/**
 * Orquestador de Geocodificación Especializada
 * 
 * Integra clasificación tipológica con geocodificadores especializados WFS
 * para máxima precisión y cobertura en infraestructuras PTEL Andalucía.
 * 
 * Flujo:
 * 1. Clasifica infraestructura por tipología
 * 2. Selecciona geocodificador especializado óptimo
 * 3. Ejecuta geocodificación con fallback a genérico
 * 4. Valida resultado y asigna scoring final
 * 
 * @module services/geocoding
 */

import { InfrastructureClassifier } from '../classification/InfrastructureClassifier';
import { 
  InfrastructureType, 
  GeocodingResult,
  ClassificationResult 
} from '../../types/infrastructure';

import {
  WFSHealthGeocoder,
  WFSEducationGeocoder,
  WFSCulturalGeocoder,
  WFSSecurityGeocoder,
  type WFSSearchOptions
} from './specialized';

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
  
  /** Tipo forzado (omitir clasificación automática) */
  forceType?: InfrastructureType;
  
  /** Usar fallback genérico si falla especializado */
  useGenericFallback?: boolean;
  
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
  
  /** Geocodificador usado ('specialized' | 'generic' | 'none') */
  geocoderUsed: string;
  
  /** Tiempo total de procesamiento en ms */
  processingTime: number;
  
  /** Errores encontrados durante proceso */
  errors: string[];
}

/**
 * Orquestador principal de geocodificación especializada
 * 
 * Gestiona flujo completo: clasificación → geocodificación → validación
 * 
 * @example
 * ```typescript
 * const orchestrator = new GeocodingOrchestrator();
 * 
 * const result = await orchestrator.geocode({
 *   name: 'Centro de Salud San Antón',
 *   municipality: 'Granada',
 *   province: 'Granada'
 * });
 * 
 * if (result.geocoding) {
 *   console.log(`Geocodificado con precisión ${result.geocoding.confidence}%`);
 *   console.log(`Usando: ${result.geocoderUsed}`);
 * }
 * ```
 */
export class GeocodingOrchestrator {
  private classifier: InfrastructureClassifier;
  private healthGeocoder: WFSHealthGeocoder;
  private educationGeocoder: WFSEducationGeocoder;
  private culturalGeocoder: WFSCulturalGeocoder;
  private securityGeocoder: WFSSecurityGeocoder;

  constructor() {
    this.classifier = new InfrastructureClassifier({
      strictMode: false,
      caseSensitive: false
    });

    // Inicializar geocodificadores especializados
    this.healthGeocoder = new WFSHealthGeocoder();
    this.educationGeocoder = new WFSEducationGeocoder();
    this.culturalGeocoder = new WFSCulturalGeocoder();
    this.securityGeocoder = new WFSSecurityGeocoder();
  }

  /**
   * Geocodifica una infraestructura usando clasificación + geocodificador especializado
   */
  public async geocode(options: OrchestrationOptions): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Paso 1: Clasificar tipología (o usar tipo forzado)
      const classification = options.forceType 
        ? { 
            type: options.forceType, 
            confidence: 'ALTA' as const,
            keywords: [] 
          }
        : this.classifier.classify(options.name);

      // Paso 2: Seleccionar y ejecutar geocodificador especializado
      const searchOptions: WFSSearchOptions = {
        name: options.name,
        municipality: options.municipality,
        province: options.province,
        maxResults: 10
      };

      let geocodingResult: GeocodingResult | null = null;
      let geocoderUsed = 'none';

      // Intentar geocodificación especializada según tipo
      switch (classification.type) {
        case InfrastructureType.HEALTH:
          geocodingResult = await this.healthGeocoder.geocodeWithAutoLayer(searchOptions);
          geocoderUsed = geocodingResult ? 'specialized:health' : geocoderUsed;
          break;

        case InfrastructureType.EDUCATION:
          geocodingResult = await this.educationGeocoder.geocode(searchOptions);
          geocoderUsed = geocodingResult ? 'specialized:education' : geocoderUsed;
          break;

        case InfrastructureType.CULTURAL:
          geocodingResult = await this.culturalGeocoder.geocodeWithAutoLayer(searchOptions);
          geocoderUsed = geocodingResult ? 'specialized:cultural' : geocoderUsed;
          break;

        case InfrastructureType.POLICE:
        case InfrastructureType.FIRE:
        case InfrastructureType.EMERGENCY:
          geocodingResult = await this.securityGeocoder.geocodeWithAutoLayer(searchOptions);
          geocoderUsed = geocodingResult ? 'specialized:security' : geocoderUsed;
          break;

        case InfrastructureType.GENERIC:
        default:
          // Para tipos genéricos, ir directo a fallback
          if (options.useGenericFallback !== false) {
            geocodingResult = await this.genericFallback(searchOptions);
            geocoderUsed = geocodingResult ? 'generic:cartociudad' : geocoderUsed;
          }
          break;
      }

      // Paso 3: Fallback genérico si falla especializado y está habilitado
      if (!geocodingResult && options.useGenericFallback !== false) {
        geocodingResult = await this.genericFallback(searchOptions);
        if (geocodingResult) {
          geocoderUsed = 'generic:fallback';
          errors.push('Geocodificador especializado falló, usado fallback genérico');
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        geocoding: geocodingResult,
        classification,
        geocoderUsed,
        processingTime,
        errors
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
        errors
      };
    }
  }

  /**
   * Geocodifica múltiples infraestructuras en batch
   * Optimizado para procesamiento masivo de CSVs PTEL
   */
  public async geocodeBatch(
    infrastructures: OrchestrationOptions[]
  ): Promise<OrchestrationResult[]> {
    
    // Procesar en paralelo con límite de concurrencia (10 simultáneos)
    const BATCH_SIZE = 10;
    const results: OrchestrationResult[] = [];

    for (let i = 0; i < infrastructures.length; i += BATCH_SIZE) {
      const batch = infrastructures.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(opts => this.geocode(opts))
      );
      results.push(...batchResults);

      // Log progreso
      console.log(`Geocodificadas ${Math.min(i + BATCH_SIZE, infrastructures.length)}/${infrastructures.length}`);
    }

    return results;
  }

  /**
   * Fallback genérico usando CartoCiudad IGN
   * TODO: Implementar cuando integremos CartoCiudad
   */
  private async genericFallback(
    options: WFSSearchOptions
  ): Promise<GeocodingResult | null> {
    // Placeholder - implementar CartoCiudad en Fase 2
    console.warn('Fallback genérico no implementado aún (Fase 2)');
    return null;
  }

  /**
   * Obtiene estadísticas de clasificación para un conjunto de nombres
   * Útil para análisis pre-geocodificación de datasets completos
   */
  public analyzeDataset(names: string[]): {
    byType: Record<string, number>;
    byConfidence: Record<string, number>;
    totalSpecializedCoverage: number;
  } {
    const classifications = names.map(name => this.classifier.classify(name));

    const byType: Record<string, number> = {};
    const byConfidence: Record<string, number> = {};
    let specializedCount = 0;

    classifications.forEach(c => {
      // Contar por tipo
      byType[c.type] = (byType[c.type] || 0) + 1;
      
      // Contar por confianza
      byConfidence[c.confidence] = (byConfidence[c.confidence] || 0) + 1;

      // Contar cobertura especializada (excluyendo GENERIC)
      if (c.type !== InfrastructureType.GENERIC) {
        specializedCount++;
      }
    });

    const totalSpecializedCoverage = (specializedCount / names.length) * 100;

    return {
      byType,
      byConfidence,
      totalSpecializedCoverage
    };
  }

  /**
   * Limpia cachés de todos los geocodificadores
   * Útil al cambiar de municipio/dataset
   */
  public clearAllCaches(): void {
    this.healthGeocoder.clearCache();
    this.educationGeocoder.clearCache();
    this.culturalGeocoder.clearCache();
    this.securityGeocoder.clearCache();
    console.log('✅ Cachés de geocodificadores limpiados');
  }

  /**
   * Obtiene estadísticas de todos los geocodificadores
   */
  public getAllStats() {
    return {
      health: this.healthGeocoder.getStats(),
      education: this.educationGeocoder.getStats(),
      cultural: this.culturalGeocoder.getStats(),
      security: this.securityGeocoder.getStats()
    };
  }
}
