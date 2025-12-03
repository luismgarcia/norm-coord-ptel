# PROMPT SESIÓN 2A - Fundamentos Validación Cruzada

## 🎯 Contexto Global

**Proyecto:** PTEL Coordinate Normalizer v0.5.0  
**Repo local:** `/Users/lm/Documents/GitHub/norm-coord-ptel`  
**Rol:** MapWizard (React/TypeScript/APIs)

### Estado actual
- **Fase 1:** ✅ COMPLETADA (100%) - Singleton + desambiguación
- **Fase 2:** ⏳ PENDIENTE (0/18 tareas) - Validación cruzada
- **Score:** 75-80% → Objetivo: 92-98%
- **Tests:** 953 passed, 7 skipped

---

## 🗺️ Plan Fase 2: 3 Sesiones

```
SESIÓN 2A (ESTA)     →     SESIÓN 2B          →     SESIÓN 2C
Fundamentos                Algoritmos               Integración
─────────────────          ─────────────────        ─────────────────
• GeocodingErrors          • analyzeCluster         • compositeScore
• distanceUTM              • huberCentroid          • detectDiscrep.
• queryMultipleSources     • tests clusters         • integrar Orch.
                                                    • tests E2E
~1.5h                      ~1.5h                    ~1.5h
```

**Dependencias:** 2A → 2B → 2C (secuencial, cada sesión necesita la anterior)

---

## ✅ Tareas SESIÓN 2A (6 tareas)

### 1. GeocodingErrors.ts (30 min)
**Crear:** `src/services/geocoding/errors/GeocodingErrors.ts`

```typescript
// Errores tipados para geocodificación
export class GeocodingError extends Error { ... }
export class NetworkError extends GeocodingError { ... }      // API no responde
export class TimeoutError extends GeocodingError { ... }      // >5s
export class ParseError extends GeocodingError { ... }        // Respuesta malformada
export class NoResultsError extends GeocodingError { ... }    // 0 resultados
export class AmbiguousResultError extends GeocodingError { ... } // Múltiples sin resolver
export class InvalidCoordinateError extends GeocodingError { ... } // Fuera rango UTM
```

### 2. crossValidation.ts - Estructura (15 min)
**Crear:** `src/lib/crossValidation.ts`

Estructura inicial con tipos e interfaces.

### 3. distanceUTM() (20 min)
**En:** `crossValidation.ts`

```typescript
// Distancia euclidiana para EPSG:25830
function distanceUTM(p1: {x: number, y: number}, p2: {x: number, y: number}): number
// Retorna distancia en metros
```

### 4. queryMultipleSources() (40 min)
**En:** `crossValidation.ts`

```typescript
// Consulta paralela con tolerancia a fallos
async function queryMultipleSources(
  query: GeocodingQuery,
  sources: GeocodingSource[],
  timeoutMs?: number
): Promise<SourceResult[]>
```

- Usar `Promise.allSettled` (no Promise.all)
- Timeout individual por fuente (default 5000ms)
- Si una fuente falla, las demás continúan
- Retornar array con source identificada en cada resultado

### 5. Tests (20 min)
**Crear:** `src/lib/__tests__/crossValidation.test.ts`

- Tests distanceUTM (casos simples, diagonales, mismo punto)
- Tests queryMultipleSources con mocks
- Tests de timeout y manejo de errores

---

## 📁 Archivos a crear/modificar

```
src/
├── services/geocoding/errors/
│   └── GeocodingErrors.ts          ← CREAR
├── lib/
│   ├── crossValidation.ts          ← CREAR
│   └── __tests__/
│       └── crossValidation.test.ts ← CREAR
```

---

## 📚 Referencias

Leer antes de empezar:
- `.ptel/PTEL_ESTADO_SESION.json` - Estado actual
- `.ptel/MAPA_SESIONES_FASE2.md` - Mapa completo de sesiones
- `.ptel/DOCUMENTACION_FASE1_COMPLETA.md` - Cómo se hizo Fase 1
- `.ptel/PLAN_IMPLEMENTACION_GEOCODIFICACION_v2.md` - Plan maestro

---

## 🚀 Comandos inicio

```bash
cd /Users/lm/Documents/GitHub/norm-coord-ptel
git pull origin main
npm test
```

---

## ✅ Criterios de éxito sesión 2A

- [ ] GeocodingErrors.ts con 6 clases de error
- [ ] crossValidation.ts con distanceUTM + queryMultipleSources
- [ ] ~15-20 tests nuevos pasando
- [ ] Todos los tests previos siguen pasando (953+)
- [ ] Commit con mensaje descriptivo
- [ ] Actualizar MAPA_SESIONES_FASE2.md marcando completado

---

## 🔜 Próxima sesión (2B)

Tras completar 2A, la sesión 2B implementará:
- `analyzeResultClusters()` - Agrupación por proximidad
- `huberCentroid()` - Centroide robusto
- Tests de clustering

---

**Prompt guardado en:** `.ptel/PROMPT_SESION_2A.md`
