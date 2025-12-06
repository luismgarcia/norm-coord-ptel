# Plan UTF8: Estrategias de Corrección en Cascada

**Proyecto**: PTEL Andalucía - Normalizador de Coordenadas  
**Versión Plan**: 1.0  
**Fecha**: 2025-12-06  
**Estado**: 🔄 EN PROGRESO (2/6 completadas)  
**Feature asociada**: F027 (nueva)

---

## 📌 Resumen Ejecutivo

Este plan implementa las **estrategias de corrección UTF-8 en cascada** documentadas en el análisis técnico, optimizando el procesamiento de texto corrupto en documentos PTEL municipales de Andalucía.

### Objetivos

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Tasa corrección UTF-8 | ~85% | 95-98% |
| Patrones ordenados | ✅ Sí (v2.5) | ✅ Completado |
| Early-exit docs limpios | No | Sí (~90% skip) |
| Sistema de tiers | Parcial (Tier1) | Completo (Hot/Warm/Cold) |
| Falsos positivos | No medido | <1 por 1000 docs |

---

## 🎭 Roles Implicados

### MapWizard (Principal)
- Implementación TypeScript/React
- Creación de servicios y hooks
- Tests unitarios y de integración
- Integración con pipeline existente

### DataMaster (Validación)
- Definición de patrones por frecuencia
- Validación de resultados contra corpus real
- Casos de prueba con datos reales andaluces
- Revisión de falsos positivos

---

## 📅 Cronograma - 6 Sesiones

| Sesión | ID | Tarea | Duración | Rol | Estado |
|--------|----|----|----------|-----|--------|
| 1 | UTF8-1 | Reordenar patrones longest-first | 30 min | MapWizard | ✅ Completada |
| 2 | UTF8-2 | Función `isSuspicious()` early-exit | 45 min | MapWizard | ✅ Completada |
| 3 | UTF8-3 | Clase `EncodingCorrector` con tiers | 1h | MapWizard | ⏳ Pendiente |
| 4 | UTF8-4 | Tests unitarios completos | 45 min | DataMaster | ⏳ Pendiente |
| 5 | UTF8-5 | Integración en pipeline normalización | 45 min | MapWizard | ⏳ Pendiente |
| 6 | UTF8-6 | Tests E2E y documentación | 30 min | DataMaster | ⏳ Pendiente |

**Total estimado**: 4-5 horas distribuidas

---

## ✅ Sesión UTF8-1 Completada (06-Dic-2025)

### Cambios Realizados
- Extraídos 17 patrones UTF-8 a array `MOJIBAKE_PATTERNS_TIER1`
- Ordenación longest-match-first para evitar conflictos
- Añadidas vocales mayúsculas acentuadas (Á, É, Í, Ó, Ú, Ñ)
- Añadido soporte diéresis ü (Güéjar Sierra, Agüero)
- Mejorada detección con regex `/[ÃÂ]/`
- Uso de `split().join()` en lugar de `replace()` encadenado
- Versión actualizada a v2.5.0

### Commit
```
refactor(UTF8-1): Reordenar patrones mojibake longest-match-first
Commit: 6a2bcfe
```

---

## ✅ Sesión UTF8-2 Completada (07-Dic-2025)

### Cambios Realizados
- Creado `src/lib/encodingDetector.ts` (~150 líneas)
- Función `isSuspicious()` para early-exit
- Función `isCleanASCII()` para fast-path
- Función `detectEncodingIssue()` para diagnóstico detallado
- Función `analyzeTexts()` para análisis batch
- Creados 60 tests en `src/__tests__/encodingDetector.test.ts`

### Funciones Implementadas

| Función | Propósito | Rendimiento |
|---------|-----------|-------------|
| `isCleanASCII(text)` | Detecta ASCII puro | <0.01ms |
| `isSuspicious(text)` | Detecta mojibake | <0.1ms |
| `detectEncodingIssue(text)` | Diagnóstico detallado | <0.1ms |
| `analyzeTexts(texts[])` | Análisis batch | ~0.1ms/texto |

### Tests
- 60 tests nuevos pasando
- Cobertura: topónimos limpios, mojibake, coordenadas, casos límite

---

## 📋 Detalle Sesiones Pendientes

### UTF8-2: Early-Exit (45 min) - MapWizard

**Objetivo**: Evitar procesamiento innecesario en textos limpios.

**Archivos a crear**:
- `src/lib/encodingDetector.ts` (nuevo, ~80 líneas)

**Código de referencia**:
```typescript
const MOJIBAKE_INDICATORS = /[ÃÂ]|â€/;

export function isSuspicious(text: string): boolean {
  if (/^[\x00-\x7F]*$/.test(text)) return false;
  return MOJIBAKE_INDICATORS.test(text);
}
```

---

### UTF8-3: Clase EncodingCorrector (1h) - MapWizard

**Objetivo**: Servicio reutilizable con sistema de tiers.

**Archivos a crear**:
- `src/lib/EncodingCorrector.ts` (nuevo, ~200 líneas)
- `src/lib/mojibakePatterns.ts` (nuevo, ~100 líneas)

**Sistema de Tiers**:
- **Tier 1 (Hot)**: 17 patrones más frecuentes ✅ (ya implementado en v2.5)
- **Tier 2 (Warm)**: 25 patrones medios
- **Tier 3 (Cold)**: 20 patrones raros

---

### UTF8-4: Tests Unitarios (45 min) - DataMaster

**Archivos a crear**:
- `src/__tests__/EncodingCorrector.test.ts`

---

### UTF8-5: Integración Pipeline (45 min) - MapWizard

**Archivos a modificar**:
- `src/lib/coordinateNormalizer.ts` (refactorizar FASE 1)

---

### UTF8-6: Tests E2E (30 min) - DataMaster

**Archivos a crear**:
- `src/__tests__/e2e/utf8Integration.test.ts`

---

## 🔄 Coexistencia con Fase C

El Plan UTF8 está diseñado para **intercalarse** con la Fase C planificada:

| Semana | Lunes | Martes | Miércoles | Jueves | Viernes |
|--------|-------|--------|-----------|--------|---------|
| 1 | C.1 uFuzzy | **UTF8-2** | C.2 Flatbush | **UTF8-3** | - |
| 2 | **UTF8-4** | C.3 Cache | **UTF8-5** | **UTF8-6** | Revisión |

**Compatibilidad de roles**:
- Fase C: MapWizard (principalmente)
- Plan UTF8: MapWizard (4/6) + DataMaster (2/6)
- ✅ Se pueden intercalar sin conflicto

---

## 📊 Métricas de Éxito

Al completar F027:

- [x] UTF8-1: Patrones ordenados longest-first
- [x] UTF8-2: Early-exit implementado
- [ ] UTF8-3: EncodingCorrector con tiers
- [ ] UTF8-4: >95% cobertura en tests
- [ ] UTF8-5: Integración en pipeline
- [ ] UTF8-6: Tests E2E pasando

---

## 📝 Documentos Relacionados

- `BATERIA_PRUEBAS_UTF8.md` - Suite de tests
- `Estrategias_corrección_UTF-8_cascada.md` - Documento técnico origen
- `PTEL_FEATURES.json` - Estado features (añadir F027)

---

**Última actualización**: 2025-12-06 - Sesión UTF8-1 completada
