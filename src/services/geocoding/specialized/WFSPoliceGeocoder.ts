/**
 * Geocodificador especializado para infraestructuras policiales de Andalucía
 * 
 * Conecta con servicios WFS de IECA/DERA para acceder a:
 * - DERA G16: Fuerzas y Cuerpos de Seguridad
 * - ISE: Equipamientos de seguridad georreferenciados
 * 
 * Fuentes oficiales:
 * - WFS DERA G16: https://www.ideandalucia.es/services/DERA_g16_seguridad/wfs
 * - Capas: g16_01_Comisaria, g16_02_CuartelGuardiaCivil, g16_03_PoliciaLocal
 * 
 * Cobertura:
 * - ~45 comisarías Policía Nacional
 * - ~120 cuarteles Guardia Civil
 * - ~35 comandancias Guardia Civil
 * - ~350 puestos Policía Local (municipales)
 * - Total: ~550 infraestructuras policiales en Andalucía
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
 * Tipos de infraestructuras policiales en Andalucía
 */
export enum PoliceFacilityType {
  /** Comisarías Policía Nacional (~45) */
  COMISARIA = 'COMISARIA',
  
  /** Cuarteles Guardia Civil (~120) */
  CUARTEL_GC = 'CUARTEL_GUARDIA_CIVIL',
  
  /** Comandancias Guardia Civil (~35) */
  COMANDANCIA = 'COMANDANCIA',
  
  /** Puestos Policía Local (~350) */
  POLICIA_LOCAL = 'POLICIA_LOCAL',
  
  /** Destacamentos Guardia Civil */
  DESTACAMENTO = 'DESTACAMENTO',
  
  /** Puestos fronterizos */
  PUESTO_FRONTERIZO = 'PUESTO_FRONTERIZO'
}

/**
 * Opciones de búsqueda específicas para infraestructuras policiales
 */
export interface PoliceSearchOptions extends WFSSearchOptions {
  /** Tipo de infraestructura policial */
  facilityType?: PoliceFacilityType;
  
  /** Cuerpo de seguridad (Policía Nacional, Guardia Civil, Local) */
  securityForce?: 'POLICIA_NACIONAL' | 'GUARDIA_CIVIL' | 'POLICIA_LOCAL';
}

/**
 * Geocodificador especializado para infraestructuras policiales andaluzas
 * 
 * Precisión esperada: ±10-25m (coordenadas oficiales Ministerio Interior)
 * Cobertura: ~550 infraestructuras policiales
 * 
 * @example
 * ```typescript
 * const geocoder = new WFSPoliceGeocoder();
 * const result = await geocoder.geocode({
 *   name: 'Comisaría Provincial de Granada',
 *   municipality: 'Granada',
 *   province: 'Granada'
 * });
 * // result.confidence >= 85 (match oficial)
 * ```
 */
export class WFSPoliceGeocoder extends WFSBaseGeocoder {
  
  /**
   * Configuración específica para servicios WFS policiales de IECA
   */
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      // DERA G16 - Seguridad
      wfsEndpoint: 'https://www.ideandalucia.es/services/DERA_g16_seguridad/wfs',
      layerName: 'g16_01_Comisaria', // Capa por defecto: Comisarías
      fuzzyThreshold: 0.35, // Threshold permisivo (nombres oficiales largos)
      timeout: 15000, // 15s para WFS IECA
      outputSRS: 'EPSG:25830' // UTM30 ETRS89
    };
  }

  /**
   * Parsea feature GeoJSON de DERA G16 a formato interno
   * 
   * Estructura esperada de DERA G16:
   * {
   *   type: "Feature",
   *   geometry: { type: "Point", coordinates: [x, y] },
   *   properties: {
   *     DENOMINACION: "Comisaría Provincial de Granada",
   *     MUNICIPIO: "Granada",
   *     PROVINCIA: "Granada",
   *     DIRECCION: "Calle Duquesa 21",
   *     TIPO_INSTALACION: "Comisaría",
   *     CUERPO_SEGURIDAD: "Policía Nacional",
   *     CODIGO_INSTALACION: "GR001"
   *   }
   * }
   */
  protected parseFeature(feature: any): WFSFeature | null {
    try {
      const props = feature.properties || {};
      const geom = feature.geometry;

      // Validar geometría
      if (!geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates)) {
        console.warn('Feature policial sin geometría válida:', feature.id);
        return null;
      }

      const [x, y] = geom.coordinates;

      // Validar coordenadas en rango UTM30 Andalucía
      if (x < 100000 || x > 800000 || y < 4000000 || y > 4300000) {
        console.warn('Coordenadas policiales fuera de rango UTM30:', x, y);
        return null;
      }

      // Extraer nombre
      const name = props.DENOMINACION || props.NOMBRE || props.NOMBRE_INSTALACION || '';

      return {
        name,
        x,
        y,
        municipality: props.MUNICIPIO || '',
        province: props.PROVINCIA || '',
        address: props.DIRECCION || props.DOMICILIO || '',
        properties: {
          facilityType: props.TIPO_INSTALACION || '',
          securityForce: props.CUERPO_SEGURIDAD || '',
          facilityCode: props.CODIGO_INSTALACION || '',
          phone: props.TELEFONO || '',
          emergencyPhone: props.TELEFONO_EMERGENCIAS || '091', // Default 091
          ...props
        }
      };
    } catch (error) {
      console.error('Error parseando feature policial:', error);
      return null;
    }
  }

  /**
   * Construye filtro CQL específico para infraestructuras policiales
   */
  protected buildCQLFilter(options: PoliceSearchOptions): string {
    const filters: string[] = [];

    // Filtro base (municipio, provincia)
    const baseFilter = super.buildCQLFilter(options);
    if (baseFilter) {
      filters.push(baseFilter);
    }

    // Filtro por cuerpo de seguridad
    if (options.securityForce) {
      const forceMap = {
        'POLICIA_NACIONAL': 'Policía Nacional',
        'GUARDIA_CIVIL': 'Guardia Civil',
        'POLICIA_LOCAL': 'Policía Local'
      };
      const forceName = forceMap[options.securityForce];
      filters.push(`CUERPO_SEGURIDAD ILIKE '%${this.escapeCQL(forceName)}%'`);
    }

    return filters.length > 0 ? filters.join(' AND ') : '';
  }

  /**
   * Geocodifica cambiando automáticamente entre capas según tipo detectado
   * 
   * Estrategia:
   * 1. Detecta cuerpo en nombre (comisaría, cuartel, policía local)
   * 2. Selecciona capa WFS apropiada
   * 3. Fallback a búsqueda genérica
   */
  public async geocodeWithAutoLayer(options: PoliceSearchOptions) {
    const nameLower = options.name.toLowerCase();
    let originalLayer = this.config.layerName;
    let result: any = null;

    // COMISARÍAS POLICÍA NACIONAL
    if (nameLower.includes('comisaría') || nameLower.includes('comisaria') ||
        nameLower.includes('policía nacional') || nameLower.includes('policia nacional')) {
      this.config.layerName = 'g16_01_Comisaria';
      result = await this.geocode(options);
      if (result && result.confidence >= 70) {
        this.config.layerName = originalLayer;
        return result;
      }
    }

    // CUARTELES GUARDIA CIVIL
    if (nameLower.includes('cuartel') || nameLower.includes('guardia civil') ||
        nameLower.includes('comandancia')) {
      this.config.layerName = 'g16_02_CuartelGuardiaCivil';
      result = await this.geocode(options);
      if (result && result.confidence >= 70) {
        this.config.layerName = originalLayer;
        return result;
      }
    }

    // POLICÍA LOCAL
    if (nameLower.includes('policía local') || nameLower.includes('policia local') ||
        nameLower.includes('pol. local') || nameLower.includes('seguridad ciudadana')) {
      this.config.layerName = 'g16_03_PoliciaLocal';
      result = await this.geocode(options);
      if (result && result.confidence >= 70) {
        this.config.layerName = originalLayer;
        return result;
      }
    }

    // Fallback: Intenta con capa genérica de seguridad
    this.config.layerName = 'g16_00_InstalacionSeguridad';
    result = await this.geocode(options);
    
    // Restaurar capa original
    this.config.layerName = originalLayer;
    return result;
  }

  /**
   * Obtiene todas las infraestructuras policiales de un municipio
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
        maxResults: 50 // Raramente más de 10-20 infraestructuras/municipio
      });

      const response = await this.axiosInstance.get(this.config.wfsEndpoint, { params });
      return this.parseResponse(response.data);

    } catch (error) {
      console.error(`Error obteniendo infraestructuras policiales de ${municipality}:`, error);
      return [];
    }
  }

  /**
   * Valida coordenadas contra infraestructuras policiales oficiales
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
        maxResults: 5
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
      console.error('Error validando coordenadas policiales:', error);
      return null;
    }
  }

  /**
   * Búsqueda optimizada para municipios pequeños
   * En municipios pequeños típicamente hay 1-2 infraestructuras máximo
   */
  public async geocodeSmallMunicipality(
    municipality: string,
    province: string
  ): Promise<WFSFeature[]> {
    try {
      // Buscar todas las infraestructuras del municipio
      const all = await this.getAllFacilitiesInMunicipality(municipality, province);

      // Si hay 0-2 infraestructuras, retornar todas (alta confianza)
      if (all.length <= 2) {
        return all;
      }

      // Si hay 3+, priorizar Policía Local y Guardia Civil
      return all
        .filter(f => 
          f.properties.securityForce?.toLowerCase().includes('local') ||
          f.properties.securityForce?.toLowerCase().includes('guardia civil')
        )
        .slice(0, 2);

    } catch (error) {
      console.error(`Error en geocodificación municipio pequeño ${municipality}:`, error);
      return [];
    }
  }
}
