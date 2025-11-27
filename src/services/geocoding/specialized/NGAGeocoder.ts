/**
 * Geocodificador para el Nomenclátor Geográfico de Andalucía (NGA)
 * 
 * El NGA contiene 232.000 topónimos con 307.000 geometrías puntuales
 * derivadas del Mapa Topográfico de Andalucía 1:10.000.
 * 
 * CRÍTICO para localizar:
 * - Parajes rurales (ej: "Paraje Preteles")
 * - Cerros y elevaciones (ej: "Cerro Cementerio")
 * - Eras y zonas agrícolas (ej: "Eras Cuartel")
 * - Cortijos y construcciones rurales
 * - Arroyos, fuentes y elementos hidrográficos menores
 * 
 * Servicios WFS:
 * - WFS 1.1: https://www.ideandalucia.es/wfs-nga/services
 * - WFS INSPIRE 2.0: https://www.ideandalucia.es/wfs-nga-inspire/services
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
 * Tipos de topónimos en el NGA
 */
export enum ToponymType {
  /** Parajes y zonas rurales */
  PARAJE = 'Paraje',
  
  /** Cerros, lomas, colinas */
  CERRO = 'Cerro',
  
  /** Cortijos y construcciones rurales */
  CORTIJO = 'Cortijo',
  
  /** Arroyos y cauces menores */
  ARROYO = 'Arroyo',
  
  /** Fuentes y manantiales */
  FUENTE = 'Fuente',
  
  /** Eras agrícolas */
  ERA = 'Era',
  
  /** Cañadas y vías pecuarias */
  CANADA = 'Cañada',
  
  /** Barrancos */
  BARRANCO = 'Barranco',
  
  /** Llanos y zonas planas */
  LLANO = 'Llano',
  
  /** Cualquier tipo */
  ANY = '*'
}

/**
 * Opciones específicas de búsqueda en NGA
 */
export interface NGASearchOptions extends WFSSearchOptions {
  /** Filtrar por tipo de topónimo */
  toponymType?: ToponymType;
  
  /** Incluir variantes del nombre (singular/plural) */
  includeVariants?: boolean;
}

/**
 * Geocodificador del Nomenclátor Geográfico de Andalucía
 * 
 * Precisión esperada: ±10-50m (según escala del MTA 1:10.000)
 * Cobertura: 232.000+ topónimos en toda Andalucía
 * 
 * @example
 * ```typescript
 * const geocoder = new NGAGeocoder();
 * 
 * // Buscar un paraje
 * const paraje = await geocoder.geocode({
 *   name: 'Paraje Preteles',
 *   municipality: 'Colomera',
 *   province: 'Granada'
 * });
 * 
 * // Buscar un cerro (para antenas)
 * const cerro = await geocoder.geocode({
 *   name: 'Cerro Cementerio',
 *   municipality: 'Colomera'
 * });
 * ```
 */
export class NGAGeocoder extends WFSBaseGeocoder {
  
  /**
   * Patrones para detectar y normalizar tipos de topónimos
   */
  private static readonly TOPONYM_PATTERNS: Record<ToponymType, RegExp> = {
    [ToponymType.PARAJE]: /\b(paraje|pago|partido|sitio)\b/i,
    [ToponymType.CERRO]: /\b(cerro|loma|colina|alto|cabezo|peñón|risco)\b/i,
    [ToponymType.CORTIJO]: /\b(cortijo|cortijada|caserío|casa|venta|molino)\b/i,
    [ToponymType.ARROYO]: /\b(arroyo|rambla|río|regato|caz)\b/i,
    [ToponymType.FUENTE]: /\b(fuente|manantial|nacimiento|aljibe)\b/i,
    [ToponymType.ERA]: /\b(era|eras|ejido)\b/i,
    [ToponymType.CANADA]: /\b(cañada|vereda|cordel|colada)\b/i,
    [ToponymType.BARRANCO]: /\b(barranco|barranquillo|cárcava)\b/i,
    [ToponymType.LLANO]: /\b(llano|llanura|vega|hoya)\b/i,
    [ToponymType.ANY]: /.*/
  };

  /**
   * Configuración específica para el servicio WFS del NGA
   */
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      wfsEndpoint: 'https://www.ideandalucia.es/wfs-nga/services',
      layerName: 'NGA:GN_NGA',
      fuzzyThreshold: 0.4, // Más permisivo para variaciones toponímicas
      timeout: 15000,
      outputSRS: 'EPSG:25830'
    };
  }

  /**
   * Parsea feature GeoJSON del NGA a formato interno
   * 
   * Estructura esperada del NGA:
   * {
   *   type: "Feature",
   *   geometry: { type: "Point", coordinates: [x, y] },
   *   properties: {
   *     TEXTO: "Cerro del Cementerio",
   *     MUNICIPIO: "Colomera",
   *     PROVINCIA: "Granada",
   *     TIPO: "Cerro",
   *     COD_MUN: "18052",
   *     HOJA_MTA: "1009"
   *   }
   * }
   */
  protected parseFeature(feature: any): WFSFeature | null {
    try {
      const props = feature.properties || {};
      const geom = feature.geometry;

      // Validar geometría
      if (!geom || !geom.coordinates) {
        return null;
      }

      // El NGA puede tener Point o MultiPoint
      let x: number, y: number;
      
      if (geom.type === 'Point') {
        [x, y] = geom.coordinates;
      } else if (geom.type === 'MultiPoint' && geom.coordinates.length > 0) {
        // Usar el primer punto del MultiPoint
        [x, y] = geom.coordinates[0];
      } else {
        return null;
      }

      // Validar coordenadas en rango UTM30 Andalucía
      if (x < 100000 || x > 800000 || y < 4000000 || y > 4300000) {
        return null;
      }

      return {
        name: props.TEXTO || props.NOMBRE || props.DENOMINACION || '',
        x,
        y,
        municipality: props.MUNICIPIO || '',
        province: props.PROVINCIA || '',
        properties: {
          toponymType: props.TIPO || '',
          codMun: props.COD_MUN || '',
          hojaMTA: props.HOJA_MTA || '',
          ...props
        }
      };
    } catch (error) {
      console.error('Error parseando feature NGA:', error);
      return null;
    }
  }

  /**
   * Construye filtro CQL específico para el NGA
   */
  protected buildCQLFilter(options: NGASearchOptions): string {
    const filters: string[] = [];

    // Filtro por municipio - campo específico del NGA
    if (options.municipality) {
      filters.push(`MUNICIPIO ILIKE '%${this.escapeCQL(options.municipality)}%'`);
    }

    // Filtro por provincia
    if (options.province) {
      filters.push(`PROVINCIA ILIKE '%${this.escapeCQL(options.province)}%'`);
    }

    // Filtro por tipo de topónimo
    if (options.toponymType && options.toponymType !== ToponymType.ANY) {
      filters.push(`TIPO ILIKE '%${this.escapeCQL(options.toponymType)}%'`);
    }

    // Filtro por texto del topónimo (búsqueda parcial)
    if (options.name) {
      // Extraer palabras clave significativas (eliminar artículos, preposiciones)
      const keywords = this.extractKeywords(options.name);
      if (keywords.length > 0) {
        // Usar OR para mayor flexibilidad
        const textFilters = keywords.map(kw => 
          `TEXTO ILIKE '%${this.escapeCQL(kw)}%'`
        );
        filters.push(`(${textFilters.join(' OR ')})`);
      }
    }

    return filters.length > 0 ? filters.join(' AND ') : '';
  }

  /**
   * Extrae palabras clave significativas de un nombre de topónimo
   */
  private extractKeywords(name: string): string[] {
    // Palabras a ignorar (artículos, preposiciones, etc.)
    const stopWords = new Set([
      'el', 'la', 'los', 'las', 'de', 'del', 'a', 'al', 'en', 'y', 'o',
      'un', 'una', 'unos', 'unas', 'que', 'por', 'para', 'con', 'sin'
    ]);

    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Detecta automáticamente el tipo de topónimo desde el nombre
   */
  public detectToponymType(name: string): ToponymType {
    for (const [type, pattern] of Object.entries(NGAGeocoder.TOPONYM_PATTERNS)) {
      if (type !== ToponymType.ANY && pattern.test(name)) {
        return type as ToponymType;
      }
    }
    return ToponymType.ANY;
  }

  /**
   * Geocodifica con detección automática del tipo de topónimo
   */
  public async geocodeWithTypeDetection(options: NGASearchOptions): Promise<GeocodingResult | null> {
    // Detectar tipo si no se especificó
    if (!options.toponymType) {
      options.toponymType = this.detectToponymType(options.name);
    }

    // Primer intento: con tipo detectado
    let result = await this.geocode(options);
    
    if (result && result.confidence >= 60) {
      return result;
    }

    // Segundo intento: sin filtro de tipo (más amplio)
    if (options.toponymType !== ToponymType.ANY) {
      const broadOptions = { ...options, toponymType: ToponymType.ANY };
      result = await this.geocode(broadOptions);
    }

    return result;
  }

  /**
   * Busca todos los topónimos de un municipio
   * Útil para pre-caching o análisis
   */
  public async getAllToponymsInMunicipality(
    municipality: string,
    province?: string
  ): Promise<WFSFeature[]> {
    try {
      const params = this.buildWFSParams({
        name: '',
        municipality,
        province,
        maxResults: 1000
      });

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      return this.parseResponse(response.data);

    } catch (error) {
      console.error(`Error obteniendo topónimos de ${municipality}:`, error);
      return [];
    }
  }

  /**
   * Busca topónimos cercanos a unas coordenadas
   * Útil para validar ubicaciones de antenas u otras infraestructuras
   */
  public async findNearbyToponyms(
    x: number,
    y: number,
    radiusMeters: number = 500
  ): Promise<WFSFeature[]> {
    try {
      const bbox: [number, number, number, number] = [
        x - radiusMeters,
        y - radiusMeters,
        x + radiusMeters,
        y + radiusMeters
      ];

      const params = this.buildWFSParams({
        name: '',
        bbox,
        maxResults: 50
      });

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      const features = this.parseResponse(response.data);

      // Ordenar por distancia al punto
      return features.sort((a, b) => {
        const distA = Math.sqrt(Math.pow(a.x - x, 2) + Math.pow(a.y - y, 2));
        const distB = Math.sqrt(Math.pow(b.x - x, 2) + Math.pow(b.y - y, 2));
        return distA - distB;
      });

    } catch (error) {
      console.error('Error buscando topónimos cercanos:', error);
      return [];
    }
  }

  /**
   * Normaliza variantes de topónimos para mejor matching
   * Ej: "Cerro del Cementerio" → ["cerro cementerio", "cementerio"]
   */
  public normalizeToponymVariants(name: string): string[] {
    const variants: string[] = [];
    
    // Versión normalizada base
    const normalized = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    variants.push(normalized);

    // Sin artículos y preposiciones
    const withoutArticles = normalized
      .replace(/\b(el|la|los|las|de|del|al)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (withoutArticles !== normalized) {
      variants.push(withoutArticles);
    }

    // Solo la parte específica (sin tipo genérico)
    // Ej: "Cerro del Cementerio" → "Cementerio"
    for (const pattern of Object.values(NGAGeocoder.TOPONYM_PATTERNS)) {
      const withoutType = normalized.replace(pattern, '').trim();
      if (withoutType && withoutType !== normalized && withoutType.length > 3) {
        variants.push(withoutType);
      }
    }

    return [...new Set(variants)]; // Eliminar duplicados
  }
}
