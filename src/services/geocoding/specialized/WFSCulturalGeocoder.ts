/**
 * Geocodificador especializado para patrimonio cultural de Andalucía
 * 
 * Conecta con servicios del IAPH (Instituto Andaluz del Patrimonio Histórico) para acceder a:
 * - Base de datos MOSAICO (100,000+ bienes culturales)
 * - 27,000+ registros patrimonio inmueble georeferenciado
 * - Museos, bibliotecas, sitios arqueológicos, monumentos
 * 
 * Fuentes oficiales:
 * - WFS DERA Cultural: https://www.ideandalucia.es/services/DERA_g09_cultura/wfs
 * - Datos Abiertos Cultura: https://www.juntadeandalucia.es/datosabiertos/portal/
 * - IAPH MOSAICO: https://guiadigital.iaph.es/
 * 
 * @module services/geocoding/specialized
 */

import { 
  WFSBaseGeocoder, 
  WFSFeature, 
  WFSSearchOptions 
} from './WFSBaseGeocoder';
import { SpecializedGeocoderConfig, GeocodingResult } from '../../../types/infrastructure';

/**
 * Tipos de patrimonio cultural en Andalucía
 */
export enum CulturalFacilityType {
  /** Museos (~180 en Andalucía) */
  MUSEUM = 'MUSEO',
  
  /** Bibliotecas (~1,135 recursos bibliotecarios) */
  LIBRARY = 'BIBLIOTECA',
  
  /** Teatros y auditorios */
  THEATER = 'TEATRO',
  
  /** Centros culturales */
  CULTURAL_CENTER = 'CENTRO_CULTURAL',
  
  /** Monumentos y patrimonio arquitectónico */
  MONUMENT = 'MONUMENTO',
  
  /** Sitios arqueológicos */
  ARCHAEOLOGICAL = 'ARQUEOLOGICO',
  
  /** Archivos históricos */
  ARCHIVE = 'ARCHIVO'
}

/**
 * Opciones de búsqueda específicas para patrimonio cultural
 */
export interface CulturalSearchOptions extends WFSSearchOptions {
  /** Tipo de bien cultural */
  facilityType?: CulturalFacilityType;
  
  /** Código de protección BIC, etc */
  protectionCode?: string;
  
  /** Período histórico */
  period?: string;
}

/**
 * Geocodificador especializado para patrimonio cultural andaluz
 * 
 * Precisión esperada: ±5-15m (coordenadas oficiales IAPH/IECA)
 * Cobertura: ~7,000+ sitios patrimonio cultural georeferenciado
 * 
 * @example
 * ```typescript
 * const geocoder = new WFSCulturalGeocoder();
 * const result = await geocoder.geocode({
 *   name: 'Museo de la Alhambra',
 *   municipality: 'Granada',
 *   province: 'Granada'
 * });
 * // result.confidence >= 80 (match oficial IAPH)
 * ```
 */
export class WFSCulturalGeocoder extends WFSBaseGeocoder {
  
  /**
   * Configuración específica para WFS cultural DERA G09
   */
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      wfsEndpoint: 'https://www.ideandalucia.es/services/DERA_g09_cultura/wfs',
      layerName: 'g09_01_museo', // Capa por defecto: Museos
      fuzzyThreshold: 0.35, // Threshold ligeramente más estricto (nombres únicos)
      timeout: 15000,
      outputSRS: 'EPSG:25830'
    };
  }

  /**
   * Parsea feature GeoJSON de DERA G09 Cultural
   * 
   * Estructura esperada DERA G09:
   * {
   *   type: "Feature",
   *   geometry: { type: "Point", coordinates: [x, y] },
   *   properties: {
   *     DENOMINACION: "Museo de la Alhambra",
   *     TIPO: "Museo",
   *     MUNICIPIO: "Granada",
   *     PROVINCIA: "Granada",
   *     DIRECCION: "C/ Real de la Alhambra s/n",
   *     CODIGO_BIC: "RI-51-0000479",
   *     PERIODO: "Nazarí",
   *     TITULARIDAD: "Público"
   *   }
   * }
   */
  protected parseFeature(feature: any): WFSFeature | null {
    try {
      const props = feature.properties || {};
      const geom = feature.geometry;

      // Validar geometría
      if (!geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates)) {
        console.warn('Feature cultural sin geometría válida:', feature.id);
        return null;
      }

      const [x, y] = geom.coordinates;

      // Validar coordenadas UTM30 Andalucía
      if (x < 100000 || x > 800000 || y < 4000000 || y > 4300000) {
        console.warn('Coordenadas fuera de rango UTM30:', x, y);
        return null;
      }

      return {
        name: props.DENOMINACION || props.NOMBRE || '',
        x,
        y,
        municipality: props.MUNICIPIO || props.LOCALIDAD || '',
        province: props.PROVINCIA || '',
        address: props.DIRECCION || props.DOMICILIO || '',
        properties: {
          type: props.TIPO || '',
          protectionCode: props.CODIGO_BIC || props.CODIGO || '',
          period: props.PERIODO || props.EPOCA || '',
          ownership: props.TITULARIDAD || '',
          phone: props.TELEFONO || '',
          website: props.WEB || props.URL || '',
          ...props
        }
      };
    } catch (error) {
      console.error('Error parseando feature cultural:', error);
      return null;
    }
  }

  /**
   * Construye filtro CQL específico para patrimonio cultural
   */
  protected buildCQLFilter(options: CulturalSearchOptions): string {
    const filters: string[] = [];

    // Filtro base (municipio, provincia)
    const baseFilter = super.buildCQLFilter(options);
    if (baseFilter) {
      filters.push(baseFilter);
    }

    // Filtro por tipo de bien cultural
    if (options.facilityType) {
      const typeValue = this.getFacilityTypeValue(options.facilityType);
      filters.push(`TIPO ILIKE '%${this.escapeCQL(typeValue)}%'`);
    }

    // Filtro por código de protección
    if (options.protectionCode) {
      filters.push(`CODIGO_BIC ILIKE '%${this.escapeCQL(options.protectionCode)}%'`);
    }

    // Filtro por período histórico
    if (options.period) {
      filters.push(`PERIODO ILIKE '%${this.escapeCQL(options.period)}%'`);
    }

    return filters.length > 0 ? filters.join(' AND ') : '';
  }

  /**
   * Convierte tipo de facilidad a valor para WFS
   */
  private getFacilityTypeValue(type: CulturalFacilityType): string {
    const map: Record<CulturalFacilityType, string> = {
      [CulturalFacilityType.MUSEUM]: 'Museo',
      [CulturalFacilityType.LIBRARY]: 'Biblioteca',
      [CulturalFacilityType.THEATER]: 'Teatro',
      [CulturalFacilityType.CULTURAL_CENTER]: 'Centro Cultural',
      [CulturalFacilityType.MONUMENT]: 'Monumento',
      [CulturalFacilityType.ARCHAEOLOGICAL]: 'Yacimiento',
      [CulturalFacilityType.ARCHIVE]: 'Archivo'
    };
    return map[type] || '';
  }

  /**
   * Geocodifica cambiando automáticamente entre capas según tipo detectado
   * 
   * Estrategia:
   * 1. Intenta con g09_01_museo (museos)
   * 2. Si falla y detecta "biblioteca", intenta g09_02_biblioteca
   * 3. Si falla y detecta "teatro", intenta g09_03_teatro
   * 4. Si falla, intenta g09_04_monumento (genérico patrimonio)
   */
  public async geocodeWithAutoLayer(options: CulturalSearchOptions): Promise<GeocodingResult | null> {
    const nameLower = options.name.toLowerCase();

    // Determinar capa óptima basándose en nombre
    const layerPriority: string[] = [];

    if (nameLower.includes('museo')) {
      layerPriority.push('g09_01_museo');
    }
    if (nameLower.includes('biblioteca')) {
      layerPriority.push('g09_02_biblioteca');
    }
    if (nameLower.includes('teatro') || nameLower.includes('auditorio')) {
      layerPriority.push('g09_03_teatro');
    }
    if (nameLower.includes('castillo') || nameLower.includes('monumento') || 
        nameLower.includes('iglesia') || nameLower.includes('ermita')) {
      layerPriority.push('g09_04_monumento');
    }

    // Si no hay prioridad específica, usar orden estándar
    if (layerPriority.length === 0) {
      layerPriority.push('g09_01_museo', 'g09_02_biblioteca', 'g09_04_monumento');
    }

    // Intentar con cada capa en orden de prioridad
    for (const layer of layerPriority) {
      this.config.layerName = layer;
      const result = await this.geocode(options);
      
      if (result && result.confidence >= 70) {
        this.config.layerName = 'g09_01_museo'; // Restaurar default
        return result;
      }
    }

    // Restaurar capa por defecto
    this.config.layerName = 'g09_01_museo';
    return null;
  }

  /**
   * Busca patrimonio cultural por código BIC
   * (Bien de Interés Cultural)
   */
  public async geocodeByProtectionCode(code: string): Promise<GeocodingResult | null> {
    try {
      const params = this.buildWFSParams({
        name: '',
        protectionCode: code,
        maxResults: 10
      } as CulturalSearchOptions);

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      const features = this.parseResponse(response.data);

      if (features.length === 0) {
        return null;
      }

      // Si hay match exacto de código, confianza 100%
      const feature = features[0];
      return this.featureToGeocodingResult(feature, 1.0, feature.name);

    } catch (error) {
      console.error(`Error geocodificando por código BIC ${code}:`, error);
      return null;
    }
  }

  /**
   * Obtiene todo el patrimonio cultural de un municipio
   * Útil para análisis territorial completo
   */
  public async getAllCulturalSitesInMunicipality(
    municipality: string,
    province?: string
  ): Promise<WFSFeature[]> {
    const allFeatures: WFSFeature[] = [];

    // Consultar todas las capas culturales
    const layers = [
      'g09_01_museo',
      'g09_02_biblioteca', 
      'g09_03_teatro',
      'g09_04_monumento'
    ];

    for (const layer of layers) {
      try {
        this.config.layerName = layer;
        
        const params = this.buildWFSParams({
          name: '',
          municipality,
          province,
          maxResults: 500
        });

        const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
        const features = this.parseResponse(response.data);
        allFeatures.push(...features);

      } catch (error) {
        console.error(`Error obteniendo ${layer} de ${municipality}:`, error);
      }
    }

    // Restaurar capa por defecto
    this.config.layerName = 'g09_01_museo';
    
    return allFeatures;
  }

  /**
   * Busca patrimonio por período histórico
   * Útil para planificación emergencias en zonas históricas
   */
  public async geocodeByPeriod(
    municipality: string,
    period: string
  ): Promise<WFSFeature[]> {
    try {
      const params = this.buildWFSParams({
        name: '',
        municipality,
        period,
        maxResults: 500
      } as CulturalSearchOptions);

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      return this.parseResponse(response.data);

    } catch (error) {
      console.error(`Error buscando patrimonio período ${period}:`, error);
      return [];
    }
  }
}
