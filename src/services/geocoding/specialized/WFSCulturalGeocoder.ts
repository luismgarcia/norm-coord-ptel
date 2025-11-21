/**
 * Geocodificador especializado para infraestructuras culturales de Andalucía
 * 
 * Conecta con servicios WFS de IAPH (Instituto Andaluz del Patrimonio Histórico)
 * y DERA para acceder a:
 * - IAPH: Base de Datos del Patrimonio Cultural de Andalucía (~7,000 BIC)
 * - DERA G14: Equipamientos culturales municipales
 * 
 * Fuentes oficiales:
 * - WFS IAPH: https://www.ideandalucia.es/services/IAPH_patrimonio/wfs
 * - WFS DERA G14: https://www.ideandalucia.es/services/DERA_g14_cultura/wfs
 * - Capas: museo, biblioteca, teatro, monumento, conjunto_historico
 * 
 * Cobertura:
 * - ~350 museos
 * - ~800 bibliotecas públicas
 * - ~200 teatros/auditorios
 * - ~5,000+ BIC (Bienes Interés Cultural): monumentos, conjuntos históricos
 * - ~650 centros culturales municipales
 * - Total: ~7,000 infraestructuras culturales en Andalucía
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
 * Tipos de infraestructuras culturales en Andalucía
 */
export enum CulturalFacilityType {
  /** Museos (~350) */
  MUSEUM = 'MUSEO',
  
  /** Bibliotecas públicas (~800) */
  LIBRARY = 'BIBLIOTECA',
  
  /** Teatros y auditorios (~200) */
  THEATER = 'TEATRO',
  
  /** Centros culturales municipales (~650) */
  CULTURAL_CENTER = 'CENTRO_CULTURAL',
  
  /** Monumentos BIC (~3,000) */
  MONUMENT = 'MONUMENTO',
  
  /** Conjuntos históricos BIC (~500) */
  HISTORICAL_SITE = 'CONJUNTO_HISTORICO',
  
  /** Archivos históricos */
  ARCHIVE = 'ARCHIVO',
  
  /** Casas de la Cultura */
  CASA_CULTURA = 'CASA_CULTURA'
}

/**
 * Opciones de búsqueda específicas para infraestructuras culturales
 */
export interface CulturalSearchOptions extends WFSSearchOptions {
  /** Tipo de infraestructura cultural */
  facilityType?: CulturalFacilityType;
  
  /** Titularidad (público, privado) */
  ownership?: 'PUBLICO' | 'PRIVADO';
  
  /** Figura de protección (BIC, Catálogo General) */
  protectionLevel?: string;
}

/**
 * Geocodificador especializado para infraestructuras culturales andaluzas
 * 
 * Precisión esperada:
 * - Museos/Bibliotecas/Teatros: ±5-10m (coordenadas oficiales)
 * - BIC/Monumentos: ±2-5m (coordenadas IAPH alta precisión)
 * - Centros culturales: ±10-20m (coordenadas municipales)
 * 
 * Cobertura: ~7,000 infraestructuras culturales
 * 
 * @example
 * ```typescript
 * const geocoder = new WFSCulturalGeocoder();
 * const result = await geocoder.geocode({
 *   name: 'Museo de la Alhambra',
 *   municipality: 'Granada',
 *   province: 'Granada'
 * });
 * // result.confidence >= 90 (match oficial IAPH)
 * ```
 */
export class WFSCulturalGeocoder extends WFSBaseGeocoder {
  
  /**
   * Configuración específica para servicios WFS culturales IAPH/IECA
   */
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      // IAPH - Patrimonio Cultural
      wfsEndpoint: 'https://www.ideandalucia.es/services/IAPH_patrimonio/wfs',
      layerName: 'museo', // Capa por defecto: Museos
      fuzzyThreshold: 0.3, // Threshold estándar (nombres variados)
      timeout: 15000, // 15s para WFS IAPH
      outputSRS: 'EPSG:25830' // UTM30 ETRS89
    };
  }

  /**
   * Parsea feature GeoJSON de IAPH a formato interno
   * 
   * Estructura esperada de IAPH:
   * {
   *   type: "Feature",
   *   geometry: { type: "Point", coordinates: [x, y] },
   *   properties: {
   *     DENOMINACION: "Museo de la Alhambra",
   *     MUNICIPIO: "Granada",
   *     PROVINCIA: "Granada",
   *     DIRECCION: "Calle Real de la Alhambra s/n",
   *     TIPO_BIEN: "Museo",
   *     FIGURA_PROTECCION: "BIC",
   *     FECHA_DECLARACION: "1870-06-04",
   *     CODIGO_IAPH: "01180010001"
   *   }
   * }
   */
  protected parseFeature(feature: any): WFSFeature | null {
    try {
      const props = feature.properties || {};
      const geom = feature.geometry;

      // Validar geometría
      if (!geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates)) {
        console.warn('Feature cultural sin geometría válida:', feature.id);
        return null;
      }

      const [x, y] = geom.coordinates;

      // Validar coordenadas en rango UTM30 Andalucía
      if (x < 100000 || x > 800000 || y < 4000000 || y > 4300000) {
        console.warn('Coordenadas culturales fuera de rango UTM30:', x, y);
        return null;
      }

      // Extraer nombre con prioridad a denominación oficial
      const name = props.DENOMINACION || props.NOMBRE || props.NOMBRE_BIEN || '';

      return {
        name,
        x,
        y,
        municipality: props.MUNICIPIO || '',
        province: props.PROVINCIA || '',
        address: props.DIRECCION || props.DOMICILIO || props.LOCALIZACION || '',
        properties: {
          facilityType: props.TIPO_BIEN || props.TIPO_INSTALACION || '',
          protectionLevel: props.FIGURA_PROTECCION || '',
          declarationDate: props.FECHA_DECLARACION || '',
          iaphCode: props.CODIGO_IAPH || '',
          description: props.DESCRIPCION || '',
          ...props
        }
      };
    } catch (error) {
      console.error('Error parseando feature cultural:', error);
      return null;
    }
  }

  /**
   * Construye filtro CQL específico para infraestructuras culturales
   */
  protected buildCQLFilter(options: CulturalSearchOptions): string {
    const filters: string[] = [];

    // Filtro base (municipio, provincia)
    const baseFilter = super.buildCQLFilter(options);
    if (baseFilter) {
      filters.push(baseFilter);
    }

    // Filtro por figura de protección
    if (options.protectionLevel) {
      filters.push(`FIGURA_PROTECCION ILIKE '%${this.escapeCQL(options.protectionLevel)}%'`);
    }

    // Filtro por titularidad
    if (options.ownership) {
      filters.push(`TITULARIDAD ILIKE '%${this.escapeCQL(options.ownership)}%'`);
    }

    return filters.length > 0 ? filters.join(' AND ') : '';
  }

  /**
   * Geocodifica cambiando automáticamente entre capas según tipo detectado
   * 
   * Estrategia en cascada:
   * 1. Detecta tipo en nombre (museo, biblioteca, teatro, etc)
   * 2. Prueba capa IAPH específica (alta precisión)
   * 3. Fallback a DERA G14 equipamientos culturales
   * 4. Fallback a capa genérica BIC
   */
  public async geocodeWithAutoLayer(options: CulturalSearchOptions) {
    const nameLower = options.name.toLowerCase();
    let originalLayer = this.config.layerName;
    let originalEndpoint = this.config.wfsEndpoint;
    let result: any = null;

    // MUSEOS - Alta prioridad IAPH
    if (nameLower.includes('museo')) {
      this.config.layerName = 'museo';
      this.config.wfsEndpoint = 'https://www.ideandalucia.es/services/IAPH_patrimonio/wfs';
      result = await this.geocode(options);
      if (result && result.confidence >= 70) {
        this.restoreConfig(originalEndpoint, originalLayer);
        return result;
      }
    }

    // BIBLIOTECAS - Equipamientos DERA G14
    if (nameLower.includes('biblioteca')) {
      this.config.layerName = 'g14_01_Biblioteca';
      this.config.wfsEndpoint = 'https://www.ideandalucia.es/services/DERA_g14_cultura/wfs';
      result = await this.geocode(options);
      if (result && result.confidence >= 70) {
        this.restoreConfig(originalEndpoint, originalLayer);
        return result;
      }
    }

    // TEATROS/AUDITORIOS - Equipamientos DERA G14
    if (nameLower.includes('teatro') || nameLower.includes('auditorio')) {
      this.config.layerName = 'g14_02_Teatro';
      this.config.wfsEndpoint = 'https://www.ideandalucia.es/services/DERA_g14_cultura/wfs';
      result = await this.geocode(options);
      if (result && result.confidence >= 70) {
        this.restoreConfig(originalEndpoint, originalLayer);
        return result;
      }
    }

    // CENTROS CULTURALES / CASAS DE LA CULTURA
    if (nameLower.includes('centro cultural') || nameLower.includes('casa de la cultura') ||
        nameLower.includes('casa cultura')) {
      this.config.layerName = 'g14_03_CentroCultural';
      this.config.wfsEndpoint = 'https://www.ideandalucia.es/services/DERA_g14_cultura/wfs';
      result = await this.geocode(options);
      if (result && result.confidence >= 70) {
        this.restoreConfig(originalEndpoint, originalLayer);
        return result;
      }
    }

    // MONUMENTOS/PATRIMONIO - BIC IAPH
    if (nameLower.includes('monumento') || nameLower.includes('castillo') ||
        nameLower.includes('iglesia') || nameLower.includes('ermita') ||
        nameLower.includes('palacio')) {
      this.config.layerName = 'monumento_bic';
      this.config.wfsEndpoint = 'https://www.ideandalucia.es/services/IAPH_patrimonio/wfs';
      result = await this.geocode(options);
      if (result && result.confidence >= 70) {
        this.restoreConfig(originalEndpoint, originalLayer);
        return result;
      }
    }

    // Fallback genérico: Capa completa patrimonio IAPH
    this.config.layerName = 'bien_interes_cultural';
    this.config.wfsEndpoint = 'https://www.ideandalucia.es/services/IAPH_patrimonio/wfs';
    result = await this.geocode(options);
    
    // Restaurar configuración original
    this.restoreConfig(originalEndpoint, originalLayer);
    return result;
  }

  /**
   * Restaura configuración original tras búsqueda multi-capa
   */
  private restoreConfig(endpoint: string, layer: string): void {
    this.config.wfsEndpoint = endpoint;
    this.config.layerName = layer;
  }

  /**
   * Obtiene todas las infraestructuras culturales de un municipio
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
        maxResults: 500 // Municipios patrimoniales pueden tener 100+ BIC
      });

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      return this.parseResponse(response.data);

    } catch (error) {
      console.error(`Error obteniendo infraestructuras culturales de ${municipality}:`, error);
      return [];
    }
  }

  /**
   * Valida coordenadas contra patrimonio cultural oficial
   */
  public async validateCoordinates(
    x: number,
    y: number,
    radius: number = 500
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
      console.error('Error validando coordenadas culturales:', error);
      return null;
    }
  }

  /**
   * Busca bienes culturales por código oficial IAPH
   * Útil cuando el PTEL tiene código IAPH pero no coordenadas
   * 
   * @param iaphCode - Código oficial IAPH (ej: "01180010001")
   * @returns Feature del bien cultural o null
   */
  public async geocodeByIAPHCode(iaphCode: string): Promise<WFSFeature | null> {
    try {
      const params = this.buildWFSParams({
        name: '',
        maxResults: 1
      });

      // Agregar filtro por código IAPH
      params['CQL_FILTER'] = `CODIGO_IAPH = '${this.escapeCQL(iaphCode)}'`;

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      const features = this.parseResponse(response.data);

      return features.length > 0 ? features[0] : null;

    } catch (error) {
      console.error(`Error buscando bien cultural por código ${iaphCode}:`, error);
      return null;
    }
  }

  /**
   * Búsqueda especializada para patrimonio religioso
   * Combina capas IAPH + DERA para máxima cobertura
   */
  public async geocodeReligiousSite(
    name: string,
    municipality: string,
    province?: string
  ): Promise<any> {
    // Intento 1: IAPH Patrimonio religioso (alta precisión)
    this.config.layerName = 'bien_interes_cultural';
    this.config.wfsEndpoint = 'https://www.ideandalucia.es/services/IAPH_patrimonio/wfs';
    
    let result = await this.geocode({ name, municipality, province });
    if (result && result.confidence >= 75) {
      return result;
    }

    // Intento 2: DERA G15 Lugares de culto
    this.config.layerName = 'g15_01_LugarCulto';
    this.config.wfsEndpoint = 'https://www.ideandalucia.es/services/DERA_g15_religion/wfs';
    
    result = await this.geocode({ name, municipality, province });
    return result;
  }
}
