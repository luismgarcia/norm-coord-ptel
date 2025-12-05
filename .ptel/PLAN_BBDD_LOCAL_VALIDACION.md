# 🗄️ Plan Maestro: Sistema de BBDDs Locales para Validación PTEL

> **Objetivo**: Implementar sistema de cotejo multi-BBDD local para mejorar identificación, normalización, geolocalización y confirmación de infraestructuras PTEL.

**Versión**: 1.0.0  
**Fecha**: 5 de diciembre de 2025  
**Roles**: DataMaster (geodesia/datos) + MapWizard (implementación)  
**Mejora estimada**: +13 puntos (82% → 95% score promedio)

---

## 📊 Resumen Ejecutivo

| Métrica | Actual | Objetivo | Mejora |
|---------|:------:|:--------:|:------:|
| Identificación | 85% | 95% | +10% |
| Normalización | 70% | 92% | +22% |
| Geolocalización | 88% | 95% | +7% |
| Confirmación | 80% | 98% | +18% |
| **Tiempo procesamiento** | 4-8 min | <30 seg | **10-15x** |

---

## 🏗️ Arquitectura Objetivo

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LocalDataStore                               │
│                      (Dexie.js - IndexedDB)                         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │    DERA     │ │    CDAU     │ │     INE     │ │  BOUNDARIES │  │
│  │  Catálogo   │ │ Direcciones │ │ Municipios  │ │  Polígonos  │  │
│  │ ~50MB/prov  │ │ ~200MB/And  │ │    ~2MB     │ │   ~15MB     │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │
│         │               │               │               │          │
│         ▼               ▼               ▼               ▼          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    SpatialIndex (Flatbush)                   │  │
│  │              Búsqueda espacial O(log n)                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         LocalValidator                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ Identificar  │ │  Normalizar  │ │ Geolocalizar │ │  Confirmar │ │
│  │  (DERA+INE)  │ │ (CDAU+Dict)  │ │(DERA+Cache)  │ │(Multi-src) │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📅 PLAN POR FASES

| Fase | Sesiones | Horas | Rol Principal | Objetivo |
|------|:--------:|:-----:|---------------|----------|
| **F0** | 2 | 2.5h | DataMaster | Análisis fuentes, esquemas |
| **F1** | 4 | 5h | MapWizard | LocalDataStore + SpatialIndex |
| **F2** | 4 | 5.5h | Ambos | DERA completo local |
| **F3** | 5 | 6.5h | Ambos | CDAU direcciones |
| **F4** | 4 | 4.5h | MapWizard | CrossValidator multi-fuente |
| **F5** | 3 | 3.5h | MapWizard | Sincronización trimestral |
| **Total** | **22** | **~28h** | | Sistema completo |

---

## Dependencias entre Fases

```
F0 → F1 → F2 ─┐
              ├→ F4 → F5
F0 → F1 → F3 ─┘
```

---

## Detalle por Sesión

### FASE 0: Preparación y Análisis

| Sesión | Tarea | Rol | Duración |
|--------|-------|-----|----------|
| F0.1 | Inventario de fuentes de datos | DataMaster | 1.5h |
| F0.2 | Definir esquemas IndexedDB | DataMaster + MapWizard | 1h |

### FASE 1: Infraestructura Base

| Sesión | Tarea | Rol | Duración |
|--------|-------|-----|----------|
| F1.1 | Crear LocalDataStore base | MapWizard | 1.5h |
| F1.2 | Crear índice espacial (Flatbush) | MapWizard | 1h |
| F1.3 | Tests de infraestructura | MapWizard | 1h |
| F1.4 | Integración con sistema existente | MapWizard | 1h |

### FASE 2: DERA Local Expandido

| Sesión | Tarea | Rol | Duración |
|--------|-------|-----|----------|
| F2.1 | Analizador de capas WFS DERA | DataMaster | 1.5h |
| F2.2 | Descargador WFS genérico | MapWizard | 1.5h |
| F2.3 | Sincronizador DERA | MapWizard | 1.5h |
| F2.4 | Tests y validación DERA | Ambos | 1h |

### FASE 3: CDAU Direcciones

| Sesión | Tarea | Rol | Duración |
|--------|-------|-----|----------|
| F3.1 | Analizar estructura CDAU | DataMaster | 1.5h |
| F3.2 | Parser CDAU | MapWizard | 1.5h |
| F3.3 | Sincronizador CDAU | MapWizard | 1h |
| F3.4 | Normalizador de direcciones local | MapWizard | 1.5h |
| F3.5 | Tests CDAU | MapWizard | 1h |

### FASE 4: Sistema de Confirmación Multi-Fuente

| Sesión | Tarea | Rol | Duración |
|--------|-------|-----|----------|
| F4.1 | Adaptador local para CrossValidator | MapWizard | 1.5h |
| F4.2 | Modificar CrossValidator | MapWizard | 1h |
| F4.3 | Validador de límites municipales | Ambos | 1h |
| F4.4 | Tests de confirmación | MapWizard | 1h |

### FASE 5: Sincronización y Mantenimiento

| Sesión | Tarea | Rol | Duración |
|--------|-------|-----|----------|
| F5.1 | Servicio de sincronización | MapWizard | 1.5h |
| F5.2 | UI de sincronización | DesignCraft | 1h |
| F5.3 | Tests de integración | MapWizard | 1h |

---

## Métricas de Éxito

| Fase | Métrica | Objetivo |
|------|---------|----------|
| F1 | LocalDataStore funcional | Tests pasan |
| F2 | DERA cargado | >15,000 registros |
| F3 | CDAU normaliza | >85% direcciones |
| F4 | CrossValidator local | <100ms consulta |
| F5 | Sync automático | Notifica tras 90 días |

---

## Progreso

| Sesión | Estado | Fecha | Notas |
|--------|--------|-------|-------|
| F0.1 | 🔄 EN CURSO | 2025-12-05 | Inventario fuentes |
| F0.2 | ⬜ | — | — |
| F1.1 | ⬜ | — | — |
| ... | ... | ... | ... |

---

*Plan generado: 5 de diciembre de 2025*
