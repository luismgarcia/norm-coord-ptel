/**
 * Geocodificador especializado para infraestructuras educativas de Andalucía
 * 
 * Conecta con servicios WFS de IECA/DERA para acceder a:
 * - DERA G13: Sistema de Información de Centros Educativos
 * - ISE (Instituto Estadística): Centros docentes georreferenciados
 * 
 * Fuentes oficiales:
 * - WFS DERA G13: https://www.ideandalucia.es/services/DERA_g13_educacion/wfs
 * - WFS ISE: https://www.ideandalucia.es/services/ISE_equipamientos/wfs
 * - Capas: g13_01_ColegioPublico, g13_02_InstitutoSecundaria, g13_03_CentroEducativo
 * 
 * Cobertura:
 * - ~2,400 colegios públicos (CEIP)
 * - ~800 institutos (IES)
 * - ~600 centros privados/concertados
 * - Total: ~3,800 infraestructuras educativas en Andalucía
 * 
 * @module services/geocoding/specialized
 */

import { 
  WFSBaseGeocoder, 
  WFSFeature, 
  WFSSearchOptions 
} from './WFSBaseGeocoder';
import { SpecializedGeocoderConfig } from '../../../types/infrastructure';

/**
 * Tipos de centros educativos en Andalucía
 */
export enum EducationFacilityType {
  /** Colegios de Educación Infantil y Primaria (~2,400) */
  CEIP = 'CEIP',
  
  /** Institutos de Educación Secundaria (~800) */
  IES = 'IES',
  
  /** Escuelas Infantiles / Guarderías */
  NURSERY = 'GUARDERIA',
  
  /** Centros de Educación Especial */
  SPECIAL = 'EDUCACION_ESPECIAL',
  
  /** Centros de Formación Profesional */
  FP = 'FORMACION_PROFESIONAL',
  
  /** Centros privados/concertados */
  PRIVATE = 'PRIVADO'
}

/**
 * Opciones de búsqueda específicas para centros educativos
 */
export interface EducationSearchOptions extends WFSSearchOptions {
  /** Tipo de centro educativo a buscar */
  facilityType?: EducationFacilityType;
  
  /** Nivel educativo (infantil, primaria, secundaria, FP) */
  educationLevel?: string;
  
  /** Titularidad (público, privado, concertado) */
  ownership?: 'PUBLICO' | 'PRIVADO' | 'CONCERTADO';
}

/**
 * Geocodificador especializado para centros educativos andaluces
 * 
 * Precisión esperada: ±5-15m (coordenadas oficiales Consejería Educación)
 * Cobertura: ~3,800 infraestructuras educativas
 * 
 * @example
 * ```typescript
 * const geocoder = new WFSEducationGeocoder();
 * const result = await geocoder.geocode({
 *   name: 'CEIP Miguel Hernández',
 *   municipality: 'Granada',
 *   province: 'Granada'
 * });
 * // result.confidence >= 85 (match oficial Consejería Educación)
 * ```
 */
export class WFSEducationGeocoder extends WFSBaseGeocoder {
  
  /**
   * Configuración específica para servicios WFS educativos de IECA
   */
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      // DERA G13 - Educación
      wfsEndpoint: 'https://www.ideandalucia.es/services/DERA_g13_educacion/wfs',
      layerName: 'g13_01_ColegioPublico', // Capa por defecto: CEIP
      fuzzyThreshold: 0.25, // Threshold permisivo (nombres variados)
      timeout: 15000, // 15s para WFS IECA
      outputSRS: 'EPSG:25830' // UTM30 ETRS89
    };
  }

  /**
   * Parsea feature GeoJSON de DERA G13 a formato interno
   * 
   * Estructura esperada de DERA G13:
   * {
   *   type: "Feature",
   *   geometry: { type: "Point", coordinates: [x, y] },
   *   properties: {
   *     DENOMINACION: "CEIP Miguel Hernández",
   *     MUNICIPIO: "Granada",
   *     PROVINCIA: "Granada",
   *     DIRECCION: "Calle Periodista Fernando Alcalá 1",
   *     TIPO_CENTRO: "Colegio Público",
   *     NIVEL_EDUCATIVO: "Infantil y Primaria",
   *     TITULARIDAD: "Público",
   *     CODIGO_CENTRO: "18000001"
   *   }
   * }
   */
  protected parseFeature(feature: any): WFSFeature | null {
    try {
      const props = feature.properties || {};
      const geom = feature.geometry;

      // Validar geometría
      if (!geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates)) {
        console.warn('Feature educativa sin geometría válida:', feature.id);
        return null;
      }

      const [x, y] = geom.coordinates;

      // Validar coordenadas en rango UTM30 Andalucía
      if (x < 100000 || x > 800000 || y < 4000000 || y < 4300000) {
        console.warn('Coordenadas educativas fuera de rango UTM30:', x, y);
        return null;
      }

      // Extraer nombre
      const name = props.DENOMINACION || props.NOMBRE || props.NOMBRE_CENTRO || '';

      return {
        name,
        x,
        y,
        municipality: props.MUNICIPIO || '',
        province: props.PROVINCIA || '',
        address: props.DIRECCION || props.DOMICILIO || '',
        properties: {
          facilityType: props.TIPO_CENTRO || '',
          educationLevel: props.NIVEL_EDUCATIVO || '',
          ownership: props.TITULARIDAD || '',
          centerCode: props.CODIGO_CENTRO || '',
          phone: props.TELEFONO || '',
          ...props
        }
      };
    } catch (error) {
      console.error('Error parseando feature educativa:', error);
      return null;
    }
  }

  /**
   * Construye filtro CQL específico para centros educativos
   */
  protected buildCQLFilter(options: EducationSearchOptions): string {
    const filters: string[] = [];

    // Filtro base (municipio, provincia)
    const baseFilter = super.buildCQLFilter(options);
    if (baseFilter) {
      filters.push(baseFilter);
    }

    // Filtro por titularidad
    if (options.ownership) {
      filters.push(`TITULARIDAD ILIKE '%${this.escapeCQL(options.ownership)}%'`);
    }

    // Filtro por nivel educativo
    if (options.educationLevel) {
      filters.push(`NIVEL_EDUCATIVO ILIKE '%${this.escapeCQL(options.educationLevel)}%'`);
    }

    return filters.length > 0 ? filters.join(' AND ') : '';
  }

  /**
   * Geocodifica cambiando automáticamente entre capas según tipo detectado
   * 
   * Estrategia:
   * 1. Detecta tipo en nombre (CEIP, IES, guardería, etc)
   * 2. Selecciona capa WFS apropiada
   * 3. Fallback a capa genérica si no match
   */
  public async geocodeWithAutoLayer(options: EducationSearchOptions) {
    const nameLower = options.name.toLowerCase();
    let originalLayer = this.config.layerName;
    let result: any = null;

    // Detectar tipo de centro educativo en el nombre
    if (nameLower.includes('ceip') || nameLower.includes('c.e.i.p') || 
        nameLower.includes('colegio')) {
      // CEIP - Colegios Públicos
      this.config.layerName = 'g13_01_ColegioPublico';
      result = await this.geocode(options);
      if (result && result.confidence >= 70) {
        this.config.layerName = originalLayer;
        return result;
      }
    }

    if (nameLower.includes('ies') || nameLower.includes('i.e.s') || 
        nameLower.includes('instituto')) {
      // IES - Institutos Secundaria
      this.config.layerName = 'g13_02_InstitutoSecundaria';
      result = await this.geocode(options);
      if (result && result.confidence >= 70) {
        this.config.layerName = originalLayer;
        return result;
      }
    }

    if (nameLower.includes('guardería') || nameLower.includes('guarderia') || 
        nameLower.includes('escuela infantil')) {
      // Escuelas Infantiles / Guarderías
      this.config.layerName = 'g13_03_EscuelaInfantil';
      result = await this.geocode(options);
      if (result && result.confidence >= 70) {
        this.config.layerName = originalLayer;
        return result;
      }
    }

    // Fallback: Intenta con capa genérica de centros educativos
    this.config.layerName = 'g13_00_CentroEducativo';
    result = await this.geocode(options);
    
    // Restaurar capa original
    this.config.layerName = originalLayer;
    return result;
  }

  /**
   * Obtiene todos los centros educativos de un municipio
   * Útil para pre-caching
   */
  public async getAllFacilitiesInMunicipality(
    municipality: string,
    province?: string
  ): Promise<WFSFeature[]> {
    try {
      const params = this.buildWFSParams({
        name: '',
        municipality,
        province,
        maxResults: 1000 // Municipios grandes pueden tener 100+ centros
      });

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      return this.parseResponse(response.data);

    } catch (error) {
      console.error(`Error obteniendo centros educativos de ${municipality}:`, error);
      return [];
    }
  }

  /**
   * Valida coordenadas contra centros educativos oficiales
   * 
   * @param x - Coordenada X (Este) en EPSG:25830
   * @param y - Coordenada Y (Norte) en EPSG:25830
   * @param radius - Radio búsqueda en metros (default: 500m)
   * @returns Centro educativo más cercano o null
   */
  public async validateCoordinates(
    x: number,
    y: number,
    radius: number = 500
  ): Promise<WFSFeature | null> {
    try {
      // BBOX alrededor del punto
      const bbox: [number, number, number, number] = [
        x - radius,
        y - radius,
        x + radius,
        y + radius
      ];

      const params = this.buildWFSParams({
        name: '',
        bbox,
        maxResults: 10
      });

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      const features = this.parseResponse(response.data);

      if (features.length === 0) {
        return null;
      }

      // Encontrar el más cercano
      let closest: WFSFeature | null = null;
      let minDistance = Infinity;

      for (const feature of features) {
        const distance = Math.sqrt(
          Math.pow(feature.x - x, 2) + Math.pow(feature.y - y, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closest = feature;
        }
      }

      return closest;

    } catch (error) {
      console.error('Error validando coordenadas educativas:', error);
      return null;
    }
  }

  /**
   * Busca centros educativos por código oficial
   * Útil cuando el PTEL tiene código de centro pero no coordenadas
   * 
   * @param centerCode - Código oficial del centro (ej: "18000001")
   * @returns Feature del centro o null
   */
  public async geocodeByCenterCode(centerCode: string): Promise<WFSFeature | null> {
    try {
      const params = this.buildWFSParams({
        name: '',
        maxResults: 1
      });

      // Agregar filtro por código
      params['CQL_FILTER'] = `CODIGO_CENTRO = '${this.escapeCQL(centerCode)}'`;

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      const features = this.parseResponse(response.data);

      return features.length > 0 ? features[0] : null;

    } catch (error) {
      console.error(`Error buscando centro educativo por código ${centerCode}:`, error);
      return null;
    }
  }
}
