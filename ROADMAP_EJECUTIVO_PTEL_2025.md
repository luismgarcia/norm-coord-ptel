# 🎯 ROADMAP EJECUTIVO PTEL 2025
## Plan de Trabajo Visual y Priorizado

**Versión**: 1.0 Executive Summary  
**Fecha**: 21 Noviembre 2025  
**Objetivo**: Alcanzar 95-100% completitud coordenadas en 14 semanas

---

## 📊 ESTADO ACTUAL VS OBJETIVO

```
BASELINE (HOY)                          OBJETIVO (14 SEMANAS)
══════════════════════════════════════  ══════════════════════════════════════════
✗ Completitud: 26.9%                    ✓ Completitud: 95-100% (+73%)
✗ Éxito geocodificación: 55-70%         ✓ Éxito geocodificación: 95-100% (+45%)
✗ Precisión: ±100-500m                  ✓ Precisión: ±2-25m (mejora 4-20x)
✗ Municipios: 1 piloto                  ✓ Municipios: 786 Andalucía (+785)
✓ Coste: €0/mes                         ✓ Coste: €30-45/mes (cumple &lt;€50)
✓ Frontend: GitHub Pages                ✓ Backend: AWS Lambda (opcional)
```

---

## 🗓️ DIAGRAMA DE GANTT (14 SEMANAS)

```
SEMANA │ 1  2│ 3  4│ 5  6  7  8│ 9 10 11 12 13 14│
═══════╪═════╪═════╪═══════════╪═══════════════════╪
       │ 🔴  │ 🟡  │    🟢     │       🟣          │
───────┼─────┼─────┼───────────┼───────────────────┤
FASE 1 │█████│     │           │                   │ Geocodificación Tipológica
FASE 2 │     │█████│           │                   │ Cache + Cascada
FASE 3 │     │     │███████████│                   │ Visor Cartográfico
FASE 4 │     │     │           │███████████████████│ AWS Serverless (OPCIONAL)
───────┴─────┴─────┴───────────┴───────────────────┘
CHECKPOINTS:    ↑      ↑           ↑               ↑
              Sem2   Sem4        Sem8           Sem14
```

### Leyenda Prioridades
- 🔴 **CRÍTICA** - ROI 875%, implementar inmediato
- 🟡 **ALTA** - ROI 650%, bloquea Fase 3
- 🟢 **MEDIA** - ROI 320%, corrección manual
- 🟣 **BAJA** - ROI 280%, escalabilidad regional (opcional)

---

## 🎯 MATRIZ DE PRIORIDADES VISUAL

| Fase | Prioridad | ROI | Esfuerzo | Timeline | Descripción |
|------|-----------|-----|----------|----------|-------------|
| Fase 1 | 🔴 CRÍTICA | 875% | 4 dev-weeks | Sem 1-2 | Geocodificación tipológica WFS |
| Fase 2 | 🟡 ALTA | 650% | 4 dev-weeks | Sem 3-4 | Cache multinivel + cascada 6 niveles |
| Fase 3 | 🟢 MEDIA | 320% | 6 dev-weeks | Sem 5-8 | Visor mapa + corrección manual |
| Fase 4 | 🟣 BAJA | 280% | 12 dev-weeks | Sem 9-14 | AWS escalabilidad 786 municipios |

---

## ⚡ QUICK WINS (Primeras 4 Semanas)

### Semana 1-2: Fase 1 Quick Win 🔥
**IMPACTO INMEDIATO**: +35-45% éxito geocodificación

**Qué se implementa**:
- ✅ Clasificador tipológico 12 categorías
- ✅ WFS SICESS/SAS → 1,500 centros salud
- ✅ WFS Educación → 3,800 colegios/institutos
- ✅ ISE Policía → 200+ comisarías/cuarteles
- ✅ IAPH Cultural → 7,000+ patrimonio
- ✅ OSM Religioso → 1,500+ lugares culto

**Por qué funciona**:
- Bases de datos oficiales **pre-geocodificadas**
- Precisión ±2-10m vs ±100-500m genérico
- Fuzzy matching nombres (threshold 0.3)
- Cobertura 70% infraestructuras PTEL

### Semana 3-4: Fase 2 Performance Boost ⚡
**IMPACTO**: Reducción 70-85% peticiones APIs

**Qué se implementa**:
- ✅ localStorage cache (5-10MB, TTL 90 días)
- ✅ IndexedDB cache (50-100MB datasets grandes)
- ✅ Hash key: `${nombre}_${municipio}_${tipo}`
- ✅ LRU eviction policy
- ✅ Cascada 6 niveles fallback
- ✅ Circuit breaker APIs rate-limited

---

## 💰 ROI POR FASE

| Fase | Inversión | Beneficio | ROI |
|------|-----------|-----------|-----|
| Fase 1 (Sem 1-2) | €8,000 | €70,000 | 875% |
| Fase 2 (Sem 3-4) | €8,000 | €120,000 | 650% |
| Fase 3 (Sem 5-8) | €12,000 | €60,000 | 320% |
| Fase 4 (Sem 9-14) | €24,000 | €392,015 | 280% |
| **TOTAL** | **€52,000** | **€642,015** | **1,126%** |

**Payback period**: 29 días

---

## 🚦 DECISIÓN EJECUTIVA

### Escenario Recomendado: MVP Fase 1-3 (8 Semanas)

**MVP PRODUCTION-READY (SIN AWS)**:
- ✓ Inversión: €28,000 (vs €52,000 completo)
- ✓ Timeline: 8 semanas (vs 14 semanas)
- ✓ ROI: 893% promedio
- ✓ Coste operacional: €0/mes (GitHub Pages)
- ✓ Éxito geocodificación: 90-95%
- ✓ Corrección manual integrada
- ✓ Exportación GeoJSON/CSV/KML

**Limitaciones**:
- Procesamiento browser-only (no batch 786 muni)
- Sin backend centralizado (ok para 1-10 municipios)
- Cache local por usuario (no compartido)

**Ventajas**:
- Zero costes operacionales
- Despliegue inmediato
- Mantenimiento mínimo
- Escalable a AWS luego si necesario (Fase 4)

**DECISIÓN**: ✅ APROBAR MVP Fase 1-3 | ⏸️ POSPONER Fase 4 (evaluar post-MVP)

---

## 📋 CHECKLIST ARRANQUE

### Día 1-2: Setup
- [ ] Revisión y aprobación Plan Maestro completo
- [ ] Crear branch `develop` desde `main`
- [ ] Crear branch `feature/fase1-geocodificacion-tipologica`

### Día 3: Clasificador Tipológico
- [ ] Crear `src/services/classification/InfrastructureClassifier.ts`
- [ ] Implementar 12 regex patterns categorías
- [ ] Tests unitarios con 50 nombres reales

### Día 4-5: WFS Sanitarios
- [ ] Crear `src/services/geocoding/specialized/WFSHealthGeocoder.ts`
- [ ] Configurar endpoints SICESS/SAS IECA
- [ ] Implementar query GetFeature + parse GML
- [ ] Fuzzy matching con Fuse.js

---

## 🎯 HITOS CLAVE

| Hito | Fecha Objetivo | Criterio Éxito |
|------|---------------|----------------|
| Setup proyecto | 21 Nov | Branch creado, deps instaladas |
| Fase 1 Sanitarios | 28 Nov | +25% mejora sanitarios |
| Fase 1 Completa | 5 Dic | +35-45% mejora global |
| Fase 2 Cache | 12 Dic | Hit rate &gt;70% |
| Fase 2 Cascada | 19 Dic | Circuit breaker operativo |
| Fase 3 Mapa base | 26 Dic | Visor funcional EPSG:25830 |
| Fase 3 Corrección | 9 Ene | Workflow manual fluido |
| MVP Production | 16 Ene | Sistema completo deployado |
| Fase 4 AWS (opcional) | 6 Feb | Infraestructura serverless |

---

## 📊 DASHBOARD MÉTRICAS (Tracking Semanal)

| KPI | Baseline | Objetivo |
|-----|----------|----------|
| Completitud Coordenadas | 26.9% | 95% |
| Éxito Geocodificación | 62.5% | 95% |
| Precisión Media | ±287m | ±25m |
| Cache Hit Rate (Fase 2+) | N/A | 70-85% |
| Municipios Procesados | 1 piloto | 50 (Q1 2026) |

---

## 🔍 ANÁLISIS DE RIESGOS

### Top 5 Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| APIs WFS Gubernamentales Inestables | MEDIA | ALTO | Cache agresivo 70-85%, cascada fallback 6 niveles, circuit breaker |
| Calidad Datos WFS Varía | MEDIA | MEDIO | Fuzzy matching configurable, scoring multi-dimensional, corrección manual |
| Performance Visor &gt;1000 Puntos | BAJA | MEDIO | MarkerCluster, virtualization, lazy loading |
| Complejidad EPSG:25830 | BAJA | BAJO | Documentación Proj4Leaflet, testing vs QGIS |
| Costes AWS Fase 4 Exceden €50/mes | BAJA | BAJO | Billing alerts, ARM64 Graviton2, optimización Lambda |

---

## 💡 LECCIONES DEL ANÁLISIS DOCUMENTAL

### Hallazgos Críticos (44 Archivos Muestra)

1. **77% ARCHIVOS SON DBF** (ya geocodificados) → Priorizar validación vs conversión
2. **UTF-8 CORRUPCIÓN ES SISTEMÁTICA** (95%) → Normalización encoding obligatoria
3. **COORDENADAS TRUNCADAS PREDECIBLES** (~10%) → Auto-corrección viable
4. **TIPOLOGÍA DETERMINA PRECISIÓN** (2-100m) → Geocodificación especializada esencial
5. **MUNICIPIOS RURALES MÁS PROBLEMÁTICOS** → Cascada fallback vital

---

## ✅ CRITERIOS ACEPTACIÓN MVP (Semana 8)

### Funcionalidad Core
- ✓ Procesa 8 formatos archivo (CSV/XLSX/ODT/DBF/GeoJSON/KML)
- ✓ Normaliza UTF-8 con 27+ patrones corrección
- ✓ Valida con 8 estrategias defensivas (scoring 0-100)
- ✓ Geocodifica por tipología (4+ categorías WFS)
- ✓ Cache sistema hit rate &gt;70%
- ✓ Visor mapa EPSG:25830 funcional
- ✓ Corrección manual click-to-set + drag-drop
- ✓ Exporta GeoJSON/CSV/KML con metadata

### Métricas Calidad
- ✓ Éxito geocodificación &gt;90%
- ✓ Precisión ±2-50m según tipología
- ✓ Tests automatizados &gt;85% cobertura
- ✓ Zero bugs críticos detectados

### Usabilidad
- ✓ Workflow wizard intuitivo (3 pasos)
- ✓ Corrección manual &lt;30s por punto
- ✓ Testing con 3 técnicos municipales (satisfacción &gt;4/5)

---

## 📌 RESUMEN EJECUTIVO 1-PAGER

**PROBLEMA**: Solo 26.9% infraestructuras tienen coords válidas. Decreto 197/2024 en riesgo.

**SOLUCIÓN**: Sistema web inteligente que alcanza 95-100% mediante geocodificación especializada.

**FASES**:
- 🔴 Fase 1 (2 sem): Geocodificación +35-45%
- 🟡 Fase 2 (2 sem): Cache +20-30%
- 🟢 Fase 3 (4 sem): Visor corrección manual
- 🟣 Fase 4 (6 sem): AWS escalabilidad

**ROI**: 1,126% primer año (€642K beneficio)

**INVERSIÓN**: €28K MVP (sem 1-8) o €52K completo (sem 1-14)

**COSTE OPS**: €0/mes MVP, €30-45/mes con AWS

**RECOMENDACIÓN**: ✅ Aprobar MVP Fase 1-3 (8 semanas) | ⏸️ Evaluar Fase 4 post-MVP

---

**FIN ROADMAP EJECUTIVO**

**Contacto**: Luis (Técnico Municipal Granada)  
**Fecha**: 21 Noviembre 2025  
**Versión**: 1.0 Executive