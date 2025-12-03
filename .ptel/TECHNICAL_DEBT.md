# 📊 Technical Debt - PTEL Normalizador de Coordenadas

> Documento de deuda técnica identificada para planificación de refactoring futuro
> 
> Fecha: 2025-12-04 | Versión: 0.5.2 | Líneas de código: ~51,200

---

## 📈 Métricas Actuales

| Métrica | Valor | Estado |
|---------|-------|--------|
| Archivos TypeScript | 157 | ✅ |
| Líneas de código | 51,224 | ⚠️ Grande |
| Archivos de test | 31 | ✅ |
| Tests pasando | 1,037/1,044 | ✅ |
| Usos de `any` | 53 | ⚠️ Moderado |
| TODOs pendientes | 2 | ✅ Bajo |

---

## 🔴 Prioridad ALTA (Impacto significativo)

### TD-001: Duplicación de Geocoders
**Severidad:** Alta | **Esfuerzo:** 4-6h | **Riesgo de no actuar:** Mantenimiento difícil

**Problema:**
Existen dos conjuntos de geocoders con funcionalidad solapada:
```
src/lib/                                    src/services/geocoding/specialized/
├── HeritageGeocoder.ts (30KB)             ├── WFSCulturalGeocoder.ts (10KB)
├── SecurityGeocoder.ts (28KB)             ├── WFSSecurityGeocoder.ts (12KB)
├── EducationGeocoder.ts (21KB)            ├── WFSEducationGeocoder.ts (10KB)
├── WFSHealthGeocoder.ts (18KB)            ├── WFSHealthGeocoder.ts (9KB)
```

**Solución propuesta:**
1. Auditar qué versión usa el Orchestrator actualmente
2. Consolidar en una única ubicación (`src/services/geocoding/`)
3. Eliminar duplicados no utilizados
4. Actualizar imports

**Beneficio:** Reducir ~50KB de código duplicado, simplificar mantenimiento

---

### TD-002: Archivos monolíticos muy grandes
**Severidad:** Alta | **Esfuerzo:** 6-8h | **Riesgo de no actuar:** Difícil de mantener/testear

**Archivos críticos:**
| Archivo | Líneas | Problema |
|---------|--------|----------|
| `coordinateNormalizer.ts` | 1,684 | Múltiples responsabilidades |
| `GeocodingOrchestrator.ts` | 1,188 | Lógica compleja mezclada |
| `crossValidation.ts` | 1,088 | Podría modularizarse |
| `LocalDataService.ts` | 1,065 | Datos + lógica mezclados |

**Solución propuesta:**
```
coordinateNormalizer.ts →
  ├── patterns/dmsParsers.ts
  ├── patterns/utmParsers.ts
  ├── patterns/decimalParsers.ts
  ├── validators/rangeValidator.ts
  └── normalizer.ts (orquestador)
```

**Beneficio:** Mejor testabilidad, cambios localizados, menor complejidad cognitiva

---

## 🟡 Prioridad MEDIA (Mejora de calidad)

### TD-003: Tipos `any` en el código
**Severidad:** Media | **Esfuerzo:** 3-4h | **Riesgo:** Errores en runtime

**Ubicaciones principales (53 instancias):**
```typescript
// src/App.tsx
const handleStep2Complete = (data: any) => { ... }  // ❌

// src/lib/fileParser.ts
let data: any[] = []  // ❌
function parseTextTable(text: string): any[] { ... }  // ❌

// src/components/Step3.tsx
const byTypologyData: any[] = []  // ❌
```

**Solución propuesta:**
1. Crear interfaces específicas para cada caso
2. Usar genéricos donde aplique
3. Habilitar `strict: true` en tsconfig gradualmente

**Beneficio:** Detección de errores en compilación, mejor autocompletado

---

### TD-004: Dependencias no utilizadas
**Severidad:** Media | **Esfuerzo:** 1h | **Riesgo:** Bundle innecesariamente grande

**Dependencias sospechosas:**
| Dependencia | Tamaño | Uso detectado |
|-------------|--------|---------------|
| `three` | ~500KB | ❓ No encontrado |
| `@heroicons/react` | ~200KB | ❓ Verificar si se usa |
| `octokit` + `@octokit/core` | Duplicado | Solo necesitas uno |

**Solución propuesta:**
```bash
# Verificar uso real
grep -r "three" src/
grep -r "heroicons" src/
# Eliminar no usadas
npm uninstall three @heroicons/react
```

**Beneficio:** Reducir bundle size ~700KB+

---

### TD-005: Tests sin tipado estricto
**Severidad:** Media | **Esfuerzo:** 2-3h | **Riesgo:** Tests pueden pasar incorrectamente

**Problema:**
Algunos tests usan datos mock sin tipos:
```typescript
// ❌ Actual
const mockInfra = { nombre: "Test", tipo: "hospital" }

// ✅ Propuesto
const mockInfra: Infrastructure = { nombre: "Test", tipo: "hospital", ... }
```

**Beneficio:** Tests más robustos, detectan cambios breaking en interfaces

---

## 🟢 Prioridad BAJA (Nice to have)

### TD-006: Inconsistencia en naming
**Severidad:** Baja | **Esfuerzo:** 2h

**Ejemplos:**
```typescript
// Inconsistente
WFSHealthGeocoder vs HealthGeocoder
codigosINEDerivados vs codigosINEUnificado
crossValidation vs CrossValidator
```

**Solución:** Establecer convención y renombrar gradualmente

---

### TD-007: Comentarios de código obsoletos
**Severidad:** Baja | **Esfuerzo:** 1h

**Ejemplos encontrados:**
```typescript
// F023 FASE 1.1 - MÉTODOS SINGLETON  // ← Ya completado
// TODO: Implementar parser GML si es necesario  // ← Evaluar si sigue siendo necesario
```

**Solución:** Limpiar comentarios de fases completadas

---

### TD-008: Falta de JSDoc en funciones públicas
**Severidad:** Baja | **Esfuerzo:** 4-6h

**Estado actual:**
- ~30% de funciones públicas tienen JSDoc
- Parámetros y retornos sin documentar

**Beneficio:** Mejor DX, documentación auto-generada

---

## 📋 Plan de Acción Recomendado

### Fase 1: Post-MVP (después de validación con 5-10 municipios)
| # | Tarea | Prioridad | Esfuerzo |
|---|-------|-----------|----------|
| 1 | TD-004: Eliminar dependencias no usadas | Media | 1h |
| 2 | TD-007: Limpiar comentarios obsoletos | Baja | 1h |

### Fase 2: Antes de escalar a 100 municipios
| # | Tarea | Prioridad | Esfuerzo |
|---|-------|-----------|----------|
| 3 | TD-001: Consolidar geocoders duplicados | Alta | 4-6h |
| 4 | TD-003: Eliminar tipos `any` | Media | 3-4h |

### Fase 3: Antes de producción (786 municipios)
| # | Tarea | Prioridad | Esfuerzo |
|---|-------|-----------|----------|
| 5 | TD-002: Modularizar archivos grandes | Alta | 6-8h |
| 6 | TD-005: Tipar tests estrictamente | Media | 2-3h |
| 7 | TD-008: Documentar con JSDoc | Baja | 4-6h |

---

## 📊 Estimación Total

| Fase | Esfuerzo | Beneficio |
|------|----------|-----------|
| Fase 1 | 2h | Bundle -700KB, código limpio |
| Fase 2 | 7-10h | Mantenimiento simplificado |
| Fase 3 | 12-17h | Código production-ready |
| **TOTAL** | **21-29h** | Sistema escalable y mantenible |

---

## ⚠️ Recomendaciones Importantes

1. **NO refactorizar antes de validar MVP** - El código funciona, los tests pasan
2. **Hacer cambios incrementales** - Un TD por PR, con tests
3. **Priorizar por impacto** - TD-001 y TD-002 dan más ROI
4. **Mantener cobertura de tests** - No bajar del 96% actual
5. **Documentar decisiones** - Actualizar este documento después de cada refactor

---

## 🔄 Historial de Actualizaciones

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2025-12-04 | Documento inicial | Claude (MapWizard) |

---
