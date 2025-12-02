/**
 * Geocodificador especializado para infraestructuras energéticas de Andalucía
 * 
 * Conecta con servicios WFS de la Agencia Andaluza de la Energía para acceder a:
 * - Subestaciones eléctricas: ~200 en Andalucía
 * - Centros de transformación: ~1,000+
 * - Líneas de alta tensión: Trazados vectoriales
 * - Infraestructura gasista: Gasoductos, ERMs
 * - Centrales de generación: ~150 (renovables y convencionales)
 * - Parques eólicos: ~180
 * - Plantas fotovoltaicas: ~300
 * 
 * Fuentes oficiales:
 * - WFS Agencia Andaluza Energía: https://www.agenciaandaluzadelaenergia.es/mapwms/wfs
 * - Cumplimiento: INSPIRE Annex III Energy Resources
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
 * Tipos de infraestructuras energéticas
 */
export enum EnergyFacilityType {
  /** Subestaciones eléctricas */
  SUBSTATION = 'SUBESTACION',
  /** Centros de transformación */
  TRANSFORMER = 'CENTRO_TRANSFORMACION',
  /** Estaciones reguladoras de gas */
  GAS_STATION = 'ESTACION_GAS',
  /** Centrales de generación */
  POWER_PLANT = 'CENTRAL_GENERACION',
  /** Parques eólicos */
  WIND_FARM = 'PARQUE_EOLICO',
  /** Plantas fotovoltaicas */
  SOLAR_PLANT = 'PLANTA_FOTOVOLTAICA',
  /** Plantas de biomasa */
  BIOMASS_PLANT = 'PLANTA_BIOMASA'
}

/**
 * Opciones de búsqueda específicas para infraestructuras energéticas
 */
export interface EnergySearchOptions extends WFSSearchOptions {
  /** Tipo de infraestructura energética */
  facilityType?: EnergyFacilityType;
  /** Nivel de tensión (kV) para subestaciones */
  voltageLevel?: number;
  /** Potencia mínima instalada (MW) */
  minPower?: number;
}

/**
 * Geocodificador especializado para infraestructuras energéticas andaluzas
 * 
 * Precisión esperada: ±10-20m (coordenadas oficiales AAE)
 * Cobertura: ~2,000 infraestructuras energéticas
 * 
 * @example
 * ```typescript
 * const geocoder = new WFSEnergyGeocoder();
 * const result = await geocoder.geocode({
 *   name: 'Subestación Peligros',
 *   municipality: 'Peligros',
 *   province: 'Granada'
 * });
 * // result.confidence >= 80 (match oficial AAE)
 * ```
 */
export class WFSEnergyGeocoder extends WFSBaseGeocoder {
  
  // Mapeo de tipos a capas WFS
  private readonly LAYER_MAP: Record<EnergyFacilityType, string> = {
    [EnergyFacilityType.SUBSTATION]: 'subestaciones_electricas',
    [EnergyFacilityType.TRANSFORMER]: 'centros_transformacion',
    [EnergyFacilityType.GAS_STATION]: 'infraestructura_gas',
    [EnergyFacilityType.POWER_PLANT]: 'centrales_generacion',
    [EnergyFacilityType.WIND_FARM]: 'parques_eolicos',
    [EnergyFacilityType.SOLAR_PLANT]: 'plantas_fotovoltaicas',
    [EnergyFacilityType.BIOMASS_PLANT]: 'plantas_biomasa'
  };

  /**
   * Configuración específica para WFS Agencia Andaluza Energía
   */
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      wfsEndpoint: 'https://www.agenciaandaluzadelaenergia.es/mapwms/wfs',
      layerName: 'subestaciones_electricas', // Capa por defecto
      fuzzyThreshold: 0.4, // Threshold más permisivo (nombres técnicos)
      timeout: 15000,
      outputSRS: 'EPSG:25830'
    };
  }

  /**
   * Parsea feature GeoJSON de AAE
   * 
   * Estructura esperada:
   * {
   *   type: "Feature",
   *   geometry: { type: "Point", coordinates: [x, y] },
   *   properties: {
   *     DENOMINACION: "SET Peligros 220/66 kV",
   *     MUNICIPIO: "Peligros",
   *     PROVINCIA: "Granada",
   *     TENSION_KV: 220,
   *     POTENCIA_MW: 150,
   *     PROPIETARIO: "Red Eléctrica",
   *     ESTADO: "En servicio"
   *   }
   * }
   */
  protected parseFeature(feature: any): WFSFeature | null {
    try {
      const props = feature.properties || {};
      const geom = feature.geometry;

      // Validar geometría
      if (!geom || !Array.isArray(geom.coordinates)) {
        console.warn('Feature energética sin geometría válida:', feature.id);
        return null;
      }

      // Manejar geometría Point o el centroide de polígonos
      let x: number, y: number;
      
      if (geom.type === 'Point') {
        [x, y] = geom.coordinates;
      } else if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
        // Calcular centroide aproximado
        const coords = geom.type === 'Polygon' 
          ? geom.coordinates[0] 
          : geom.coordinates[0][0];
        
        const sumX = coords.reduce((sum: number, c: number[]) => sum + c[0], 0);
        const sumY = coords.reduce((sum: number, c: number[]) => sum + c[1], 0);
        x = sumX / coords.length;
        y = sumY / coords.length;
      } else {
        console.warn('Tipo de geometría no soportado:', geom.type);
        return null;
      }

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
        address: props.DIRECCION || '',
        properties: {
          type: props.TIPO || '',
          voltage: props.TENSION_KV || props.TENSION,
          power: props.POTENCIA_MW || props.POTENCIA,
          turbines: props.NUM_AEROGENERADORES,
          area: props.SUPERFICIE_HA,
          owner: props.PROPIETARIO || props.TITULAR,
          status: props.ESTADO || '',
          year: props.ANNO_PUESTA_SERVICIO || props.ANNO,
          technology: props.TECNOLOGIA || '',
          ...props
        }
      };
    } catch (error) {
      console.error('Error parseando feature energética:', error);
      return null;
    }
  }

  /**
   * Construye filtro CQL específico para infraestructuras energéticas
   */
  protected buildCQLFilter(options: EnergySearchOptions): string {
    const filters: string[] = [];

    // Filtro base
    const baseFilter = super.buildCQLFilter(options);
    if (baseFilter) {
      filters.push(baseFilter);
    }

    // Filtro por nivel de tensión
    if (options.voltageLevel) {
      filters.push(`TENSION_KV >= ${options.voltageLevel}`);
    }

    // Filtro por potencia mínima
    if (options.minPower) {
      filters.push(`POTENCIA_MW >= ${options.minPower}`);
    }

    return filters.length > 0 ? filters.join(' AND ') : '';
  }

  /**
   * Detecta tipo de infraestructura energética por nombre
   */
  private detectFacilityType(name: string): EnergyFacilityType {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('subestación') || nameLower.includes('set ') || 
        nameLower.includes('s.e.t.') || nameLower.includes('subestacion')) {
      return EnergyFacilityType.SUBSTATION;
    }
    if (nameLower.includes('centro de transformación') || nameLower.includes('ct ') ||
        nameLower.includes('transformador')) {
      return EnergyFacilityType.TRANSFORMER;
    }
    if (nameLower.includes('gas') || nameLower.includes('erm') || 
        nameLower.includes('gasoducto') || nameLower.includes('reguladora')) {
      return EnergyFacilityType.GAS_STATION;
    }
    if (nameLower.includes('parque eólico') || nameLower.includes('eólico') ||
        nameLower.includes('aerogenerador') || nameLower.startsWith('pe ')) {
      return EnergyFacilityType.WIND_FARM;
    }
    if (nameLower.includes('fotovoltaica') || nameLower.includes('solar') ||
        nameLower.includes('huerto solar')) {
      return EnergyFacilityType.SOLAR_PLANT;
    }
    if (nameLower.includes('biomasa') || nameLower.includes('cogeneración')) {
      return EnergyFacilityType.BIOMASS_PLANT;
    }
    if (nameLower.includes('central') || nameLower.includes('generación')) {
      return EnergyFacilityType.POWER_PLANT;
    }
    
    return EnergyFacilityType.SUBSTATION; // Default
  }

  /**
   * Geocodifica con selección automática de capa según nombre
   */
  public async geocodeWithAutoLayer(options: EnergySearchOptions): Promise<GeocodingResult | null> {
    // Detectar tipo y seleccionar capa
    const detectedType = options.facilityType || this.detectFacilityType(options.name);
    const detectedLayer = this.LAYER_MAP[detectedType];
    this.config.layerName = detectedLayer;

    // Intentar con la capa detectada
    let result = await this.geocode(options);
    
    if (result && result.confidence >= 70) {
      return result;
    }

    // Si no encuentra, probar otras capas principales
    const layersToTry = [
      'subestaciones_electricas',
      'parques_eolicos',
      'plantas_fotovoltaicas',
      'centrales_generacion',
      'infraestructura_gas'
    ];
    
    for (const layer of layersToTry) {
      if (layer === detectedLayer) continue;
      
      this.config.layerName = layer;
      result = await this.geocode(options);
      
      if (result && result.confidence >= 70) {
        return result;
      }
    }

    // Restaurar capa por defecto
    this.config.layerName = 'subestaciones_electricas';
    return result;
  }

  /**
   * Obtiene todas las infraestructuras energéticas de un municipio
   */
  public async getAllFacilitiesInMunicipality(
    municipality: string,
    province?: string
  ): Promise<WFSFeature[]> {
    const allFeatures: WFSFeature[] = [];
    const layers = [
      'subestaciones_electricas',
      'parques_eolicos',
      'plantas_fotovoltaicas',
      'centrales_generacion',
      'plantas_biomasa'
    ];

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
    this.config.layerName = 'subestaciones_electricas';
    return allFeatures;
  }

  /**
   * Busca subestaciones por nivel de tensión
   */
  public async findSubstationsByVoltage(
    municipality: string,
    minVoltage: number
  ): Promise<WFSFeature[]> {
    this.config.layerName = 'subestaciones_electricas';
    
    try {
      const params = this.buildWFSParams({
        name: '',
        municipality,
        maxResults: 50
      });
      
      // Añadir filtro de tensión
      if (params['CQL_FILTER']) {
        params['CQL_FILTER'] += ` AND TENSION_KV >= ${minVoltage}`;
      } else {
        params['CQL_FILTER'] = `TENSION_KV >= ${minVoltage}`;
      }

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      return this.parseResponse(response.data);

    } catch (error) {
      console.error('Error buscando subestaciones por tensión:', error);
      return [];
    }
  }
}

export default WFSEnergyGeocoder;
