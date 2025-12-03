# PLAN DE IMPLEMENTACIÓN: Geocodificación Multi-Campo + Validación Cruzada
## Versión 2.0 - 3 Diciembre 2025
## Estado: APROBADO ✅

---

## 📌 RESUMEN EJECUTIVO

**Problema:** Score actual de geocodificación ~65%, sin detección de errores.

**Solución:** Estrategia multi-campo que explota TODOS los campos de cada fila (TIPO, NOMBRE, DIRECCIÓN, MUNICIPIO) combinada con validación cruzada multi-fuente.

**Objetivo:** Score 92-98% con detección del 95% de errores.

**Coste:** €0 (CartoCiudad gratuito, GitHub Pages, librerías open source)

---

## 🎯 PRINCIPIOS FUNDAMENTALES

### 1. Explotar TODOS los campos disponibles
Cada fila PTEL tiene múltiples campos. No usar solo NOMBRE.

```
FILA PTEL:
├── TIPO        → Filtro inicial (11,282 → <50 candidatos)
├── MUNICIPIO   → Índice O(1) (→ <10 candidatos)
├── NOMBRE      → Fuzzy matching para desambiguar
├── DIRECCIÓN   → Geocodificación directa + validación
└── COD_INE     → Validación anti-homónimos
```

### 2. Match directo en singletons (65% de casos)
Si un municipio tiene UNA SOLA infraestructura del tipo buscado → match directo sin fuzzy matching.

### 3. Siempre validación cruzada
Consultar al menos 2 fuentes. Si discrepan > umbral → flag para revisión manual.

### 4. NO propagar errores
Mejor retornar "NEEDS_REVIEW" que propagar coordenadas incorrectas.

---

## 📊 FASES DE IMPLEMENTACIÓN

## FASE 1: Estrategia Multi-Campo
**Duración estimada:** 2-3 días
**Impacto:** +20% score

### 1.1 Match Directo Singleton
**Archivo:** `src/lib/LocalDataService.ts`

```typescript
// NUEVO: Contar por tipo en municipio
async countByType(tipologia: string, codMunicipio: string): Promise<number>

// NUEVO: Obtener único si singleton
async getUniqueByType(tipologia: string, codMunicipio: string): Promise<Feature | null>
```

**Lógica:**
- Si `countByType() === 1` → retornar directamente con 95% confianza
- Si `countByType() === 0` → escalar a CartoCiudad/CDAU
- Si `countByType() >= 2` → proceder a desambiguación

### 1.2 Filtro TIPO + MUNICIPIO Primero
**Archivo:** `src/services/geocoding/GeocodingOrchestrator.ts`

Antes de cualquier fuzzy matching:
1. Clasificar TIPO → tipología (HEALTH, EDUCATION, SECURITY, etc.)
2. Filtrar DERA por tipología + código INE municipio
3. Solo entonces aplicar fuzzy matching sobre candidatos filtrados

### 1.3 Desambiguación Multi-Campo
**Archivo:** `src/lib/multiFieldStrategy.ts` (NUEVO)

```typescript
interface DisambiguationWeights {
  nombre: number;    // Peso para match de nombre
  direccion: number; // Peso para match de dirección
  localidad: number; // Peso para match de localidad/barrio
}

const WEIGHTS_BY_TYPOLOGY: Record<string, DisambiguationWeights> = {
  HEALTH:    { nombre: 0.5, direccion: 0.3, localidad: 0.2 },
  EDUCATION: { nombre: 0.6, direccion: 0.2, localidad: 0.2 },
  SECURITY:  { nombre: 0.3, direccion: 0.4, localidad: 0.3 },
  SPORTS:    { nombre: 0.4, direccion: 0.4, localidad: 0.2 },
  CULTURAL:  { nombre: 0.5, direccion: 0.3, localidad: 0.2 },
  DEFAULT:   { nombre: 0.4, direccion: 0.3, localidad: 0.3 }
};
```

### 1.4 Limpieza de Direcciones
**Archivo:** `src/utils/addressCleaner.ts` (NUEVO)

```typescript
function cleanAddress(raw: string): CleanedAddress {
  // 1. Eliminar información no relevante
  //    - Horarios: "24h", "L-V 8:00-15:00"
  //    - Teléfonos: "Tel: 950123456"
  //    - Equipamiento: "1 mesa, 2 sillas"
  
  // 2. Normalizar abreviaturas
  //    - "C/" → "Calle"
  //    - "Avda." → "Avenida"
  //    - "Pza." → "Plaza"
  //    - "n/" → ""
  //    - "s/n" → "sin número"
  
  // 3. Corregir errores comunes
  //    - "Garci laso" → "Garcilaso"
  //    - Espacios múltiples → espacio único
  
  // 4. Evaluar calidad
  //    - ¿Tiene calle? ¿Tiene número? ¿Es geocodificable?
}
```

---

## FASE 2: Validación Cruzada Completa
**Duración estimada:** 3-4 días
**Impacto:** +7-10% score, 95% detección errores

### 2.1 Consulta Paralela Multi-Fuente
**Archivo:** `src/lib/crossValidation.ts` (NUEVO)

```typescript
interface SourceResult {
  source: 'LOCAL_DERA' | 'WFS_DERA' | 'CartoCiudad' | 'CDAU' | 'Nominatim';
  coordinates: [number, number];
  confidence: number;
  matchedName?: string;
}

async function queryMultipleSources(
  row: CleanedRow,
  tipologia: string,
  codMunicipio: string
): Promise<SourceResult[]> {
  return Promise.all([
    queryLocalDERA(tipologia, codMunicipio, row.nombre),
    queryWFSOnline(tipologia, codMunicipio, row.nombre),
    row.direccionValida ? queryCartoCiudad(row.direccion, row.municipio) : null,
    row.direccionValida ? queryCDAU(row.direccion, codMunicipio) : null
  ]).then(results => results.filter(Boolean));
}
```

### 2.2 Cálculo de Distancias UTM
**Archivo:** `src/lib/crossValidation.ts`

```typescript
// Distancia Euclidiana directa para EPSG:25830 (más precisa que Haversine)
function distanceUTM(p1: [number, number], p2: [number, number]): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  return Math.sqrt(dx * dx + dy * dy); // Resultado en metros
}
```

### 2.3 Detección de Clusters y Outliers
**Archivo:** `src/lib/crossValidation.ts`

```typescript
interface ClusterAnalysis {
  mainCluster: SourceResult[];  // Fuentes que concuerdan
  outliers: SourceResult[];     // Fuentes discrepantes
  clusterRadius: number;        // Radio del cluster principal
  maxDiscrepancy: number;       // Máxima discrepancia encontrada
}

function analyzeResultClusters(
  results: SourceResult[],
  thresholdMeters: number
): ClusterAnalysis
```

### 2.4 Centroide Robusto (Huber)
**Archivo:** `src/lib/crossValidation.ts`

```typescript
// Estimador Huber: resistente a outliers
function huberCentroid(
  points: [number, number][],
  weights: number[],
  delta: number = 50 // metros
): [number, number]
```

### 2.5 Score Compuesto
**Archivo:** `src/lib/crossValidation.ts`

```typescript
interface CompositeScore {
  total: number;           // 0-100
  matchScore: number;      // Calidad del mejor match
  concordanceScore: number;// Acuerdo entre fuentes
  authorityScore: number;  // Peso de fuentes usadas
}

// Fórmula: α × matchScore + β × concordanceScore + γ × authorityScore
const SCORE_WEIGHTS = {
  α: 0.40,  // Peso match
  β: 0.35,  // Peso concordancia
  γ: 0.25   // Peso autoridad
};

// Pesos de autoridad por fuente
const SOURCE_AUTHORITY = {
  LOCAL_DERA: 0.95,
  WFS_DERA: 0.85,
  CartoCiudad: 0.80,
  CDAU: 0.80,
  Nominatim: 0.55
};
```

### 2.6 Detección de Discrepancias
**Archivo:** `src/lib/crossValidation.ts`

```typescript
// Umbrales por tipología (en metros)
const DISCREPANCY_THRESHOLDS = {
  HEALTH: 25,      // Crítico: emergencias
  SECURITY: 25,    // Crítico: emergencias
  EDUCATION: 50,   // Importante
  ADMIN: 100,      // Moderado
  SPORTS: 100,     // Moderado
  CULTURAL: 75,    // Moderado
  DEFAULT: 50
};

interface DiscrepancyResult {
  detected: boolean;
  sourceA: SourceResult;
  sourceB: SourceResult;
  distanceMeters: number;
  threshold: number;
  recommendation: 'MANUAL_REVIEW' | 'USE_CLUSTER' | 'REJECT';
}
```

---

## FASE 3: Optimizaciones Técnicas
**Duración estimada:** 2-3 días
**Impacto:** +3-5% score, 3-5x velocidad

### 3.1 Migrar Fuse.js → uFuzzy
**Archivos:** `package.json`, archivos que usan Fuse.js

- Bundle: 7.5 KB vs 24 KB
- Velocidad: 400x más rápido
- API similar, migración sencilla

```bash
npm uninstall fuse.js
npm install @leeoniya/ufuzzy
```

### 3.2 Normalización Española Completa
**Archivo:** `src/utils/spanishNormalizer.ts` (NUEVO)

```typescript
function normalizeSpanish(text: string): string {
  return text
    .normalize('NFD')                          // Descomponer Unicode
    .replace(/[\u0300-\u036f]/g, '')          // Eliminar diacríticos
    .toLowerCase()
    .replace(/\s+/g, ' ')                      // Espacios múltiples
    .trim();
}

// Expansión de abreviaturas españolas
const ABBREVIATIONS: Record<string, string> = {
  'c/': 'calle',
  'av.': 'avenida', 'avda.': 'avenida',
  'pza.': 'plaza', 'pl.': 'plaza',
  'ctra.': 'carretera',
  'sta.': 'santa', 'sto.': 'santo',
  's/n': 'sin numero',
  // ... más
};
```

### 3.3 Índice Espacial Flatbush
**Archivo:** `src/lib/LocalDataService.ts`

```typescript
import Flatbush from 'flatbush';

// Construir índice R-tree estático para DERA
// - 11,282 features
// - Construcción: <50ms
// - Tamaño: ~200KB
// - Queries bbox: <1ms
```

### 3.4 Web Workers (Opcional)
**Archivos:** `src/workers/geocodingWorker.ts` (NUEVO)

Solo si el procesamiento bloquea UI significativamente.
Usar Comlink para API tipo RPC.

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
src/
├── lib/
│   ├── LocalDataService.ts      [MODIFICAR] +countByType, +getUniqueByType
│   ├── multiFieldStrategy.ts    [NUEVO] Desambiguación multi-campo
│   └── crossValidation.ts       [NUEVO] Validación cruzada completa
├── services/
│   └── geocoding/
│       └── GeocodingOrchestrator.ts [MODIFICAR] Integrar estrategia
├── utils/
│   ├── addressCleaner.ts        [NUEVO] Limpieza direcciones
│   └── spanishNormalizer.ts     [NUEVO] Normalización español
└── workers/
    └── geocodingWorker.ts       [NUEVO, OPCIONAL] Web Worker
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### FASE 1 - Multi-Campo
- [ ] `countByType()` en LocalDataService
- [ ] `getUniqueByType()` para singletons
- [ ] Clasificador mejorado (concatenaciones: "CENTROSALUD")
- [ ] `addressCleaner.ts` completo
- [ ] Pesos por tipología para desambiguación
- [ ] Tests con datos Colomera/Tíjola/Quéntar

### FASE 2 - Validación Cruzada
- [ ] `crossValidation.ts` con funciones:
    - [ ] `queryMultipleSources()`
    - [ ] `distanceUTM()`
    - [ ] `analyzeResultClusters()`
    - [ ] `huberCentroid()`
    - [ ] `calculateCompositeScore()`
    - [ ] `detectDiscrepancy()`
- [ ] Integración en GeocodingOrchestrator
- [ ] Umbrales por tipología
- [ ] Tests de discrepancias
- [ ] Metadata completa en resultados

### FASE 3 - Optimizaciones
- [ ] Migrar Fuse.js → uFuzzy
- [ ] Implementar Flatbush para DERA
- [ ] `spanishNormalizer.ts` completo
- [ ] Web Workers con Comlink (si necesario)
- [ ] Benchmarks de rendimiento

---

## 📈 MÉTRICAS DE ÉXITO

| Métrica | Actual | Objetivo Fase 1 | Objetivo Final |
|---------|--------|-----------------|----------------|
| Score promedio | 65% | 85% | 92-98% |
| Detección errores | 0% | 50% | 95% |
| Singletons resueltos | 0% | 95% | 95% |
| Tiempo 42 registros | 6 min | 4 min | 10-12 min* |

*Mayor tiempo por validación cruzada completa, pero con calidad garantizada.

---

## 🔗 DOCUMENTOS RELACIONADOS

- `ESTRATEGIA_MULTICAMPO_MULTIFUENTE_2025-12-03.md` - Flujo detallado
- `DECISION_VALIDACION_CRUZADA_2025-12-03.md` - Decisión arquitectónica
- `DIAGNOSTICO_GEOCODIFICACION_2025-12-03.md` - Análisis del problema
- `ANALISIS_MEJORAS_GEOCODIFICACION_2025-12-03.md` - Técnicas evaluadas

---

## 📝 HISTORIAL

| Fecha | Versión | Cambio |
|-------|---------|--------|
| 2025-12-03 | 2.0 | Plan consolidado multi-campo + validación cruzada |
| 2025-12-03 | 1.0 | Diagnóstico inicial y propuestas |

---

**Autor:** Claude (DataMaster/MapWizard)
**Aprobado por:** Luis Muñoz, GREA
**Estado:** LISTO PARA IMPLEMENTACIÓN
