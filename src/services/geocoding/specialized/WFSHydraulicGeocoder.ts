/**
 * Geocodificador especializado para infraestructuras hidráulicas de Andalucía
 * 
 * Conecta con servicios WFS de REDIAM para acceder a:
 * - EDAR (Estaciones Depuradoras de Aguas Residuales): ~450 instalaciones
 * - Embalses y presas: ~80 en Andalucía
 * - Captaciones de agua: ~300 puntos
 * - Desaladoras: ~15 plantas
 * 
 * Fuentes oficiales:
 * - WFS REDIAM: https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas
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
 * Tipos de infraestructuras hidráulicas
 */
export enum HydraulicFacilityType {
  /** Estaciones Depuradoras de Aguas Residuales */
  EDAR = 'EDAR',
  /** Depuradoras menores */
  DEPURADORA = 'DEPURADORA',
  /** Embalses y presas */
  EMBALSE = 'EMBALSE',
  /** Captaciones de agua */
  CAPTACION = 'CAPTACION',
  /** Plantas desaladoras */
  DESALADORA = 'DESALADORA',
  /** Estaciones de bombeo */
  BOMBEO = 'BOMBEO'
}

/**
 * Opciones de búsqueda específicas para infraestructuras hidráulicas
 */
export interface HydraulicSearchOptions extends WFSSearchOptions {
  /** Tipo de infraestructura hidráulica */
  facilityType?: HydraulicFacilityType;
  /** Cuenca hidrográfica */
  basin?: string;
  /** Capacidad mínima (habitantes equivalentes para EDAR) */
  minCapacity?: number;
}

/**
 * Geocodificador especializado para infraestructuras hidráulicas andaluzas
 * 
 * Precisión esperada: ±5-15m (coordenadas oficiales REDIAM)
 * Cobertura: ~850 infraestructuras hidráulicas
 * 
 * @example
 * ```typescript
 * const geocoder = new WFSHydraulicGeocoder();
 * const result = await geocoder.geocode({
 *   name: 'EDAR Granada Sur',
 *   municipality: 'Granada',
 *   province: 'Granada'
 * });
 * // result.confidence >= 85 (match oficial REDIAM)
 * ```
 */
export class WFSHydraulicGeocoder extends WFSBaseGeocoder {
  
  // Mapeo de capas por tipo de infraestructura
  private readonly LAYER_MAP: Record<string, string> = {
    'edar': 'EDAR',
    'depuradora': 'Depuradoras',
    'embalse': 'Embalses',
    'captacion': 'Captaciones',
    'desaladora': 'Desaladoras'
  };

  /**
   * Configuración específica para WFS REDIAM Infraestructuras Hidráulicas
   */
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      wfsEndpoint: 'https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas',
      layerName: 'EDAR', // Capa por defecto
      fuzzyThreshold: 0.35,
      timeout: 20000, // 20s - REDIAM puede ser lento
      outputSRS: 'EPSG:25830'
    };
  }

  /**
   * Parsea feature GeoJSON de REDIAM Hidráulicas
   * 
   * Estructura esperada:
   * {
   *   type: "Feature",
   *   geometry: { type: "Point", coordinates: [x, y] },
   *   properties: {
   *     DENOMINACION: "EDAR Granada Sur",
   *     MUNICIPIO: "Granada",
   *     PROVINCIA: "Granada",
   *     CAPACIDAD_HE: 500000,
   *     CAUDAL_M3DIA: 120000,
   *     TITULAR: "EMASAGRA",
   *     CUENCA: "Guadalquivir"
   *   }
   * }
   */
  protected parseFeature(feature: any): WFSFeature | null {
    try {
      const props = feature.properties || {};
      const geom = feature.geometry;

      // Validar geometría
      if (!geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates)) {
        console.warn('Feature hidráulica sin geometría válida:', feature.id);
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
        municipality: props.MUNICIPIO || '',
        province: props.PROVINCIA || '',
        address: '', // Infraestructuras hidráulicas raramente tienen dirección postal
        properties: {
          type: props.TIPO || '',
          capacity: props.CAPACIDAD_HE || props.CAPACIDAD,
          flow: props.CAUDAL_M3DIA || props.CAUDAL,
          owner: props.TITULAR || props.PROPIETARIO,
          basin: props.CUENCA || props.DEMARCACION,
          status: props.ESTADO || '',
          ...props
        }
      };
    } catch (error) {
      console.error('Error parseando feature hidráulica:', error);
      return null;
    }
  }

  /**
   * Construye filtro CQL específico para infraestructuras hidráulicas
   */
  protected buildCQLFilter(options: HydraulicSearchOptions): string {
    const filters: string[] = [];

    // Filtro base
    const baseFilter = super.buildCQLFilter(options);
    if (baseFilter) {
      filters.push(baseFilter);
    }

    // Filtro por cuenca hidrográfica
    if (options.basin) {
      filters.push(`CUENCA ILIKE '%${this.escapeCQL(options.basin)}%'`);
    }

    // Filtro por capacidad mínima
    if (options.minCapacity) {
      filters.push(`CAPACIDAD_HE >= ${options.minCapacity}`);
    }

    return filters.length > 0 ? filters.join(' AND ') : '';
  }

  /**
   * Detecta tipo de infraestructura por nombre
   */
  private detectFacilityType(name: string): string {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('edar') || nameLower.includes('depuradora')) {
      return 'EDAR';
    }
    if (nameLower.includes('embalse') || nameLower.includes('presa') || nameLower.includes('pantano')) {
      return 'Embalses';
    }
    if (nameLower.includes('captación') || nameLower.includes('potabilizadora') || nameLower.includes('etap')) {
      return 'Captaciones';
    }
    if (nameLower.includes('desaladora') || nameLower.includes('desalinizadora')) {
      return 'Desaladoras';
    }
    
    return 'EDAR'; // Default
  }

  /**
   * Geocodifica con selección automática de capa según nombre
   */
  public async geocodeWithAutoLayer(options: HydraulicSearchOptions): Promise<GeocodingResult | null> {
    // Detectar tipo y seleccionar capa
    const detectedLayer = this.detectFacilityType(options.name);
    this.config.layerName = detectedLayer;

    // Intentar con la capa detectada
    let result = await this.geocode(options);
    
    if (result && result.confidence >= 70) {
      return result;
    }

    // Si no encuentra, probar otras capas
    const layersToTry = ['EDAR', 'Embalses', 'Captaciones', 'Desaladoras'];
    
    for (const layer of layersToTry) {
      if (layer === detectedLayer) continue;
      
      this.config.layerName = layer;
      result = await this.geocode(options);
      
      if (result && result.confidence >= 70) {
        return result;
      }
    }

    // Restaurar capa por defecto
    this.config.layerName = 'EDAR';
    return result;
  }

  /**
   * Obtiene todas las infraestructuras hidráulicas de un municipio
   */
  public async getAllFacilitiesInMunicipality(
    municipality: string,
    province?: string
  ): Promise<WFSFeature[]> {
    const allFeatures: WFSFeature[] = [];
    const layers = ['EDAR', 'Embalses', 'Captaciones', 'Desaladoras'];

    for (const layer of layers) {
      try {
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
        console.warn(`Error obteniendo ${layer} de ${municipality}:`, error);
      }
    }

    // Restaurar capa por defecto
    this.config.layerName = 'EDAR';
    return allFeatures;
  }
}

export default WFSHydraulicGeocoder;
