/**
 * Geocodificador especializado para infraestructuras deportivas en Andalucía
 * 
 * Conecta con servicios DERA G12 (Datos Espaciales de Referencia de Andalucía) para acceder a:
 * - Equipamientos deportivos: polideportivos, pabellones, campos de fútbol, piscinas (~3.000+ en Andalucía)
 * - Campos de golf (~100 en Andalucía)
 * 
 * Fuentes oficiales:
 * - WFS DERA G12: https://www.ideandalucia.es/services/DERA_g12_servicios/wfs
 * - Capas: 12_24_EquipamientoDeportivo, 12_25_CampoGolf
 * 
 * Origen datos: BCA10 (Base Cartográfica Andalucía 1:10.000) - TM5_Servicios
 * Sistema coordenadas nativo: EPSG:25830 (UTM30 ETRS89)
 * Actualización: Julio 2024 (revisión general), actualizaciones incrementales 2025
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
 * Tipos de instalaciones deportivas según BCA10 TM5_Servicios
 * (Prefijo DERA para evitar conflicto con SportsFacilityType de IAIDGeocoder)
 */
export enum DERASportsFacilityType {
  /** Polideportivos y complejos multiusos */
  POLIDEPORTIVO = 'POLIDEPORTIVO',
  
  /** Pabellones deportivos cubiertos */
  PABELLON = 'PABELLON',
  
  /** Campos de fútbol (estadios y municipales) */
  CAMPO_FUTBOL = 'CAMPO_FUTBOL',
  
  /** Pistas de atletismo */
  PISTA_ATLETISMO = 'PISTA_ATLETISMO',
  
  /** Piscinas (cubiertas y descubiertas) */
  PISCINA = 'PISCINA',
  
  /** Pistas de tenis y pádel */
  PISTA_RAQUETA = 'PISTA_RAQUETA',
  
  /** Frontones */
  FRONTON = 'FRONTON',
  
  /** Estadios grandes */
  ESTADIO = 'ESTADIO',
  
  /** Centros deportivos uso público */
  CENTRO_DEPORTIVO = 'CENTRO_DEPORTIVO',
  
  /** Campos de golf (capa separada 12_25) */
  CAMPO_GOLF = 'CAMPO_GOLF',
  
  /** Instalación genérica deportiva */
  GENERICO = 'GENERICO'
}

/**
 * Opciones de búsqueda específicas para deportes
 */
export interface SportsSearchOptions extends WFSSearchOptions {
  /** Tipo de instalación deportiva */
  facilityType?: DERASportsFacilityType;
  
  /** Incluir campos de golf (capa separada) */
  includeGolf?: boolean;
}

/**
 * Geocodificador especializado para infraestructuras deportivas andaluzas
 * 
 * Precisión esperada: ±10-25m (centroides BCA10 escala 1:10.000)
 * Cobertura: ~3.000+ instalaciones deportivas + ~100 campos golf
 * 
 * @example
 * ```typescript
 * const geocoder = new WFSSportsGeocoder();
 * const result = await geocoder.geocode({
 *   name: 'Polideportivo Municipal',
 *   municipality: 'Colomera',
 *   province: 'Granada'
 * });
 * // result.confidence >= 75 (match oficial DERA)
 * ```
 */
export class WFSSportsGeocoder extends WFSBaseGeocoder {
  
  /** Endpoint DERA G12 Servicios */
  private static readonly DERA_G12_ENDPOINT = 'https://www.ideandalucia.es/services/DERA_g12_servicios/wfs';
  
  /** Capa principal equipamientos deportivos */
  private static readonly LAYER_DEPORTES = 'DERA_g12_servicios:12_24_EquipamientoDeportivo';
  
  /** Capa campos de golf */
  private static readonly LAYER_GOLF = 'DERA_g12_servicios:12_25_CampoGolf';
  
  /**
   * Configuración específica para WFS DERA G12 Deportes
   */
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      wfsEndpoint: WFSSportsGeocoder.DERA_G12_ENDPOINT,
      layerName: WFSSportsGeocoder.LAYER_DEPORTES,
      fuzzyThreshold: 0.40, // Umbral moderado (nombres pueden variar)
      timeout: 15000,
      outputSRS: 'EPSG:25830'
    };
  }

  /**
   * Parsea feature GeoJSON de DERA G12 Equipamiento Deportivo
   * 
   * Estructura esperada DERA G12:
   * {
   *   type: "Feature",
   *   geometry: { type: "Point", coordinates: [x, y] },
   *   properties: {
   *     OBJECTID: 1234,
   *     NOMBRE: "Polideportivo Municipal",
   *     TIPO: "Polideportivo",
   *     COD_MUN: "18054",
   *     MUNICIPIO: "Colomera",
   *     COD_PROV: "18",
   *     PROVINCIA: "Granada"
   *   }
   * }
   */
  protected parseFeature(feature: any): WFSFeature | null {
    try {
      const props = feature.properties || {};
      const geom = feature.geometry;

      // Validar geometría
      if (!geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates)) {
        console.warn('Feature deportiva sin geometría válida:', feature.id || props.OBJECTID);
        return null;
      }

      const [x, y] = geom.coordinates;

      // Validar coordenadas UTM30 Andalucía (rangos amplios para toda la comunidad)
      if (x < 100000 || x > 800000 || y < 4000000 || y > 4300000) {
        console.warn('Coordenadas deportivas fuera de rango UTM30:', x, y);
        return null;
      }

      // Extraer nombre (puede estar en NOMBRE, DENOMINACION o NAME según versión)
      const nombre = props.NOMBRE || props.DENOMINACION || props.NAME || props.nombre || '';
      
      if (!nombre) {
        console.warn('Feature deportiva sin nombre:', props.OBJECTID);
        return null;
      }

      return {
        name: nombre,
        x,
        y,
        municipality: props.MUNICIPIO || props.municipio || '',
        province: props.PROVINCIA || props.provincia || '',
        address: props.DIRECCION || props.direccion || '',
        properties: {
          objectId: props.OBJECTID || props.objectid,
          tipo: props.TIPO || props.tipo || '',
          codMun: props.COD_MUN || props.cod_mun || '',
          codProv: props.COD_PROV || props.cod_prov || '',
          fuente: 'DERA_G12',
          capa: this.config.layerName,
          ...props
        }
      };
    } catch (error) {
      console.error('Error parseando feature deportiva:', error);
      return null;
    }
  }

  /**
   * Construye filtro CQL específico para instalaciones deportivas
   */
  protected buildCQLFilter(options: SportsSearchOptions): string {
    const filters: string[] = [];

    // Filtro base (municipio, provincia)
    const baseFilter = super.buildCQLFilter(options);
    if (baseFilter) {
      filters.push(baseFilter);
    }

    // Filtro por tipo de instalación
    if (options.facilityType && options.facilityType !== DERASportsFacilityType.GENERICO) {
      const typeValue = this.getFacilityTypeValue(options.facilityType);
      if (typeValue) {
        filters.push(`TIPO ILIKE '%${this.escapeCQL(typeValue)}%'`);
      }
    }

    // Filtro por nombre si se proporciona (búsqueda parcial)
    if (options.name && options.name.length > 2) {
      // Extraer palabras clave significativas del nombre
      const keywords = this.extractKeywords(options.name);
      if (keywords.length > 0) {
        const nameFilters = keywords.map(kw => 
          `NOMBRE ILIKE '%${this.escapeCQL(kw)}%'`
        );
        if (nameFilters.length > 0) {
          filters.push(`(${nameFilters.join(' OR ')})`);
        }
      }
    }

    return filters.length > 0 ? filters.join(' AND ') : '';
  }

  /**
   * Extrae palabras clave significativas para búsqueda
   */
  private extractKeywords(name: string): string[] {
    // Palabras a ignorar (artículos, preposiciones comunes)
    const stopWords = new Set([
      'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'y', 'e', 'o', 'u',
      'en', 'con', 'para', 'por', 'a', 'al', 'municipal', 'publico', 'público'
    ]);

    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 3); // Máximo 3 palabras clave
  }

  /**
   * Convierte tipo de facilidad a valor para filtro WFS
   */
  private getFacilityTypeValue(type: DERASportsFacilityType): string {
    const map: Record<DERASportsFacilityType, string> = {
      [DERASportsFacilityType.POLIDEPORTIVO]: 'Polideportivo',
      [DERASportsFacilityType.PABELLON]: 'Pabellón',
      [DERASportsFacilityType.CAMPO_FUTBOL]: 'Fútbol',
      [DERASportsFacilityType.PISTA_ATLETISMO]: 'Atletismo',
      [DERASportsFacilityType.PISCINA]: 'Piscina',
      [DERASportsFacilityType.PISTA_RAQUETA]: 'Tenis',
      [DERASportsFacilityType.FRONTON]: 'Frontón',
      [DERASportsFacilityType.ESTADIO]: 'Estadio',
      [DERASportsFacilityType.CENTRO_DEPORTIVO]: 'Centro Deportivo',
      [DERASportsFacilityType.CAMPO_GOLF]: 'Golf',
      [DERASportsFacilityType.GENERICO]: ''
    };
    return map[type] || '';
  }

  /**
   * Detecta tipo de instalación deportiva a partir del nombre
   */
  private detectFacilityType(name: string): DERASportsFacilityType {
    const nameLower = name.toLowerCase();

    if (nameLower.includes('golf')) {
      return DERASportsFacilityType.CAMPO_GOLF;
    }
    if (nameLower.includes('polideportivo')) {
      return DERASportsFacilityType.POLIDEPORTIVO;
    }
    if (nameLower.includes('pabellón') || nameLower.includes('pabellon')) {
      return DERASportsFacilityType.PABELLON;
    }
    if (nameLower.includes('fútbol') || nameLower.includes('futbol') || 
        nameLower.includes('estadio municipal')) {
      return DERASportsFacilityType.CAMPO_FUTBOL;
    }
    if (nameLower.includes('estadio') && !nameLower.includes('municipal')) {
      return DERASportsFacilityType.ESTADIO;
    }
    if (nameLower.includes('piscina')) {
      return DERASportsFacilityType.PISCINA;
    }
    if (nameLower.includes('tenis') || nameLower.includes('pádel') || 
        nameLower.includes('padel')) {
      return DERASportsFacilityType.PISTA_RAQUETA;
    }
    if (nameLower.includes('frontón') || nameLower.includes('fronton')) {
      return DERASportsFacilityType.FRONTON;
    }
    if (nameLower.includes('atletismo') || nameLower.includes('pista')) {
      return DERASportsFacilityType.PISTA_ATLETISMO;
    }
    if (nameLower.includes('centro deportivo') || nameLower.includes('complejo')) {
      return DERASportsFacilityType.CENTRO_DEPORTIVO;
    }

    return DERASportsFacilityType.GENERICO;
  }

  /**
   * Geocodifica cambiando automáticamente entre capas según tipo detectado
   * 
   * Estrategia:
   * 1. Detecta tipo de instalación por nombre
   * 2. Si es golf, consulta capa 12_25_CampoGolf
   * 3. Para resto, consulta capa 12_24_EquipamientoDeportivo
   * 4. Si no encuentra, intenta con la otra capa como fallback
   */
  public async geocodeWithAutoLayer(options: SportsSearchOptions): Promise<GeocodingResult | null> {
    const detectedType = this.detectFacilityType(options.name);
    
    // Determinar orden de capas según tipo detectado
    const layerPriority: string[] = [];
    
    if (detectedType === DERASportsFacilityType.CAMPO_GOLF) {
      layerPriority.push(WFSSportsGeocoder.LAYER_GOLF);
      layerPriority.push(WFSSportsGeocoder.LAYER_DEPORTES);
    } else {
      layerPriority.push(WFSSportsGeocoder.LAYER_DEPORTES);
      // Solo añadir golf como fallback si explícitamente se solicita
      if (options.includeGolf) {
        layerPriority.push(WFSSportsGeocoder.LAYER_GOLF);
      }
    }

    const originalLayer = this.config.layerName;

    for (const layer of layerPriority) {
      this.config.layerName = layer;
      
      const result = await this.geocode(options);
      
      if (result && result.confidence >= 65) {
        // Añadir información de capa al resultado
        result.sourceLayer = layer;
        
        // Restaurar configuración
        this.config.layerName = originalLayer;
        return result;
      }
    }

    // Restaurar configuración
    this.config.layerName = originalLayer;
    return null;
  }

  /**
   * Obtiene todas las instalaciones deportivas de un municipio
   * Combina equipamientos deportivos + campos de golf
   */
  public async getAllSportsFacilitiesInMunicipality(
    municipality: string,
    province?: string,
    includeGolf: boolean = true
  ): Promise<WFSFeature[]> {
    const allFeatures: WFSFeature[] = [];
    const originalLayer = this.config.layerName;

    // Capas a consultar
    const layers = [WFSSportsGeocoder.LAYER_DEPORTES];
    if (includeGolf) {
      layers.push(WFSSportsGeocoder.LAYER_GOLF);
    }

    for (const layer of layers) {
      try {
        this.config.layerName = layer;
        
        const params = this.buildWFSParams({
          name: '',
          municipality,
          province,
          maxResults: 200
        });

        const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
        const features = this.parseResponse(response.data);
        
        // Añadir información de capa a cada feature
        features.forEach(f => {
          f.properties.capa = layer;
        });
        
        allFeatures.push(...features);

      } catch (error) {
        console.error(`Error obteniendo ${layer} de ${municipality}:`, error);
      }
    }

    // Restaurar configuración
    this.config.layerName = originalLayer;
    
    return allFeatures;
  }

  /**
   * Busca campos de golf en un área (provincia o bbox)
   */
  public async getGolfCoursesInArea(
    province?: string,
    bbox?: [number, number, number, number]
  ): Promise<WFSFeature[]> {
    const originalLayer = this.config.layerName;
    
    try {
      this.config.layerName = WFSSportsGeocoder.LAYER_GOLF;

      const params = this.buildWFSParams({
        name: '',
        province,
        bbox,
        maxResults: 150
      });

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      return this.parseResponse(response.data);

    } catch (error) {
      console.error('Error obteniendo campos de golf:', error);
      return [];
    } finally {
      this.config.layerName = originalLayer;
    }
  }

  /**
   * Busca instalaciones deportivas por tipo específico
   */
  public async searchByType(
    facilityType: DERASportsFacilityType,
    municipality?: string,
    province?: string
  ): Promise<WFSFeature[]> {
    const originalLayer = this.config.layerName;
    
    // Si es golf, usar capa específica
    if (facilityType === DERASportsFacilityType.CAMPO_GOLF) {
      this.config.layerName = WFSSportsGeocoder.LAYER_GOLF;
    } else {
      this.config.layerName = WFSSportsGeocoder.LAYER_DEPORTES;
    }

    try {
      const params = this.buildWFSParams({
        name: '',
        municipality,
        province,
        facilityType,
        maxResults: 200
      } as SportsSearchOptions);

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      return this.parseResponse(response.data);

    } catch (error) {
      console.error(`Error buscando instalaciones tipo ${facilityType}:`, error);
      return [];
    } finally {
      this.config.layerName = originalLayer;
    }
  }

  /**
   * Obtiene estadísticas de instalaciones deportivas por provincia
   */
  public async getStatsByProvince(province: string): Promise<{
    total: number;
    byType: Record<string, number>;
    municipalities: string[];
  }> {
    const features = await this.getAllSportsFacilitiesInMunicipality('', province, true);
    
    const byType: Record<string, number> = {};
    const municipalities = new Set<string>();
    
    for (const feature of features) {
      const tipo = feature.properties.tipo || 'Sin clasificar';
      byType[tipo] = (byType[tipo] || 0) + 1;
      
      if (feature.municipality) {
        municipalities.add(feature.municipality);
      }
    }
    
    return {
      total: features.length,
      byType,
      municipalities: Array.from(municipalities).sort()
    };
  }

  /**
   * Valida si el servicio DERA G12 está disponible
   */
  public async checkServiceHealth(): Promise<{
    available: boolean;
    responseTime: number;
    layersAvailable: string[];
  }> {
    const start = Date.now();
    const layersAvailable: string[] = [];
    
    try {
      // Verificar capa principal
      this.config.layerName = WFSSportsGeocoder.LAYER_DEPORTES;
      const params1 = this.buildWFSParams({ name: '', maxResults: 1 });
      const response1 = await this.axiosInstance.get(this.config.wfsEndpoint, { params: params1 });
      if (response1.data) {
        layersAvailable.push('12_24_EquipamientoDeportivo');
      }

      // Verificar capa golf
      this.config.layerName = WFSSportsGeocoder.LAYER_GOLF;
      const params2 = this.buildWFSParams({ name: '', maxResults: 1 });
      const response2 = await this.axiosInstance.get(this.config.wfsEndpoint, { params: params2 });
      if (response2.data) {
        layersAvailable.push('12_25_CampoGolf');
      }

      return {
        available: layersAvailable.length > 0,
        responseTime: Date.now() - start,
        layersAvailable
      };

    } catch (error) {
      return {
        available: false,
        responseTime: Date.now() - start,
        layersAvailable: []
      };
    }
  }
}
