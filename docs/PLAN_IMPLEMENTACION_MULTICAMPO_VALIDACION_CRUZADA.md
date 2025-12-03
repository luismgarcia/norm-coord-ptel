# PLAN DE IMPLEMENTACIÓN: Geocodificación Multi-Campo + Validación Cruzada
## Versión 2.0 - 3 Diciembre 2025
## Estado: APROBADO ✅

---

## 📌 RESUMEN EJECUTIVO

| Aspecto | Valor |
|---------|-------|
| **Problema** | Score geocodificación ~65%, sin detección errores |
| **Solución** | Multi-campo + validación cruzada multi-fuente |
| **Objetivo** | Score 92-98%, detección 95% errores |
| **Coste** | €0 (CartoCiudad gratuito, GitHub Pages) |
| **Duración** | 8-10 días |

---

## 🎯 PRINCIPIOS FUNDAMENTALES

### 1. Explotar TODOS los campos disponibles

```
FILA PTEL
├── TIPO        → Filtro inicial (11,282 → <50 candidatos)
├── MUNICIPIO   → Índice O(1) (→ <10 candidatos)
├── NOMBRE      → Fuzzy matching para desambiguar
├── DIRECCIÓN   → Geocodificación directa + validación
└── COD_INE     → Validación anti-homónimos
```

### 2. Match directo en singletons (65% de casos)

Si un municipio tiene **1 sola infraestructura** del tipo buscado:
- Match directo sin fuzzy matching
- Confianza 95%
- Tiempo <10ms

### 3. Siempre validación cruzada

Consultar **mínimo 2 fuentes** para cada geocodificación.
Si discrepan más del umbral → flag para revisión manual.

### 4. NO propagar errores

Mejor retornar `NEEDS_REVIEW` que coordenadas incorrectas.
En emergencias, un error puede costar vidas.

---

## 📊 FASES DE IMPLEMENTACIÓN

## FASE 1: Estrategia Multi-Campo
**Duración:** 2-3 días | **Impacto:** +20% score

| Tarea | Archivo | Descripción |
|-------|---------|-------------|
| 1.1 | `LocalDataService.ts` | `countByType()`, `getUniqueByType()` |
| 1.2 | `InfrastructureClassifier.ts` | Detectar concatenaciones "CENTROSALUD" |
| 1.3 | `addressCleaner.ts` (NUEVO) | Limpiar direcciones sucias |
| 1.4 | `multiFieldStrategy.ts` (NUEVO) | Desambiguación con pesos por tipología |

### Pesos por Tipología

```typescript
const WEIGHTS = {
  HEALTH:    { nombre: 0.5, direccion: 0.3, localidad: 0.2 },
  EDUCATION: { nombre: 0.6, direccion: 0.2, localidad: 0.2 },
  SECURITY:  { nombre: 0.3, direccion: 0.4, localidad: 0.3 },
  SPORTS:    { nombre: 0.4, direccion: 0.4, localidad: 0.2 },
  DEFAULT:   { nombre: 0.4, direccion: 0.3, localidad: 0.3 }
};
```

---

## FASE 2: Validación Cruzada Completa
**Duración:** 3-4 días | **Impacto:** +7-10% score, 95% detección errores

| Tarea | Función | Descripción |
|-------|---------|-------------|
| 2.1 | `queryMultipleSources()` | Promise.all paralelo |
| 2.2 | `distanceUTM()` | Euclidiana directa (10x más rápida) |
| 2.3 | `analyzeResultClusters()` | Identificar concordancia/outliers |
| 2.4 | `huberCentroid()` | Promedio resistente a outliers |
| 2.5 | `calculateCompositeScore()` | α×match + β×concordancia + γ×autoridad |
| 2.6 | `detectDiscrepancy()` | Flag si distancia > umbral |

### Umbrales por Tipología

| Tipología | Umbral | Justificación |
|-----------|--------|---------------|
| HEALTH | 25m | Crítico: emergencias médicas |
| SECURITY | 25m | Crítico: emergencias |
| EDUCATION | 50m | Importante: evacuaciones |
| ADMIN | 100m | Moderado |
| SPORTS | 100m | Moderado |
| CULTURAL | 75m | Moderado |

### Score Compuesto

```
Score = 0.40 × matchScore + 0.35 × concordanceScore + 0.25 × authorityScore
```

### Autoridad por Fuente

| Fuente | Peso | Justificación |
|--------|------|---------------|
| LOCAL_DERA | 0.95 | Dato oficial Junta Andalucía |
| WFS_DERA | 0.85 | Online oficial |
| CartoCiudad | 0.80 | IGN oficial |
| CDAU | 0.80 | Callejero Andalucía |
| Nominatim | 0.55 | OSM crowd-sourced |

---

## FASE 3: Optimizaciones Técnicas
**Duración:** 2-3 días | **Impacto:** +3-5% score, 3-5x velocidad

| Tarea | Cambio | Mejora |
|-------|--------|--------|
| 3.1 | Fuse.js → uFuzzy | 400x velocidad, 7.5KB vs 24KB |
| 3.2 | Normalización NFD | +5-8% matching español |
| 3.3 | Flatbush R-tree | 100x queries espaciales |
| 3.4 | Web Workers | UI sin bloqueo (opcional) |

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
src/
├── lib/
│   ├── LocalDataService.ts      [MODIFICAR]
│   ├── multiFieldStrategy.ts    [NUEVO]
│   └── crossValidation.ts       [NUEVO]
├── services/
│   └── geocoding/
│       └── GeocodingOrchestrator.ts [MODIFICAR]
├── utils/
│   ├── addressCleaner.ts        [NUEVO]
│   └── spanishNormalizer.ts     [NUEVO]
└── workers/
    └── geocodingWorker.ts       [NUEVO, OPCIONAL]
```

---

## ✅ CHECKLIST RESUMIDO

### Fase 1 (20 tareas)
- [ ] countByType() y getUniqueByType()
- [ ] Clasificador concatenaciones
- [ ] addressCleaner.ts
- [ ] multiFieldStrategy.ts
- [ ] Tests Colomera/Tíjola/Quéntar

### Fase 2 (18 tareas)
- [ ] crossValidation.ts completo
- [ ] Integración en Orchestrator
- [ ] Umbrales por tipología
- [ ] Tests discrepancias

### Fase 3 (12 tareas)
- [ ] Migrar a uFuzzy
- [ ] Flatbush para DERA
- [ ] Normalización española
- [ ] Benchmarks

**Total: 50 tareas**

---

## 📈 MÉTRICAS DE ÉXITO

| Métrica | Actual | Fase 1 | Final |
|---------|--------|--------|-------|
| Score promedio | 65% | 85% | 92-98% |
| Detección errores | 0% | 50% | 95% |
| Singletons resueltos | 0% | 95% | 95% |
| Tiempo (42 reg) | 6 min | 4 min | 10-12 min |

---

## 🔗 DOCUMENTACIÓN RELACIONADA

| Documento | Ubicación |
|-----------|-----------|
| Plan Maestro (este documento) | `docs/PLAN_IMPLEMENTACION_MULTICAMPO_VALIDACION_CRUZADA.md` |
| Flujo Técnico Detallado | `.ptel/ESTRATEGIA_MULTICAMPO_MULTIFUENTE_2025-12-03.md` |
| Checklist Detallado | `.ptel/CHECKLIST_IMPLEMENTACION_MULTICAMPO.md` |
| Decisión Arquitectónica | `.ptel/DECISION_VALIDACION_CRUZADA_2025-12-03.md` |
| Diagnóstico del Problema | `.ptel/DIAGNOSTICO_GEOCODIFICACION_2025-12-03.md` |
| Índice Completo | `.ptel/INDICE_DOCUMENTACION_GEOCODIFICACION.md` |

---

## 📝 HISTORIAL

| Fecha | Versión | Cambio |
|-------|---------|--------|
| 2025-12-03 | 2.0 | Plan consolidado multi-campo + validación cruzada |
| 2025-12-03 | 1.0 | Diagnóstico inicial |

---

**Autor:** Claude (DataMaster/MapWizard)  
**Aprobado por:** Luis Muñoz, GREA  
**Estado:** LISTO PARA IMPLEMENTACIÓN
