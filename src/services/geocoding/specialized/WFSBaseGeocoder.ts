/**
 * Clase base abstracta para geocodificadores especializados vía WFS
 * 
 * Proporciona funcionalidad común para consultar servicios WFS de IECA, REDIAM, IAPH
 * y parsear respuestas GML/GeoJSON.
 * 
 * @module services/geocoding/specialized
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import Fuse from 'fuse.js';
import { GeocodingResult, SpecializedGeocoderConfig } from '../../../types/infrastructure';

/**
 * Feature GML parseada del WFS
 */
export interface WFSFeature {
  name: string;
  x: number;
  y: number;
  municipality?: string;
  province?: string;
  address?: string;
  properties: Record<string, any>;
}

/**
 * Opciones para búsqueda WFS
 */
export interface WFSSearchOptions {
  /** Nombre a buscar */
  name: string;
  
  /** Municipio para filtrar resultados */
  municipality?: string;
  
  /** Provincia para filtrar resultados */
  province?: string;
  
  /** BBOX para filtro espacial [minX, minY, maxX, maxY] */
  bbox?: [number, number, number, number];
  
  /** Límite de resultados */
  maxResults?: number;
}

/**
 * Clase base abstracta para geocodificadores especializados WFS
 * 
 * Subclases deben implementar:
 * - getDefaultConfig(): Configuración específica del servicio
 * - parseFeature(): Lógica de parseo específica del formato GML
 * - buildCQLFilter(): Construcción de filtros CQL específicos
 */
export abstract class WFSBaseGeocoder {
  protected config: SpecializedGeocoderConfig;
  protected axiosInstance: AxiosInstance;
  protected featureCache: Map<string, WFSFeature[]>;

  constructor(config?: Partial<SpecializedGeocoderConfig>) {
    this.config = {
      ...this.getDefaultConfig(),
      ...config
    };

    this.axiosInstance = axios.create({
      timeout: this.config.timeout,
      headers: {
        'Accept': 'application/json, application/xml, text/xml',
        'User-Agent': 'PTEL-Normalizer/1.0 (Granada Municipality)'
      }
    });

    this.featureCache = new Map();
  }

  /**
   * Configuración por defecto del servicio WFS específico
   * Debe ser implementado por cada geocodificador especializado
   */
  protected abstract getDefaultConfig(): SpecializedGeocoderConfig;

  /**
   * Parsea una feature GML/GeoJSON a formato interno
   * Debe ser implementado por cada geocodificador según estructura de datos
   */
  protected abstract parseFeature(feature: any): WFSFeature | null;

  /**
   * Construye filtro CQL específico para el servicio
   * Puede ser sobrescrito para lógica personalizada
   */
  protected buildCQLFilter(options: WFSSearchOptions): string {
    const filters: string[] = [];

    // Filtro por municipio si está disponible
    if (options.municipality) {
      filters.push(`MUNICIPIO ILIKE '%${this.escapeCQL(options.municipality)}%'`);
    }

    // Filtro por provincia si está disponible
    if (options.province) {
      filters.push(`PROVINCIA ILIKE '%${this.escapeCQL(options.province)}%'`);
    }

    // Filtro BBOX si está disponible
    if (options.bbox) {
      const [minX, minY, maxX, maxY] = options.bbox;
      filters.push(`BBOX(the_geom,${minX},${minY},${maxX},${maxY},'EPSG:25830')`);
    }

    return filters.length > 0 ? filters.join(' AND ') : '';
  }

  /**
   * Escapa caracteres especiales para CQL
   */
  protected escapeCQL(text: string): string {
    return text.replace(/'/g, "''");
  }

  /**
   * Geocodifica una infraestructura usando el servicio WFS especializado
   * 
   * @param options - Opciones de búsqueda (nombre, municipio, etc)
   * @returns Mejor resultado geocodificado o null si no hay matches
   */
  public async geocode(options: WFSSearchOptions): Promise<GeocodingResult | null> {
    try {
      // Construir URL de petición WFS GetFeature
      const params = this.buildWFSParams(options);
      
      // Realizar petición
      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });

      // Parsear features
      const features = this.parseResponse(response.data);

      if (features.length === 0) {
        return null;
      }

      // Aplicar fuzzy matching
      const bestMatch = this.findBestMatch(options.name, features);

      if (!bestMatch || bestMatch.score < this.config.fuzzyThreshold) {
        return null;
      }

      // Convertir a resultado de geocodificación
      return this.featureToGeocodingResult(bestMatch.feature, bestMatch.score, options.name);

    } catch (error) {
      console.error(`Error geocodificando vía WFS ${this.config.layerName}:`, error);
      return null;
    }
  }

  /**
   * Construye parámetros para petición WFS GetFeature
   */
  protected buildWFSParams(options: WFSSearchOptions): Record<string, string> {
    const params: Record<string, string> = {
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: this.config.layerName,
      outputFormat: 'application/json',
      srsName: this.config.outputSRS,
      maxFeatures: String(options.maxResults || 100)
    };

    // Agregar filtro CQL si existe
    const cqlFilter = this.buildCQLFilter(options);
    if (cqlFilter) {
      params['CQL_FILTER'] = cqlFilter;
    }

    return params;
  }

  /**
   * Parsea respuesta WFS (GeoJSON o GML)
   */
  protected parseResponse(data: any): WFSFeature[] {
    const features: WFSFeature[] = [];

    // Detectar formato de respuesta
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      // GeoJSON
      for (const feature of data.features) {
        const parsed = this.parseFeature(feature);
        if (parsed) {
          features.push(parsed);
        }
      }
    } else if (typeof data === 'string' && data.includes('gml:')) {
      // GML - requiere parsing XML
      // TODO: Implementar parser GML si es necesario
      console.warn('GML response detected but not implemented yet');
    }

    return features;
  }

  /**
   * Encuentra el mejor match usando fuzzy matching (Fuse.js)
   */
  protected findBestMatch(
    searchName: string, 
    features: WFSFeature[]
  ): { feature: WFSFeature; score: number } | null {
    
    if (features.length === 0) {
      return null;
    }

    // Configurar Fuse para fuzzy matching
    const fuse = new Fuse(features, {
      keys: ['name'],
      threshold: 1 - this.config.fuzzyThreshold, // Fuse usa distancia inversa
      includeScore: true,
      ignoreLocation: true,
      distance: 100
    });

    // Buscar matches
    const results = fuse.search(searchName);

    if (results.length === 0) {
      return null;
    }

    // Mejor resultado
    const best = results[0];
    const score = 1 - (best.score || 1); // Convertir a similaridad 0-1

    return {
      feature: best.item,
      score
    };
  }

  /**
   * Convierte WFSFeature a GeocodingResult
   */
  protected featureToGeocodingResult(
    feature: WFSFeature,
    fuzzyScore: number,
    originalName: string
  ): GeocodingResult {
    return {
      x: feature.x,
      y: feature.y,
      confidence: Math.round(fuzzyScore * 100),
      source: this.config.layerName,
      matchedName: feature.name,
      fuzzyScore,
      address: feature.address,
      municipality: feature.municipality || '',
      province: feature.province || ''
    };
  }

  /**
   * Geocodifica múltiples infraestructuras en batch
   */
  public async geocodeBatch(
    searchOptions: WFSSearchOptions[]
  ): Promise<(GeocodingResult | null)[]> {
    const results = await Promise.allSettled(
      searchOptions.map(opts => this.geocode(opts))
    );

    return results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    );
  }

  /**
   * Limpia caché de features
   */
  public clearCache(): void {
    this.featureCache.clear();
  }

  /**
   * Obtiene estadísticas del geocodificador
   */
  public getStats(): { cacheSize: number; endpoint: string; layer: string } {
    return {
      cacheSize: this.featureCache.size,
      endpoint: this.config.wfsEndpoint,
      layer: this.config.layerName
    };
  }
}
