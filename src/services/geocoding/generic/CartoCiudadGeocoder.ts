/**
 * Geocodificador genérico usando CartoCiudad API (IGN/CNIG)
 * 
 * Proporciona fallback universal para cualquier dirección en España.
 * Usado cuando los geocodificadores especializados WFS no encuentran resultado.
 * 
 * Características:
 * - Cobertura: 100% direcciones postales de España
 * - Precisión: Portal/Calle/Municipio según disponibilidad
 * - Formato: JSON/JSONP
 * - CORS: Soportado
 * - Sin autenticación
 * 
 * @module services/geocoding/generic
 */

import axios, { AxiosInstance } from 'axios';
import proj4 from 'proj4';
import { GeocodingResult } from '../../../types/infrastructure';

// Definir proyecciones si no existen
if (!proj4.defs('EPSG:25830')) {
  proj4.defs('EPSG:25830', '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
}
if (!proj4.defs('EPSG:4326')) {
  proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
}

/**
 * Tipos de precisión de geocodificación CartoCiudad
 */
export enum CartoCiudadMatchType {
  /** Match exacto a nivel de portal */
  PORTAL = 'portal',
  /** Match a nivel de calle (sin número exacto) */
  STREET = 'callejero',
  /** Match a nivel de municipio */
  MUNICIPALITY = 'municipio',
  /** Match a nivel de provincia */
  PROVINCE = 'provincia',
  /** Match aproximado */
  APPROXIMATE = 'aproximado'
}

/**
 * Respuesta de la API CartoCiudad
 */
interface CartoCiudadResponse {
  id?: string;
  province?: string;
  muni?: string;
  type?: string;
  address?: string;
  portalNumber?: number;
  geom?: string;
  tip_via?: string;
  lat?: number;
  lng?: number;
  stateMsg?: string;
  state?: number;
  countryCode?: string;
  // Campos adicionales para candidatos
  postalCode?: string;
  locality?: string;
}

/**
 * Opciones para geocodificación con CartoCiudad
 */
export interface CartoCiudadSearchOptions {
  /** Dirección completa o nombre de lugar */
  address: string;
  /** Municipio para filtrar */
  municipality?: string;
  /** Provincia para filtrar */
  province?: string;
  /** Tipo de resultado deseado: 'portal', 'callejero', 'municipio' */
  type?: string;
  /** Número máximo de candidatos a evaluar */
  maxCandidates?: number;
}

/**
 * Geocodificador genérico usando CartoCiudad API del IGN
 * 
 * Flujo:
 * 1. Intenta geocodificación directa (findJsonp)
 * 2. Si falla, obtiene candidatos y selecciona el mejor
 * 3. Transforma coordenadas WGS84 → UTM30 ETRS89
 * 
 * @example
 * ```typescript
 * const geocoder = new CartoCiudadGeocoder();
 * 
 * // Geocodificación simple
 * const result = await geocoder.geocode({
 *   address: 'Plaza del Carmen 1',
 *   municipality: 'Granada',
 *   province: 'Granada'
 * });
 * 
 * // Geocodificación por nombre de infraestructura
 * const result2 = await geocoder.geocodeInfrastructure(
 *   'Centro de Salud Zaidín',
 *   'Granada',
 *   'Granada'
 * );
 * ```
 */
export class CartoCiudadGeocoder {
  private readonly BASE_URL = 'https://www.cartociudad.es/geocoder/api/geocoder';
  private axiosInstance: AxiosInstance;
  private cache: Map<string, GeocodingResult>;
  
  constructor() {
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PTEL-Normalizer/1.0 (Granada Municipality)'
      }
    });
    this.cache = new Map();
  }

  /**
   * Geocodifica una dirección usando CartoCiudad
   * 
   * @param options - Opciones de búsqueda
   * @returns Resultado con coordenadas UTM30 o null si no encuentra
   */
  public async geocode(options: CartoCiudadSearchOptions): Promise<GeocodingResult | null> {
    const cacheKey = this.buildCacheKey(options);
    
    // Verificar caché
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null;
    }

    try {
      // Construir query de búsqueda
      const query = this.buildSearchQuery(options);
      
      // Intentar geocodificación directa
      const directResult = await this.directGeocode(query, options);
      
      if (directResult && directResult.confidence >= 60) {
        this.cache.set(cacheKey, directResult);
        return directResult;
      }

      // Si falla, buscar candidatos
      const candidatesResult = await this.geocodeWithCandidates(query, options);
      
      if (candidatesResult) {
        this.cache.set(cacheKey, candidatesResult);
        return candidatesResult;
      }

      return null;

    } catch (error) {
      console.error('Error en CartoCiudad geocoder:', error);
      return null;
    }
  }

  /**
   * Geocodifica una infraestructura por nombre
   * Wrapper conveniente para uso desde el orquestador
   */
  public async geocodeInfrastructure(
    name: string,
    municipality: string,
    province: string
  ): Promise<GeocodingResult | null> {
    // Primero intentar con el nombre completo
    let result = await this.geocode({
      address: name,
      municipality,
      province,
      maxCandidates: 5
    });

    if (result && result.confidence >= 50) {
      return result;
    }

    // Si falla, intentar solo con municipio (geocodificación a nivel municipio)
    result = await this.geocode({
      address: municipality,
      province,
      type: 'municipio'
    });

    if (result) {
      // Bajar confianza porque es aproximación a centroide
      result.confidence = Math.min(result.confidence, 30);
      result.matchType = 'municipality_centroid';
    }

    return result;
  }

  /**
   * Geocodificación directa usando endpoint findJsonp
   */
  private async directGeocode(
    query: string,
    options: CartoCiudadSearchOptions
  ): Promise<GeocodingResult | null> {
    try {
      const params = new URLSearchParams({
        q: query,
        type: options.type || 'portal',
        countrycodes: 'es'
      });

      if (options.municipality) {
        params.append('municipio', options.municipality);
      }
      if (options.province) {
        params.append('provincia', options.province);
      }

      const response = await this.axiosInstance.get<CartoCiudadResponse>(
        `${this.BASE_URL}/find?${params.toString()}`
      );

      const data = response.data;

      // Verificar estado de respuesta
      // state=0: éxito total, state=1: éxito parcial, state=2: aproximado
      // Solo rechazar si hay error explícito (state >= 3 o -1)
      if (!data || data.state === -1 || data.state === undefined) {
        return null;
      }
      
      // 🔧 BUG FIX #3: Validar que el municipio del resultado coincida con el buscado
      // CartoCiudad puede devolver resultados de otros municipios con nombres similares
      if (options.municipality && data.muni) {
        const searchMuni = options.municipality.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const resultMuni = data.muni.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Si el municipio del resultado no contiene el buscado ni viceversa, rechazar
        if (!resultMuni.includes(searchMuni) && !searchMuni.includes(resultMuni)) {
          console.warn(`CartoCiudad: Municipio no coincide. Buscado: ${options.municipality}, Encontrado: ${data.muni}`);
          return null;
        }
      }

      // Extraer coordenadas
      let lat: number | undefined;
      let lng: number | undefined;

      if (data.lat !== undefined && data.lng !== undefined) {
        lat = data.lat;
        lng = data.lng;
      } else if (data.geom) {
        // Parsear POINT(-3.598765 37.176543)
        const match = data.geom.match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i);
        if (match) {
          lng = parseFloat(match[1]);
          lat = parseFloat(match[2]);
        }
      }

      if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
        return null;
      }

      // Transformar WGS84 → UTM30 ETRS89
      const [x, y] = proj4('EPSG:4326', 'EPSG:25830', [lng, lat]);

      // Calcular confianza basada en tipo de match
      const confidence = this.calculateConfidence(data);

      return {
        x,
        y,
        confidence,
        source: 'CartoCiudad',
        sourceLayer: 'find',
        matchedName: this.buildMatchedName(data),
        matchType: data.type || 'unknown',
        address: data.address ? `${data.tip_via || ''} ${data.address} ${data.portalNumber || ''}`.trim() : undefined,
        municipality: data.muni,
        province: data.province,
        metadata: {
          state: data.state,
          stateMsg: data.stateMsg,
          portalNumber: data.portalNumber,
          postalCode: data.postalCode
        }
      };

    } catch (error) {
      console.warn('CartoCiudad directGeocode failed:', error);
      return null;
    }
  }

  /**
   * Geocodificación usando candidatos
   */
  private async geocodeWithCandidates(
    query: string,
    options: CartoCiudadSearchOptions
  ): Promise<GeocodingResult | null> {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: String(options.maxCandidates || 10),
        countrycodes: 'es'
      });

      if (options.municipality) {
        params.append('municipio', options.municipality);
      }
      if (options.province) {
        params.append('provincia', options.province);
      }

      const response = await this.axiosInstance.get<CartoCiudadResponse[]>(
        `${this.BASE_URL}/candidates?${params.toString()}`
      );

      const candidates = response.data;

      if (!Array.isArray(candidates) || candidates.length === 0) {
        return null;
      }

      // 🔧 BUG FIX #4: Filtrar ESTRICTAMENTE por municipio
      // No usar candidatos de otros municipios aunque no haya coincidencias
      let filteredCandidates = candidates;
      if (options.municipality) {
        const searchMuni = options.municipality.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        filteredCandidates = candidates.filter(c => {
          const candidateMuni = (c.muni || c.locality || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return candidateMuni.includes(searchMuni) || searchMuni.includes(candidateMuni);
        });
      }

      // Si no hay candidatos del municipio correcto, NO usar candidatos de otros municipios
      if (filteredCandidates.length === 0) {
        console.warn(`CartoCiudad candidates: No hay candidatos para municipio ${options.municipality}`);
        return null;
      }

      // Seleccionar mejor candidato (priorizar portales sobre calles)
      const bestCandidate = this.selectBestCandidate(filteredCandidates, options);

      if (!bestCandidate) {
        return null;
      }

      // Geocodificar el candidato seleccionado
      return this.directGeocode(
        bestCandidate.address || query,
        {
          ...options,
          municipality: bestCandidate.muni || options.municipality,
          type: bestCandidate.type
        }
      );

    } catch (error) {
      console.warn('CartoCiudad candidatesGeocode failed:', error);
      return null;
    }
  }

  /**
   * Selecciona el mejor candidato de una lista
   */
  private selectBestCandidate(
    candidates: CartoCiudadResponse[],
    options: CartoCiudadSearchOptions
  ): CartoCiudadResponse | null {
    if (candidates.length === 0) return null;

    // Prioridad: portal > callejero > municipio > provincia
    const priorityOrder = ['portal', 'callejero', 'municipio', 'provincia'];
    
    // Ordenar por prioridad de tipo
    const sorted = [...candidates].sort((a, b) => {
      const priorityA = priorityOrder.indexOf(a.type || 'provincia');
      const priorityB = priorityOrder.indexOf(b.type || 'provincia');
      return priorityA - priorityB;
    });

    return sorted[0];
  }

  /**
   * Calcula confianza basada en tipo de resultado
   */
  private calculateConfidence(data: CartoCiudadResponse): number {
    // Base por estado
    // state=0: match exacto, state=1: match parcial, state=2: aproximado
    let confidence = data.state === 0 ? 90 : (data.state === 1 ? 75 : 60);

    // Ajustar por tipo de match
    switch (data.type) {
      case 'portal':
        confidence = Math.min(confidence + 5, 95);
        break;
      case 'callejero':
        confidence = Math.min(confidence, 75);
        break;
      case 'municipio':
        confidence = Math.min(confidence, 50);
        break;
      case 'provincia':
        confidence = Math.min(confidence, 30);
        break;
    }

    return confidence;
  }

  /**
   * Construye nombre del match para logging
   */
  private buildMatchedName(data: CartoCiudadResponse): string {
    const parts: string[] = [];
    
    if (data.tip_via) parts.push(data.tip_via);
    if (data.address) parts.push(data.address);
    if (data.portalNumber) parts.push(String(data.portalNumber));
    if (data.muni) parts.push(data.muni);
    
    return parts.join(' ').trim() || 'Unknown';
  }

  /**
   * Construye query de búsqueda optimizada
   */
  private buildSearchQuery(options: CartoCiudadSearchOptions): string {
    const parts: string[] = [options.address];
    
    if (options.municipality && !options.address.toLowerCase().includes(options.municipality.toLowerCase())) {
      parts.push(options.municipality);
    }
    
    return parts.join(', ');
  }

  /**
   * Construye clave de caché
   */
  private buildCacheKey(options: CartoCiudadSearchOptions): string {
    return `${options.address}|${options.municipality || ''}|${options.province || ''}`.toLowerCase();
  }

  /**
   * Geocodificación inversa: coordenadas → dirección
   */
  public async reverseGeocode(
    x: number,
    y: number
  ): Promise<{ address: string; municipality: string; province: string } | null> {
    try {
      // Transformar UTM30 → WGS84
      const [lng, lat] = proj4('EPSG:25830', 'EPSG:4326', [x, y]);

      const params = new URLSearchParams({
        lon: String(lng),
        lat: String(lat)
      });

      const response = await this.axiosInstance.get<CartoCiudadResponse>(
        `${this.BASE_URL}/reverseGeocode?${params.toString()}`
      );

      const data = response.data;

      if (!data || !data.muni) {
        return null;
      }

      return {
        address: this.buildMatchedName(data),
        municipality: data.muni,
        province: data.province || ''
      };

    } catch (error) {
      console.warn('CartoCiudad reverseGeocode failed:', error);
      return null;
    }
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
  public getStats(): { cacheSize: number; endpoint: string; totalRequests?: number } {
    return {
      cacheSize: this.cache.size,
      endpoint: this.BASE_URL
    };
  }

  /**
   * Resetea estadísticas (compatibilidad con orquestador)
   */
  public resetStats(): void {
    // CartoCiudad no mantiene estadísticas detalladas,
    // solo limpia la caché
    this.cache.clear();
  }
}

export default CartoCiudadGeocoder;
