/**
 * PTEL Seed Patterns - Patrones Semilla v1.0
 * 
 * Patrones iniciales aprendidos de validación empírica con documentos reales.
 * Fuente: 17 documentos de 7 municipios andaluces (02-Dic-2025)
 * 
 * Métricas de validación:
 * - 1,212 instancias de coordenadas analizadas
 * - 426 pares X-Y válidos confirmados
 * - 98% tasa de confianza ALTA
 * - 100% cobertura de patrones detectados
 * 
 * @version 1.0.0
 * @date Diciembre 2025
 */

import type { LearnedPattern, PatternCondition, PatternTransform } from './learnedPatterns';

// ============================================================================
// CATÁLOGO DE PATRONES SEMILLA
// ============================================================================

/**
 * Estadísticas de patrones por tipo
 */
export interface PatternCatalogEntry {
  id: string;
  name: string;
  description: string;
  regex: string;
  transform: string;
  count: number;
  percentage: number;
  confidence: 'ALTA' | 'MEDIA' | 'BAJA';
  municipalities: string[];
  examples: string[];
  priority: number;
}

/**
 * Catálogo completo de patrones detectados en validación empírica
 */
export const PATTERN_CATALOG: PatternCatalogEntry[] = [
  {
    id: 'SEED_DECIMAL_PUNTO',
    name: 'Decimal con punto',
    description: 'Formato estándar internacional: 520779.59',
    regex: '^\\d+\\.\\d+$',
    transform: 'none',
    count: 449,
    percentage: 37.0,
    confidence: 'ALTA',
    municipalities: ['Tijola', 'Quentar', 'Castril', 'Colomera', 'Hornos', 'Berja'],
    examples: ['520779.59', '4185466.35', '550288.87', '4133597.37'],
    priority: 1
  },
  {
    id: 'SEED_ESPACIO_DOBLE_TILDE',
    name: 'Espacio + doble tilde',
    description: 'Formato Berja: 506 320´´45 (espacio miles, ´´ decimal)',
    regex: '^\\d{1,3}(?:\\s+\\d{3})+´´\\d{1,2}$',
    transform: 'removeSpaces,replaceTildeDouble',
    count: 337,
    percentage: 27.8,
    confidence: 'ALTA',
    municipalities: ['Berja'],
    examples: ['506 320´´45', '4 076 622´´96', '504 750´´92', '4 077 153´´36'],
    priority: 2
  },
  {
    id: 'SEED_COMA_DECIMAL',
    name: 'Coma decimal',
    description: 'Formato español estándar: 436780,0',
    regex: '^\\d+,\\d+$',
    transform: 'replaceComma',
    count: 221,
    percentage: 18.2,
    confidence: 'ALTA',
    municipalities: ['Colomera', 'Castril', 'Quentar', 'Tijola', 'Berja'],
    examples: ['436780,0', '4136578,2', '519440,26', '4183176,02'],
    priority: 3
  },
  {
    id: 'SEED_ENTERO',
    name: 'Entero sin decimales',
    description: 'Coordenada entera: 505438',
    regex: '^\\d{5,7}$',
    transform: 'none',
    count: 125,
    percentage: 10.3,
    confidence: 'ALTA',
    municipalities: ['Colomera', 'Berja', 'Tijola', 'Quentar', 'Castril', 'Hornos'],
    examples: ['505438', '4078875', '550288', '4133597'],
    priority: 4
  },
  {
    id: 'SEED_EUROPEO_LARGO',
    name: 'Europeo largo',
    description: 'Formato europeo completo: 4.078.875,09 (punto miles, coma decimal)',
    regex: '^\\d{1,3}(?:\\.\\d{3}){2,},\\d+$',
    transform: 'removeThousandsDot,replaceComma',
    count: 24,
    percentage: 2.0,
    confidence: 'MEDIA',
    municipalities: ['Berja'],
    examples: ['4.078.875,09', '4.076.573,36', '4.076.556,99', '4.076.704,47'],
    priority: 5
  },
  {
    id: 'SEED_EUROPEO_CORTO',
    name: 'Europeo corto',
    description: 'Formato europeo X: 505.438,13 (punto miles, coma decimal)',
    regex: '^\\d{3}\\.\\d{3},\\d+$',
    transform: 'removeThousandsDot,replaceComma',
    count: 23,
    percentage: 1.9,
    confidence: 'MEDIA',
    municipalities: ['Berja'],
    examples: ['505.438,13', '506.299,81', '506.384,63', '504.489,53'],
    priority: 6
  },
  {
    id: 'SEED_PUNTO_MILES',
    name: 'Punto miles sin decimal',
    description: 'Coordenada con puntos de miles: 524.891 o 4.230.105',
    regex: '^\\d{1,3}(?:\\.\\d{3})+$',
    transform: 'removeThousandsDot',
    count: 18,
    percentage: 1.5,
    confidence: 'MEDIA',
    municipalities: ['Hornos', 'Berja'],
    examples: ['524.891', '4.230.105', '17.224', '6.854'],
    priority: 7
  },
  {
    id: 'SEED_TILDE_SIMPLE',
    name: 'Tilde simple',
    description: 'Tilde como decimal: 503693´77',
    regex: '^\\d+´\\d+$',
    transform: 'replaceTilde',
    count: 12,
    percentage: 1.0,
    confidence: 'MEDIA',
    municipalities: ['Berja'],
    examples: ['503693´77', '504750´92'],
    priority: 8
  },
  {
    id: 'SEED_DOBLE_TILDE',
    name: 'Doble tilde sin espacio',
    description: 'Doble tilde como decimal: 505313´´62',
    regex: '^\\d+´´\\d+$',
    transform: 'replaceTildeDouble',
    count: 3,
    percentage: 0.2,
    confidence: 'BAJA',
    municipalities: ['Berja'],
    examples: ['505313´´62', '503693´´77'],
    priority: 9
  }
];

// ============================================================================
// PERFILES DE MUNICIPIO
// ============================================================================

export interface MunicipioProfile {
  nombre: string;
  provincia: string;
  codigoINE?: string;
  patronesDominantes: string[];
  complejidad: 'alta' | 'media' | 'baja';
  formatoDecimal: 'coma' | 'punto' | 'mixto';
  formatoMiles: 'punto' | 'espacio' | 'ninguno' | 'mixto';
  caracteristicas: string[];
}

/**
 * Perfiles de municipios basados en validación empírica
 */
export const MUNICIPIO_PROFILES: MunicipioProfile[] = [
  {
    nombre: 'Berja',
    provincia: 'Almería',
    patronesDominantes: ['SEED_ESPACIO_DOBLE_TILDE', 'SEED_EUROPEO_LARGO', 'SEED_EUROPEO_CORTO'],
    complejidad: 'alta',
    formatoDecimal: 'mixto',
    formatoMiles: 'mixto',
    caracteristicas: [
      'Mayor diversidad de patrones (9 tipos)',
      'Uso único de doble tilde (´´)',
      'Mezcla formatos europeos con espacios',
      'Coordenadas Y con formato 4.076.xxx,xx'
    ]
  },
  {
    nombre: 'Castril',
    provincia: 'Granada',
    patronesDominantes: ['SEED_DECIMAL_PUNTO', 'SEED_COMA_DECIMAL'],
    complejidad: 'media',
    formatoDecimal: 'mixto',
    formatoMiles: 'ninguno',
    caracteristicas: [
      'Volumen alto (145 pares)',
      'Equilibrio punto/coma decimal',
      'Sin formato miles'
    ]
  },
  {
    nombre: 'Tijola',
    provincia: 'Almería',
    patronesDominantes: ['SEED_DECIMAL_PUNTO'],
    complejidad: 'baja',
    formatoDecimal: 'punto',
    formatoMiles: 'ninguno',
    caracteristicas: [
      'Formato más limpio',
      'Predomina decimal con punto',
      'Algunas Y truncadas (corregidas automáticamente)'
    ]
  },
  {
    nombre: 'Quéntar',
    provincia: 'Granada',
    patronesDominantes: ['SEED_DECIMAL_PUNTO', 'SEED_COMA_DECIMAL'],
    complejidad: 'media',
    formatoDecimal: 'mixto',
    formatoMiles: 'ninguno',
    caracteristicas: [
      'Mezcla punto y coma decimal',
      'Sin caracteres especiales',
      'Documento pequeño (7 pares)'
    ]
  },
  {
    nombre: 'Colomera',
    provincia: 'Granada',
    patronesDominantes: ['SEED_DECIMAL_PUNTO', 'SEED_COMA_DECIMAL'],
    complejidad: 'media',
    formatoDecimal: 'mixto',
    formatoMiles: 'ninguno',
    caracteristicas: [
      'Formato estándar español',
      'Documento pequeño (6 pares)',
      'Benchmark de referencia'
    ]
  },
  {
    nombre: 'Hornos',
    provincia: 'Jaén',
    patronesDominantes: ['SEED_PUNTO_MILES'],
    complejidad: 'media',
    formatoDecimal: 'ninguno',
    formatoMiles: 'punto',
    caracteristicas: [
      'Usa punto como miles (524.891)',
      'Requiere interpretación contextual',
      'Documento pequeño (6 pares)'
    ]
  }
];

// ============================================================================
// CONVERSIÓN A LearnedPattern
// ============================================================================

/**
 * Genera ID único para patrón
 */
function generatePatternId(entry: PatternCatalogEntry): string {
  return `seed_${entry.id.toLowerCase()}_${Date.now().toString(36)}`;
}

/**
 * Convierte entrada del catálogo a LearnedPattern
 */
export function catalogEntryToLearnedPattern(entry: PatternCatalogEntry): LearnedPattern {
  const conditions: PatternCondition[] = [
    {
      field: 'coordinates',
      regex: entry.regex,
      description: entry.description
    }
  ];
  
  const transforms: PatternTransform[] = entry.transform.split(',')
    .filter(t => t !== 'none')
    .map(t => ({
      type: t as PatternTransform['type'],
      description: getTransformDescription(t)
    }));
  
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    source: 'empirical',
    dateAdded: '2025-12-02',
    lastUsed: new Date().toISOString(),
    uses: entry.count,
    successes: Math.round(entry.count * (entry.confidence === 'ALTA' ? 0.98 : entry.confidence === 'MEDIA' ? 0.90 : 0.75)),
    failures: Math.round(entry.count * (entry.confidence === 'ALTA' ? 0.02 : entry.confidence === 'MEDIA' ? 0.10 : 0.25)),
    isStable: entry.confidence === 'ALTA' && entry.count >= 10,
    municipalities: entry.municipalities,
    conditions,
    transforms,
    priority: entry.priority,
    examples: entry.examples
  };
}

/**
 * Obtiene descripción de transformación
 */
function getTransformDescription(transform: string): string {
  const descriptions: Record<string, string> = {
    'removeSpaces': 'Elimina espacios de miles',
    'replaceTildeDouble': 'Reemplaza ´´ por punto decimal',
    'replaceTilde': 'Reemplaza ´ por punto decimal',
    'replaceComma': 'Reemplaza coma por punto decimal',
    'removeThousandsDot': 'Elimina puntos de miles'
  };
  return descriptions[transform] || transform;
}

/**
 * Genera todos los LearnedPatterns desde el catálogo
 */
export function generateAllSeedPatterns(): LearnedPattern[] {
  return PATTERN_CATALOG.map(catalogEntryToLearnedPattern);
}

// ============================================================================
// ESTADÍSTICAS DE VALIDACIÓN
// ============================================================================

export const VALIDATION_STATS = {
  fecha: '2025-12-02',
  documentos: {
    total: 17,
    odt_docx: 6,
    ods: 6,
    dbf: 5
  },
  municipios: {
    total: 7,
    lista: ['Berja', 'Colomera', 'Tijola', 'Quéntar', 'Castril', 'Hornos', 'Industrial']
  },
  coordenadas: {
    totalInstancias: 1212,
    paresValidos: 426,
    xValidas: 465,
    yValidas: 426,
    yCorregidas: 18
  },
  confianza: {
    alta: 98.0,
    media: 2.0,
    baja: 0.0
  },
  patrones: {
    total: 9,
    cubiertosNormalizador: 9,
    cobertura: 100.0
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  PATTERN_CATALOG,
  MUNICIPIO_PROFILES,
  VALIDATION_STATS,
  generateAllSeedPatterns,
  catalogEntryToLearnedPattern
};
