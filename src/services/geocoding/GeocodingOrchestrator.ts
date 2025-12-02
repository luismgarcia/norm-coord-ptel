/**
 * Orquestador de Geocodificación Especializada v2.0
 * 
 * Integra clasificación tipológica con geocodificadores especializados WFS,
 * NGA (topónimos), IAID (deportes), Overpass (OSM) y fallbacks genéricos
 * (CDAU, CartoCiudad) para máxima precisión y cobertura en infraestructuras
 * PTEL Andalucía.
 * 
 * Cascada de geocodificación (10 niveles):
 * L1. Geocodificador especializado WFS según tipología (DERA)
 * L2. NGA - Nomenclátor Geográfico Andalucía (topónimos: parajes, cerros)
 * L3. IAID - Instalaciones Deportivas (piscinas, campos)
 * L4. Overpass/OSM - OpenStreetMap (antenas, industrias, varios)
 * L5. CDAU - Callejero Digital Andalucía
 * L6. CartoCiudad - IGN (fallback universal España)
 * 
 * Cobertura esperada: ~85-92% con todos los geocodificadores activos
 * 
 * @module services/geocoding
 */

import { InfrastructureClassifier } from '../classification/InfrastructureClassifier';
import { 
  InfrastructureType, 
  GeocodingResult,
  ClassificationResult 
} from '../../types/infrastructure';

// Geocodificadores especializados WFS
import {
  WFSHealthGeocoder,
  WFSEducationGeocoder,
  WFSCulturalGeocoder,
  WFSSecurityGeocoder,
  WFSHydraulicGeocoder,
  WFSEnergyGeocoder,
  // Nuevos geocodificadores Fase B
  NGAGeocoder,
  IAIDGeocoder,
  OverpassGeocoder,
  type WFSSearchOptions
} from './specialized';

// Geocodificadores genéricos (fallback)
import { 
  CartoCiudadGeocoder,
  CDAUGeocoder 
} from './generic';

// Validación por código INE (previene errores Colomera/Colomers)
import { 
  validarResultadoCartoCiudad, 
  esAndalucia 
} from './ineValidator';
import { getCodigoINE } from '../../utils/codigosINEDerivados';

/**
 * Opciones para geocodificación orquestada
 */
export interface OrchestrationOptions {
  /** Nombre de infraestructura */
  name: string;
  
  /** Municipio (CRÍTICO para filtrado espacial) */
  municipality: string;
  
  /** Provincia */
  province: string;
  
  /** Dirección postal (para fallbacks genéricos) */
  address?: string;
  
  /** Tipo forzado (omitir clasificación automática) */
  forceType?: InfrastructureType;
  
  /** Usar fallback genérico si falla especializado */
  useGenericFallback?: boolean;
  
  /** Usar NGA para topónimos */
  useNGA?: boolean;
  
  /** Usar IAID para deportes */
  useIAID?: boolean;
  
  /** Usar Overpass/OSM */
  useOverpass?: boolean;
  
  /** Timeout total en ms */
  timeout?: number;
}

/**
 * Resultado de geocodificación orquestada
 */
export interface OrchestrationResult {
  /** Resultado de geocodificación (null si falla todo) */
  geocoding: GeocodingResult | null;
  
  /** Clasificación tipológica aplicada */
  classification: ClassificationResult;
  
  /** Geocodificador usado ('specialized:health' | 'nga' | 'iaid' | 'overpass' | 'cdau' | 'cartociudad' | 'none') */
  geocoderUsed: string;
  
  /** Tiempo total de procesamiento en ms */
  processingTime: number;
  
  /** Errores encontrados durante proceso */
  errors: string[];
  
  /** Intentos realizados */
  attempts: string[];
}

/**
 * Orquestador principal de geocodificación v2.0
 * 
 * Gestiona flujo completo con 10 niveles de cascada
 * 
 * @example
 * ```typescript
 * const orchestrator = new GeocodingOrchestrator();
 * 
 * // Geocodificar una piscina municipal sin dirección
 * const result = await orchestrator.geocode({
 *   name: 'Piscina Municipal',
 *   municipality: 'Colomera',
 *   province: 'Granada',
 *   useIAID: true  // Usar censo deportivo
 * });
 * 
 * // Geocodificar antena en un cerro
 * const antena = await orchestrator.geocode({
 *   name: 'Antena Movistar',
 *   municipality: 'Colomera',
 *   province: 'Granada',
 *   address: 'Cerro Cementerio',  // Topónimo como referencia
 *   useNGA: true,    // Buscar topónimo
 *   useOverpass: true // Buscar antena en OSM
 * });
 * ```
 */
export class GeocodingOrchestrator {
  // Clasificador tipológico
  private classifier: InfrastructureClassifier;
  
  // Geocodificadores especializados WFS (Fase 1)
  private healthGeocoder: WFSHealthGeocoder;
  private educationGeocoder: WFSEducationGeocoder;
  private culturalGeocoder: WFSCulturalGeocoder;
  private securityGeocoder: WFSSecurityGeocoder;
  private hydraulicGeocoder: WFSHydraulicGeocoder;
  private energyGeocoder: WFSEnergyGeocoder;
  
  // Nuevos geocodificadores (Fase B)
  private ngaGeocoder: NGAGeocoder;
  private iaidGeocoder: IAIDGeocoder;
  private overpassGeocoder: OverpassGeocoder;
  
  // Geocodificadores genéricos (fallback)
  private cdauGeocoder: CDAUGeocoder;
  private cartoCiudadGeocoder: CartoCiudadGeocoder;

  constructor() {
    // Inicializar clasificador
    this.classifier = new InfrastructureClassifier({
      strictMode: false,
      caseSensitive: false
    });

    // Inicializar geocodificadores especializados WFS
    this.healthGeocoder = new WFSHealthGeocoder();
    this.educationGeocoder = new WFSEducationGeocoder();
    this.culturalGeocoder = new WFSCulturalGeocoder();
    this.securityGeocoder = new WFSSecurityGeocoder();
    this.hydraulicGeocoder = new WFSHydraulicGeocoder();
    this.energyGeocoder = new WFSEnergyGeocoder();
    
    // Inicializar nuevos geocodificadores (Fase B)
    this.ngaGeocoder = new NGAGeocoder();
    this.iaidGeocoder = new IAIDGeocoder();
    this.overpassGeocoder = new OverpassGeocoder();
    
    // Inicializar geocodificadores genéricos
    this.cdauGeocoder = new CDAUGeocoder();
    this.cartoCiudadGeocoder = new CartoCiudadGeocoder();
  }

  /**
   * Geocodifica una infraestructura usando clasificación + cascada completa
   */
  public async geocode(options: OrchestrationOptions): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const attempts: string[] = [];

    // Opciones por defecto para nuevos geocodificadores
    const useNGA = options.useNGA !== false;
    const useIAID = options.useIAID !== false;
    const useOverpass = options.useOverpass !== false;

    try {
      // Paso 1: Clasificar tipología (o usar tipo forzado)
      const classification = options.forceType 
        ? { 
            type: options.forceType, 
            confidence: 'ALTA' as const,
            keywords: [] 
          }
        : this.classifier.classify(options.name);

      // Paso 2: Preparar opciones de búsqueda
      const searchOptions: WFSSearchOptions = {
        name: options.name,
        municipality: options.municipality,
        province: options.province,
        maxResults: 10
      };

      let geocodingResult: GeocodingResult | null = null;
      let geocoderUsed = 'none';

      // ===== NIVEL 1: GEOCODIFICADOR ESPECIALIZADO WFS =====
      const specializedResult = await this.trySpecializedGeocoder(
        classification.type,
        searchOptions,
        attempts
      );

      if (specializedResult.result && specializedResult.result.confidence >= 70) {
        geocodingResult = specializedResult.result;
        geocoderUsed = specializedResult.geocoder;
      }

      // ===== NIVEL 2: NGA - NOMENCLÁTOR GEOGRÁFICO (para topónimos) =====
      if (!geocodingResult && useNGA) {
        // Buscar si la dirección/nombre contiene un topónimo
        const toponymSearch = options.address || options.name;
        
        if (this.looksLikeToponym(toponymSearch)) {
          attempts.push('nga');
          try {
            const ngaResult = await this.ngaGeocoder.geocodeWithTypeDetection({
              name: toponymSearch,
              municipality: options.municipality,
              province: options.province
            });
            
            if (ngaResult && ngaResult.confidence >= 55) {
              geocodingResult = ngaResult;
              geocoderUsed = 'nga:toponym';
            }
          } catch (err) {
            errors.push(`NGA: ${err}`);
          }
        }
      }

      // ===== NIVEL 3: IAID - INSTALACIONES DEPORTIVAS =====
      if (!geocodingResult && useIAID && this.isSportsFacility(classification.type, options.name)) {
        attempts.push('iaid');
        try {
          const iaidResult = await this.iaidGeocoder.geocodeWithFallback({
            name: options.name,
            municipality: options.municipality,
            province: options.province
          });
          
          if (iaidResult && iaidResult.confidence >= 60) {
            geocodingResult = iaidResult;
            geocoderUsed = 'iaid:sports';
          }
        } catch (err) {
          errors.push(`IAID: ${err}`);
        }
      }

      // ===== NIVEL 4: OVERPASS/OSM =====
      if (!geocodingResult && useOverpass) {
        attempts.push('overpass');
        try {
          // Determinar qué tipo de búsqueda OSM hacer
          if (this.isTelecomInfrastructure(options.name)) {
            // Buscar antenas específicamente
            const towers = await this.overpassGeocoder.findTelecomTowers(
              options.municipality,
              options.province
            );
            
            if (towers.length > 0) {
              // Buscar el topónimo de la dirección para match
              const address = options.address || '';
              const matchingTower = this.findMatchingTower(towers, address, options.name);
              
              if (matchingTower) {
                const coords = this.overpassGeocoder.toUTM30(matchingTower.lon, matchingTower.lat);
                geocodingResult = {
                  x: coords.x,
                  y: coords.y,
                  confidence: 70,
                  source: 'OpenStreetMap',
                  matchedName: matchingTower.name,
                  municipality: options.municipality,
                  province: options.province
                };
                geocoderUsed = 'overpass:telecom';
              }
            }
          } else {
            // Búsqueda genérica en OSM
            const osmResult = await this.overpassGeocoder.geocode({
              name: options.name,
              municipality: options.municipality,
              province: options.province,
              infrastructureType: classification.type
            });
            
            if (osmResult && osmResult.confidence >= 55) {
              geocodingResult = osmResult;
              geocoderUsed = 'overpass:general';
            }
          }
        } catch (err) {
          errors.push(`Overpass: ${err}`);
        }
      }

      // ===== NIVEL 5: CDAU (Callejero Andalucía) =====
      if (!geocodingResult && options.useGenericFallback !== false) {
        attempts.push('cdau');
        try {
          const cdauResult = await this.cdauGeocoder.geocode({
            street: options.address || options.name,
            municipality: options.municipality,
            province: options.province
          });

          if (cdauResult && cdauResult.confidence >= 60) {
            geocodingResult = cdauResult;
            geocoderUsed = 'generic:cdau';
          }
        } catch (err) {
          errors.push(`CDAU: ${err}`);
        }
      }

      // ===== NIVEL 6: CARTOCIUDAD (Fallback universal) + VALIDACIÓN INE =====
      if (!geocodingResult && options.useGenericFallback !== false) {
        attempts.push('cartociudad');
        try {
          const address = options.address 
            ? `${options.address}, ${options.municipality}`
            : `${options.name}, ${options.municipality}`;
          
          const cartoCiudadResult = await this.cartoCiudadGeocoder.geocode({
            address,
            municipality: options.municipality,
            province: options.province
          });

          if (cartoCiudadResult) {
            // ===== VALIDACIÓN POR CÓDIGO INE =====
            // Obtener código INE esperado para el municipio
            const codigoINEEsperado = getCodigoINE(options.municipality, options.province);
            
            // Validar que el resultado corresponde al municipio correcto
            // Esto previene errores como Colomera(Granada) vs Colomers(Girona)
            const validacionINE = validarResultadoCartoCiudad(
              {
                muni: cartoCiudadResult.municipality,
                muniCode: cartoCiudadResult.muniCode,
                province: cartoCiudadResult.province,
                lat: cartoCiudadResult.y,
                lng: cartoCiudadResult.x
              },
              options.municipality,
              options.province,
              codigoINEEsperado || undefined,
              true // logearRechazos
            );
            
            if (validacionINE.valido) {
              geocodingResult = cartoCiudadResult;
              geocoderUsed = 'generic:cartociudad';
              
              if (cartoCiudadResult.confidence < 70) {
                errors.push('CartoCiudad: match de baja confianza');
              }
            } else {
              // Resultado rechazado por validación INE
              errors.push(`CartoCiudad: ${validacionINE.error}`);
              console.warn(`[GeocodingOrchestrator] Resultado CartoCiudad rechazado por validación INE: ${validacionINE.error}`);
              // El resultado NO se acepta, continuará al siguiente nivel (Nominatim)
            }
          }
        } catch (err) {
          errors.push(`CartoCiudad: ${err}`);
        }
      }

      // ===== NIVEL 7: NOMINATIM OSM (último recurso) =====
      if (!geocodingResult && useOverpass) {
        attempts.push('nominatim');
        try {
          const searchText = options.address || options.name;
          const nominatimResult = await this.overpassGeocoder.geocodeWithNominatim(
            searchText,
            options.municipality,
            options.province
          );
          
          if (nominatimResult && nominatimResult.confidence >= 40) {
            geocodingResult = nominatimResult;
            geocoderUsed = 'nominatim';
          }
        } catch (err) {
          errors.push(`Nominatim: ${err}`);
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        geocoding: geocodingResult,
        classification,
        geocoderUsed,
        processingTime,
        errors,
        attempts
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      errors.push(`Error crítico: ${error}`);

      return {
        geocoding: null,
        classification: {
          type: InfrastructureType.GENERIC,
          confidence: 'NULA' as const,
          keywords: []
        },
        geocoderUsed: 'none',
        processingTime,
        errors,
        attempts
      };
    }
  }

  /**
   * Intenta geocodificación con geocodificador especializado según tipo
   */
  private async trySpecializedGeocoder(
    type: InfrastructureType,
    options: WFSSearchOptions,
    attempts: string[]
  ): Promise<{ result: GeocodingResult | null; geocoder: string }> {
    
    let result: GeocodingResult | null = null;
    let geocoder = 'none';

    switch (type) {
      case InfrastructureType.HEALTH:
        attempts.push('specialized:health');
        result = await this.healthGeocoder.geocodeWithAutoLayer(options);
        geocoder = result ? 'specialized:health' : geocoder;
        break;

      case InfrastructureType.EDUCATION:
        attempts.push('specialized:education');
        result = await this.educationGeocoder.geocode(options);
        geocoder = result ? 'specialized:education' : geocoder;
        break;

      case InfrastructureType.CULTURAL:
        attempts.push('specialized:cultural');
        result = await this.culturalGeocoder.geocodeWithAutoLayer(options);
        geocoder = result ? 'specialized:cultural' : geocoder;
        break;

      case InfrastructureType.POLICE:
      case InfrastructureType.FIRE:
      case InfrastructureType.EMERGENCY:
        attempts.push('specialized:security');
        result = await this.securityGeocoder.geocodeWithAutoLayer(options);
        geocoder = result ? 'specialized:security' : geocoder;
        break;

      case InfrastructureType.HYDRAULIC:
        attempts.push('specialized:hydraulic');
        result = await this.hydraulicGeocoder.geocodeWithAutoLayer(options);
        geocoder = result ? 'specialized:hydraulic' : geocoder;
        break;

      case InfrastructureType.ENERGY:
        attempts.push('specialized:energy');
        result = await this.energyGeocoder.geocodeWithAutoLayer(options);
        geocoder = result ? 'specialized:energy' : geocoder;
        break;

      case InfrastructureType.SPORTS:
        // SPORTS ahora va a IAID (se maneja en nivel L3)
        break;

      case InfrastructureType.TELECOM:
        // TELECOM va a Overpass/OSM (se maneja en nivel L4)
        break;

      case InfrastructureType.VIAL:
        // VIAL es difícilmente geocodificable como punto
        break;

      case InfrastructureType.INDUSTRIAL:
        // INDUSTRIAL va a Overpass/OSM (se maneja en nivel L4)
        break;

      case InfrastructureType.GENERIC:
      default:
        // Tipos genéricos van directo a fallback
        break;
    }

    return { result, geocoder };
  }

  /**
   * Detecta si un texto parece ser un topónimo (paraje, cerro, era, etc.)
   */
  private looksLikeToponym(text: string): boolean {
    const toponymPatterns = [
      /\b(paraje|pago|partido|sitio)\b/i,
      /\b(cerro|loma|colina|alto|cabezo|peñón)\b/i,
      /\b(cortijo|cortijada|caserío|venta|molino)\b/i,
      /\b(arroyo|rambla|barranco)\b/i,
      /\b(fuente|manantial|aljibe)\b/i,
      /\b(era|eras|ejido)\b/i,
      /\b(cañada|vereda|cordel|colada)\b/i,
      /\b(llano|vega|hoya)\b/i
    ];
    
    return toponymPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Detecta si es una instalación deportiva
   */
  private isSportsFacility(type: InfrastructureType, name: string): boolean {
    if (type === InfrastructureType.SPORTS) return true;
    
    const sportsPatterns = [
      /\b(piscina|nataci[oó]n)\b/i,
      /\b(campo|estadio|f[uú]tbol)\b/i,
      /\b(polideportivo|pabellón|pabell[oó]n)\b/i,
      /\b(pista|cancha|frontón)\b/i,
      /\b(gimnasio)\b/i
    ];
    
    return sportsPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Detecta si es infraestructura de telecomunicaciones
   */
  private isTelecomInfrastructure(name: string): boolean {
    const telecomPatterns = [
      /\b(antena|torre)\b/i,
      /\b(movistar|vodafone|orange|yoigo|masmovil)\b/i,
      /\b(telecom|telecomunicaci[oó]n)\b/i,
      /\b(repetidor|bts|estaci[oó]n base)\b/i
    ];
    
    return telecomPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Busca torre de telecomunicaciones que coincida con topónimo o nombre
   */
  private findMatchingTower(
    towers: any[],
    address: string,
    name: string
  ): any | null {
    // Si solo hay una torre, retornarla
    if (towers.length === 1) {
      return towers[0];
    }

    // Intentar match por nombre de operador
    const operator = this.extractOperator(name);
    if (operator) {
      const byOperator = towers.find(t => 
        t.tags?.operator?.toLowerCase().includes(operator) ||
        t.name?.toLowerCase().includes(operator)
      );
      if (byOperator) return byOperator;
    }

    // Si no hay match específico, retornar la primera
    return towers[0];
  }

  /**
   * Extrae operador de telecomunicaciones del nombre
   */
  private extractOperator(name: string): string | null {
    const operators = ['movistar', 'vodafone', 'orange', 'yoigo', 'masmovil'];
    const nameLower = name.toLowerCase();
    return operators.find(op => nameLower.includes(op)) || null;
  }

  /**
   * Geocodifica múltiples infraestructuras en batch
   */
  public async geocodeBatch(
    infrastructures: OrchestrationOptions[],
    onProgress?: (current: number, total: number) => void
  ): Promise<OrchestrationResult[]> {
    const BATCH_SIZE = 5;
    const results: OrchestrationResult[] = [];

    for (let i = 0; i < infrastructures.length; i += BATCH_SIZE) {
      const batch = infrastructures.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(opts => this.geocode(opts))
      );
      results.push(...batchResults);

      if (onProgress) {
        onProgress(Math.min(i + BATCH_SIZE, infrastructures.length), infrastructures.length);
      }

      if (i + BATCH_SIZE < infrastructures.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Obtiene estadísticas de clasificación para un conjunto de nombres
   */
  public analyzeDataset(names: string[]): {
    byType: Record<string, number>;
    byConfidence: Record<string, number>;
    totalSpecializedCoverage: number;
    estimatedGeocodingSuccess: number;
  } {
    const classifications = names.map(name => this.classifier.classify(name));

    const byType: Record<string, number> = {};
    const byConfidence: Record<string, number> = {};
    let specializedCount = 0;

    classifications.forEach(c => {
      byType[c.type] = (byType[c.type] || 0) + 1;
      byConfidence[c.confidence] = (byConfidence[c.confidence] || 0) + 1;

      if (c.type !== InfrastructureType.GENERIC) {
        specializedCount++;
      }
    });

    const totalSpecializedCoverage = (specializedCount / names.length) * 100;
    
    // Con los nuevos geocodificadores, el éxito estimado es mayor:
    // - Especializados: ~85% éxito
    // - Genéricos con cascada completa: ~75% éxito
    const estimatedGeocodingSuccess = 
      (specializedCount * 0.85 + (names.length - specializedCount) * 0.75) / names.length * 100;

    return {
      byType,
      byConfidence,
      totalSpecializedCoverage,
      estimatedGeocodingSuccess
    };
  }

  /**
   * Limpia cachés de todos los geocodificadores
   */
  public clearAllCaches(): void {
    // Especializados WFS
    this.healthGeocoder.clearCache();
    this.educationGeocoder.clearCache();
    this.culturalGeocoder.clearCache();
    this.securityGeocoder.clearCache();
    this.hydraulicGeocoder.clearCache();
    this.energyGeocoder.clearCache();
    
    // Nuevos geocodificadores
    this.ngaGeocoder.clearCache();
    this.iaidGeocoder.clearCache();
    this.overpassGeocoder.clearCache();
    
    // Genéricos
    this.cdauGeocoder.clearCache();
    this.cartoCiudadGeocoder.clearCache();
    
    console.log('✅ Cachés de todos los geocodificadores limpiados');
  }

  /**
   * Obtiene estadísticas de todos los geocodificadores
   */
  public getAllStats() {
    return {
      specialized: {
        health: this.healthGeocoder.getStats(),
        education: this.educationGeocoder.getStats(),
        cultural: this.culturalGeocoder.getStats(),
        security: this.securityGeocoder.getStats(),
        hydraulic: this.hydraulicGeocoder.getStats(),
        energy: this.energyGeocoder.getStats()
      },
      phaseB: {
        nga: this.ngaGeocoder.getStats(),
        iaid: this.iaidGeocoder.getStats(),
        overpass: { cacheSize: 0, endpoint: 'overpass-api.de', layer: 'osm' }
      },
      generic: {
        cdau: this.cdauGeocoder.getStats(),
        cartociudad: this.cartoCiudadGeocoder.getStats()
      }
    };
  }

  /**
   * Resetea estadísticas de todos los geocodificadores
   */
  public resetAllStats(): void {
    this.cdauGeocoder.resetStats();
    this.cartoCiudadGeocoder.resetStats();
    console.log('✅ Estadísticas reseteadas');
  }
}
