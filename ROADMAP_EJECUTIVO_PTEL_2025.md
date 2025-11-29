# 🎯 ROADMAP EJECUTIVO PTEL 2025
## Plan de Trabajo Visual y Priorizado

**Versión**: 1.1 Executive Summary  
**Fecha**: 29 Noviembre 2025  
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
✓ Coste: €0/mes                         ✓ Coste: €30-45/mes (cumple <€50)
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
  ├─ Sanitarios   │     │           │                   │ ├─ WFS SICESS/SAS (1,500 centros)
  └─ Resto tipos  │  ███│           │                   │ └─ Educación/Policía/Cultura/Religión
───────┼─────┼─────┼───────────┼───────────────────┤
FASE 2 │     │█████│           │                   │ Cache + Cascada
  ├─ Cache       │     │██   │           │                   │ ├─ localStorage + IndexedDB
  └─ Orchestrator│     │  ███│           │                   │ └─ 6 niveles fallback + circuit breaker
───────┼─────┼─────┼───────────┼───────────────────┤
FASE 3 │     │     │███████████│                   │ Visor Cartográfico
  ├─ Mapa base   │     │     │███        │                   │ ├─ Leaflet + EPSG:25830
  ├─ Visualización│     │     │   ███     │                   │ ├─ Marcadores + clustering
  ├─ Corrección  │     │     │      ███  │                   │ ├─ Click-to-set + drag-drop
  └─ Exportación │     │     │         ██│                   │ └─ GeoJSON/CSV/KML + persistencia
───────┼─────┼─────┼───────────┼───────────────────┤
FASE 4 │     │     │           │███████████████████│ AWS Serverless (OPCIONAL)
  ├─ Infra AWS   │     │     │           │████               │ ├─ Lambda + ECR + IAM
  ├─ Cache DDB   │     │     │           │    ████           │ ├─ DynamoDB + Step Functions
  └─ Monitoring  │     │     │           │        ████       │ └─ CloudWatch + Security
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

```
                                  IMPACTO EN ÉXITO GEOCODIFICACIÓN
                    │
              ALTO  │   ┌─────────────┐
                    │   │   FASE 1    │ 🔴 CRITICAL PATH
                    │   │ +35-45%     │ Sem 1-2, 4 dev-weeks
                    │   │ Tipológica  │ ROI: 875%
                    │   └─────────────┘
                    │          │
                    │          ↓
                    │   ┌─────────────┐
              MEDIO │   │   FASE 2    │ 🟡 HIGH PRIORITY
                    │   │ +20-30%     │ Sem 3-4, 4 dev-weeks
                    │   │ Cache       │ ROI: 650%
                    │   └─────────────┘ Requiere Fase 1
                    │          │
                    │          ↓
              BAJO  │   ┌─────────────┐   ┌─────────────┐
                    │   │   FASE 3    │   │   FASE 4    │
                    │   │ Visor mapa  │   │ AWS Scale   │
                    │   │ Corrección  │   │ 786 muni.   │
                    │   └─────────────┘   └─────────────┘
                    │     🟢 MEDIUM         🟣 LOW/OPTIONAL
                    │     Sem 5-8           Sem 9-14
                    │     ROI: 320%         ROI: 280%
                    └───────────────────────────────────────────────
                         BAJO    MEDIO    ALTO    MUY ALTO
                              ESFUERZO DESARROLLO
```

---

## ⚡ QUICK WINS (Primeras 4 Semanas)

### Semana 1-2: Fase 1 Quick Win 🔥
**IMPACTO INMEDIATO**: +35-45% éxito geocodificación

```
┌─────────────────────────────────────────────────────────┐
│  ANTES (Sistema Actual)                                 │
│  ───────────────────────────────────────────────────    │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░  55-70% éxito   │
│                                                          │
│  DESPUÉS (Con Geocodificación Tipológica)               │
│  ───────────────────────────────────────────────────    │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░  90-95% éxito   │
│                                                          │
│  Mejora: +35-45 puntos porcentuales                     │
└─────────────────────────────────────────────────────────┘
```

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

```
┌─────────────────────────────────────────────────────────┐
│  PETICIONES API (Sin Cache)                             │
│  ───────────────────────────────────────────────────    │
│  Procesamiento 1000 infraestructuras:                   │
│  → CartoCiudad: 1000 requests × 300ms = 300s (5 min)   │
│  → CDAU: 500 requests × 200ms = 100s                    │
│  → Total: 400s = 6.7 minutos                            │
│                                                          │
│  CON CACHE (70-85% hit rate)                            │
│  ───────────────────────────────────────────────────    │
│  Procesamiento 1000 infraestructuras:                   │
│  → Cache hits: 700 × 5ms = 3.5s                         │
│  → API calls: 300 × 300ms = 90s                         │
│  → Total: 93.5s = 1.6 minutos                           │
│                                                          │
│  Mejora: 76% más rápido, 70% menos carga APIs           │
└─────────────────────────────────────────────────────────┘
```

**Qué se implementa**:
- ✅ localStorage cache (5-10MB, TTL 90 días)
- ✅ IndexedDB cache (50-100MB datasets grandes)
- ✅ Hash key: `${nombre}_${municipio}_${tipo}`
- ✅ LRU eviction policy
- ✅ Cascada 6 niveles fallback
- ✅ Circuit breaker APIs rate-limited

---

## 💰 ROI POR FASE

```
INVERSIÓN vs BENEFICIO (Acumulado)
─────────────────────────────────────────────────────────

FASE 1 (Sem 1-2)
  Inversión: €8,000
  Beneficio: €70,000 (mejora 35% × 786 muni × €2.5/infra)
  ROI: 875% ████████████████████████████████████

FASE 2 (Sem 3-4)  
  Inversión: €8,000 (acum €16,000)
  Beneficio: €120,000 (acum €190,000)
  ROI: 650% ██████████████████████████████

FASE 3 (Sem 5-8)
  Inversión: €12,000 (acum €28,000)
  Beneficio: €60,000 (acum €250,000)
  ROI: 320% ████████████████

FASE 4 (Sem 9-14) [OPCIONAL]
  Inversión: €24,000 (acum €52,000)
  Beneficio: €392,015 (acum €642,015)
  ROI: 280% ██████████████

─────────────────────────────────────────────────────────
TOTAL ROI PROYECTO: 1,126%
Payback period: 29 días
```

---

## 🚦 DECISIÓN EJECUTIVA

### Escenario Recomendado: MVP Fase 1-3 (8 Semanas)

```
┌────────────────────────────────────────────────────────┐
│  MVP PRODUCTION-READY (SIN AWS)                        │
│  ──────────────────────────────────────────────────    │
│  ✓ Inversión: €28,000 (vs €52,000 completo)           │
│  ✓ Timeline: 8 semanas (vs 14 semanas)                │
│  ✓ ROI: 893% promedio                                 │
│  ✓ Coste operacional: €0/mes (GitHub Pages)           │
│  ✓ Éxito geocodificación: 90-95%                      │
│  ✓ Corrección manual integrada                        │
│  ✓ Exportación GeoJSON/CSV/KML                        │
│                                                         │
│  ⚠ Limitaciones:                                       │
│  - Procesamiento browser-only (no batch 786 muni)     │
│  - Sin backend centralizado (ok para 1-10 municipios) │
│  - Cache local por usuario (no compartido)            │
│                                                         │
│  ✓ Ventajas:                                           │
│  + Zero costes operacionales                           │
│  + Despliegue inmediato                                │
│  + Mantenimiento mínimo                                │
│  + Escalable a AWS luego si necesario (Fase 4)        │
└────────────────────────────────────────────────────────┘

DECISIÓN: ✅ APROBAR MVP Fase 1-3
          ⏸️ POSPONER Fase 4 (evaluar post-MVP)
```

### Criterios Go/No-Go Post-MVP (Semana 8)

```
EVALUAR NECESIDAD FASE 4 AWS CUANDO:

✓ SI (necesitamos AWS):
  □ >50 municipios requieren procesamiento simultáneo
  □ Procesamiento batch nocturno crítico
  □ Cache compartido entre usuarios esencial
  □ Arquitectura centralizada mandatoria

✗ NO (MVP suficiente):
  □ Uso secuencial 1-10 municipios/mes
  □ Técnico municipal puede procesar localmente
  □ Cache local por usuario aceptable
  □ Coste €0/mes prioritario vs escalabilidad
```

---

## 📋 CHECKLIST ARRANQUE (Esta Semana)

### Día 1-2: Setup
- [ ] Revisión y aprobación Plan Maestro completo
- [ ] Crear branch `develop` desde `main`
- [ ] Crear branch `feature/fase1-geocodificacion-tipologica`
- [ ] Setup proyecto local actualizado
- [ ] Instalación dependencias adicionales:
  ```bash
  npm install fuse.js@7.0.0
  npm install axios@1.6.0
  ```

### Día 3: Clasificador Tipológico
- [ ] Crear `src/services/classification/InfrastructureClassifier.ts`
- [ ] Implementar 12 regex patterns categorías
- [ ] Tests unitarios con 50 nombres reales
- [ ] Integrar en pipeline Step2

### Día 4-5: WFS Sanitarios
- [ ] Crear `src/services/geocoding/specialized/WFSHealthGeocoder.ts`
- [ ] Configurar endpoints SICESS/SAS IECA
- [ ] Implementar query GetFeature + parse GML
- [ ] Fuzzy matching con Fuse.js
- [ ] Tests integración 10 centros piloto

### Viernes: Sprint Review
- [ ] Demo clasificador tipológico funcionando
- [ ] Primeros resultados geocodificación sanitarios
- [ ] Métricas baseline vs mejorado
- [ ] Retrospectiva y ajustes sprint 2

---

## 🎯 HITOS CLAVE

```
HITO                         FECHA OBJETIVO    CRITERIO ÉXITO
────────────────────────────────────────────────────────────
✓ Setup proyecto             21 Nov            Branch creado, deps instaladas
🔄 Fase 1 Sanitarios         28 Nov            +25% mejora sanitarios
🔄 Fase 1 Completa           5 Dic             +35-45% mejora global
⏳ Fase 2 Cache              12 Dic            Hit rate >70%
⏳ Fase 2 Cascada            19 Dic            Circuit breaker operativo
⏳ Fase 3 Mapa base          26 Dic            Visor funcional EPSG:25830
⏳ Fase 3 Corrección         9 Ene             Workflow manual fluido
⏳ MVP Production            16 Ene            Sistema completo deployado
⏸️ Fase 4 AWS (opcional)    6 Feb             Infraestructura serverless
```

---

## 📊 DASHBOARD MÉTRICAS (Tracking Semanal)

```
┌─────────────────────────────────────────────────────────┐
│  KPI DASHBOARD - Actualización Semanal                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Completitud Coordenadas                                │
│  ────────────────────────────────────────────────       │
│  ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░ 26.9% → Objetivo: 95%    │
│                                                          │
│  Éxito Geocodificación                                  │
│  ────────────────────────────────────────────────       │
│  ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░ 62.5% → Objetivo: 95%    │
│                                                          │
│  Precisión Media                                        │
│  ────────────────────────────────────────────────       │
│  ±287m → Objetivo: ±25m                                 │
│                                                          │
│  Cache Hit Rate (Fase 2+)                               │
│  ────────────────────────────────────────────────       │
│  N/A → Objetivo: 70-85%                                 │
│                                                          │
│  Municipios Procesados                                  │
│  ────────────────────────────────────────────────       │
│  1 piloto → Objetivo: 50 (Q1 2026)                      │
└─────────────────────────────────────────────────────────┘

Actualizar cada viernes sprint review
```

---

## 🔍 ANÁLISIS DE RIESGOS

### Top 5 Riesgos y Mitigaciones

```
1. 🔴 APIs WFS Gubernamentales Inestables
   Probabilidad: MEDIA | Impacto: ALTO
   Mitigación:
   ✓ Cache agresivo 70-85% (Fase 2)
   ✓ Cascada fallback 6 niveles
   ✓ Circuit breaker auto-failover
   ✓ Datos offline fallback (OSM)

2. 🟡 Calidad Datos WFS Especializado Varía
   Probabilidad: MEDIA | Impacto: MEDIO
   Mitigación:
   ✓ Fuzzy matching threshold 0.3 configurable
   ✓ Validación multi-dimensional scoring
   ✓ Corrección manual integrada (Fase 3)
   ✓ Feedback loop técnicos municipales

3. 🟡 Performance Visor Mapa >1000 Puntos
   Probabilidad: BAJA | Impacto: MEDIO
   Mitigación:
   ✓ MarkerCluster desde diseño
   ✓ Virtualization tabla react-virtual
   ✓ Lazy loading componentes
   ✓ Testing benchmarking continuo

4. 🟢 Complejidad Configuración EPSG:25830
   Probabilidad: BAJA | Impacto: BAJO
   Mitigación:
   ✓ Seguir documentación Proj4Leaflet exacta
   ✓ Testing transformaciones vs QGIS
   ✓ Validación coordenadas con CartoCiudad

5. 🟢 Costes AWS Fase 4 Exceden €50/mes
   Probabilidad: BAJA | Impacto: BAJO
   Mitigación:
   ✓ Monitoreo billing alerts (€30, €40, €50)
   ✓ ARM64 Graviton2 (-20% coste)
   ✓ Cache Redis opcional (skip si presupuesto)
   ✓ Lambda optimization (memory allocation)
```

---

## 💡 LECCIONES DE ANÁLISIS DOCUMENTAL

### Hallazgos Críticos del Análisis Real (44 Archivos Muestra)

```
1. 77% ARCHIVOS SON DBF (YA GEOCODIFICADOS)
   Implicación: Priorizar validación vs conversión
   Acción: Estrategia #1-7 validación más críticas

2. UTF-8 CORRUPCIÓN ES SISTEMÁTICA (95%)
   Implicación: Normalización encoding obligatoria
   Acción: Mantener 27 patrones corrección activos

3. COORDENADAS TRUNCADAS PREDECIBLES (~10%)
   Implicación: Auto-corrección viable
   Acción: Detector Y sin "4" inicial por provincia

4. TIPOLOGÍA DETERMINA PRECISIÓN (Varianza 2-100m)
   Implicación: Geocodificación especializada esencial
   Acción: Fase 1 crítica para alcanzar objetivos

5. MUNICIPIOS RURALES MÁS PROBLEMÁTICOS
   Implicación: Cascada fallback vital
   Acción: OSM Nominatim como último recurso
```

---

## 📞 COMUNICACIÓN Y REPORTING

### Frecuencia Reportes

```
DAILY (Slack/Async)
├─ Progress update 1-2 líneas
├─ Blockers identificados
└─ Decisiones necesarias

WEEKLY (Viernes 16:00)
├─ Sprint review demo funcionalidad
├─ Métricas KPI actualizadas
├─ Retrospectiva mejoras proceso
└─ Planning sprint siguiente

MONTHLY (Último viernes mes)
├─ Reporte ejecutivo stakeholders
├─ Dashboard completo ROI
├─ Ajustes roadmap si necesario
└─ Comunicación técnicos municipales
```

### Escalation Matrix

```
ISSUE SEVERITY          RESPONSE TIME    ESCALATION PATH
─────────────────────────────────────────────────────────
🔴 Blocker crítico      <2 horas         Luis → Coordinador
🟡 Bug funcionalidad    <1 día           Luis → Revisión sprint
🟢 Mejora UX            <1 semana        Backlog → Sprint planning
🔵 Nice-to-have         Sin timeline     Backlog largo plazo
```

---

## ✅ CRITERIOS ACEPTACIÓN MVP (Semana 8)

### Sistema Listo para Producción Cuando:

```
FUNCIONALIDAD CORE
├─ ✓ Procesa 8 formatos archivo (CSV/XLSX/ODT/DBF/GeoJSON/KML)
├─ ✓ Normaliza UTF-8 con 27+ patrones corrección
├─ ✓ Valida con 8 estrategias defensivas (scoring 0-100)
├─ ✓ Geocodifica por tipología (4+ categorías WFS)
├─ ✓ Cache sistema hit rate >70%
├─ ✓ Visor mapa EPSG:25830 funcional
├─ ✓ Corrección manual click-to-set + drag-drop
└─ ✓ Exporta GeoJSON/CSV/KML con metadata

MÉTRICAS CALIDAD
├─ ✓ Éxito geocodificación >90%
├─ ✓ Precisión ±2-50m según tipología
├─ ✓ Tests automatizados >85% cobertura
├─ ✓ Zero bugs críticos detectados
├─ ✓ Performance <2s procesamiento 1000 registros
└─ ✓ Lighthouse score >85

USABILIDAD
├─ ✓ Workflow wizard intuitivo (3 pasos claros)
├─ ✓ Corrección manual <30s por punto
├─ ✓ Testing con 3 técnicos municipales (satisfacción >4/5)
└─ ✓ Documentación usuario completa con videos

DEPLOYMENT
├─ ✓ GitHub Pages deployado (URL: ptel.github.io/...)
├─ ✓ CI/CD pipeline funcional (auto-deploy main)
├─ ✓ Monitoreo básico activo (Google Analytics)
└─ ✓ Backups automáticos configurados
```

---

## 🚀 ACCIÓN INMEDIATA

### Esta Semana (21-28 Nov)

```
┌─────────────────────────────────────────────────────────┐
│  🎯 OBJETIVO SEMANA 1: Geocodificación Sanitarios       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  LUNES (21 Nov)                                         │
│  ├─ 09:00  Revisión Plan Maestro                        │
│  ├─ 11:00  Aprobación stakeholders                      │
│  ├─ 14:00  Setup branch feature/fase1                   │
│  └─ 16:00  Instalación dependencias                     │
│                                                          │
│  MARTES (22 Nov)                                        │
│  ├─ 09:00  Implementar InfrastructureClassifier         │
│  ├─ 12:00  Tests unitarios clasificador                 │
│  └─ 15:00  Integración pipeline Step2                   │
│                                                          │
│  MIÉRCOLES (23 Nov)                                     │
│  ├─ 09:00  Crear WFSHealthGeocoder clase               │
│  ├─ 11:00  Configurar endpoints SICESS/SAS             │
│  └─ 14:00  Implementar query GetFeature                 │
│                                                          │
│  JUEVES (24 Nov)                                        │
│  ├─ 09:00  Fuzzy matching con Fuse.js                  │
│  ├─ 12:00  Parser respuestas GML                        │
│  └─ 15:00  Tests integración 10 centros                 │
│                                                          │
│  VIERNES (25 Nov)                                       │
│  ├─ 09:00  Testing end-to-end sanitarios               │
│  ├─ 11:00  Métricas: baseline vs mejorado              │
│  ├─ 14:00  Demo sprint review                          │
│  └─ 16:00  Retrospectiva + planning sprint 2           │
│                                                          │
│  ENTREGABLE: +20-30% mejora geocodificación sanitaria  │
└─────────────────────────────────────────────────────────┘
```

---

## 📌 RESUMEN EJECUTIVO 1-PAGER

```
╔═══════════════════════════════════════════════════════════╗
║  PROYECTO PTEL: NORMALIZACIÓN COORDENADAS 786 MUNICIPIOS  ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  PROBLEMA:  Solo 26.9% infraestructuras tienen coords     ║
║             válidas. Decreto 197/2024 en riesgo.          ║
║                                                            ║
║  SOLUCIÓN:  Sistema web inteligente que alcanza 95-100%   ║
║             mediante geocodificación especializada.        ║
║                                                            ║
║  FASES:     🔴 Fase 1 (2 sem): Geocodificación +35-45%   ║
║             🟡 Fase 2 (2 sem): Cache +20-30%             ║
║             🟢 Fase 3 (4 sem): Visor corrección manual   ║
║             🟣 Fase 4 (6 sem): AWS escalabilidad         ║
║                                                            ║
║  ROI:       1,126% primer año (€642K beneficio)           ║
║  INVERSIÓN: €28K MVP (sem 1-8) o €52K completo (sem 1-14)║
║  COSTE OPS: €0/mes MVP, €30-45/mes con AWS               ║
║                                                            ║
║  RECOMEN.:  ✅ Aprobar MVP Fase 1-3 (8 semanas)          ║
║             ⏸️ Evaluar Fase 4 post-MVP si necesario      ║
║                                                            ║
║  ARRANQUE:  Lunes 21 Nov - Clasificador + WFS Sanitarios ║
╚═══════════════════════════════════════════════════════════╝
```

---

**FIN ROADMAP EJECUTIVO**

Este documento complementa el Plan Maestro de 26 páginas con visualizaciones y prioridades claras para decisión ejecutiva rápida.

**Próximo paso**: Revisión lunes 09:00 → Aprobación → Arranque inmediato

**Contacto**: Luis (Técnico Municipal Granada)  
**Fecha**: 29 Noviembre 2025  
**Versión**: 1.1 Executive
