/**
 * Geocodificador para el Inventario Andaluz de Instalaciones Deportivas (IAID)
 * 
 * El IAID, regulado por Decreto 48/2022, es la fuente oficial para
 * equipamientos deportivos en Andalucía con ~3,500 instalaciones.
 * 
 * CRÍTICO para localizar:
 * - Piscinas municipales
 * - Campos de fútbol
 * - Polideportivos
 * - Pabellones cubiertos
 * - Pistas de atletismo
 * - Frontones
 * - Otras instalaciones deportivas
 * 
 * Acceso:
 * - Visor web: https://www.juntadeandalucia.es/deporte/Censo_Andalucia/
 * - API REST: https://www.juntadeandalucia.es/datosabiertos/portal/dataset/censo-de-instalaciones-deportivas
 * - WFS DERA G12: https://www.ideandalucia.es/services/DERA_g12_servicios/wfs (capa g12_06_Deportivo)
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
 * Tipos de instalaciones deportivas
 */
export enum SportsFacilityType {
  /** Piscinas (cubiertas y descubiertas) */
  SWIMMING_POOL = 'PISCINA',
  
  /** Campos de fútbol (césped natural/artificial) */
  FOOTBALL_FIELD = 'CAMPO_FUTBOL',
  
  /** Polideportivos y pabellones */
  SPORTS_CENTER = 'POLIDEPORTIVO',
  
  /** Pistas de pádel */
  PADEL_COURT = 'PADEL',
  
  /** Pistas de tenis */
  TENNIS_COURT = 'TENIS',
  
  /** Frontones */
  FRONTON = 'FRONTON',
  
  /** Pistas de atletismo */
  ATHLETICS_TRACK = 'ATLETISMO',
  
  /** Gimnasios */
  GYM = 'GIMNASIO',
  
  /** Cualquier tipo */
  ANY = '*'
}

/**
 * Opciones específicas de búsqueda en IAID
 */
export interface IAIDSearchOptions extends WFSSearchOptions {
  /** Filtrar por tipo de instalación */
  facilityType?: SportsFacilityType;
  
  /** Solo instalaciones municipales (públicas) */
  onlyPublic?: boolean;
}

/**
 * Geocodificador del Inventario Andaluz de Instalaciones Deportivas
 * 
 * Estrategia de búsqueda en cascada:
 * 1. WFS DERA G12 (capa g12_06_Deportivo) - más rápido
 * 2. API REST datos abiertos - más completo
 * 
 * Precisión esperada: ±5-20m (coordenadas de parcela/edificio)
 * Cobertura: ~3,500 instalaciones deportivas en Andalucía
 * 
 * @example
 * ```typescript
 * const geocoder = new IAIDGeocoder();
 * 
 * // Buscar piscina municipal
 * const piscina = await geocoder.geocode({
 *   name: 'Piscina Municipal',
 *   municipality: 'Colomera',
 *   province: 'Granada',
 *   facilityType: SportsFacilityType.SWIMMING_POOL
 * });
 * 
 * // Buscar campo de fútbol
 * const campo = await geocoder.geocode({
 *   name: 'Campo de Fútbol',
 *   municipality: 'Colomera'
 * });
 * ```
 */
export class IAIDGeocoder extends WFSBaseGeocoder {
  
  /**
   * URL de la API REST de datos abiertos (fallback)
   */
  private static readonly API_REST_URL = 'https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/datastore_search';
  
  /**
   * ID del dataset en el portal de datos abiertos
   */
  private static readonly DATASET_ID = 'censo-instalaciones-deportivas';

  /**
   * Patrones para detectar tipos de instalación
   */
  private static readonly FACILITY_PATTERNS: Record<SportsFacilityType, RegExp> = {
    [SportsFacilityType.SWIMMING_POOL]: /\b(piscina|nataci[oó]n|vaso|acuático)\b/i,
    [SportsFacilityType.FOOTBALL_FIELD]: /\b(f[uú]tbol|campo|estadio(?!\s+de\s+atletismo)|césped)\b/i,
    [SportsFacilityType.SPORTS_CENTER]: /\b(polideportivo|pabellón|pabell[oó]n|complejo deportivo|centro deportivo)\b/i,
    [SportsFacilityType.PADEL_COURT]: /\b(p[aá]del|padel)\b/i,
    [SportsFacilityType.TENNIS_COURT]: /\b(tenis|tennis)\b/i,
    [SportsFacilityType.FRONTON]: /\b(front[oó]n|pelota)\b/i,
    [SportsFacilityType.ATHLETICS_TRACK]: /\b(atletismo|pista|tartán)\b/i,
    [SportsFacilityType.GYM]: /\b(gimnasio|gym|fitness)\b/i,
    [SportsFacilityType.ANY]: /.*/
  };

  /**
   * Configuración específica para WFS DERA G12 (Deportivo)
   */
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      wfsEndpoint: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wfs',
      layerName: 'g12_06_Deportivo',
      fuzzyThreshold: 0.35, // Permisivo para variaciones como "Piscina Municipal"
      timeout: 15000,
      outputSRS: 'EPSG:25830'
    };
  }

  /**
   * Parsea feature GeoJSON de DERA G12 (Deportivo)
   */
  protected parseFeature(feature: any): WFSFeature | null {
    try {
      const props = feature.properties || {};
      const geom = feature.geometry;

      if (!geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates)) {
        return null;
      }

      const [x, y] = geom.coordinates;

      // Validar coordenadas UTM30 Andalucía
      if (x < 100000 || x > 800000 || y < 4000000 || y > 4300000) {
        return null;
      }

      return {
        name: props.DENOMINACION || props.NOMBRE || props.INSTALACION || '',
        x,
        y,
        municipality: props.MUNICIPIO || '',
        province: props.PROVINCIA || '',
        address: props.DIRECCION || props.DOMICILIO || props.LOCALIZACION || '',
        properties: {
          facilityType: props.TIPO_INSTALACION || props.TIPO || '',
          owner: props.TITULAR || props.TITULARIDAD || '',
          surface: props.SUPERFICIE || '',
          capacity: props.AFORO || '',
          ...props
        }
      };
    } catch (error) {
      console.error('Error parseando feature IAID:', error);
      return null;
    }
  }

  /**
   * Construye filtro CQL específico para instalaciones deportivas
   */
  protected buildCQLFilter(options: IAIDSearchOptions): string {
    const filters: string[] = [];

    // Filtros base
    if (options.municipality) {
      filters.push(`MUNICIPIO ILIKE '%${this.escapeCQL(options.municipality)}%'`);
    }

    if (options.province) {
      filters.push(`PROVINCIA ILIKE '%${this.escapeCQL(options.province)}%'`);
    }

    // Filtro por tipo de instalación
    if (options.facilityType && options.facilityType !== SportsFacilityType.ANY) {
      const typeMapping: Record<SportsFacilityType, string[]> = {
        [SportsFacilityType.SWIMMING_POOL]: ['Piscina', 'Natación', 'Vaso'],
        [SportsFacilityType.FOOTBALL_FIELD]: ['Fútbol', 'Campo', 'Estadio'],
        [SportsFacilityType.SPORTS_CENTER]: ['Polideportivo', 'Pabellón', 'Complejo'],
        [SportsFacilityType.PADEL_COURT]: ['Pádel', 'Padel'],
        [SportsFacilityType.TENNIS_COURT]: ['Tenis'],
        [SportsFacilityType.FRONTON]: ['Frontón'],
        [SportsFacilityType.ATHLETICS_TRACK]: ['Atletismo', 'Pista'],
        [SportsFacilityType.GYM]: ['Gimnasio'],
        [SportsFacilityType.ANY]: []
      };

      const types = typeMapping[options.facilityType];
      if (types.length > 0) {
        const typeFilters = types.map(t => 
          `TIPO_INSTALACION ILIKE '%${this.escapeCQL(t)}%'`
        );
        filters.push(`(${typeFilters.join(' OR ')})`);
      }
    }

    // Filtro por titularidad pública
    if (options.onlyPublic) {
      filters.push(`(TITULAR ILIKE '%municipal%' OR TITULAR ILIKE '%público%' OR TITULAR ILIKE '%ayuntamiento%')`);
    }

    return filters.length > 0 ? filters.join(' AND ') : '';
  }

  /**
   * Detecta automáticamente el tipo de instalación desde el nombre
   */
  public detectFacilityType(name: string): SportsFacilityType {
    for (const [type, pattern] of Object.entries(IAIDGeocoder.FACILITY_PATTERNS)) {
      if (type !== SportsFacilityType.ANY && pattern.test(name)) {
        return type as SportsFacilityType;
      }
    }
    return SportsFacilityType.ANY;
  }

  /**
   * Geocodifica usando WFS primero, y API REST como fallback
   */
  public async geocodeWithFallback(options: IAIDSearchOptions): Promise<GeocodingResult | null> {
    // Detectar tipo si no se especificó
    if (!options.facilityType) {
      options.facilityType = this.detectFacilityType(options.name);
    }

    // Intento 1: WFS DERA G12
    let result = await this.geocode(options);
    
    if (result && result.confidence >= 65) {
      return result;
    }

    // Intento 2: Búsqueda más amplia sin tipo específico
    if (options.facilityType !== SportsFacilityType.ANY) {
      const broadOptions = { ...options, facilityType: SportsFacilityType.ANY };
      result = await this.geocode(broadOptions);
      
      if (result && result.confidence >= 65) {
        return result;
      }
    }

    // Intento 3: API REST datos abiertos (si WFS falla)
    // Nota: La API REST puede requerir configuración adicional
    // Por ahora, retornamos el mejor resultado del WFS
    
    return result;
  }

  /**
   * Busca todas las instalaciones deportivas de un municipio
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
        maxResults: 200
      });

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      return this.parseResponse(response.data);

    } catch (error) {
      console.error(`Error obteniendo instalaciones deportivas de ${municipality}:`, error);
      return [];
    }
  }

  /**
   * Busca piscinas específicamente (método de conveniencia)
   */
  public async findSwimmingPools(
    municipality: string,
    province?: string
  ): Promise<WFSFeature[]> {
    try {
      const options: IAIDSearchOptions = {
        name: '',
        municipality,
        province,
        facilityType: SportsFacilityType.SWIMMING_POOL,
        maxResults: 50
      };

      const params = this.buildWFSParams(options);
      params['CQL_FILTER'] = this.buildCQLFilter(options);

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      return this.parseResponse(response.data);

    } catch (error) {
      console.error(`Error buscando piscinas en ${municipality}:`, error);
      return [];
    }
  }

  /**
   * Busca campos de fútbol específicamente (método de conveniencia)
   */
  public async findFootballFields(
    municipality: string,
    province?: string
  ): Promise<WFSFeature[]> {
    try {
      const options: IAIDSearchOptions = {
        name: '',
        municipality,
        province,
        facilityType: SportsFacilityType.FOOTBALL_FIELD,
        maxResults: 50
      };

      const params = this.buildWFSParams(options);
      params['CQL_FILTER'] = this.buildCQLFilter(options);

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      return this.parseResponse(response.data);

    } catch (error) {
      console.error(`Error buscando campos de fútbol en ${municipality}:`, error);
      return [];
    }
  }

  /**
   * Normaliza nombres de instalaciones deportivas para mejor matching
   * Ej: "Piscina Municipal Cubierta" → ["piscina municipal cubierta", "piscina municipal", "piscina"]
   */
  public normalizeNameVariants(name: string): string[] {
    const variants: string[] = [];
    
    const normalized = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    
    variants.push(normalized);

    // Sin adjetivos comunes
    const withoutAdjectives = normalized
      .replace(/\b(municipal|cubierta|cubierto|climatizada|descubierta|nuevo|nueva|viejo|vieja)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (withoutAdjectives !== normalized) {
      variants.push(withoutAdjectives);
    }

    // Solo el tipo genérico
    for (const [type, pattern] of Object.entries(IAIDGeocoder.FACILITY_PATTERNS)) {
      if (type !== SportsFacilityType.ANY) {
        const match = normalized.match(pattern);
        if (match) {
          variants.push(match[0].toLowerCase());
        }
      }
    }

    return [...new Set(variants)];
  }

  /**
   * Valida si unas coordenadas corresponden a una instalación deportiva
   */
  public async validateCoordinates(
    x: number,
    y: number,
    radius: number = 300
  ): Promise<WFSFeature | null> {
    try {
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
      console.error('Error validando coordenadas deportivas:', error);
      return null;
    }
  }
}
