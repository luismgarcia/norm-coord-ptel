# 📋 PLAN CONSOLIDADO PTEL - 48 SESIONES

> **Versión**: 2.0 | **Fecha**: 5 diciembre 2025 | **Esfuerzo total**: ~54h

---

## 🎯 RESUMEN EJECUTIVO

| Fase | Sesiones | Horas | Semana | Objetivo |
|:----:|:--------:|:-----:|:------:|----------|
| **A** | 4 | 4.5h | 9-13 dic | Integración F025 + E2E |
| **B** | 11 | 10.75h | 16-20 dic | DERA completo |
| **C** | 9 | 11h | 6-10 ene | BBDD local |
| **D** | 5 | 5.5h | 13-17 ene | Cache + UI (F014/F015) |
| **E** | 11 | 14h | 20-24 ene | Reporting multi-formato |
| **F** | 5 | 5.5h | 27-31 ene | Validación avanzada |
| **G** | 3 | 3h | Feb | Sincronización |

---

## FASE A: INTEGRACIÓN INMEDIATA (Sem 1: 9-13 dic)

| # | Tarea | Rol | h |
|:-:|-------|:---:|:-:|
| A.1 | Integrar F025 AddressExtractor → Orchestrator | 🧙 | 1.5 |
| A.2 | Test E2E flujo ODT → coordenadas | 🧙 | 1 |
| A.3 | Definir esquemas IndexedDB (schemas.ts) | 🔬 | 1 |
| A.4 | Suite benchmark Vitest | 🧙 | 1 |

---

## FASE B: DERA COMPLETO (Sem 2: 16-20 dic)

| # | Tarea | Rol | h |
|:-:|-------|:---:|:-:|
| B.1 | DERAWFSService.ts (cliente genérico) | 🧙 | 1 |
| B.2 | types.ts (capas g12_*) | 🧙 | 0.75 |
| B.3 | Patrones clasificación tipológica | 🔬 | 1 |
| B.4 | TypologyClassifier.ts | 🧙+🔬 | 1 |
| B.5 | DERAHealthGeocoder.ts | 🧙 | 1 |
| B.6 | DERAEducationGeocoder.ts | 🧙 | 1 |
| B.7 | DERAGeneralGeocoder.ts | 🧙 | 1.25 |
| B.8 | Integrar DERA en cascada | 🧙 | 1 |
| B.9 | DERACache.ts (IndexedDB) | 🧙 | 1 |
| B.10 | Tests integración datos reales | 🔬 | 1 |
| B.11 | Documentación DERA | 🧙+🔬 | 0.75 |

---

## FASE C: BBDD LOCAL (Sem 3: 6-10 ene)

| # | Tarea | Rol | h |
|:-:|-------|:---:|:-:|
| C.1 | LocalDataStore base (Dexie) | 🧙 | 1.5 |
| C.2 | SpatialIndex (Flatbush) | 🧙 | 1 |
| C.3 | Tests LocalDataStore | 🧙 | 1 |
| C.4 | Integrar LocalDataStore → Orchestrator | 🧙 | 1 |
| C.5 | Analizador capas WFS (deraLayers.ts) | 🔬 | 1.5 |
| C.6 | WFSDownloader.ts | 🧙 | 1.5 |
| C.7 | DERASyncService.ts | 🧙 | 1.5 |
| C.8 | Tests validación DERA local | 🔬+🧙 | 1 |
| C.9 | uFuzzy integración (F023 Fase 3) | 🧙 | 1 |

---

## FASE D: CACHE Y UI (Sem 4: 13-17 ene)

| # | Tarea | Rol | h |
|:-:|-------|:---:|:-:|
| D.1 | F014: CacheManager arquitectura | 🧙 | 1 |
| D.2 | F014: Cache localStorage | 🧙 | 1 |
| D.3 | F014: Cache IndexedDB | 🧙 | 1 |
| D.4 | F015: ProgressPanel mockup | 🎨 | 1 |
| D.5 | F015: Componente React | 🧙 | 1.5 |

---

## FASE E: REPORTING (Sem 5: 20-24 ene)

| # | Tarea | Rol | h |
|:-:|-------|:---:|:-:|
| E.1 | Tipos reporting.ts | 🧙 | 1 |
| E.2 | ProcessingResults.tsx | 🧙 | 2 |
| E.3 | Estilos CSS reporting | 🧙 | 1 |
| E.4 | MetricsPanel.tsx | 🧙 | 1 |
| E.5 | AlertsPanel + AlertDetailModal | 🧙 | 1.5 |
| E.6 | ExportDropdown + CSVExporter | 🧙 | 1.5 |
| E.7 | PDFExporter (jsPDF) | 🧙 | 1.5 |
| E.8 | DOCXExporter + ODTExporter | 🧙 | 2 |
| E.9 | ExcelExporter (ExcelJS) | 🧙 | 1 |
| E.10 | JSONExporter + formatOptions.ts | 🧙 | 0.5 |
| E.11 | Tests unitarios reporting | 🧙 | 2 |

---

## FASE F: VALIDACIÓN AVANZADA (Sem 6: 27-31 ene)

| # | Tarea | Rol | h |
|:-:|-------|:---:|:-:|
| F.1 | Adaptador Local para CrossValidator | 🧙 | 1.5 |
| F.2 | BoundaryValidator (point-in-polygon) | 🔬+🧙 | 1 |
| F.3 | Modificar CrossValidator fuentes locales | 🧙 | 1 |
| F.4 | Tests CrossValidator local | 🧙 | 1 |
| F.5 | Normalización nombres mejorada | 🧙 | 1 |

---

## FASE G: SINCRONIZACIÓN (Feb)

| # | Tarea | Rol | h |
|:-:|-------|:---:|:-:|
| G.1 | SyncService (auto-actualización) | 🧙 | 1 |
| G.2 | UI de sincronización | 🎨 | 1 |
| G.3 | Tests E2E flujo completo | 🧙 | 1 |

---

## 🔧 ROLES

| Icono | Rol | Foco |
|:-----:|-----|------|
| 🧙 | MapWizard | React/TypeScript/APIs |
| 🔬 | DataMaster | Geodesia/Validación |
| 🎨 | DesignCraft | UI/UX |

---

## 📍 ELEMENTOS POSPUESTOS

- **CDAU WFS**: Bloqueado (403/503) - Requiere autorización NAOS
- **Arquitectura Integraciones**: Fase 4+ futura
- **Visor Cartográfico Leaflet**: Después de reporting

---

## 🔄 TECHNICAL DEBT (Paralelo)

| Tarea | Prioridad | Horas |
|-------|:---------:|:-----:|
| TD-004: Eliminar deps no usadas | Media | 1h |
| TD-001: Consolidar geocoders | Alta | 5h |
| TD-003: Eliminar `any` | Media | 4h |
| TD-002: Modularizar archivos | Alta | 7h |

---

*Actualizado: 5 dic 2025 - Auditoría completa 6 documentos*
