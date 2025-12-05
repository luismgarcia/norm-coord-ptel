# 🗄️ Plan Maestro: Sistema BBDDs Locales para Validación PTEL

> **Sesión origen**: S2.1 (5 diciembre 2025)
> **Objetivo**: Sistema multi-BBDD local para validación multi-fase de infraestructuras
> **Mejora estimada**: +13 puntos (82% → 95%)

---

## 📊 Resumen Ejecutivo

### Estado CrossValidator (ya implementado)
El sistema CrossValidator.ts (546 líneas) **ya está completo**:
- ✅ `validate()` y `validateEnhanced()` (centroide Huber)
- ✅ Clustering espacial con `calculateMaxDiscrepancy()`
- ✅ Scoring: α=0.40 (match) + β=0.35 (concordancia) + γ=0.25 (autoridad)
- ✅ Umbrales por tipología (10 tipos PTEL)
- ✅ 75 tests (F023 Fase 2 completada)

### Mejora Esperada con BBDDs Locales

| Proceso | Sin BBDD | Con BBDD | Mejora |
|---------|:--------:|:--------:|:------:|
| Identificación | 85% | **95%** | +10% |
| Normalización direcciones | 70% | **92%** | +22% |
| Normalización nombres | 88% | **96%** | +8% |
| Geolocalización | 88% | **95%** | +7% |
| Confirmación | 80% | **98%** | +18% |
| **Tiempo** | 4-8 min | <30 seg | **10-15x** |

---

## 🏗️ Arquitectura Objetivo

```
┌───────────────────────────────────────────────────────────────┐
│                    LocalDataStore (Dexie.js)                   │
├───────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │   DERA   │ │   CDAU   │ │   INE    │ │BOUNDARIES│        │
│  │ Catálogo │ │Direcciones│ │Municipios│ │ Polígonos│        │
│  │ ~50MB    │ │ ~200MB   │ │  ~2MB    │ │  ~15MB   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│         │            │            │            │             │
│         └────────────┴────────────┴────────────┘             │
│                          ▼                                    │
│              SpatialIndex (Flatbush)                          │
│              Búsqueda espacial O(log n)                       │
└───────────────────────────────────────────────────────────────┘
```

---

## 📅 PLAN: 5 Fases, 22 Sesiones (~28h)

| Fase | Sesiones | Horas | Rol | Objetivo |
|------|:--------:|:-----:|-----|----------|
| **F0** | 2 | 2.5h | DataMaster | Análisis fuentes, esquemas |
| **F1** | 4 | 5h | MapWizard | LocalDataStore + SpatialIndex |
| **F2** | 4 | 5.5h | Ambos | DERA completo local |
| **F3** | 5 | 6.5h | Ambos | CDAU direcciones |
| **F4** | 4 | 4.5h | MapWizard | CrossValidator local |
| **F5** | 3 | 3.5h | MapWizard | Sincronización trimestral |

### Dependencias
```
F0 → F1 → F2 ─┐
              ├→ F4 → F5
F0 → F1 → F3 ─┘
```

---

## 🔬 FASE 0: Preparación (2 sesiones)

### F0.1 — Inventario de Fuentes (DataMaster, 1.5h)
**Entregable**: `src/data/sources/SOURCE_CATALOG.md`

Tareas:
1. Documentar endpoints WFS de DERA por capa
2. Analizar estructura de datos CDAU
3. Verificar formatos de descarga disponibles
4. Estimar tamaños de datos por provincia

### F0.2 — Definir Esquemas IndexedDB (Ambos, 1h)
**Entregable**: `src/lib/localData/schemas.ts`

```typescript
interface DERAInfrastructure {
  id: string;
  nombre: string;
  nombreNormalizado: string;
  tipologia: string;
  municipioINE: string;
  x: number; y: number;
  direccion?: string;
  fechaActualizacion: string;
}

interface CDAUAddress {
  id: string;
  viaTipo: string;
  viaNombre: string;
  viaNombreNorm: string;
  numero?: number;
  municipioINE: string;
  x: number; y: number;
}

interface INEMunicipio {
  codigo: string;
  nombre: string;
  nombreNormalizado: string;
  variantes: string[];
  provincia: string;
}
```

---

## 🔧 FASE 1: Infraestructura (4 sesiones)

### F1.1 — LocalDataStore Base (MapWizard, 1.5h)
**Archivo**: `src/lib/localData/LocalDataStore.ts`

### F1.2 — Índice Espacial (MapWizard, 1h)
**Archivo**: `src/lib/localData/SpatialIndex.ts` (usando Flatbush)

### F1.3 — Tests Infraestructura (MapWizard, 1h)
**Archivo**: `src/lib/localData/__tests__/LocalDataStore.test.ts`

### F1.4 — Integración Sistema (MapWizard, 1h)
**Modificar**: `src/services/geocoding/GeocodingOrchestrator.ts`

---

## 📦 FASE 2: DERA Expandido (4 sesiones)

### F2.1 — Analizador Capas WFS (DataMaster, 1.5h)
**Entregable**: `src/data/sources/deraLayers.ts`

### F2.2 — Descargador WFS Genérico (MapWizard, 1.5h)
**Archivo**: `src/lib/localData/WFSDownloader.ts`

### F2.3 — Sincronizador DERA (MapWizard, 1.5h)
**Archivo**: `src/lib/localData/DERASyncService.ts`

### F2.4 — Tests DERA (Ambos, 1h)

---

## 📍 FASE 3: CDAU Direcciones (5 sesiones)

### F3.1 — Estructura CDAU (DataMaster, 1.5h)
### F3.2 — Parser CDAU (MapWizard, 1.5h)
### F3.3 — Sincronizador CDAU (MapWizard, 1h)
### F3.4 — Normalizador Local (MapWizard, 1.5h)
### F3.5 — Tests CDAU (MapWizard, 1h)

---

## ✅ FASE 4: Confirmación Multi-Fuente (4 sesiones)

### F4.1 — Adaptador Local CrossValidator (MapWizard, 1.5h)
### F4.2 — Modificar CrossValidator (MapWizard, 1h)
### F4.3 — Validador Límites Municipales (Ambos, 1h)
### F4.4 — Tests Confirmación (MapWizard, 1h)

---

## 🔄 FASE 5: Sincronización (3 sesiones)

### F5.1 — Servicio Sync (MapWizard, 1.5h)
### F5.2 — UI Sincronización (DesignCraft, 1h)
### F5.3 — Tests Integración (MapWizard, 1h)

---

## 📁 Archivos a Crear

| Fase | Archivo | Tipo |
|------|---------|------|
| F0.1 | `src/data/sources/SOURCE_CATALOG.md` | Doc |
| F0.2 | `src/lib/localData/schemas.ts` | Code |
| F1.1 | `src/lib/localData/LocalDataStore.ts` | Code |
| F1.2 | `src/lib/localData/SpatialIndex.ts` | Code |
| F2.1 | `src/data/sources/deraLayers.ts` | Code |
| F2.2 | `src/lib/localData/WFSDownloader.ts` | Code |
| F3.2 | `src/lib/localData/CDAUParser.ts` | Code |
| F3.4 | `src/lib/localData/LocalAddressNormalizer.ts` | Code |
| F4.1 | `src/services/geocoding/sources/LocalSources.ts` | Code |
| F4.3 | `src/lib/localData/BoundaryValidator.ts` | Code |
| F5.1 | `src/lib/localData/SyncService.ts` | Code |

---

## 🎯 Métricas de Éxito

| Fase | Métrica | Objetivo |
|------|---------|----------|
| F1 | LocalDataStore funcional | Tests pasan |
| F2 | DERA cargado | >15,000 registros |
| F3 | CDAU normaliza | >85% direcciones |
| F4 | CrossValidator local | <100ms consulta |
| F5 | Sync automático | Notifica tras 90 días |

---

## 📋 Seguimiento

- [x] **F0.1** — Inventario fuentes ✅ (5 dic 2025)
- [ ] F0.2 — Esquemas IndexedDB
- [ ] F1.1-F1.4 — Infraestructura base
- [ ] F2.1-F2.4 — DERA local
- [ ] F3.1-F3.5 — CDAU direcciones
- [ ] F4.1-F4.4 — Confirmación multi-fuente
- [ ] F5.1-F5.3 — Sincronización
