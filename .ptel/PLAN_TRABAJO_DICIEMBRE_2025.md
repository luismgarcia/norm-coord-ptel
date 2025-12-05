# 📋 PLAN DE TRABAJO PTEL - Diciembre 2025

> **Generado**: 2025-12-05
> **Versión actual**: 0.4.1
> **Estado features**: 23/24 (96%)
> **Tests**: 1151/1159 (99.9%)

---

## 🎯 OBJETIVOS DEL PLAN

1. **Completar features pendientes** (F014, F015)
2. **Integrar F025 con orquestador** (Fase 3)
3. **Ampliar validación municipal** (5 → 20+ municipios)
4. **Implementar suite de testing avanzada**
5. **Optimizar rendimiento** (benchmarks)

---

## 📅 CRONOGRAMA POR FASES

### FASE 1: CONSOLIDACIÓN (6-8 Dic)
*Sin documentos nuevos - preparación y testing*

| Día | Sesión | Tarea | Duración | Rol |
|:--|:--|:--|:--|:--|
| 06-Dic | S1.1 | Integrar F025 AddressExtractor en GeocodingOrchestrator | 1-2h | MapWizard |
| 06-Dic | S1.2 | Test E2E: flujo completo ODT → coordenadas normalizadas | 1h | MapWizard |
| 07-Dic | S1.3 | Crear suite benchmark con Vitest bench | 1h | MapWizard |
| 07-Dic | S1.4 | Snapshot tests para AddressExtractor (63 casos) | 1h | MapWizard |
| 08-Dic | S1.5 | Arreglar test fallido Quéntar (multiFieldStrategy) | 30min | DataMaster |
| 08-Dic | S1.6 | Documentar arquitectura actualizada (diagrama) | 1h | DesignCraft |


### FASE 2: VALIDACIÓN MUNICIPAL (9-12 Dic)
*Con nuevos documentos PTEL*

| Día | Sesión | Tarea | Duración | Rol |
|:--|:--|:--|:--|:--|
| 09-Dic | S2.1 | Procesar 3 nuevos documentos PTEL (identificar patrones) | 2h | DataMaster |
| 09-Dic | S2.2 | Añadir casos de prueba de nuevos municipios | 1h | MapWizard |
| 10-Dic | S2.3 | Procesar 3 documentos adicionales | 2h | DataMaster |
| 10-Dic | S2.4 | Actualizar patrones si se detectan nuevos | 1h | MapWizard |
| 11-Dic | S2.5 | Procesar 4 documentos más (total: 10 nuevos) | 2h | DataMaster |
| 11-Dic | S2.6 | Validar cobertura de patrones (objetivo: 95%+) | 1h | DataMaster |
| 12-Dic | S2.7 | Test de regresión completo post-municipios | 1h | MapWizard |
| 12-Dic | S2.8 | Actualizar documentación de patrones | 1h | MapWizard |

**Entregable Fase 2**: 15+ municipios validados, suite de tests actualizada

---

### FASE 3: FEATURES PENDIENTES (13-15 Dic)

| Día | Sesión | Tarea | Duración | Rol | Feature |
|:--|:--|:--|:--|:--|:--|
| 13-Dic | S3.1 | F014: Diseñar arquitectura CacheManager | 1h | MapWizard | F014 |
| 13-Dic | S3.2 | F014: Implementar cache localStorage | 1.5h | MapWizard | F014 |
| 14-Dic | S3.3 | F014: Implementar cache IndexedDB | 1.5h | MapWizard | F014 |
| 14-Dic | S3.4 | F014: Tests unitarios CacheManager | 1h | MapWizard | F014 |
| 15-Dic | S3.5 | F015: Diseñar UI ProgressPanel (mockup) | 1h | DesignCraft | F015 |
| 15-Dic | S3.6 | F015: Implementar componente React | 1.5h | DesignCraft | F015 |

**Entregable Fase 3**: 25/25 features (100%), F014 y F015 completados

---

### FASE 4: TESTING AVANZADO (16-18 Dic)

| Día | Sesión | Tarea | Duración | Rol |
|:--|:--|:--|:--|:--|
| 16-Dic | S4.1 | Implementar MSW (Mock Service Worker) para APIs | 1.5h | MapWizard |
| 16-Dic | S4.2 | Tests de contrato para CartoCiudad | 1h | MapWizard |
| 17-Dic | S4.3 | Tests de contrato para CDAU | 1h | MapWizard |
| 17-Dic | S4.4 | Property-based testing con fast-check (coordenadas) | 1.5h | DataMaster |
| 18-Dic | S4.5 | Configurar cobertura de código (c8/istanbul) | 1h | MapWizard |
| 18-Dic | S4.6 | Alcanzar 80%+ cobertura (identificar gaps) | 1.5h | MapWizard |

**Entregable Fase 4**: Cobertura >80%, tests de contrato, property-based testing

---

### FASE 5: OPTIMIZACIÓN Y CIERRE (19-22 Dic)

| Día | Sesión | Tarea | Duración | Rol |
|:--|:--|:--|:--|:--|
| 19-Dic | S5.1 | Ejecutar benchmarks y establecer baseline | 1h | MapWizard |
| 19-Dic | S5.2 | Optimizar hotspots identificados | 1.5h | MapWizard |
| 20-Dic | S5.3 | Test E2E completo: 20 municipios | 2h | DataMaster |
| 20-Dic | S5.4 | Documentación final de usuario | 1.5h | DesignCraft |
| 21-Dic | S5.5 | README actualizado + CHANGELOG | 1h | MapWizard |
| 21-Dic | S5.6 | Release v0.5.0 (versión estable) | 1h | MapWizard |
| 22-Dic | S5.7 | Retrospectiva y planificación Q1 2026 | 1h | Todos |

**Entregable Fase 5**: v0.5.0 estable, documentación completa, roadmap Q1

---


## 📝 DETALLE DE TAREAS CRÍTICAS

### T1: Integración F025 → GeocodingOrchestrator (S1.1)

```typescript
// Objetivo: Usar addressExtractor antes de geocodificar
// Archivo: src/services/geocoding/GeocodingOrchestrator.ts

import { extractAddress } from '@/utils/addressExtractor';

async geocode(input: GeocodingInput): Promise<GeocodingResult> {
  // NUEVO: Pre-procesar dirección
  if (input.direccion) {
    const { address, transformations } = extractAddress(
      input.direccion, 
      input.municipio
    );
    input.direccionNormalizada = address;
    input.transformacionesAplicadas = transformations;
  }
  
  // Continuar con cascada existente...
}
```

**Criterio de éxito**: Test E2E pasa con documento real

---

### T2: Suite Benchmark (S1.3)

```typescript
// Archivo: src/__benchmarks__/geocoding.bench.ts
import { bench, describe } from 'vitest';

describe('Geocoding Performance', () => {
  bench('singleton detection', async () => {
    await orchestrator.geocode({
      nombre: 'Centro de Salud',
      tipo: 'SANITARIO',
      municipio: 'Tíjola',
      codigoINE: '04091'
    });
  }, { iterations: 100 });

  bench('address extraction', () => {
    extractAddress('C/ Mayor, 15, Tíjola', 'Tíjola');
  }, { iterations: 1000 });

  bench('coordinate normalization', () => {
    normalizeCoordinate('524.538', '4.229.920');
  }, { iterations: 1000 });
});
```

**Baseline objetivo**:
- Singleton: <50ms
- Address extraction: <5ms
- Coordinate normalization: <1ms

---

### T3: Snapshot Tests F025 (S1.4)

```typescript
// Archivo: src/utils/__tests__/addressExtractor.snapshot.test.ts
import { extractAddress } from '../addressExtractor';

describe('AddressExtractor Snapshots', () => {
  const testCases = [
    { input: 'C/ Mayor, 15', municipality: 'Tíjola' },
    { input: 'Poligono Industrial Tíjola, s/n', municipality: 'Tíjola' },
    // ... 63 casos
  ];

  testCases.forEach(({ input, municipality }, i) => {
    it(`caso ${i + 1}: "${input}"`, () => {
      const result = extractAddress(input, municipality);
      expect(result).toMatchSnapshot();
    });
  });
});
```

**Beneficio**: Detectar cambios inesperados en output

---

### T4: Property-Based Testing (S4.4)

```typescript
// Archivo: src/lib/__tests__/coordinates.property.test.ts
import { fc } from 'fast-check';

describe('Coordinate Normalization Properties', () => {
  it('siempre produce coordenadas en rango válido', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 800000 }),  // X UTM
        fc.integer({ min: 4000000, max: 4350000 }), // Y UTM
        (x, y) => {
          const result = normalizeCoordinate(x.toString(), y.toString());
          return result.x >= 100000 && result.x <= 800000 &&
                 result.y >= 4000000 && result.y <= 4350000;
        }
      )
    );
  });

  it('normalización es idempotente', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const first = normalizeCoordinate(input, input);
        const second = normalizeCoordinate(
          first.x?.toString() || '', 
          first.y?.toString() || ''
        );
        return first.x === second.x && first.y === second.y;
      })
    );
  });
});
```

---


## 📊 MÉTRICAS DE ÉXITO POR FASE

| Fase | Métrica | Valor Actual | Objetivo | Criterio |
|:--|:--|:--:|:--:|:--|
| **1** | Tests E2E | 0 | 3+ | Flujo completo funciona |
| **1** | Benchmarks | ❌ | ✅ | Suite configurada |
| **2** | Municipios validados | 5 | 15+ | 3x más cobertura |
| **2** | Patrones detectados | 62 | 70+ | Nuevos patrones |
| **3** | Features completadas | 23/24 | 25/25* | 100% |
| **4** | Cobertura código | ~75% | >80% | Medido con c8 |
| **4** | Tests contrato | 0 | 6+ | MSW configurado |
| **5** | Versión release | 0.4.1 | 0.5.0 | Tag + changelog |

*Nota: Se añade F024 (E2E Testing) como feature implícita

---

## 🔧 DEPENDENCIAS TÉCNICAS

### Paquetes a Instalar

```bash
# Fase 1: Benchmarks
npm install -D @vitest/coverage-c8

# Fase 4: Testing avanzado
npm install -D msw fast-check
npm install -D @vitest/coverage-istanbul  # alternativa a c8
```

### Archivos a Crear

| Fase | Archivo | Propósito |
|:--|:--|:--|
| 1 | `src/__benchmarks__/geocoding.bench.ts` | Suite benchmarks |
| 1 | `vitest.bench.config.ts` | Config benchmarks |
| 1 | `src/utils/__tests__/addressExtractor.snapshot.test.ts` | Snapshots |
| 3 | `src/lib/cache/CacheManager.ts` | Cache multinivel |
| 3 | `src/components/ProgressPanel.tsx` | UI progreso |
| 4 | `src/mocks/handlers.ts` | MSW handlers |
| 4 | `src/mocks/server.ts` | MSW server |
| 4 | `src/lib/__tests__/coordinates.property.test.ts` | Property tests |

---

## 📁 CHECKLIST DE DOCUMENTOS PTEL

*Para Fase 2 - Marcar cuando se procesen*

| # | Municipio | Provincia | Procesado | Patrones Nuevos | Tests Añadidos |
|:--:|:--|:--|:--:|:--:|:--:|
| 1 | Tíjola | Almería | ✅ | 8 | 15 |
| 2 | Colomera | Granada | ✅ | 5 | 12 |
| 3 | Berja | Almería | ✅ | 7 | 8 |
| 4 | Hornos | Jaén | ✅ | 3 | 6 |
| 5 | Quéntar | Granada | ✅ | 2 | 4 |
| 6 | _________ | _______ | ⬜ | — | — |
| 7 | _________ | _______ | ⬜ | — | — |
| 8 | _________ | _______ | ⬜ | — | — |
| 9 | _________ | _______ | ⬜ | — | — |
| 10 | _________ | _______ | ⬜ | — | — |
| 11 | _________ | _______ | ⬜ | — | — |
| 12 | _________ | _______ | ⬜ | — | — |
| 13 | _________ | _______ | ⬜ | — | — |
| 14 | _________ | _______ | ⬜ | — | — |
| 15 | _________ | _______ | ⬜ | — | — |

---

## 🚨 RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|:--|:--:|:--:|:--|
| APIs externas caídas durante tests | Media | Alto | MSW mocks (Fase 4) |
| Documentos con formatos inesperados | Alta | Medio | Análisis antes de procesar |
| Patrones de coordenadas no cubiertos | Media | Alto | Property-based testing |
| Regresiones al añadir features | Media | Alto | Snapshots + CI |
| Tiempo insuficiente | Baja | Medio | Priorizar Fases 1-2 |

---

## 📞 PROTOCOLO DE SESIÓN

### Inicio de Sesión
```
1. Leer .ptel/PTEL_ESTADO_SESION.json
2. Leer .ptel/handoff.json
3. Identificar tarea del día (este documento)
4. Activar rol correspondiente
5. Ejecutar tarea única
```

### Cierre de Sesión
```
1. Ejecutar tests (npm test)
2. Commit con mensaje descriptivo
3. Actualizar PTEL_ESTADO_SESION.json
4. Actualizar handoff.json
5. Push a GitHub
6. Marcar tarea como completada en este documento
```

---

## ✅ PROGRESO (Actualizar diariamente)

| Fase | Sesión | Estado | Fecha | Notas |
|:--|:--|:--:|:--|:--|
| 1 | S1.1 | ✅ | 2025-12-05 | Test integración F025 creado (11 tests) |
| 1 | S1.2 | ✅ | 2025-12-05 | Suite E2E verificada, fixtures corregidos (19 tests) |
| 1 | S1.3 | ⬜ | — | — |
| 1 | S1.4 | ⬜ | — | — |
| 1 | S1.5 | ⬜ | — | — |
| 1 | S1.6 | ⬜ | — | — |
| 2 | S2.1 | ⬜ | — | — |
| 2 | S2.2 | ⬜ | — | — |
| 2 | S2.3 | ⬜ | — | — |
| 2 | S2.4 | ⬜ | — | — |
| 2 | S2.5 | ⬜ | — | — |
| 2 | S2.6 | ⬜ | — | — |
| 2 | S2.7 | ⬜ | — | — |
| 2 | S2.8 | ⬜ | — | — |
| 3 | S3.1 | ⬜ | — | — |
| 3 | S3.2 | ⬜ | — | — |
| 3 | S3.3 | ⬜ | — | — |
| 3 | S3.4 | ⬜ | — | — |
| 3 | S3.5 | ⬜ | — | — |
| 3 | S3.6 | ⬜ | — | — |
| 4 | S4.1 | ⬜ | — | — |
| 4 | S4.2 | ⬜ | — | — |
| 4 | S4.3 | ⬜ | — | — |
| 4 | S4.4 | ⬜ | — | — |
| 4 | S4.5 | ⬜ | — | — |
| 4 | S4.6 | ⬜ | — | — |
| 5 | S5.1 | ⬜ | — | — |
| 5 | S5.2 | ⬜ | — | — |
| 5 | S5.3 | ⬜ | — | — |
| 5 | S5.4 | ⬜ | — | — |
| 5 | S5.5 | ⬜ | — | — |
| 5 | S5.6 | ⬜ | — | — |
| 5 | S5.7 | ⬜ | — | — |

---

*Última actualización: 2025-12-05 (S1.2 completado)*
*Próxima sesión: S1.3 - Suite benchmark Vitest*
