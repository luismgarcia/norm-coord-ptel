/**
 * Orquestador de Geocodificación Especializada v2.1
 * 
 * Integra clasificación tipológica con geocodificadores especializados WFS,
 * datos locales DERA (offline), NGA (topónimos), IAID (deportes), 
 * Overpass (OSM) y fallbacks genéricos (CDAU, CartoCiudad) para máxima 
 * precisión y cobertura en infraestructuras PTEL Andalucía.
 * 
 * Cascada de geocodificación (8 niveles - OFFLINE-FIRST):
 * L0. LOCAL_DERA - Datos pre-descargados (10.653 features, offline)
 * L1. Geocodificador especializado WFS según tipología (DERA online)
 * L2. NGA - Nomenclátor Geográfico Andalucía (topónimos: parajes, cerros)
 * L3. IAID - Instalaciones Deportivas (piscinas, campos)
 * L4. Overpass/OSM - OpenStreetMap (antenas, industrias, varios)
 * L5. CDAU - Callejero Digital Andalucía
 * L6. CartoCiudad - IGN (fallback universal España)
 * L7. Nominatim - OSM (último recurso)
 * 
 * F021 Fase 2: Sistema offline-first con datos DERA locales
 * - health.geojson:     1,700 centros (CAP + hospitales)
 * - security.geojson:   1,282 (policía, bomberos, GC, emergencias)
 * - education.geojson:  6,725 centros educativos
 * - municipal.geojson:    785 ayuntamientos (100% municipios)
 * - energy.geojson:       161 parques eólicos
 * 
 * Cobertura esperada: ~90-95% con L0 + cascada completa
 * 
 * @module services/geocoding
 * @version 2.1.0 - F021 Fase 2 LocalData integration
 */

import { InfrastructureClassifier } from '../classification/InfrastructureClassifier';
import { 
  InfrastructureType, 
  GeocodingResult,
  ClassificationResult 
} from '../../types/infrastructure';

// LocalDataService - L0 Geocoding offline (F021 Fase 2)
// B.4: SingletonDetector usa IndexedDB, pero LocalDataService se mantiene como fallback
import {
  searchLocal,
  isDataLoaded,
  loadLocalData,
  toGeocodingResult,
  // Fallback para cuando IndexedDB no está lista (tests, primera carga)
  countByType,
  getUniqueByType,
  getFeaturesByMunicipio,
  type InfrastructureCategory,
  type LocalSearchResult,
  type LocalFeature
} from '../../lib/LocalDataService';

// F023 Fase 1.4 - Desambiguación multi-campo
import {
  disambiguate,
  type GeocodingCandidate,
  type PTELRecord,
  type DisambiguationResult
} from '../../lib/multiFieldStrategy';

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

// Validación Cruzada Multi-Fuente (v3.0)
import {
  CrossValidator,
  getCrossValidator,
  type SourceResult,
  type CrossValidationResult,
  type GeocodingSource,
} from './CrossValidator';

// F025: Extractor de direcciones normalizadas
import {
  extractStreetAddress,
  type AddressExtractionResult,
} from '../../utils/addressExtractor';

// F023 Fase 1 / B.4: SingletonDetector con BBDD local IndexedDB
import {
  detectSingleton,
  getSingletonFeature,
  getCandidatesByNombre,
  type SingletonResult,
  type InfraTipologia,
} from '../../lib/localData/singletonDetector';
import { isDatabaseReady } from '../../lib/localData/schemas';

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
  
  /** Código INE del municipio (5 dígitos) - mejora precisión */
  codMun?: string;
  
  /** Dirección postal (para fallbacks genéricos) */
  address?: string;
  
  /** Tipo forzado (omitir clasificación automática) */
  forceType?: InfrastructureType;
  
  /** Usar datos locales DERA primero (L0 offline) - default: true */
  useLocalData?: boolean;
  
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
  
  /** 
   * VALIDACIÓN CRUZADA MULTI-FUENTE (v3.0)
   * Consulta múltiples fuentes y calcula score compuesto
   * Score objetivo: 92-98% con detección errores ~95%
   * Default: true (siempre validar)
   */
  crossValidate?: boolean;
  
  /** Mínimo de fuentes a consultar para validación (default: 2) */
  minValidationSources?: number;
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
  
  // ========== VALIDACIÓN CRUZADA (v3.0) ==========
  
  /** Score compuesto de validación cruzada (0-100) */
  crossValidationScore?: number;
  
  /** Estado de validación: CONFIRMED | LIKELY_VALID | UNCERTAIN | CONFLICT | SINGLE_SOURCE */
  validationStatus?: string;
  
  /** Discrepancia entre fuentes en metros */
  discrepancyMeters?: number | null;
  
  /** Requiere revisión manual */
  requiresManualReview?: boolean;
  
  /** Razón de revisión manual */
  reviewReason?: string;
  
  /** Desglose del score */
  scoreBreakdown?: {
    C_match: number;
    C_concordance: number;
    C_source: number;
    bonusApplied: number;
  };
  
  /** Resultados de cada fuente consultada */
  sourcesConsulted?: Array<{
    source: string;
    x: number;
    y: number;
    confidence: number;
    responseTimeMs: number;
  }>;
  
  // ========== F025 ADDRESS EXTRACTION ==========
  
  /** Resultado de extracción de dirección F025 */
  addressExtraction?: {
    /** Dirección original antes de normalizar */
    originalAddress: string;
    /** Dirección normalizada (null si no geocodificable) */
    normalizedAddress: string | null;
    /** Confianza de la dirección extraída (0-100) */
    confidence: number;
    /** Transformaciones aplicadas (debug) */
    transformations: string[];
  };
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
  
  // Estado de datos locales (L0)
  private localDataPreloaded = false;

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
   * B.4: Mapea InfrastructureType a InfraTipologia para SingletonDetector
   * @param type - Tipo de infraestructura del clasificador
   * @returns Tipología para consulta en BBDD local
   */
  private mapTypeToTipologia(type: InfrastructureType): InfraTipologia {
    switch (type) {
      case InfrastructureType.HEALTH:
        return 'SANITARIO';
      case InfrastructureType.EDUCATION:
        return 'EDUCATIVO';
      case InfrastructureType.POLICE:
      case InfrastructureType.FIRE:
        return 'SEGURIDAD';
      case InfrastructureType.EMERGENCY:
        return 'EMERGENCIA';
      case InfrastructureType.MUNICIPAL:
        return 'MUNICIPAL';
      case InfrastructureType.ENERGY:
        return 'ENERGIA';
      case InfrastructureType.HYDRAULIC:
        return 'HIDRAULICO';
      case InfrastructureType.CULTURAL:
        return 'PATRIMONIO';
      case InfrastructureType.SPORTS:
        return 'DEPORTIVO';
      case InfrastructureType.VIAL:
        return 'TRANSPORTE';
      case InfrastructureType.TELECOM:
      case InfrastructureType.INDUSTRIAL:
      case InfrastructureType.GENERIC:
      default:
        return 'OTRO';
    }
  }

  /**
   * Precarga datos locales DERA para geocodificación offline (L0)
   * Llamar al inicio de la app para evitar latencia en primera búsqueda
   * 
   * @returns Stats de carga (total features, por categoría, tiempo)
   */
  public async preloadLocalData(): Promise<{
    totalFeatures: number;
    byCategory: Record<string, number>;
    loadTimeMs: number;
    municipiosIndexados: number;
  }> {
    if (this.localDataPreloaded && isDataLoaded()) {
      console.log('[GeocodingOrchestrator] Datos locales ya cargados');
      return loadLocalData();
    }
    
    console.log('[GeocodingOrchestrator] Precargando datos DERA locales...');
    const stats = await loadLocalData();
    this.localDataPreloaded = true;
    
    console.log(
      `[GeocodingOrchestrator] L0 ready: ${stats.totalFeatures} features ` +
      `(${stats.municipiosIndexados} municipios) en ${stats.loadTimeMs}ms`
    );
    
    return stats;
  }

  /**
   * Verifica si datos locales están disponibles
   */
  public isLocalDataReady(): boolean {
    return isDataLoaded();
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

      // ===== PASO 1.5: PRE-PROCESAR DIRECCIÓN CON F025 AddressExtractor =====
      // Normalizar dirección antes de geocodificar para mejorar match rate
      let addressExtractionResult: AddressExtractionResult | null = null;
      const originalAddress = options.address;
      
      if (options.address && options.address.trim().length > 0) {
        attempts.push('f025_address_extraction');
        try {
          addressExtractionResult = extractStreetAddress(
            options.address,
            options.municipality
          );
          
          if (addressExtractionResult.address) {
            // Usar dirección normalizada para el resto del flujo
            options.address = addressExtractionResult.address;
            console.log(
              `[F025] ✅ Dirección normalizada: "${originalAddress}" → "${addressExtractionResult.address}" ` +
              `(confianza: ${addressExtractionResult.confidence}%)`
            );
          } else {
            console.log(
              `[F025] ⚠️ Dirección no geocodificable: "${originalAddress}" ` +
              `(razón: ${addressExtractionResult.reason})`
            );
          }
        } catch (err) {
          errors.push(`F025_EXTRACT: ${err}`);
          console.warn('[F025] Error en extracción de dirección:', err);
        }
      }

      // Paso 2: Preparar opciones de búsqueda
      const searchOptions: WFSSearchOptions = {
        name: options.name,
        municipality: options.municipality,
        province: options.province,
        maxResults: 10
      };

      let geocodingResult: GeocodingResult | null = null;
      let geocoderUsed = 'none';

      // ===== B.4: SINGLETON DETECTOR CON BBDD LOCAL (IndexedDB) =====
      // Nivel L0_LOCAL: Consulta BBDD local antes de cualquier llamada WFS
      // El 65% de municipios tiene solo 1 infraestructura por tipo → match directo
      const useLocalData = options.useLocalData !== false;
      
      if (useLocalData && options.codMun) {
        attempts.push('singleton_indexeddb');
        try {
          // Verificar si IndexedDB está lista (datos cargados)
          const dbReady = await isDatabaseReady();
          
          if (dbReady) {
            // Mapear tipo a tipología DERA
            const tipologia = this.mapTypeToTipologia(classification.type);
            
            // Consulta rápida: ¿es singleton?
            const singletonResult = await detectSingleton(options.codMun, tipologia);
            
            console.log(
              `[B.4] SingletonDetector: ${tipologia} en ${options.codMun} → ` +
              `count=${singletonResult.count}, singleton=${singletonResult.isSingleton} (${singletonResult.queryTimeMs.toFixed(1)}ms)`
            );
            
            if (singletonResult.isSingleton && singletonResult.feature) {
              // ===== SINGLETON DETECTADO → RETORNO DIRECTO 95% =====
              const feature = singletonResult.feature;
              
              console.log(
                `[B.4] ✅ SINGLETON: "${feature.nombre}" (95% confianza, skip WFS)`
              );
              
              geocodingResult = {
                x: feature.x,
                y: feature.y,
                confidence: 95,
                source: `SINGLETON_${tipologia}`,
                matchedName: feature.nombre,
                municipality: options.municipality,
                province: options.province
              };
              geocoderUsed = `singleton:${tipologia.toLowerCase()}`;
              
              // Retorno inmediato para singleton (sin validación cruzada WFS)
              const processingTime = Date.now() - startTime;
              return {
                geocoding: geocodingResult,
                classification,
                geocoderUsed,
                processingTime,
                errors,
                attempts,
                crossValidationScore: 95,
                validationStatus: 'CONFIRMED',
                discrepancyMeters: null,
                requiresManualReview: false,
                sourcesConsulted: [{
                  source: 'LOCAL_INDEXEDDB',
                  x: feature.x,
                  y: feature.y,
                  confidence: 95,
                  responseTimeMs: singletonResult.queryTimeMs,
                }],
              };
              
            } else if (singletonResult.count >= 2) {
              // ===== MÚLTIPLES CANDIDATOS → DESAMBIGUACIÓN =====
              console.log(
                `[B.4] 🔄 Múltiples (${singletonResult.count}): ${tipologia} en ${options.codMun} → desambiguación`
              );
              
              // Obtener candidatos ordenados por similitud con nombre buscado
              const candidates = await getCandidatesByNombre(
                options.codMun,
                tipologia,
                options.name,
                10
              );
              
              if (candidates.length >= 1) {
                // Convertir DERAFeature a GeocodingCandidate para desambiguación
                const geocodingCandidates: GeocodingCandidate[] = candidates.map(f => ({
                  id: f.id,
                  nombre: f.nombre,
                  direccion: f.direccion || '',
                  municipio: f.municipio,
                  codMunicipio: f.codMun,
                  utmX: f.x,
                  utmY: f.y,
                  tipologia: classification.type,
                  subtipo: f.subtipo || '',
                }));
                
                // Crear registro PTEL para desambiguación
                const ptelRecord: PTELRecord = {
                  nombre: options.name,
                  direccion: options.address,
                  localidad: options.municipality,
                  codMunicipio: options.codMun,
                };
                
                // Ejecutar desambiguación multi-campo (F023)
                const disambResult = disambiguate(
                  geocodingCandidates, 
                  ptelRecord, 
                  classification.type
                );
                
                if (disambResult.selected && disambResult.confidence !== 'NONE') {
                  console.log(
                    `[B.4] 📊 Desambiguación: "${disambResult.selected.nombre}" ` +
                    `(score=${disambResult.score}, conf=${disambResult.confidence})`
                  );
                  
                  const disambConfidence = 
                    disambResult.confidence === 'HIGH' ? 90 :
                    disambResult.confidence === 'MEDIUM' ? 75 : 60;
                  
                  geocodingResult = {
                    x: disambResult.selected.utmX,
                    y: disambResult.selected.utmY,
                    confidence: disambConfidence,
                    source: 'DISAMBIGUATED_INDEXEDDB',
                    matchedName: disambResult.selected.nombre,
                    municipality: options.municipality,
                    province: options.province
                  };
                  geocoderUsed = 'disambiguated:indexeddb';
                  
                  // Si HIGH, retornar directamente
                  if (disambResult.confidence === 'HIGH') {
                    const processingTime = Date.now() - startTime;
                    return {
                      geocoding: geocodingResult,
                      classification,
                      geocoderUsed,
                      processingTime,
                      errors,
                      attempts,
                      crossValidationScore: disambConfidence,
                      validationStatus: 'CONFIRMED',
                      discrepancyMeters: null,
                      requiresManualReview: false,
                    };
                  }
                  // MEDIUM/LOW: continuar cascada para validación cruzada
                }
              }
            }
            // count === 0: No hay datos locales → fallback a cascada WFS
          } else {
            // ===== FALLBACK A LOCALDATA SERVICE (para tests y compatibilidad) =====
            console.log('[B.4] ⚠️ IndexedDB no lista, intentando LocalDataService...');
            
            // Usar el viejo sistema para mantener compatibilidad con tests
            const localCategories = this.mapTypeToLocalCategories(classification.type);
            
            if (localCategories.length > 0 && localCategories.length <= 2) {
              const count = await countByType(classification.type, options.codMun);
              
              if (count === 1) {
                const singletonFeature = await getUniqueByType(classification.type, options.codMun);
                
                if (singletonFeature) {
                  console.log(
                    `[B.4] ✅ SINGLETON (LocalDataService): "${singletonFeature.nombre}" (95% confianza)`
                  );
                  
                  geocodingResult = {
                    x: singletonFeature.x,
                    y: singletonFeature.y,
                    confidence: 95,
                    source: `SINGLETON_${singletonFeature.categoria.toUpperCase()}`,
                    matchedName: singletonFeature.nombre,
                    municipality: options.municipality,
                    province: options.province
                  };
                  geocoderUsed = `singleton:${singletonFeature.categoria}`;
                  
                  const processingTime = Date.now() - startTime;
                  return {
                    geocoding: geocodingResult,
                    classification,
                    geocoderUsed,
                    processingTime,
                    errors,
                    attempts,
                    crossValidationScore: 95,
                    validationStatus: 'CONFIRMED',
                    discrepancyMeters: null,
                    requiresManualReview: false,
                    sourcesConsulted: [{
                      source: 'LOCAL_DERA',
                      x: singletonFeature.x,
                      y: singletonFeature.y,
                      confidence: 95,
                      responseTimeMs: Date.now() - startTime,
                    }],
                  };
                }
              } else if (count >= 2) {
                // Múltiples candidatos: usar desambiguación
                const allFeatures = await getFeaturesByMunicipio(
                  options.codMun,
                  localCategories
                );
                
                if (allFeatures.length >= 1) {
                  const geocodingCandidates: GeocodingCandidate[] = allFeatures.map(f => ({
                    id: f.id,
                    nombre: f.nombre,
                    direccion: f.direccion || '',
                    municipio: f.municipio,
                    codMunicipio: f.codMun,
                    utmX: f.x,
                    utmY: f.y,
                    tipologia: classification.type,
                    subtipo: f.tipo || '',
                  }));
                  
                  const ptelRecord: PTELRecord = {
                    nombre: options.name,
                    direccion: options.address,
                    localidad: options.municipality,
                    codMunicipio: options.codMun,
                  };
                  
                  const disambResult = disambiguate(
                    geocodingCandidates,
                    ptelRecord,
                    classification.type
                  );
                  
                  if (disambResult.selected && disambResult.confidence !== 'NONE') {
                    const disambConfidence =
                      disambResult.confidence === 'HIGH' ? 90 :
                      disambResult.confidence === 'MEDIUM' ? 75 : 60;
                    
                    geocodingResult = {
                      x: disambResult.selected.utmX,
                      y: disambResult.selected.utmY,
                      confidence: disambConfidence,
                      source: 'DISAMBIGUATED_LOCAL',
                      matchedName: disambResult.selected.nombre,
                      municipality: options.municipality,
                      province: options.province
                    };
                    geocoderUsed = 'disambiguated:local';
                    
                    if (disambResult.confidence === 'HIGH') {
                      const processingTime = Date.now() - startTime;
                      return {
                        geocoding: geocodingResult,
                        classification,
                        geocoderUsed,
                        processingTime,
                        errors,
                        attempts,
                        crossValidationScore: disambConfidence,
                        validationStatus: 'CONFIRMED',
                        discrepancyMeters: null,
                        requiresManualReview: false,
                      };
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          errors.push(`SINGLETON_INDEXEDDB: ${err}`);
          console.warn('[B.4] Error en SingletonDetector:', err);
        }
      }

      // ===== NIVEL 0: LOCAL_DERA - DATOS OFFLINE (F021 Fase 2) =====
      // (Se ejecuta si singleton no encontró match o para validación cruzada)
      
      if (useLocalData && !geocodingResult) {
        attempts.push('local_dera');
        try {
          // Mapear tipo a categorías locales
          const localCategories = this.mapTypeToLocalCategories(classification.type);
          
          // Buscar en datos locales
          const localResult = await searchLocal({
            nombre: options.name,
            codMun: options.codMun,
            municipio: options.municipality,
            provincia: options.province,
            categorias: localCategories,
            threshold: 0.35,  // Más estricto para evitar falsos positivos
          });
          
          // Aceptar si match >= 70% (alta confianza)
          if (localResult.success && localResult.bestMatch && localResult.matchScore >= 70) {
            const converted = toGeocodingResult(localResult.bestMatch, localResult.matchScore);
            geocodingResult = {
              x: converted.x,
              y: converted.y,
              confidence: localResult.matchScore,
              source: converted.source,
              matchedName: converted.matchedName,
              municipality: options.municipality,
              province: options.province
            };
            geocoderUsed = 'local_dera';
            
            // Retorno temprano DESACTIVADO para validación cruzada
            // El sistema ahora siempre consulta múltiples fuentes
            // if (localResult.matchScore >= 85) { ... }
          }
        } catch (err) {
          // Local data no disponible, continuar con cascada online
          errors.push(`LOCAL_DERA: ${err}`);
        }
      }

      // ===== RECOPILAR RESULTADOS PARA VALIDACIÓN CRUZADA =====
      const sourceResults: SourceResult[] = [];
      
      // Añadir resultado LOCAL_DERA si existe
      if (geocodingResult && geocoderUsed === 'local_dera') {
        sourceResults.push({
          source: 'LOCAL_DERA' as GeocodingSource,
          x: geocodingResult.x,
          y: geocodingResult.y,
          confidence: geocodingResult.confidence,
          matchedName: geocodingResult.matchedName,
          responseTimeMs: Date.now() - startTime,
        });
      }

      // ===== NIVEL 1: GEOCODIFICADOR ESPECIALIZADO WFS (SIEMPRE EJECUTAR) =====
      // Para validación cruzada, SIEMPRE consultamos WFS aunque L0 tenga resultado
      const specializedResult = await this.trySpecializedGeocoder(
        classification.type,
        searchOptions,
        attempts
      );

      if (specializedResult.result && specializedResult.result.confidence >= 50) {
        // Añadir a sourceResults para validación cruzada
        sourceResults.push({
          source: 'WFS_SPECIALIZED' as GeocodingSource,
          x: specializedResult.result.x,
          y: specializedResult.result.y,
          confidence: specializedResult.result.confidence,
          matchedName: specializedResult.result.matchedName,
          responseTimeMs: Date.now() - startTime,
        });
        
        // Si no teníamos resultado previo, usar este
        if (!geocodingResult || specializedResult.result.confidence > geocodingResult.confidence) {
          geocodingResult = specializedResult.result;
          geocoderUsed = specializedResult.geocoder;
        }
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

      // ===== VALIDACIÓN CRUZADA MULTI-FUENTE (v3.0 Enhanced) =====
      const crossValidate = options.crossValidate !== false; // Default: true
      
      if (crossValidate && sourceResults.length > 0) {
        const validator = getCrossValidator();
        // F023 Fase 2: Usar validateEnhanced() con algoritmos robustos
        // - huberCentroid: centroide robusto (reduce outliers)
        // - analyzeResultClusters: detección automática discordancias
        // - detectDiscrepancy: umbrales específicos por tipología
        // - generateRecommendation: USE_RESULT / MANUAL_REVIEW / REJECT
        const validationResult = validator.validateEnhanced(
          sourceResults,
          classification.type
        );
        
        // Usar coordenadas validadas si están disponibles
        if (validationResult.coordinates) {
          geocodingResult = {
            x: validationResult.coordinates.x,
            y: validationResult.coordinates.y,
            confidence: validationResult.compositeScore,
            source: validationResult.primarySource || 'cross_validated',
            matchedName: geocodingResult?.matchedName || options.name,
            municipality: options.municipality,
            province: options.province
          };
        }
        
        return {
          geocoding: geocodingResult,
          classification,
          geocoderUsed: sourceResults.length > 1 ? 'cross_validated' : geocoderUsed,
          processingTime,
          errors,
          attempts,
          // Campos de validación cruzada
          crossValidationScore: validationResult.compositeScore,
          validationStatus: validationResult.status,
          discrepancyMeters: validationResult.discrepancyMeters,
          requiresManualReview: validationResult.requiresManualReview,
          reviewReason: validationResult.reviewReason,
          scoreBreakdown: validationResult.scoreBreakdown,
          sourcesConsulted: sourceResults.map(s => ({
            source: s.source,
            x: s.x,
            y: s.y,
            confidence: s.confidence,
            responseTimeMs: s.responseTimeMs,
          })),
          // F025: Información de extracción de dirección
          ...(addressExtractionResult && originalAddress ? {
            addressExtraction: {
              originalAddress,
              normalizedAddress: addressExtractionResult.address,
              confidence: addressExtractionResult.confidence,
              transformations: addressExtractionResult.transformations || [],
            }
          } : {}),
        };
      }

      // Sin validación cruzada: comportamiento legacy
      return {
        geocoding: geocodingResult,
        classification,
        geocoderUsed,
        processingTime,
        errors,
        attempts,
        // F025: Información de extracción de dirección
        ...(addressExtractionResult && originalAddress ? {
          addressExtraction: {
            originalAddress,
            normalizedAddress: addressExtractionResult.address,
            confidence: addressExtractionResult.confidence,
            transformations: addressExtractionResult.transformations || [],
          }
        } : {}),
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
   * Mapea InfrastructureType a categorías LocalDataService
   * Usado por L0 (LOCAL_DERA) para filtrar búsqueda
   */
  private mapTypeToLocalCategories(type: InfrastructureType): InfrastructureCategory[] {
    switch (type) {
      case InfrastructureType.HEALTH:
        return ['health'];
      
      case InfrastructureType.EDUCATION:
        return ['education'];
      
      case InfrastructureType.POLICE:
      case InfrastructureType.FIRE:
      case InfrastructureType.EMERGENCY:
        return ['security'];
      
      case InfrastructureType.ENERGY:
        return ['energy'];
      
      case InfrastructureType.MUNICIPAL:
        return ['municipal'];
      
      // Tipos sin datos locales específicos: buscar en todo
      case InfrastructureType.CULTURAL:
      case InfrastructureType.SPORTS:
      case InfrastructureType.HYDRAULIC:
      case InfrastructureType.TELECOM:
      case InfrastructureType.VIAL:
      case InfrastructureType.INDUSTRIAL:
      case InfrastructureType.GENERIC:
      default:
        return ['health', 'security', 'education', 'municipal', 'energy'];
    }
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
