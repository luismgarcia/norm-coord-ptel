/**
 * Geocodificador usando CDAU (Callejero Digital de Andalucía Unificado)
 * 
 * Proporciona geocodificación de alta precisión para direcciones andaluzas.
 * Preferido sobre CartoCiudad para Andalucía por:
 * - Coordenadas nativas UTM30 ETRS89 (sin transformación)
 * - Precisión a nivel de portal/edificio
 * - Actualización más frecuente para Andalucía
 * 
 * Cobertura: 786 municipios andaluces
 * Formato: WFS 2.0 / GeoJSON
 * 
 * @module services/geocoding/generic
 */

import axios, { AxiosInstance } from 'axios';
import { FastFuzzy } from '../../../lib/fuzzySearch';
import { GeocodingResult } from '../../../types/infrastructure';

/**
 * Respuesta de CDAU WFS
 */
interface CDAUFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    INE_MUN?: string;
    MUNICIPIO?: string;
    PROVINCIA?: string;
    TIPO_VIA?: string;
    NOMBRE_VIA?: string;
    NUM_PORTAL?: number | string;
    COD_POSTAL?: string;
    X_ETRS89?: number;
    Y_ETRS89?: number;
    [key: string]: any;
  };
}

/**
 * Opciones para geocodificación CDAU
 */
export interface CDAUSearchOptions {
  /** Nombre de calle o dirección */
  street: string;
  /** Número de portal (opcional) */
  portalNumber?: string | number;
  /** Municipio (CRÍTICO para filtrado) */
  municipality: string;
  /** Provincia */
  province?: string;
  /** Máximo de resultados */
  maxResults?: number;
}

/**
 * Estadísticas del geocodificador
 */
interface CDAUStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  avgResponseTime: number;
}

/**
 * Geocodificador CDAU para Andalucía
 * 
 * @example
 * ```typescript
 * const geocoder = new CDAUGeocoder();
 * 
 * const result = await geocoder.geocode({
 *   street: 'Gran Vía',
 *   portalNumber: 1,
 *   municipality: 'Granada',
 *   province: 'Granada'
 * });
 * ```
 */
export class CDAUGeocoder {
  // WFS endpoint - puede requerir proxy por CORS
  private readonly WFS_ENDPOINT = 'https://www.callejerodeandalucia.es/services/cdau/wfs';
  
  // Endpoint alternativo via API REST de datos abiertos
  private readonly API_ENDPOINT = 'https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/datastore_search';
  private readonly RESOURCE_ID = 'cdau-portales'; // Verificar ID correcto
  
  private axiosInstance: AxiosInstance;
  private cache: Map<string, GeocodingResult>;
  private stats: CDAUStats;
  
  constructor() {
    this.axiosInstance = axios.create({
      timeout: 15000,
      headers: {
        'Accept': 'application/json, application/xml',
        'User-Agent': 'PTEL-Normalizer/1.0 (Granada Municipality)'
      }
    });
    
    this.cache = new Map();
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      avgResponseTime: 0
    };
  }

  /**
   * Geocodifica una dirección usando CDAU
   */
  public async geocode(options: CDAUSearchOptions): Promise<GeocodingResult | null> {
    const cacheKey = this.buildCacheKey(options);
    const startTime = Date.now();
    
    this.stats.totalRequests++;
    
    // Verificar caché
    if (this.cache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.cache.get(cacheKey) || null;
    }

    try {
      // Intentar WFS primero
      let result = await this.geocodeViaWFS(options);
      
      // Si falla WFS, intentar API REST
      if (!result) {
        result = await this.geocodeViaAPI(options);
      }

      if (result) {
        this.cache.set(cacheKey, result);
        this.stats.successfulRequests++;
      } else {
        this.stats.failedRequests++;
      }

      // Actualizar tiempo promedio
      const responseTime = Date.now() - startTime;
      this.stats.avgResponseTime = 
        (this.stats.avgResponseTime * (this.stats.totalRequests - 1) + responseTime) / 
        this.stats.totalRequests;

      return result;

    } catch (error) {
      console.error('Error en CDAU geocoder:', error);
      this.stats.failedRequests++;
      return null;
    }
  }

  /**
   * Geocodificación via WFS
   */
  private async geocodeViaWFS(options: CDAUSearchOptions): Promise<GeocodingResult | null> {
    try {
      // Construir filtro CQL
      const cqlFilter = this.buildCQLFilter(options);
      
      const params = new URLSearchParams({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeName: 'cdau_portal',
        outputFormat: 'application/json',
        srsName: 'EPSG:25830',
        maxFeatures: String(options.maxResults || 50),
        CQL_FILTER: cqlFilter
      });

      const response = await this.axiosInstance.get(`${this.WFS_ENDPOINT}?${params.toString()}`);
      
      if (!response.data?.features?.length) {
        return null;
      }

      // Aplicar fuzzy matching para encontrar mejor resultado
      const features = response.data.features as CDAUFeature[];
      const bestMatch = this.findBestMatch(options.street, features);

      if (!bestMatch) {
        return null;
      }

      return this.featureToResult(bestMatch.feature, bestMatch.score, options);

    } catch (error) {
      // WFS puede fallar por CORS - silenciar y probar API
      console.warn('CDAU WFS failed, trying API:', error);
      return null;
    }
  }

  /**
   * Geocodificación via API REST de datos abiertos
   */
  private async geocodeViaAPI(options: CDAUSearchOptions): Promise<GeocodingResult | null> {
    try {
      const filters: Record<string, string> = {
        MUNICIPIO: options.municipality.toUpperCase()
      };

      const params = new URLSearchParams({
        resource_id: this.RESOURCE_ID,
        filters: JSON.stringify(filters),
        q: options.street,
        limit: String(options.maxResults || 50)
      });

      const response = await this.axiosInstance.get(`${this.API_ENDPOINT}?${params.toString()}`);

      if (!response.data?.success || !response.data?.result?.records?.length) {
        return null;
      }

      // Convertir records a features
      const records = response.data.result.records;
      const features: CDAUFeature[] = records.map((r: any) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            parseFloat(r.X_ETRS89 || r.x_etrs89 || 0),
            parseFloat(r.Y_ETRS89 || r.y_etrs89 || 0)
          ]
        },
        properties: r
      })).filter((f: CDAUFeature) => 
        f.geometry.coordinates[0] !== 0 && f.geometry.coordinates[1] !== 0
      );

      if (features.length === 0) {
        return null;
      }

      const bestMatch = this.findBestMatch(options.street, features);
      
      if (!bestMatch) {
        return null;
      }

      return this.featureToResult(bestMatch.feature, bestMatch.score, options);

    } catch (error) {
      console.warn('CDAU API failed:', error);
      return null;
    }
  }

  /**
   * Construye filtro CQL para WFS
   */
  private buildCQLFilter(options: CDAUSearchOptions): string {
    const filters: string[] = [];

    // Filtro por municipio (obligatorio)
    filters.push(`MUNICIPIO ILIKE '%${this.escapeCQL(options.municipality)}%'`);

    // Filtro por provincia si está disponible
    if (options.province) {
      filters.push(`PROVINCIA ILIKE '%${this.escapeCQL(options.province)}%'`);
    }

    // Filtro por nombre de vía
    if (options.street) {
      filters.push(`NOMBRE_VIA ILIKE '%${this.escapeCQL(options.street)}%'`);
    }

    // Filtro por número de portal
    if (options.portalNumber) {
      filters.push(`NUM_PORTAL = '${options.portalNumber}'`);
    }

    return filters.join(' AND ');
  }

  /**
   * Escapa caracteres especiales para CQL
   */
  private escapeCQL(text: string): string {
    return text.replace(/'/g, "''");
  }

  /**
   * Encuentra el mejor match usando fuzzy matching
   */
  private findBestMatch(
    searchStreet: string,
    features: CDAUFeature[]
  ): { feature: CDAUFeature; score: number } | null {
    if (features.length === 0) return null;

    // Preparar datos para FastFuzzy (uFuzzy)
    const items = features.map(f => ({
      feature: f,
      name: f.properties.NOMBRE_VIA || ''
    }));

    const fuzzy = new FastFuzzy(items, {
      keys: ['name'],
      threshold: 0.6  // FastFuzzy: menor = más estricto
    });

    const results = fuzzy.search(searchStreet);

    if (results.length === 0) {
      // Si no hay match, devolver el primero
      return { feature: features[0], score: 0.5 };
    }

    const best = results[0];
    return {
      feature: best.item.feature,
      score: 1 - best.score
    };
  }

  /**
   * Convierte feature CDAU a resultado de geocodificación
   */
  private featureToResult(
    feature: CDAUFeature,
    score: number,
    options: CDAUSearchOptions
  ): GeocodingResult {
    const props = feature.properties;
    const coords = feature.geometry.coordinates;

    // Usar coordenadas de properties si están disponibles (más precisas)
    const x = props.X_ETRS89 || coords[0];
    const y = props.Y_ETRS89 || coords[1];

    // Calcular confianza
    let confidence = Math.round(score * 100);
    
    // Bonus si coincide el número de portal
    if (options.portalNumber && 
        String(props.NUM_PORTAL) === String(options.portalNumber)) {
      confidence = Math.min(confidence + 10, 98);
    }

    // Construir dirección completa
    const addressParts: string[] = [];
    if (props.TIPO_VIA) addressParts.push(props.TIPO_VIA);
    if (props.NOMBRE_VIA) addressParts.push(props.NOMBRE_VIA);
    if (props.NUM_PORTAL) addressParts.push(String(props.NUM_PORTAL));

    return {
      x,
      y,
      confidence,
      source: 'CDAU',
      sourceLayer: 'cdau_portal',
      matchedName: props.NOMBRE_VIA || '',
      matchType: props.NUM_PORTAL ? 'portal' : 'street',
      fuzzyScore: score,
      address: addressParts.join(' '),
      municipality: props.MUNICIPIO,
      province: props.PROVINCIA,
      metadata: {
        ineMun: props.INE_MUN,
        postalCode: props.COD_POSTAL,
        streetType: props.TIPO_VIA
      }
    };
  }

  /**
   * Construye clave de caché
   */
  private buildCacheKey(options: CDAUSearchOptions): string {
    return `${options.street}|${options.portalNumber || ''}|${options.municipality}|${options.province || ''}`.toLowerCase();
  }

  /**
   * Limpia la caché
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Obtiene estadísticas
   */
  public getStats(): CDAUStats & { cacheSize: number; endpoint: string } {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      endpoint: this.WFS_ENDPOINT
    };
  }

  /**
   * Resetea estadísticas
   */
  public resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      avgResponseTime: 0
    };
  }
}

export default CDAUGeocoder;