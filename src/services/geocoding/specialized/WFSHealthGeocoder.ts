/**
 * Geocodificador especializado para infraestructuras sanitarias de Andalucía
 * 
 * Conecta con servicios WFS de IECA/DERA para acceder a:
 * - SICESS: Sistema de Información de Centros Sanitarios (1,500+ centros)
 * - SAS: Servicio Andaluz de Salud
 * 
 * Fuentes oficiales:
 * - WFS DERA G12: https://www.ideandalucia.es/services/DERA_g12_servicios/wfs
 * - Capas: g12_01_CentroSalud, g12_02_Hospital, g12_03_Consultorio
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
 * Tipos de centros sanitarios en Andalucía
 */
export enum HealthFacilityType {
  /** Centros de Salud (~400 en Andalucía) */
  HEALTH_CENTER = 'CENTRO_SALUD',
  
  /** Hospitales (~40 en Andalucía) */
  HOSPITAL = 'HOSPITAL',
  
  /** Consultorios locales (~1,000 en Andalucía) */
  CONSULTORIO = 'CONSULTORIO',
  
  /** Ambulatorios */
  AMBULATORIO = 'AMBULATORIO'
}

/**
 * Opciones de búsqueda específicas para sanitarios
 */
export interface HealthSearchOptions extends WFSSearchOptions {
  /** Tipo de centro sanitario a buscar */
  facilityType?: HealthFacilityType;
  
  /** Distrito sanitario (Almería, Granada, etc) */
  healthDistrict?: string;
}

/**
 * Geocodificador especializado para centros sanitarios andaluces
 * 
 * Precisión esperada: ±2-10m (coordenadas oficiales SAS)
 * Cobertura: ~1,500 infraestructuras sanitarias
 * 
 * @example
 * ```typescript
 * const geocoder = new WFSHealthGeocoder();
 * const result = await geocoder.geocode({
 *   name: 'Centro de Salud San Antón',
 *   municipality: 'Granada',
 *   province: 'Granada'
 * });
 * // result.confidence >= 85 (match oficial SAS)
 * ```
 */
export class WFSHealthGeocoder extends WFSBaseGeocoder {
  
  /**
   * Configuración específica para servicios WFS sanitarios de IECA
   */
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      wfsEndpoint: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wfs',
      layerName: 'g12_01_CentroSalud', // Capa por defecto: Centros de Salud
      fuzzyThreshold: 0.3, // Threshold permisivo para variaciones nombre
      timeout: 15000, // 15s para WFS IECA
      outputSRS: 'EPSG:25830' // UTM30 ETRS89
    };
  }

  /**
   * Parsea feature GeoJSON de DERA G12 a formato interno
   * 
   * Estructura esperada de DERA G12:
   * {
   *   type: "Feature",
   *   geometry: { type: "Point", coordinates: [x, y] },
   *   properties: {
   *     DENOMINACION: "Centro de Salud San Antón",
   *     MUNICIPIO: "Granada",
   *     PROVINCIA: "Granada",
   *     DIRECCION: "Calle San Antón 72",
   *     TIPO_CENTRO: "Centro de Salud",
   *     DISTRITO_SANITARIO: "Granada"
   *   }
   * }
   */
  protected parseFeature(feature: any): WFSFeature | null {
    try {
      const props = feature.properties || {};
      const geom = feature.geometry;

      // Validar geometría
      if (!geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates)) {
        console.warn('Feature sin geometría válida:', feature.id);
        return null;
      }

      const [x, y] = geom.coordinates;

      // Validar coordenadas en rango UTM30 Andalucía
      if (x < 100000 || x > 800000 || y < 4000000 || y > 4300000) {
        console.warn('Coordenadas fuera de rango UTM30 Andalucía:', x, y);
        return null;
      }

      return {
        name: props.DENOMINACION || props.NOMBRE || '',
        x,
        y,
        municipality: props.MUNICIPIO || '',
        province: props.PROVINCIA || '',
        address: props.DIRECCION || props.DOMICILIO || '',
        properties: {
          facilityType: props.TIPO_CENTRO || '',
          healthDistrict: props.DISTRITO_SANITARIO || '',
          phone: props.TELEFONO || '',
          ...props
        }
      };
    } catch (error) {
      console.error('Error parseando feature sanitaria:', error);
      return null;
    }
  }

  /**
   * Construye filtro CQL específico para centros sanitarios
   * Sobrescribe método base para agregar filtros específicos de salud
   */
  protected buildCQLFilter(options: HealthSearchOptions): string {
    const filters: string[] = [];

    // Filtro base (municipio, provincia)
    const baseFilter = super.buildCQLFilter(options);
    if (baseFilter) {
      filters.push(baseFilter);
    }

    // Filtro por tipo de centro sanitario
    if (options.facilityType) {
      const typeMap: Record<HealthFacilityType, string> = {
        [HealthFacilityType.HEALTH_CENTER]: 'Centro de Salud',
        [HealthFacilityType.HOSPITAL]: 'Hospital',
        [HealthFacilityType.CONSULTORIO]: 'Consultorio',
        [HealthFacilityType.AMBULATORIO]: 'Ambulatorio'
      };
      const typeValue = typeMap[options.facilityType];
      filters.push(`TIPO_CENTRO ILIKE '%${this.escapeCQL(typeValue)}%'`);
    }

    // Filtro por distrito sanitario
    if (options.healthDistrict) {
      filters.push(`DISTRITO_SANITARIO ILIKE '%${this.escapeCQL(options.healthDistrict)}%'`);
    }

    return filters.length > 0 ? filters.join(' AND ') : '';
  }

  /**
   * Geocodifica cambiando automáticamente entre capas según tipo detectado
   * 
   * Estrategia:
   * 1. Intenta con capa principal (g12_01_CentroSalud)
   * 2. Si falla y detecta "hospital" en nombre, intenta g12_02_Hospital
   * 3. Si falla y detecta "consultorio", intenta g12_03_Consultorio
   */
  public async geocodeWithAutoLayer(options: HealthSearchOptions) {
    // Intento 1: Capa por defecto (Centros de Salud)
    let result = await this.geocode(options);
    if (result && result.confidence >= 70) {
      return result;
    }

    // Detectar tipo en nombre para elegir capa alternativa
    const nameLower = options.name.toLowerCase();

    // Intento 2: Hospitales
    if (nameLower.includes('hospital') || nameLower.includes('clínica')) {
      this.config.layerName = 'g12_02_Hospital';
      result = await this.geocode(options);
      if (result && result.confidence >= 70) {
        this.config.layerName = 'g12_01_CentroSalud'; // Restaurar
        return result;
      }
    }

    // Intento 3: Consultorios
    if (nameLower.includes('consultorio') || nameLower.includes('ambulatorio')) {
      this.config.layerName = 'g12_03_Consultorio';
      result = await this.geocode(options);
      if (result && result.confidence >= 70) {
        this.config.layerName = 'g12_01_CentroSalud'; // Restaurar
        return result;
      }
    }

    // Restaurar capa por defecto
    this.config.layerName = 'g12_01_CentroSalud';
    return result; // Retorna último intento (puede ser null)
  }

  /**
   * Obtiene todos los centros sanitarios de un municipio
   * Útil para pre-caching de municipios completos
   * 
   * @param municipality - Nombre del municipio
   * @param province - Nombre de la provincia
   * @returns Array de features sanitarias del municipio
   */
  public async getAllFacilitiesInMunicipality(
    municipality: string,
    province?: string
  ): Promise<WFSFeature[]> {
    try {
      const params = this.buildWFSParams({
        name: '', // Sin filtro por nombre
        municipality,
        province,
        maxResults: 500 // Aumentar límite para municipios grandes
      });

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      return this.parseResponse(response.data);

    } catch (error) {
      console.error(`Error obteniendo centros sanitarios de ${municipality}:`, error);
      return [];
    }
  }

  /**
   * Valida que unas coordenadas correspondan a un centro sanitario oficial
   * Útil para verificar coordenadas existentes en PTEL
   * 
   * @param x - Coordenada X (Este) en EPSG:25830
   * @param y - Coordenada Y (Norte) en EPSG:25830
   * @param radius - Radio de búsqueda en metros (default: 500m)
   * @returns Centro sanitario más cercano o null
   */
  public async validateCoordinates(
    x: number,
    y: number,
    radius: number = 500
  ): Promise<WFSFeature | null> {
    try {
      // Calcular BBOX alrededor del punto
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
      console.error('Error validando coordenadas sanitarias:', error);
      return null;
    }
  }
}
