# F023 Fase 2 - Mapa de Sesiones
## Validación Cruzada Multi-Fuente

**Objetivo global:** Score 75-80% → 92-98%  
**Tareas totales:** 18  
**Sesiones planificadas:** 3

---

## 🗺️ MAPA DE SESIONES

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         F023 FASE 2: VALIDACIÓN CRUZADA                     │
│                              18 tareas / 3 sesiones                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────────┐       ┌───────────────────┐       ┌───────────────────┐
│   SESIÓN 2A ✅    │       │   SESIÓN 2B ✅    │       │   SESIÓN 2C       │
│   FUNDAMENTOS     │ ───▶  │   ALGORITMOS      │ ───▶  │   INTEGRACIÓN     │
│   COMPLETADA      │       │   COMPLETADA      │       │                   │
│ ✓ GeocodingErrors │       │ ✓ huberCentroid   │       │ • compositeScore  │
│ ✓ distanceUTM     │       │ ✓ analyzeCluster  │       │ • detectDiscrep.  │
│ ✓ queryMultiple   │       │ ✓ identifyOutlier │       │ • integrar Orch.  │
│ ✓ 19 tests        │       │ ✓ concordanceScor │       │ • tests E2E       │
│ Tiempo: ~45min    │       │ ✓ 25 tests nuevos │       │ Tiempo: ~1.5h     │
└───────────────────┘       └───────────────────┘       └───────────────────┘
        │                             │                             │
        ▼                             ▼                             ▼
   6 tareas                      5 tareas                      7 tareas
```

---

## 📋 SESIÓN 2A: Fundamentos (PRIMERA)

**Prerrequisito:** Fase 1 completada ✅  
**Objetivo:** Crear infraestructura base para validación cruzada

### Tareas (6)

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 2.0 | GeocodingErrors | `src/services/geocoding/errors/GeocodingErrors.ts` | Sistema errores tipados |
| 2.1 | crossValidation | `src/lib/crossValidation.ts` | Módulo principal (estructura) |
| 2.2a | distanceUTM | En crossValidation.ts | Distancia euclidiana EPSG:25830 |
| 2.2b | queryMultipleSources | En crossValidation.ts | Promise.allSettled paralelo |
| 2.2c | Manejo errores | En crossValidation.ts | Una fuente falla, otras continúan |
| 2.2d | Tests paralelo | `src/lib/__tests__/crossValidation.test.ts` | Tests con fuentes mock |

### Entregables sesión 2A
- [x] GeocodingErrors.ts con 6 tipos de error ✅
- [x] crossValidation.ts con distanceUTM + queryMultipleSources ✅
- [x] 19 tests nuevos (972 total) ✅
- [x] Documentación inline ✅

**Estado:** ✅ COMPLETADA (3 Dic 2025)  
**Archivos creados:**
- `src/services/geocoding/errors/GeocodingErrors.ts` (282 líneas)
- `src/services/geocoding/errors/index.ts` (31 líneas)
- `src/lib/crossValidation.ts` (355 líneas)
- `src/lib/__tests__/crossValidation.test.ts` (340 líneas)

---

## 📋 SESIÓN 2B: Algoritmos (SEGUNDA)

**Prerrequisito:** Sesión 2A completada  
**Objetivo:** Implementar algoritmos de clustering y centroide

### Tareas (5)

| # | Tarea | Descripción |
|---|-------|-------------|
| 2.3 | analyzeResultClusters | Agrupar resultados por proximidad |
| 2.4 | identificar outliers | Detectar fuentes discrepantes |
| 2.5 | calcular radio cluster | Métrica de dispersión |
| 2.6 | huberCentroid | Centroide robusto (resistente outliers) |
| 2.7 | Tests clusters | Casos concordancia y discrepancia |

### Entregables sesión 2B
- [x] analyzeResultClusters() funcionando ✅
- [x] huberCentroid() funcionando ✅
- [x] 25 tests nuevos (997 total) ✅
- [x] identifyOutliers + calculateConcordanceScore ✅

**Estado:** ✅ COMPLETADA (3 Dic 2025)  
**Funciones implementadas:**
- `simpleCentroid()` - Media aritmética
- `huberCentroid()` - Centroide robusto iterativo
- `identifyOutliers()` - Detección de fuentes discrepantes
- `calculateClusterRadius()` - Radio del cluster
- `calculateConcordanceScore()` - Score ponderado por autoridad
- `analyzeResultClusters()` - Análisis completo

---

## 📋 SESIÓN 2C: Integración (TERCERA)

**Prerrequisito:** Sesión 2B completada  
**Objetivo:** Score compuesto, detección discrepancias, integración final

### Tareas (7)

| # | Tarea | Descripción |
|---|-------|-------------|
| 2.8 | calculateCompositeScore | α×match + β×concordancia + γ×autoridad |
| 2.9 | Pesos por fuente | LOCAL=0.95, WFS=0.85, CARTO=0.80, NOM=0.55 |
| 2.10 | detectDiscrepancy | Umbrales por tipología |
| 2.11 | Recomendaciones | MANUAL_REVIEW, USE_CLUSTER, REJECT |
| 2.12 | Integrar en Orchestrator | Añadir validación cruzada al flujo |
| 2.13 | Metadata completa | Fuentes usadas, outliers, scores |
| 2.14 | Tests E2E | Validación completa con datos reales |

### Entregables sesión 2C
- [ ] Score compuesto funcionando
- [ ] Detección discrepancias activa
- [ ] GeocodingOrchestrator integrado
- [ ] ~20-25 tests nuevos
- [ ] Fase 2 COMPLETADA

---

## 🔗 DEPENDENCIAS

```
Sesión 2A (Fundamentos)
    │
    ├── GeocodingErrors.ts ──────────────────────────────────┐
    │                                                         │
    └── crossValidation.ts                                    │
            │                                                 │
            ├── distanceUTM() ───────┐                       │
            │                        │                        │
            └── queryMultipleSources() ───────────────────────┤
                                     │                        │
                                     ▼                        │
Sesión 2B (Algoritmos)               │                        │
    │                                │                        │
    ├── analyzeResultClusters() ◀────┘ (usa distanceUTM)     │
    │         │                                               │
    │         └── outliers, radio cluster                     │
    │                                                         │
    └── huberCentroid() ──────────────────────────────────────┤
                         │                                    │
                         ▼                                    │
Sesión 2C (Integración)  │                                    │
    │                    │                                    │
    ├── calculateCompositeScore() ◀───────────────────────────┤
    │                                                         │
    ├── detectDiscrepancy() ◀─────────────────────────────────┘
    │
    └── GeocodingOrchestrator.ts (integración final)
```

---

## 📊 MÉTRICAS OBJETIVO

| Métrica | Antes Fase 2 | Después Fase 2 |
|---------|--------------|----------------|
| Score global | 75-80% | 92-98% |
| Detección errores | ~60% | 95% |
| Tests totales | 953 | ~1010 |
| Cobertura | 94% | 96% |

---

**Documento creado:** 3 Diciembre 2025  
**Actualizar:** Al completar cada sesión
