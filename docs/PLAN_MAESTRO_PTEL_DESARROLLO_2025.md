# 📋 PLAN MAESTRO DE DESARROLLO PTEL 2025
## Sistema de Normalización y Geocodificación de Coordenadas para 786 Municipios Andaluces

**Documento**: Plan de Trabajo Completo v1.0  
**Fecha**: 21 Noviembre 2025  
**Autor**: Luis (Técnico Municipal Granada)  
**Objetivo**: Alcanzar 95-100% completitud coordenadas infraestructuras críticas PTEL

---

## 🎯 RESUMEN EJECUTIVO

### Contexto del Proyecto

Sistema profesional de normalización y geocodificación de coordenadas para Planes Territoriales de Emergencias Locales (PTEL) en cumplimiento del **Decreto 197/2024** de la Junta de Andalucía. El proyecto aborda una problemática crítica: **solo el 26.9% de infraestructuras** en documentos municipales PTEL tienen coordenadas completas, con **95% de documentos** sufriendo corrupción UTF-8 y coordenadas truncadas.

### Arquitectura Actual

**Stack Tecnológico**:
- Frontend: React 18.3.1 + TypeScript 5.6 + Vite 5.4
- UI: shadcn/ui + Tailwind CSS + Framer Motion
- Mapas: Leaflet 1.9.4 + react-leaflet (pendiente integración)
- Estado: Zustand
- Hosting: GitHub Pages (frontend)
- Backend: AWS Lambda + Python 3.11/3.12 (preparado, no desplegado)
- Geocodificación: APIs oficiales españolas (CartoCiudad, CDAU, IECA)

### Métricas Actuales

| Métrica | Valor Actual | Objetivo | Gap |
|---------|--------------|----------|-----|
| Completitud coords | 26.9% | 95-100% | **+68-73%** |
| Éxito geocodificación | 55-70% | 95-100% | **+25-45%** |
| Precisión | ±100-500m | ±2-25m | **Mejora 4-20x** |
| Municipios cubiertos | 1 piloto | 786 | **+785** |
| Coste operacional | €0/mes | <€50/mes | ✅ Cumple |

---

## ✅ TAREAS COMPLETADAS (v0.4.0)

### Fase 0: Fundación (100% Completo)

#### Infraestructura Base
- ✅ Setup React 18 + TypeScript + Vite con strict mode
- ✅ Configuración Tailwind CSS + shadcn/ui components
- ✅ Sistema routing wizard 3 pasos (Upload → Process → View)
- ✅ State management con Zustand
- ✅ Despliegue GitHub Pages con CD automático
- ✅ ESLint + Prettier configurados

#### Paso 1: Upload de Archivos
- ✅ Componente drag-and-drop multi-archivo (hasta 10 simultáneos)
- ✅ Soporte CSV, XLSX, ODS, ODT, DBF, GeoJSON, KML/KMZ
- ✅ Validación tamaño archivo (<50MB)
- ✅ Preview primeras 5 filas con detección encoding
- ✅ Mapeo inteligente columnas (auto-detecta X/Y, lat/lon)

#### Paso 2: Procesamiento
- ✅ Parser CSV con Papa Parse (detección delimitador automática)
- ✅ Parser Excel con SheetJS (manejo celdas vacías)
- ✅ Parser OpenDocument (.odt) con mammoth.js
- ✅ Parser GeoJSON con validación RFC 7946
- ✅ Parser KML/KMZ con JSZip
- ✅ Parser DBF con encoding UTF-8 correcto
- ✅ Progress bar con feedback en tiempo real

#### Sistema de Normalización UTF-8
- ✅ 52 patrones de corrección caracteres corrompidos (v2.0)
- ✅ Detección y corrección coordenadas truncadas (Y sin "4" inicial)
- ✅ Auto-recuperación ~10-15% registros truncados
- ✅ Validación decimales europeos (`,` vs `.`)

#### Sistema de Validación Defensiva (8 Estrategias)
- ✅ **Estrategia #1**: Validación formato sintáctico
- ✅ **Estrategia #2**: Validación rangos UTM30 Andalucía
- ✅ **Estrategia #3**: Detección caracteres especiales
- ✅ **Estrategia #4**: Validación decimales y precisión
- ✅ **Estrategia #5**: Validación longitud dígitos
- ✅ **Estrategia #6**: Coherencia espacial (distancia centroide <20km)
- ✅ **Estrategia #7**: Validación vecindad (clustering)
- ✅ **Estrategia #8**: Auto-detección CRS (WGS84/ETRS89/ED50)

#### Scoring y Clasificación
- ✅ Sistema scoring 0-100 puntos multi-dimensional
- ✅ 4 niveles confianza: CRITICAL/LOW/MEDIUM/HIGH
- ✅ 4 recomendaciones: REJECT/MANUAL_REVIEW/ACCEPT_FLAG/ACCEPT
- ✅ Pesos configurables por estrategia
- ✅ Algoritmo agregación weighted average

#### Paso 3: Visualización Resultados
- ✅ Tabla resultados con columnas scoring
- ✅ Pestaña "Scores" con barras progreso coloreadas
- ✅ Colores semánticos por nivel (rojo/amarillo/verde)
- ✅ Filtros dinámicos (confianza, tipología, score)
- ✅ Badges tipología infraestructura (🏥🎓🚔🏛⛪)
- ✅ Dashboard estadísticas agregadas (BatchStatsCard)
- ✅ Toast notifications feedback usuario

---

## 🚧 TAREAS PENDIENTES (Priorizadas)

### 🔴 FASE 1: GEOCODIFICACIÓN POR TIPOLOGÍA ✅ COMPLETADA
- ✅ Clasificador tipológico (12 categorías)
- ✅ WFSHealthGeocoder (sanitarios)
- ✅ WFSEducationGeocoder (educativos)
- ✅ WFSCulturalGeocoder (culturales IAPH)
- ✅ WFSSecurityGeocoder (policía/bomberos)
- ✅ GeocodingOrchestrator con priorización

### 🟡 FASE 2: CACHE MULTINIVEL Y CASCADA (Prioridad ALTA)
**Timeline**: Semanas 3-4

- [ ] Capa localStorage (10MB, session)
- [ ] Capa IndexedDB (100MB, persistente)
- [ ] TTL configurable por fuente (7-90 días)
- [ ] Invalidación selectiva por municipio
- [ ] Métricas hit/miss rate
- [ ] Cascada 6 niveles fallback

### 🟢 FASE 3: VISOR CARTOGRÁFICO (Prioridad MEDIA)
**Timeline**: Semanas 5-8

- [ ] Componente Leaflet integrado
- [ ] Capas base: OSM, PNOA, Catastro
- [ ] Clustering markers dinámico
- [ ] Modo edición drag-and-drop
- [ ] Búsqueda CartoCiudad en mapa
- [ ] Histórico correcciones

### 🔵 FASE 4: DESPLIEGUE AWS (Prioridad BAJA)
**Timeline**: Semanas 9-14

- [ ] Lambda functions
- [ ] Step Functions orquestación
- [ ] DynamoDB cache
- [ ] CloudWatch monitoring

---

## 📊 MÉTRICAS Y KPIs

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Éxito geocodificación | 72% | 95-100% |
| Precisión | ±10-50m | ±2-25m |
| Cache hit rate | 0% | 70-85% |
| Municipios cubiertos | 3 pilotos | 786 |

---

## ✅ CRITERIOS DE ACEPTACIÓN

### Sistema Listo Para Producción Cuando:
- ✅ Procesa 8 formatos archivo
- ✅ Normaliza UTF-8 con 52+ patrones
- ✅ Valida con 8 estrategias defensivas
- ✅ Geocodifica por tipología (4 categorías)
- ✅ Éxito geocodificación >95%
- ✅ Performance <2s/1000 registros

---

**Última actualización**: 24 Noviembre 2025  
**Versión**: 1.1  
**Estado**: APROBADO PARA EJECUCIÓN
