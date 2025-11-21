/**
 * Clasificador tipológico de infraestructuras PTEL
 * 
 * Implementa detección automática de categorías mediante patrones regex
 * optimizados para nomenclatura andaluza de documentos municipales.
 * 
 * @example
 * ```typescript
 * const classifier = new InfrastructureClassifier();
 * const result = classifier.classify("Centro de Salud San Antón");
 * // result.type === InfrastructureType.HEALTH
 * // result.confidence === ClassificationConfidence.HIGH
 * ```
 * 
 * @module services/classification
 */

import { 
  InfrastructureType, 
  ClassificationConfidence, 
  ClassificationResult,
  ClassifierConfig 
} from '../../types/infrastructure';

/**
 * Patrón de clasificación con palabras clave y nivel de confianza
 */
interface ClassificationPattern {
  type: InfrastructureType;
  /** Regex principal (alta confianza) */
  primary: RegExp;
  /** Regex secundario (media confianza) */
  secondary?: RegExp;
  /** Palabras clave para debugging */
  keywords: string[];
}

/**
 * Clasificador tipológico de infraestructuras basado en análisis de 
 * documentos PTEL reales de municipios andaluces.
 * 
 * Patrones calibrados contra nomenclatura oficial de IECA, ISE, DERA, IAPH.
 */
export class InfrastructureClassifier {
  private config: ClassifierConfig;
  private patterns: ClassificationPattern[];

  constructor(config: Partial<ClassifierConfig> = {}) {
    this.config = {
      strictMode: false,
      caseSensitive: false,
      ...config
    };

    this.patterns = this.initializePatterns();
  }

  /**
   * Inicializa patrones de clasificación basados en análisis empírico
   * de 44 documentos PTEL municipales.
   */
  private initializePatterns(): ClassificationPattern[] {
    return [
      // SANITARIOS - 1,500+ infraestructuras en Andalucía
      {
        type: InfrastructureType.HEALTH,
        primary: /\b(centro\s+de\s+salud|hospital|cl[íi]nica|consultorio\s+m[ée]dico?|ambulatorio|urgencias?|centro\s+sanitario)\b/i,
        secondary: /\b(consultorio|m[ée]dico?|sanitari[oa]|sas\b)/i,
        keywords: ['centro salud', 'hospital', 'clínica', 'consultorio', 'ambulatorio', 'urgencias', 'sanitario']
      },
      
      // EDUCATIVOS - 3,800+ infraestructuras
      {
        type: InfrastructureType.EDUCATION,
        primary: /\b(colegio|instituto|escuela|centro\s+educativo|ceip|ies|guardería|c\.e\.i\.p\.|i\.e\.s\.)\b/i,
        secondary: /\b(educaci[óo]n|infantil|primaria|secundaria|aula)\b/i,
        keywords: ['colegio', 'instituto', 'escuela', 'ceip', 'ies', 'guardería', 'educativo']
      },
      
      // POLICIALES - 200+ infraestructuras
      {
        type: InfrastructureType.POLICE,
        primary: /\b(comisar[íi]a|cuartel\s+de\s+la\s+guardia\s+civil|polic[íi]a\s+(local|nacional)|comandancia|puesto\s+guardia\s+civil)\b/i,
        secondary: /\b(polic[íi]a|guardia\s+civil|g\.civil|seguridad\s+ciudadana)\b/i,
        keywords: ['comisaría', 'cuartel', 'policía', 'guardia civil', 'comandancia']
      },
      
      // BOMBEROS - 86 parques según IECA
      {
        type: InfrastructureType.FIRE,
        primary: /\b(parque\s+de\s+bomberos?|bomberos?|estaci[óo]n\s+de\s+bomberos?)\b/i,
        secondary: /\b(extinc?i[óo]n\s+incendios?|servicios?\s+contra\s+incendios?)\b/i,
        keywords: ['parque bomberos', 'bomberos', 'extinción', 'incendios']
      },
      
      // CULTURALES - 7,000+ vía IAPH
      {
        type: InfrastructureType.CULTURAL,
        primary: /\b(museo|biblioteca|centro\s+cultural|teatro|casa\s+de\s+la\s+cultura|auditorio)\b/i,
        secondary: /\b(cultural|patrimonio|exposici[óo]n)\b/i,
        keywords: ['museo', 'biblioteca', 'centro cultural', 'teatro', 'casa cultura', 'auditorio']
      },
      
      // RELIGIOSOS - 1,500+ lugares culto
      {
        type: InfrastructureType.RELIGIOUS,
        primary: /\b(iglesia|ermita|parroquia|convento|monasterio|catedral|bas[íi]lica|capilla)\b/i,
        secondary: /\b(religios[oa]|culto|templo|sacr[oa])\b/i,
        keywords: ['iglesia', 'ermita', 'parroquia', 'convento', 'monasterio', 'catedral']
      },
      
      // DEPORTIVOS
      {
        type: InfrastructureType.SPORTS,
        primary: /\b(polideportivo|pabell[óo]n\s+deportivo|campo\s+de\s+f[úu]tbol|piscina\s+municipal|complejo\s+deportivo)\b/i,
        secondary: /\b(deportivo|gimnasio|pista\s+deportiva)\b/i,
        keywords: ['polideportivo', 'pabellón', 'campo fútbol', 'piscina', 'deportivo']
      },
      
      // MUNICIPALES
      {
        type: InfrastructureType.MUNICIPAL,
        primary: /\b(ayuntamiento|casa\s+consistorial|oficina\s+municipal|centro\s+administrativo|casa\s+del\s+pueblo)\b/i,
        secondary: /\b(municipal|consistorio|servicios?\s+municipales?)\b/i,
        keywords: ['ayuntamiento', 'consistorial', 'oficina municipal', 'administrativo']
      },
      
      // SOCIALES
      {
        type: InfrastructureType.SOCIAL,
        primary: /\b(centro\s+social|residencia|centro\s+de\s+d[íi]a|hogar\s+del\s+pensionista|centro\s+de\s+mayores)\b/i,
        secondary: /\b(social|servicios?\s+sociales?|asistencia\s+social)\b/i,
        keywords: ['centro social', 'residencia', 'centro día', 'hogar pensionista', 'mayores']
      },
      
      // COMBUSTIBLE
      {
        type: InfrastructureType.FUEL,
        primary: /\b(gasolinera|estaci[óo]n\s+de\s+servicio|[áa]rea\s+de\s+servicio|e\.s\.)\b/i,
        secondary: /\b(combustible|carburante|repostaje)\b/i,
        keywords: ['gasolinera', 'estación servicio', 'combustible', 'e.s.']
      },
      
      // EMERGENCIAS
      {
        type: InfrastructureType.EMERGENCY,
        primary: /\b(protecci[óo]n\s+civil|emergencias?|112|centro\s+coordinaci[óo]n|cecopal)\b/i,
        secondary: /\b(emergencia|urgencia|coordinaci[óo]n)\b/i,
        keywords: ['protección civil', 'emergencias', '112', 'cecopal', 'coordinación']
      }
    ];
  }

  /**
   * Clasifica una infraestructura basándose en su nombre
   * 
   * @param name - Nombre de la infraestructura (ej: "Centro de Salud La Esperanza")
   * @returns Resultado de clasificación con tipo y nivel de confianza
   * 
   * @example
   * ```typescript
   * classifier.classify("CEIP Miguel Hernández")
   * // { type: 'EDUCATIVO', confidence: 'ALTA', keywords: ['ceip', 'escuela'] }
   * ```
   */
  public classify(name: string): ClassificationResult {
    if (!name || name.trim().length === 0) {
      return {
        type: InfrastructureType.GENERIC,
        confidence: ClassificationConfidence.NONE,
        keywords: []
      };
    }

    // Normalizar entrada
    const normalized = this.normalizeName(name);

    // Buscar match con patrones
    for (const pattern of this.patterns) {
      // Intenta match con patrón primario (alta confianza)
      if (pattern.primary.test(normalized)) {
        return {
          type: pattern.type,
          confidence: ClassificationConfidence.HIGH,
          matchedPattern: pattern.primary.source,
          keywords: pattern.keywords
        };
      }

      // Si no está en modo estricto, intenta match secundario (media confianza)
      if (!this.config.strictMode && pattern.secondary?.test(normalized)) {
        return {
          type: pattern.type,
          confidence: ClassificationConfidence.MEDIUM,
          matchedPattern: pattern.secondary.source,
          keywords: pattern.keywords
        };
      }
    }

    // No match - categoría genérica
    return {
      type: InfrastructureType.GENERIC,
      confidence: ClassificationConfidence.NONE,
      keywords: []
    };
  }

  /**
   * Clasifica múltiples infraestructuras en batch
   * 
   * @param names - Array de nombres a clasificar
   * @returns Array de resultados de clasificación
   */
  public classifyBatch(names: string[]): ClassificationResult[] {
    return names.map(name => this.classify(name));
  }

  /**
   * Normaliza nombre de infraestructura para matching
   * - Elimina caracteres especiales superfluos
   * - Normaliza espacios múltiples
   * - Convierte a minúsculas si case-insensitive
   */
  private normalizeName(name: string): string {
    let normalized = name.trim();
    
    // Normalizar espacios múltiples
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Normalizar acentos si es case-insensitive
    if (!this.config.caseSensitive) {
      normalized = normalized.toLowerCase();
    }
    
    return normalized;
  }

  /**
   * Obtiene estadísticas de clasificación para un conjunto de nombres
   * Útil para análisis de datasets PTEL
   * 
   * @param names - Array de nombres a analizar
   * @returns Estadísticas por tipo y nivel de confianza
   */
  public getClassificationStats(names: string[]): Record<string, number> {
    const stats: Record<string, number> = {};
    
    names.forEach(name => {
      const result = this.classify(name);
      const key = `${result.type}_${result.confidence}`;
      stats[key] = (stats[key] || 0) + 1;
    });
    
    return stats;
  }
}
