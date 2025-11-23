/**
 * Geocodificador especializado para centros educativos de Andalucía
 * 
 * Conecta con API CKAN de la Consejería de Educación para acceder a:
 * - Directorio de Centros Docentes de Andalucía (3,800+ centros)
 * - Incluye: públicos, privados, concertados
 * - Actualización: Anual (última: Enero 2025, datos curso 2023/2024)
 * 
 * Fuentes oficiales:
 * - API REST OpenAPI: https://www.juntadeandalucia.es/datosabiertos/portal/api/...
 * - Dataset: directorio-de-centros-docentes-de-andalucia
 * - Web: https://www.juntadeandalucia.es/educacion/vscripts/centros/
 * 
 * @module services/geocoding/specialized
 */

import { 
  WFSBaseGeocoder, 
  WFSFeature, 
  WFSSearchOptions 
} from './WFSBaseGeocoder';
import { SpecializedGeocoderConfig, GeocodingResult } from '../../../types/infrastructure';
import axios from 'axios';

/**
 * Tipos de centros educativos en Andalucía
 */
export enum EducationFacilityType {
  /** Centros de Educación Infantil y Primaria */
  CEIP = 'CEIP',
  
  /** Institutos de Educación Secundaria */
  IES = 'IES',
  
  /** Colegios Públicos Rurales */
  CPR = 'CPR',
  
  /** Centros Privados/Concertados */
  PRIVATE = 'PRIVADO',
  
  /** Escuelas Infantiles */
  EI = 'ESCUELA_INFANTIL',
  
  /** Conservatorios */
  CONSERVATORY = 'CONSERVATORIO'
}

/**
 * Opciones de búsqueda específicas para educación
 */
export interface EducationSearchOptions extends WFSSearchOptions {
  /** Tipo de centro educativo */
  facilityType?: EducationFacilityType;
  
  /** Código de centro (si se conoce) */
  centerCode?: string;
  
  /** Titularidad: 'Público', 'Privado', 'Concertado' */
  ownership?: 'Público' | 'Privado' | 'Concertado';
}

/**
 * Geocodificador especializado para centros educativos andaluces
 * 
 * Precisión esperada: ±5-10m (coordenadas oficiales Consejería)
 * Cobertura: ~3,800 centros educativos con alumnado matriculado
 * 
 * @example
 * ```typescript
 * const geocoder = new WFSEducationGeocoder();
 * const result = await geocoder.geocode({
 *   name: 'CEIP Miguel Hernández',
 *   municipality: 'Granada',
 *   province: 'Granada'
 * });
 * // result.confidence >= 85 (match oficial)
 * ```
 */
export class WFSEducationGeocoder extends WFSBaseGeocoder {
  
  // Endpoint API CKAN de Educación Andalucía
  private readonly EDUCATION_API_BASE = 'https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action';
  private educationCache: Map<string, any[]> = new Map();

  /**
   * Configuración específica para API educación
   * Nota: No es WFS tradicional, sino API REST de datos abiertos
   */
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      wfsEndpoint: `${this.EDUCATION_API_BASE}/datastore_search`,
      layerName: 'directorio-centros-docentes', // ID del dataset
      fuzzyThreshold: 0.3, // Threshold permisivo para variaciones nombre
      timeout: 15000, // 15s timeout
      outputSRS: 'EPSG:25830' // UTM30 ETRS89
    };
  }

  /**
   * Parsea feature de API CKAN a formato interno
   * 
   * Estructura esperada API educación:
   * {
   *   "codigo_centro": "18000123",
   *   "denominacion": "CEIP Miguel Hernández",
   *   "naturaleza": "Centro público",
   *   "titularidad": "Público",
   *   "domicilio": "C/ Real, 45",
   *   "localidad": "Granada",
   *   "municipio": "Granada",
   *   "provincia": "Granada",
   *   "codigo_postal": "18009",
   *   "telefono": "958123456",
   *   "coordenada_x_geo": "447850.23",
   *   "coordenada_y_geo": "4111234.56",
   *   "ensenanzas": "Educación Infantil, Educación Primaria"
   * }
   */
  protected parseFeature(record: any): WFSFeature | null {
    try {
      // Parsear coordenadas (pueden venir como strings)
      const x = parseFloat(record.coordenada_x_geo || record.x || record.longitude);
      const y = parseFloat(record.coordenada_y_geo || record.y || record.latitude);

      // Validar coordenadas
      if (isNaN(x) || isNaN(y)) {
        console.warn('Centro educativo sin coordenadas:', record.codigo_centro);
        return null;
      }

      // Validar rango UTM30 Andalucía
      if (x < 100000 || x > 800000 || y < 4000000 || y < 4300000) {
        console.warn('Coordenadas fuera de rango UTM30:', x, y);
        return null;
      }

      return {
        name: record.denominacion || record.nombre || '',
        x,
        y,
        municipality: record.municipio || record.localidad || '',
        province: record.provincia || '',
        address: record.domicilio || record.direccion || '',
        properties: {
          centerCode: record.codigo_centro || '',
          ownership: record.titularidad || '',
          nature: record.naturaleza || '',
          postalCode: record.codigo_postal || '',
          phone: record.telefono || '',
          teachings: record.ensenanzas || '',
          ...record
        }
      };
    } catch (error) {
      console.error('Error parseando centro educativo:', error);
      return null;
    }
  }

  /**
   * Geocodifica usando API CKAN en lugar de WFS tradicional
   * Sobrescribe método base para usar API REST específica
   */
  public async geocode(options: EducationSearchOptions): Promise<GeocodingResult | null> {
    try {
      // Obtener todos los centros del municipio (con cache)
      const municipalityKey = `${options.municipality}_${options.province}`.toLowerCase();
      
      let centers: any[];
      if (this.educationCache.has(municipalityKey)) {
        centers = this.educationCache.get(municipalityKey)!;
      } else {
        centers = await this.fetchCentersByMunicipality(
          options.municipality || '',
          options.province
        );
        this.educationCache.set(municipalityKey, centers);
      }

      if (centers.length === 0) {
        return null;
      }

      // Parsear a WFSFeature
      const features = centers
        .map(c => this.parseFeature(c))
        .filter((f): f is WFSFeature => f !== null);

      // Aplicar filtros adicionales si existen
      let filteredFeatures = features;
      
      if (options.ownership) {
        filteredFeatures = filteredFeatures.filter(f => 
          f.properties.ownership?.includes(options.ownership!)
        );
      }

      if (options.facilityType) {
        const typeKeyword = this.getFacilityTypeKeyword(options.facilityType);
        filteredFeatures = filteredFeatures.filter(f =>
          f.name.toUpperCase().includes(typeKeyword)
        );
      }

      // Fuzzy matching sobre features filtrados
      const bestMatch = this.findBestMatch(options.name, filteredFeatures);

      if (!bestMatch || bestMatch.score < this.config.fuzzyThreshold) {
        return null;
      }

      // Convertir a resultado
      return this.featureToGeocodingResult(
        bestMatch.feature, 
        bestMatch.score, 
        options.name
      );

    } catch (error) {
      console.error('Error geocodificando centro educativo:', error);
      return null;
    }
  }

  /**
   * Obtiene todos los centros educativos de un municipio via API CKAN
   */
  private async fetchCentersByMunicipality(
    municipality: string,
    province?: string
  ): Promise<any[]> {
    try {
      // Construir query SQL para API CKAN
      let sqlQuery = `SELECT * FROM "directorio-centros-docentes" WHERE LOWER("municipio") LIKE '%${municipality.toLowerCase()}%'`;
      
      if (province) {
        sqlQuery += ` AND LOWER("provincia") LIKE '%${province.toLowerCase()}%'`;
      }
      
      sqlQuery += ' LIMIT 500'; // Límite generoso

      const response = await axios.get(this.config.wfsEndpoint, {
        params: {
          resource_id: 'directorio-centros-docentes',
          sql: sqlQuery
        },
        timeout: this.config.timeout
      });

      if (response.data?.success && response.data?.result?.records) {
        return response.data.result.records;
      }

      return [];

    } catch (error) {
      console.error(`Error obteniendo centros de ${municipality}:`, error);
      return [];
    }
  }

  /**
   * Convierte tipo de facilidad a keyword para filtrado
   */
  private getFacilityTypeKeyword(type: EducationFacilityType): string {
    const map: Record<EducationFacilityType, string> = {
      [EducationFacilityType.CEIP]: 'CEIP',
      [EducationFacilityType.IES]: 'IES',
      [EducationFacilityType.CPR]: 'CPR',
      [EducationFacilityType.PRIVATE]: 'PRIVADO',
      [EducationFacilityType.EI]: 'INFANTIL',
      [EducationFacilityType.CONSERVATORY]: 'CONSERVATORIO'
    };
    return map[type] || '';
  }

  /**
   * Normaliza nombre de centro educativo
   * Maneja abreviaturas comunes: C.E.I.P. → CEIP, I.E.S. → IES
   */
  private normalizeEducationName(name: string): string {
    return name
      .replace(/C\.E\.I\.P\./gi, 'CEIP')
      .replace(/I\.E\.S\./gi, 'IES')
      .replace(/C\.P\.R\./gi, 'CPR')
      .replace(/E\.I\./gi, 'EI')
      .trim();
  }

  /**
   * Obtiene todos los centros educativos de un municipio
   * Para pre-caching completo
   */
  public async getAllCentersInMunicipality(
    municipality: string,
    province?: string
  ): Promise<WFSFeature[]> {
    const centers = await this.fetchCentersByMunicipality(municipality, province);
    return centers
      .map(c => this.parseFeature(c))
      .filter((f): f is WFSFeature => f !== null);
  }

  /**
   * Busca centro educativo por código oficial
   * Útil cuando el código está disponible en PTEL
   */
  public async geocodeByCenterCode(code: string): Promise<GeocodingResult | null> {
    try {
      const response = await axios.get(this.config.wfsEndpoint, {
        params: {
          resource_id: 'directorio-centros-docentes',
          filters: JSON.stringify({ codigo_centro: code })
        },
        timeout: this.config.timeout
      });

      if (!response.data?.success || !response.data?.result?.records?.length) {
        return null;
      }

      const record = response.data.result.records[0];
      const feature = this.parseFeature(record);

      if (!feature) {
        return null;
      }

      return this.featureToGeocodingResult(feature, 1.0, feature.name);

    } catch (error) {
      console.error(`Error geocodificando por código ${code}:`, error);
      return null;
    }
  }

  /**
   * Limpia cache de centros educativos
   */
  public clearCache(): void {
    super.clearCache();
    this.educationCache.clear();
  }
}
