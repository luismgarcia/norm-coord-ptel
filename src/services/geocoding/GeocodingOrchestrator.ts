/**
 * Orquestador de Geocodificación Especializada
 * 
 * Integra clasificación tipológica con geocodificadores especializados WFS
 * y fallbacks genéricos (CDAU, CartoCiudad) para máxima precisión y cobertura
 * en infraestructuras PTEL Andalucía.
 * 
 * Flujo de geocodificación:
 * 1. Clasifica infraestructura por tipología
 * 2. Selecciona geocodificador especializado óptimo (WFS)
 * 3. Si falla, intenta CDAU (para Andalucía)
 * 4. Si falla, intenta CartoCiudad (fallback universal)
 * 5. Valida resultado y asigna scoring final
 * 
 * Cobertura esperada: ~85-90% con todos los geocodificadores activos
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
  type WFSSearchOptions
} from './specialized';

// Geocodificadores genéricos (fallback)
import { 
  CartoCiudadGeocoder,
  CDAUGeocoder 
} from './generic';

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
  
  /** Geocodificador usado ('specialized:health' | 'cdau' | 'cartociudad' | 'none') */
  geocoderUsed: string;
  
  /** Tiempo total de procesamiento en ms */
  processingTime: number;
  
  /** Errores encontrados durante proceso */
  errors: string[];
  
  /** Intentos realizados */
  attempts: string[];
}

/**
 * Orquestador principal de geocodificación
 * 
 * Gestiona flujo completo: clasificación → especializado → CDAU → CartoCiudad
 * 
 * @example
 * ```typescript
 * const orchestrator = new GeocodingOrchestrator();
 * 
 * const result = await orchestrator.geocode({
 *   name: 'Centro de Salud San Antón',
 *   municipality: 'Granada',
 *   province: 'Granada',
 *   address: 'C/ San Antón 72'
 * });
 * 
 * if (result.geocoding) {
 *   console.log(`Geocodificado con precisión ${result.geocoding.confidence}%`);
 *   console.log(`Usando: ${result.geocoderUsed}`);
 * }
 * ```
 */
export class GeocodingOrchestrator {
  // Clasificador tipológico
  private classifier: InfrastructureClassifier;
  
  // Geocodificadores especializados WFS
  private healthGeocoder: WFSHealthGeocoder;
  private educationGeocoder: WFSEducationGeocoder;
  private culturalGeocoder: WFSCulturalGeocoder;
  private securityGeocoder: WFSSecurityGeocoder;
  private hydraulicGeocoder: WFSHydraulicGeocoder;
  private energyGeocoder: WFSEnergyGeocoder;
  
  // Geocodificadores genéricos (fallback)
  private cdauGeocoder: CDAUGeocoder;
  private cartoCiudadGeocoder: CartoCiudadGeocoder;

  constructor() {
    // Inicializar clasificador
    this.classifier = new InfrastructureClassifier({
      strictMode: false,
      caseSensitive: false
    });

    // Inicializar geocodificadores especializados
    this.healthGeocoder = new WFSHealthGeocoder();
    this.educationGeocoder = new WFSEducationGeocoder();
    this.culturalGeocoder = new WFSCulturalGeocoder();
    this.securityGeocoder = new WFSSecurityGeocoder();
    this.hydraulicGeocoder = new WFSHydraulicGeocoder();
    this.energyGeocoder = new WFSEnergyGeocoder();
    
    // Inicializar geocodificadores genéricos
    this.cdauGeocoder = new CDAUGeocoder();
    this.cartoCiudadGeocoder = new CartoCiudadGeocoder();
  }

  /**
   * Geocodifica una infraestructura usando clasificación + geocodificador óptimo
   */
  public async geocode(options: OrchestrationOptions): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const attempts: string[] = [];

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

      // Paso 3: Intentar geocodificación especializada según tipo
      const specializedResult = await this.trySpecializedGeocoder(
        classification.type,
        searchOptions,
        attempts
      );

      if (specializedResult.result && specializedResult.result.confidence >= 70) {
        geocodingResult = specializedResult.result;
        geocoderUsed = specializedResult.geocoder;
      }

      // Paso 4: Fallback CDAU (para direcciones andaluzas)
      if (!geocodingResult && options.useGenericFallback !== false) {
        attempts.push('cdau');
        
        const cdauResult = await this.cdauGeocoder.geocode({
          street: options.address || options.name,
          municipality: options.municipality,
          province: options.province
        });

        if (cdauResult && cdauResult.confidence >= 60) {
          geocodingResult = cdauResult;
          geocoderUsed = 'generic:cdau';
        }
      }

      // Paso 5: Fallback CartoCiudad (universal)
      if (!geocodingResult && options.useGenericFallback !== false) {
        attempts.push('cartociudad');
        
        const address = options.address 
          ? `${options.address}, ${options.municipality}`
          : `${options.name}, ${options.municipality}`;
        
        const cartoCiudadResult = await this.cartoCiudadGeocoder.geocode({
          address,
          municipality: options.municipality,
          province: options.province
        });

        if (cartoCiudadResult) {
          geocodingResult = cartoCiudadResult;
          geocoderUsed = 'generic:cartociudad';
          
          if (cartoCiudadResult.confidence < 70) {
            errors.push('CartoCiudad: match de baja confianza');
          }
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

      case InfrastructureType.GENERIC:
      default:
        // Tipos genéricos van directo a fallback
        break;
    }

    return { result, geocoder };
  }

  /**
   * Geocodifica múltiples infraestructuras en batch
   * Optimizado para procesamiento masivo de CSVs PTEL
   */
  public async geocodeBatch(
    infrastructures: OrchestrationOptions[],
    onProgress?: (current: number, total: number) => void
  ): Promise<OrchestrationResult[]> {
    
    // Procesar en paralelo con límite de concurrencia (5 simultáneos)
    const BATCH_SIZE = 5;
    const results: OrchestrationResult[] = [];

    for (let i = 0; i < infrastructures.length; i += BATCH_SIZE) {
      const batch = infrastructures.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(opts => this.geocode(opts))
      );
      results.push(...batchResults);

      // Callback de progreso
      if (onProgress) {
        onProgress(Math.min(i + BATCH_SIZE, infrastructures.length), infrastructures.length);
      }

      // Pequeña pausa entre batches para no saturar APIs
      if (i + BATCH_SIZE < infrastructures.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Obtiene estadísticas de clasificación para un conjunto de nombres
   * Útil para análisis pre-geocodificación de datasets completos
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
    
    // Estimar éxito de geocodificación:
    // - Especializados: ~80% éxito
    // - Genéricos con fallback: ~60% éxito
    const estimatedGeocodingSuccess = 
      (specializedCount * 0.80 + (names.length - specializedCount) * 0.60) / names.length * 100;

    return {
      byType,
      byConfidence,
      totalSpecializedCoverage,
      estimatedGeocodingSuccess
    };
  }

  /**
   * Limpia cachés de todos los geocodificadores
   * Útil al cambiar de municipio/dataset
   */
  public clearAllCaches(): void {
    // Especializados
    this.healthGeocoder.clearCache();
    this.educationGeocoder.clearCache();
    this.culturalGeocoder.clearCache();
    this.securityGeocoder.clearCache();
    this.hydraulicGeocoder.clearCache();
    this.energyGeocoder.clearCache();
    
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
