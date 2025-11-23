/**
 * Geocodificador especializado para infraestructuras de seguridad en Andalucía
 * 
 * Conecta con servicios ISE (Infraestructuras de Seguridad del Estado) para acceder a:
 * - Comisarías Policía Nacional (~40 en Andalucía)
 * - Cuarteles Guardia Civil (~120 en Andalucía)
 * - Parques de Bomberos (~86 en Andalucía según IECA)
 * - Instalaciones Policía Local (variable por municipio)
 * 
 * Fuentes oficiales:
 * - WFS ISE: https://www.ideandalucia.es/services/ISE_seguridad/wfs
 * - DERA G12 Servicios (incluye bomberos)
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
 * Tipos de infraestructuras de seguridad
 */
export enum SecurityFacilityType {
  /** Comisarías Policía Nacional */
  POLICE_STATION = 'COMISARIA',
  
  /** Cuarteles Guardia Civil */
  CIVIL_GUARD = 'CUARTEL_GC',
  
  /** Instalaciones Policía Local */
  LOCAL_POLICE = 'POLICIA_LOCAL',
  
  /** Parques de Bomberos */
  FIRE_STATION = 'PARQUE_BOMBEROS',
  
  /** Centros 112 / Emergencias */
  EMERGENCY_CENTER = 'CENTRO_112'
}

/**
 * Opciones de búsqueda específicas para seguridad
 */
export interface SecuritySearchOptions extends WFSSearchOptions {
  /** Tipo de instalación de seguridad */
  facilityType?: SecurityFacilityType;
  
  /** Código de unidad (si disponible) */
  unitCode?: string;
}

/**
 * Geocodificador especializado para infraestructuras de seguridad andaluzas
 * 
 * Precisión esperada: ±10-20m (coordenadas oficiales ISE/IECA)
 * Cobertura: ~250 instalaciones seguridad + bomberos
 * 
 * @example
 * ```typescript
 * const geocoder = new WFSSecurityGeocoder();
 * const result = await geocoder.geocode({
 *   name: 'Comisaría Provincial Granada',
 *   municipality: 'Granada',
 *   province: 'Granada'
 * });
 * // result.confidence >= 80 (match oficial ISE)
 * ```
 */
export class WFSSecurityGeocoder extends WFSBaseGeocoder {
  
  /**
   * Configuración específica para WFS seguridad ISE
   */
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      wfsEndpoint: 'https://www.ideandalucia.es/services/ISE_seguridad/wfs',
      layerName: 'ise_comisarias', // Capa por defecto: Comisarías
      fuzzyThreshold: 0.35, // Threshold estricto (nombres oficiales únicos)
      timeout: 15000,
      outputSRS: 'EPSG:25830'
    };
  }

  /**
   * Parsea feature GeoJSON de ISE Seguridad
   * 
   * Estructura esperada ISE:
   * {
   *   type: "Feature",
   *   geometry: { type: "Point", coordinates: [x, y] },
   *   properties: {
   *     DENOMINACION: "Comisaría Provincial de Policía",
   *     TIPO: "Comisaría",
   *     ORGANISMO: "Policía Nacional",
   *     MUNICIPIO: "Granada",
   *     PROVINCIA: "Granada",
   *     DIRECCION: "C/ Duquesa, 31",
   *     TELEFONO: "958123456",
   *     CODIGO_UNIDAD: "GR-001"
   *   }
   * }
   */
  protected parseFeature(feature: any): WFSFeature | null {
    try {
      const props = feature.properties || {};
      const geom = feature.geometry;

      // Validar geometría
      if (!geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates)) {
        console.warn('Feature seguridad sin geometría válida:', feature.id);
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
          organism: props.ORGANISMO || props.CUERPO || '',
          unitCode: props.CODIGO_UNIDAD || props.CODIGO || '',
          phone: props.TELEFONO || '',
          emergency: props.EMERGENCIAS || '',
          ...props
        }
      };
    } catch (error) {
      console.error('Error parseando feature seguridad:', error);
      return null;
    }
  }

  /**
   * Construye filtro CQL específico para infraestructuras de seguridad
   */
  protected buildCQLFilter(options: SecuritySearchOptions): string {
    const filters: string[] = [];

    // Filtro base (municipio, provincia)
    const baseFilter = super.buildCQLFilter(options);
    if (baseFilter) {
      filters.push(baseFilter);
    }

    // Filtro por tipo de instalación
    if (options.facilityType) {
      const typeValue = this.getFacilityTypeValue(options.facilityType);
      filters.push(`TIPO ILIKE '%${this.escapeCQL(typeValue)}%'`);
    }

    // Filtro por código de unidad
    if (options.unitCode) {
      filters.push(`CODIGO_UNIDAD = '${this.escapeCQL(options.unitCode)}'`);
    }

    return filters.length > 0 ? filters.join(' AND ') : '';
  }

  /**
   * Convierte tipo de facilidad a valor para WFS
   */
  private getFacilityTypeValue(type: SecurityFacilityType): string {
    const map: Record<SecurityFacilityType, string> = {
      [SecurityFacilityType.POLICE_STATION]: 'Comisaría',
      [SecurityFacilityType.CIVIL_GUARD]: 'Cuartel',
      [SecurityFacilityType.LOCAL_POLICE]: 'Policía Local',
      [SecurityFacilityType.FIRE_STATION]: 'Parque Bomberos',
      [SecurityFacilityType.EMERGENCY_CENTER]: 'Centro 112'
    };
    return map[type] || '';
  }

  /**
   * Geocodifica cambiando automáticamente entre capas según tipo detectado
   * 
   * Estrategia:
   * 1. Intenta con ise_comisarias (Policía Nacional)
   * 2. Si falla y detecta "guardia civil", intenta ise_cuarteles
   * 3. Si falla y detecta "bomberos", intenta g12_03_bomberos (DERA)
   * 4. Si falla y detecta "local", intenta ise_policia_local
   */
  public async geocodeWithAutoLayer(options: SecuritySearchOptions): Promise<GeocodingResult | null> {
    const nameLower = options.name.toLowerCase();

    // Determinar capa óptima
    const layerPriority: Array<{endpoint: string, layer: string}> = [];

    if (nameLower.includes('comisaría') || nameLower.includes('policía nacional')) {
      layerPriority.push({
        endpoint: 'https://www.ideandalucia.es/services/ISE_seguridad/wfs',
        layer: 'ise_comisarias'
      });
    }
    
    if (nameLower.includes('guardia civil') || nameLower.includes('cuartel')) {
      layerPriority.push({
        endpoint: 'https://www.ideandalucia.es/services/ISE_seguridad/wfs',
        layer: 'ise_cuarteles_gc'
      });
    }
    
    if (nameLower.includes('bombero') || nameLower.includes('parque') || 
        nameLower.includes('extinción')) {
      layerPriority.push({
        endpoint: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wfs',
        layer: 'g12_03_parque_bomberos'
      });
    }
    
    if (nameLower.includes('policía local') || nameLower.includes('municipal')) {
      layerPriority.push({
        endpoint: 'https://www.ideandalucia.es/services/ISE_seguridad/wfs',
        layer: 'ise_policia_local'
      });
    }

    // Si no hay prioridad específica, orden estándar
    if (layerPriority.length === 0) {
      layerPriority.push(
        { endpoint: 'https://www.ideandalucia.es/services/ISE_seguridad/wfs', layer: 'ise_comisarias' },
        { endpoint: 'https://www.ideandalucia.es/services/ISE_seguridad/wfs', layer: 'ise_cuarteles_gc' },
        { endpoint: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wfs', layer: 'g12_03_parque_bomberos' }
      );
    }

    // Intentar con cada capa/endpoint
    const originalEndpoint = this.config.wfsEndpoint;
    const originalLayer = this.config.layerName;

    for (const {endpoint, layer} of layerPriority) {
      this.config.wfsEndpoint = endpoint;
      this.config.layerName = layer;
      
      const result = await this.geocode(options);
      
      if (result && result.confidence >= 70) {
        // Restaurar configuración original
        this.config.wfsEndpoint = originalEndpoint;
        this.config.layerName = originalLayer;
        return result;
      }
    }

    // Restaurar configuración original
    this.config.wfsEndpoint = originalEndpoint;
    this.config.layerName = originalLayer;
    return null;
  }

  /**
   * Busca instalación de seguridad por código de unidad
   */
  public async geocodeByUnitCode(code: string): Promise<GeocodingResult | null> {
    try {
      const params = this.buildWFSParams({
        name: '',
        unitCode: code,
        maxResults: 10
      } as SecuritySearchOptions);

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      const features = this.parseResponse(response.data);

      if (features.length === 0) {
        return null;
      }

      // Match exacto por código = confianza 100%
      const feature = features[0];
      return this.featureToGeocodingResult(feature, 1.0, feature.name);

    } catch (error) {
      console.error(`Error geocodificando por código ${code}:`, error);
      return null;
    }
  }

  /**
   * Obtiene todas las instalaciones de seguridad de un municipio
   * Incluye: Policía, Guardia Civil, Bomberos
   */
  public async getAllSecurityFacilitiesInMunicipality(
    municipality: string,
    province?: string
  ): Promise<WFSFeature[]> {
    const allFeatures: WFSFeature[] = [];

    // Consultar todas las capas de seguridad
    const sources = [
      { endpoint: 'https://www.ideandalucia.es/services/ISE_seguridad/wfs', layer: 'ise_comisarias' },
      { endpoint: 'https://www.ideandalucia.es/services/ISE_seguridad/wfs', layer: 'ise_cuarteles_gc' },
      { endpoint: 'https://www.ideandalucia.es/services/ISE_seguridad/wfs', layer: 'ise_policia_local' },
      { endpoint: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wfs', layer: 'g12_03_parque_bomberos' }
    ];

    const originalEndpoint = this.config.wfsEndpoint;
    const originalLayer = this.config.layerName;

    for (const {endpoint, layer} of sources) {
      try {
        this.config.wfsEndpoint = endpoint;
        this.config.layerName = layer;
        
        const params = this.buildWFSParams({
          name: '',
          municipality,
          province,
          maxResults: 100
        });

        const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
        const features = this.parseResponse(response.data);
        allFeatures.push(...features);

      } catch (error) {
        console.error(`Error obteniendo ${layer} de ${municipality}:`, error);
      }
    }

    // Restaurar configuración original
    this.config.wfsEndpoint = originalEndpoint;
    this.config.layerName = originalLayer;
    
    return allFeatures;
  }

  /**
   * Obtiene solo parques de bomberos de un municipio/provincia
   * Método específico para emergencias de incendios
   */
  public async getFireStationsInArea(
    municipality?: string,
    province?: string,
    bbox?: [number, number, number, number]
  ): Promise<WFSFeature[]> {
    try {
      this.config.wfsEndpoint = 'https://www.ideandalucia.es/services/DERA_g12_servicios/wfs';
      this.config.layerName = 'g12_03_parque_bomberos';

      const params = this.buildWFSParams({
        name: '',
        municipality,
        province,
        bbox,
        maxResults: 100
      });

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      return this.parseResponse(response.data);

    } catch (error) {
      console.error('Error obteniendo parques de bomberos:', error);
      return [];
    } finally {
      // Restaurar configuración original
      this.config.wfsEndpoint = 'https://www.ideandalucia.es/services/ISE_seguridad/wfs';
      this.config.layerName = 'ise_comisarias';
    }
  }
}
