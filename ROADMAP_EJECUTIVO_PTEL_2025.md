# Roadmap Ejecutivo PTEL 2025
## Sistema de Normalización de Coordenadas

> Visión estratégica y planificación de desarrollo del sistema PTEL Coordinate Normalizer.

**Última actualización**: 24 noviembre 2025  
**Versión**: 1.0.0

---

## 🎯 Visión del Proyecto

**Objetivo**: Automatizar la normalización, validación y geocodificación de coordenadas para los 786 municipios de Andalucía, mejorando la completitud de datos PTEL del 26.9% actual al 95%+.

**Contexto**: Cumplimiento del Decreto 197/2024 de planificación de emergencias de Andalucía.

---

## 📅 Fases de Desarrollo

### Fase 1: MVP Funcional ✅ (Completada)
**Periodo**: Noviembre 2025  
**Estado**: ✅ COMPLETADO

**Entregables**:
- [x] Normalización UTF-8 (52 patrones)
- [x] Validación 8 estrategias (score 0-100)
- [x] 4 geocodificadores WFS especializados
- [x] Interfaz web React/TypeScript
- [x] Soporte CSV, Excel, DBF

**Métricas alcanzadas**:
- Cobertura tipologías: 72%
- Precisión normalización: 98%
- Tiempo procesamiento: <30s/100 registros

---

### Fase 2: Caché y Cascada (En Progreso)
**Periodo**: Diciembre 2025  
**Estado**: 🔄 EN PROGRESO

**Objetivos**:
- [ ] Sistema caché multinivel (Memory/LocalStorage/IndexedDB)
- [ ] Cascada 6 niveles geocodificación
- [ ] Métricas y monitorización
- [ ] Tests E2E con datos reales

**Componentes clave**:
```
CacheManager (442 líneas)
├── Nivel 1: Memory (sesión)
├── Nivel 2: LocalStorage (7 días)
└── Nivel 3: IndexedDB (30 días)

CascadeOrchestrator (664 líneas)
├── WFS Especializados (4 servicios)
├── CartoCiudad IGN
├── CDAU Andalucía
├── Nominatim OSM
└── Fallback manual
```

---

### Fase 3: Visor Cartográfico
**Periodo**: Enero 2026  
**Estado**: 📋 PLANIFICADO

**Objetivos**:
- [ ] Integración Leaflet completa
- [ ] Corrección manual drag-and-drop
- [ ] Visualización clusters por municipio
- [ ] Capas WMS oficiales IDE Andalucía

**Funcionalidades**:
- Mapa base: OpenStreetMap / PNOA
- Marcadores diferenciados por confianza
- Panel de edición integrado
- Exportación GeoJSON/Shapefile

---

### Fase 4: Escalabilidad (Opcional)
**Periodo**: Febrero-Marzo 2026  
**Estado**: 📋 PLANIFICADO

**Objetivos**:
- [ ] AWS Lambda para procesamiento masivo
- [ ] API REST pública
- [ ] Dashboard multi-municipio
- [ ] Integración CGES Andalucía

---

## 📊 Métricas de Éxito

### KPIs Principales

| Métrica | Baseline | Objetivo | Actual |
|---------|----------|----------|--------|
| Completitud coordenadas | 26.9% | 95% | 67%* |
| Score promedio validación | 45 | 85 | 89 |
| Tiempo por 100 registros | 4h manual | <1min | 25s |
| Cobertura geocodificación | 0% | 80% | 72% |

*Tras procesamiento automatizado

### ROI Estimado

**Ahorro por municipio**:
- Tiempo técnico: 4h → 10min (96% reducción)
- Coste hora técnico: €35/h
- Ahorro por municipio: €140

**Ahorro total Andalucía**:
- 786 municipios × €140 = **€110.040/año**

---

## 🔧 Stack Tecnológico

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Maps**: Leaflet
- **State**: Zustand

### Datos y APIs
- **Transformaciones**: proj4.js
- **Geocoding**: WFS oficiales + CartoCiudad
- **Parsing**: SheetJS, PapaParse

### Infraestructura
- **Hosting**: GitHub Pages (gratuito)
- **CI/CD**: GitHub Actions
- **Monitorización**: Browser-based

### Coste Operacional
- **Actual**: €0/mes (todo gratuito)
- **Proyectado**: <€50/año

---

## 🎯 Próximos Hitos

### Q4 2025
- [x] MVP funcional
- [x] Validación con datos Colomera
- [ ] Completar Fase 2 (caché + cascada)
- [ ] Documentación operacional completa

### Q1 2026
- [ ] Visor cartográfico Leaflet
- [ ] Piloto 5 municipios Granada
- [ ] Feedback técnicos municipales

### Q2 2026
- [ ] Despliegue provincial Granada
- [ ] Integración CGES (si aprobado)
- [ ] Escalado resto Andalucía

---

## 👥 Stakeholders

### Equipo Desarrollo
- **Luis García**: Arquitectura, desarrollo, validación

### Usuarios Objetivo
- Técnicos municipales PTEL
- Servicios de Emergencias 112
- Protección Civil Andalucía

### Organismos Relacionados
- IECA (Instituto de Estadística y Cartografía)
- IDE Andalucía
- Junta de Andalucía - CGES

---

## 📚 Documentación Relacionada

| Documento | Propósito |
|-----------|-----------|
| PLAN_MAESTRO_PTEL_DESARROLLO_2025.md | Planificación detallada |
| ARQUITECTURA_COMPONENTES.md | Estructura técnica |
| API_DOCUMENTATION.md | Interfaces TypeScript |
| CASOS_DE_USO_Y_WORKFLOWS.md | Escenarios prácticos |
| DEPLOYMENT_GUIDE.md | Guía despliegue |

---

**Roadmap Ejecutivo** | **v1.0.0**  
**Sistema PTEL Coordinate Normalizer** 🗺️
