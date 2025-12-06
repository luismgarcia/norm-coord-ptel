/**
 * Geocodificador basado en OpenStreetMap vía Overpass API
 * 
 * OpenStreetMap es una fuente colaborativa con excelente cobertura
 * para infraestructuras que no están en registros oficiales.
 * 
 * CRÍTICO para localizar:
 * - Antenas de telecomunicaciones (tower:type=communication)
 * - Instalaciones deportivas menores no registradas
 * - Industrias y polígonos industriales
 * - Equipamientos municipales diversos
 * - Cualquier infraestructura mapeada por la comunidad
 * 
 * Servicios:
 * - Overpass API: https://overpass-api.de/api/interpreter
 * - Nominatim (geocoding): https://nominatim.openstreetmap.org/
 * 
 * Limitaciones:
 * - Overpass: ~10,000 requests/día (compartido)
 * - Nominatim: 1 request/segundo (política de uso)
 * 
 * @module services/geocoding/specialized
 */

import axios, { AxiosInstance } from 'axios';
import { FastFuzzy } from '../../../lib/fuzzySearch';
import { GeocodingResult, InfrastructureType } from '../../../types/infrastructure';
import proj4 from 'proj4';

/**
 * Elemento OSM parseado
 */
export interface OSMElement {
  id: number;
  type: 'node' | 'way' | 'relation';
  name: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

/**
 * Opciones de búsqueda en Overpass
 */
export interface OverpassSearchOptions {
  /** Nombre a buscar */
  name: string;
  
  /** Municipio para filtrar */
  municipality: string;
  
  /** Provincia (opcional, mejora precisión del área) */
  province?: string;
  
  /** Tipo de infraestructura PTEL */
  infrastructureType?: InfrastructureType;
  
  /** Radio de búsqueda en metros (para búsqueda por proximidad) */
  radius?: number;
  
  /** Coordenadas centrales para búsqueda por proximidad */
  center?: { lat: number; lon: number };
  
  /** Límite de resultados */
  maxResults?: number;
}

/**
 * Mapeo de tipos PTEL a queries Overpass
 * @public Exportado para testing
 */
export const PTEL_TO_OSM_QUERIES: Record<InfrastructureType, string[]> = {
  [InfrastructureType.HEALTH]: [
    'nwr["amenity"="hospital"]',
    'nwr["amenity"="clinic"]',
    'nwr["amenity"="doctors"]',
    'nwr["healthcare"="centre"]'
  ],
  [InfrastructureType.EDUCATION]: [
    'nwr["amenity"="school"]',
    'nwr["amenity"="kindergarten"]',
    'nwr["amenity"="college"]',
    'nwr["amenity"="university"]'
  ],
  [InfrastructureType.POLICE]: [
    'nwr["amenity"="police"]'
  ],
  [InfrastructureType.FIRE]: [
    'nwr["amenity"="fire_station"]'
  ],
  [InfrastructureType.CULTURAL]: [
    'nwr["amenity"="library"]',
    'nwr["amenity"="theatre"]',
    'nwr["amenity"="community_centre"]',
    'nwr["tourism"="museum"]'
  ],
  [InfrastructureType.RELIGIOUS]: [
    'nwr["amenity"="place_of_worship"]',
    'nwr["building"="church"]',
    'nwr["building"="chapel"]'
  ],
  [InfrastructureType.SPORTS]: [
    'nwr["leisure"="sports_centre"]',
    'nwr["leisure"="swimming_pool"]',
    'nwr["leisure"="pitch"]',
    'nwr["leisure"="stadium"]'
  ],
  [InfrastructureType.MUNICIPAL]: [
    'nwr["amenity"="townhall"]',
    'nwr["office"="government"]'
  ],
  [InfrastructureType.SOCIAL]: [
    'nwr["amenity"="social_facility"]',
    'nwr["social_facility"="nursing_home"]'
  ],
  [InfrastructureType.FUEL]: [
    'nwr["amenity"="fuel"]'
  ],
  [InfrastructureType.EMERGENCY]: [
    'nwr["emergency"="ambulance_station"]',
    'nwr["amenity"="emergency_service"]'
  ],
  [InfrastructureType.HYDRAULIC]: [
    'nwr["man_made"="wastewater_plant"]',
    'nwr["man_made"="water_works"]',
    'nwr["man_made"="reservoir_covered"]'
  ],
  [InfrastructureType.ENERGY]: [
    'nwr["power"="substation"]',
    'nwr["power"="plant"]',
    'nwr["generator:source"="solar"]',
    'nwr["generator:source"="wind"]'
  ],
  [InfrastructureType.GENERIC]: [
    'nwr["amenity"]',
    'nwr["building"="public"]'
  ],
  [InfrastructureType.TELECOM]: [
    'nwr["man_made"="mast"]["tower:type"="communication"]',
    'nwr["man_made"="tower"]["tower:type"="communication"]',
    'nwr["tower:type"="communication"]',
    'nwr["communication:mobile_phone"="yes"]'
  ],
  [InfrastructureType.INDUSTRIAL]: [
    'nwr["landuse"="industrial"]',
    'nwr["building"="industrial"]',
    'nwr["industrial"]'
  ],
  [InfrastructureType.VIAL]: [
    'nwr["highway"="primary"]',
    'nwr["highway"="secondary"]',
    'nwr["highway"="tertiary"]'
  ]
};

/**
 * Query específica para antenas de telecomunicaciones
 */
const TELECOM_QUERY = `
  nwr["man_made"="mast"]["tower:type"="communication"];
  nwr["man_made"="tower"]["tower:type"="communication"];
  nwr["tower:type"="communication"];
  nwr["communication:mobile_phone"="yes"];
`;

/**
 * Query para instalaciones industriales
 */
const INDUSTRIAL_QUERY = `
  nwr["landuse"="industrial"];
  nwr["building"="industrial"];
  nwr["industrial"];
`;

/**
 * Geocodificador basado en OpenStreetMap/Overpass
 * 
 * Precisión esperada: Variable (±5-100m según elemento)
 * Cobertura: Depende del mapeo comunitario (excelente en zonas urbanas)
 * 
 * @example
 * ```typescript
 * const geocoder = new OverpassGeocoder();
 * 
 * // Buscar antenas de telecomunicaciones
 * const antenas = await geocoder.findTelecomTowers('Colomera', 'Granada');
 * 
 * // Buscar cualquier infraestructura por nombre
 * const result = await geocoder.geocode({
 *   name: 'Piscina Municipal',
 *   municipality: 'Colomera',
 *   infrastructureType: InfrastructureType.SPORTS
 * });
 * ```
 */
export class OverpassGeocoder {
  private axiosInstance: AxiosInstance;
  private nominatimInstance: AxiosInstance;
  
  /**
   * Proyección para conversión WGS84 ↔ UTM30
   */
  private static readonly WGS84 = 'EPSG:4326';
  private static readonly UTM30 = 'EPSG:25830';

  /**
   * URLs de servicios
   */
  private static readonly OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
  private static readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

  /**
   * Caché de áreas de municipios (evita buscar el área repetidamente)
   */
  private areaCache: Map<string, number> = new Map();

  constructor() {
    // Cliente para Overpass (sin límite de rate estricto)
    this.axiosInstance = axios.create({
      timeout: 30000, // 30s para queries complejas
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PTEL-Normalizer/1.0 (Granada Municipality; Emergency Planning)'
      }
    });

    // Cliente para Nominatim (1 req/s)
    this.nominatimInstance = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'PTEL-Normalizer/1.0 (Granada Municipality; Emergency Planning)'
      }
    });

    // Configurar proyección
    if (!proj4.defs(OverpassGeocoder.UTM30)) {
      proj4.defs(OverpassGeocoder.UTM30, '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
    }
  }

  /**
   * Geocodifica una infraestructura usando Overpass + fuzzy matching
   */
  public async geocode(options: OverpassSearchOptions): Promise<GeocodingResult | null> {
    try {
      // Construir y ejecutar query
      const query = await this.buildQuery(options);
      const elements = await this.executeQuery(query);

      if (elements.length === 0) {
        return null;
      }

      // Aplicar fuzzy matching para encontrar el mejor resultado
      const bestMatch = this.findBestMatch(options.name, elements);

      if (!bestMatch) {
        return null;
      }

      // Convertir coordenadas a UTM30
      const [x, y] = proj4(OverpassGeocoder.WGS84, OverpassGeocoder.UTM30, [bestMatch.element.lon, bestMatch.element.lat]);

      return {
        x,
        y,
        confidence: Math.round(bestMatch.score * 100),
        source: 'OpenStreetMap',
        sourceLayer: bestMatch.element.type,
        matchedName: bestMatch.element.name,
        fuzzyScore: bestMatch.score,
        municipality: options.municipality,
        province: options.province || '',
        metadata: {
          osmId: bestMatch.element.id,
          osmType: bestMatch.element.type,
          tags: bestMatch.element.tags
        }
      };

    } catch (error) {
      console.error('Error geocodificando vía Overpass:', error);
      return null;
    }
  }

  /**
   * Busca antenas de telecomunicaciones en un municipio
   * Método especializado para el caso crítico de antenas sin dirección
   */
  public async findTelecomTowers(
    municipality: string,
    province?: string
  ): Promise<OSMElement[]> {
    try {
      const query = `
        [out:json][timeout:60];
        area[name="${municipality}"][admin_level=8]->.searchArea;
        (
          ${TELECOM_QUERY}
        )(area.searchArea);
        out center;
      `;

      return await this.executeQuery(query);

    } catch (error) {
      console.error(`Error buscando antenas en ${municipality}:`, error);
      return [];
    }
  }

  /**
   * Busca instalaciones deportivas en un municipio
   */
  public async findSportsFacilities(
    municipality: string,
    province?: string
  ): Promise<OSMElement[]> {
    try {
      const queries = PTEL_TO_OSM_QUERIES[InfrastructureType.SPORTS];
      const queryString = queries.join(';\n  ');

      const query = `
        [out:json][timeout:60];
        area[name="${municipality}"][admin_level=8]->.searchArea;
        (
          ${queryString};
        )(area.searchArea);
        out center;
      `;

      return await this.executeQuery(query);

    } catch (error) {
      console.error(`Error buscando instalaciones deportivas en ${municipality}:`, error);
      return [];
    }
  }

  /**
   * Busca instalaciones industriales en un municipio
   */
  public async findIndustrialFacilities(
    municipality: string,
    province?: string
  ): Promise<OSMElement[]> {
    try {
      const query = `
        [out:json][timeout:60];
        area[name="${municipality}"][admin_level=8]->.searchArea;
        (
          ${INDUSTRIAL_QUERY}
        )(area.searchArea);
        out center;
      `;

      return await this.executeQuery(query);

    } catch (error) {
      console.error(`Error buscando instalaciones industriales en ${municipality}:`, error);
      return [];
    }
  }

  /**
   * Busca cualquier amenity en un municipio
   */
  public async findAllAmenities(
    municipality: string,
    province?: string
  ): Promise<OSMElement[]> {
    try {
      const query = `
        [out:json][timeout:90];
        area[name="${municipality}"][admin_level=8]->.searchArea;
        (
          nwr["amenity"](area.searchArea);
          nwr["leisure"](area.searchArea);
          nwr["building"="public"](area.searchArea);
        );
        out center;
      `;

      return await this.executeQuery(query);

    } catch (error) {
      console.error(`Error buscando amenities en ${municipality}:`, error);
      return [];
    }
  }

  /**
   * Geocodifica usando Nominatim (búsqueda por texto libre)
   * Más simple pero menos preciso que Overpass
   */
  public async geocodeWithNominatim(
    searchText: string,
    municipality: string,
    province?: string
  ): Promise<GeocodingResult | null> {
    try {
      // Construir query
      const query = `${searchText}, ${municipality}${province ? ', ' + province : ''}, España`;
      
      // Respetar límite de 1 req/s
      await this.delay(1000);

      const response = await this.nominatimInstance.get(`${OverpassGeocoder.NOMINATIM_URL}/search`, {
        params: {
          q: query,
          format: 'json',
          limit: 5,
          addressdetails: 1
        }
      });

      if (!response.data || response.data.length === 0) {
        return null;
      }

      // Tomar el primer resultado
      const result = response.data[0];
      
      // Convertir a UTM30
      const [x, y] = proj4(OverpassGeocoder.WGS84, OverpassGeocoder.UTM30, [
        parseFloat(result.lon),
        parseFloat(result.lat)
      ]);

      // Calcular confianza basada en importancia y tipo
      let confidence = 50;
      if (result.importance) {
        confidence = Math.min(90, Math.round(result.importance * 100));
      }

      return {
        x,
        y,
        confidence,
        source: 'Nominatim',
        matchedName: result.display_name,
        matchType: result.type,
        municipality,
        province: province || '',
        metadata: {
          osmId: result.osm_id,
          osmType: result.osm_type,
          class: result.class,
          type: result.type,
          importance: result.importance
        }
      };

    } catch (error) {
      console.error('Error geocodificando vía Nominatim:', error);
      return null;
    }
  }

  /**
   * Construye query Overpass basada en opciones
   */
  private async buildQuery(options: OverpassSearchOptions): Promise<string> {
    const { municipality, infrastructureType } = options;

    // Obtener queries OSM según tipo
    let osmQueries: string[];
    
    if (infrastructureType && PTEL_TO_OSM_QUERIES[infrastructureType]) {
      osmQueries = PTEL_TO_OSM_QUERIES[infrastructureType];
    } else {
      // Query genérica amplia
      osmQueries = [
        'nwr["amenity"]',
        'nwr["leisure"]',
        'nwr["building"="public"]'
      ];
    }

    const queryString = osmQueries.join(';\n  ');

    return `
      [out:json][timeout:60];
      area[name="${municipality}"][admin_level=8]->.searchArea;
      (
        ${queryString};
      )(area.searchArea);
      out center;
    `;
  }

  /**
   * Ejecuta query Overpass y parsea resultados
   */
  private async executeQuery(query: string): Promise<OSMElement[]> {
    try {
      const response = await this.axiosInstance.post(
        OverpassGeocoder.OVERPASS_URL,
        `data=${encodeURIComponent(query)}`
      );

      if (!response.data || !response.data.elements) {
        return [];
      }

      return response.data.elements
        .map((el: any) => this.parseElement(el))
        .filter((el: OSMElement | null): el is OSMElement => el !== null);

    } catch (error) {
      console.error('Error ejecutando query Overpass:', error);
      return [];
    }
  }

  /**
   * Parsea elemento OSM a formato interno
   */
  private parseElement(element: any): OSMElement | null {
    try {
      // Obtener coordenadas (directas para node, center para way/relation)
      let lat: number, lon: number;

      if (element.type === 'node') {
        lat = element.lat;
        lon = element.lon;
      } else if (element.center) {
        lat = element.center.lat;
        lon = element.center.lon;
      } else {
        return null;
      }

      // Extraer nombre
      const tags = element.tags || {};
      const name = tags.name || tags['name:es'] || tags.alt_name || '';

      if (!name) {
        return null; // Ignorar elementos sin nombre
      }

      return {
        id: element.id,
        type: element.type,
        name,
        lat,
        lon,
        tags
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Encuentra el mejor match usando fuzzy matching
   */
  private findBestMatch(
    searchName: string,
    elements: OSMElement[]
  ): { element: OSMElement; score: number } | null {
    if (elements.length === 0) {
      return null;
    }

    const fuzzy = new FastFuzzy(elements, {
      keys: ['name'],
      threshold: 0.6 // Más permisivo para OSM
    });

    const results = fuzzy.search(searchName);

    if (results.length === 0) {
      // Si no hay match fuzzy, retornar el primero si hay pocos resultados
      if (elements.length <= 3) {
        return { element: elements[0], score: 0.4 };
      }
      return null;
    }

    const best = results[0];
    return {
      element: best.item,
      score: 1 - (best.score || 1)
    };
  }

  /**
   * Convierte coordenadas WGS84 a UTM30
   */
  public toUTM30(lon: number, lat: number): { x: number; y: number } {
    const [x, y] = proj4(OverpassGeocoder.WGS84, OverpassGeocoder.UTM30, [lon, lat]);
    return { x, y };
  }

  /**
   * Convierte coordenadas UTM30 a WGS84
   */
  public toWGS84(x: number, y: number): { lon: number; lat: number } {
    const [lon, lat] = proj4(OverpassGeocoder.UTM30, OverpassGeocoder.WGS84, [x, y]);
    return { lon, lat };
  }

  /**
   * Delay para respetar límites de rate
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Limpia caché de áreas
   */
  public clearCache(): void {
    this.areaCache.clear();
  }

  /**
   * Estadísticas del geocodificador para testing/monitorización
   */
  public getStats(): {
    endpoint: string;
    nominatimEndpoint: string;
    rateLimitMs: number;
    cacheSize: number;
    requestCount: number;
  } {
    return {
      endpoint: OverpassGeocoder.OVERPASS_URL,
      nominatimEndpoint: OverpassGeocoder.NOMINATIM_URL,
      rateLimitMs: 1000, // 1 req/s para Nominatim
      cacheSize: this.areaCache.size,
      requestCount: 0 // TODO: implementar contador si necesario
    };
  }

  /**
   * Verifica si se puede hacer una petición según rate limit
   */
  public checkRateLimit(): boolean {
    // Por ahora siempre true - rate limit se gestiona con delay()
    return true;
  }
}