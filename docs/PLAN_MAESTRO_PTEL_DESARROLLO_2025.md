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
| Coste operacional | €0/mes | &lt;€50/mes | ✅ Cumple |

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
- ✅ Validación tamaño archivo (&lt;50MB)
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
- ✅ 27 patrones de corrección caracteres corrompidos
- ✅ Mapeo Ã→ñ, Ã©→é, Ã¡→á (y 24 patrones más)
- ✅ Detección y corrección coordenadas truncadas (Y sin "4" inicial)
- ✅ Auto-recuperación ~10-15% registros truncados
- ✅ Validación decimales europeos (`,` vs `.`)

#### Sistema de Validación Defensiva (8 Estrategias)
- ✅ **Estrategia #1**: Validación formato sintáctico
- ✅ **Estrategia #2**: Validación rangos UTM30 Andalucía
- ✅ **Estrategia #3**: Detección caracteres especiales
- ✅ **Estrategia #4**: Validación decimales y precisión
- ✅ **Estrategia #5**: Validación longitud dígitos
- ✅ **Estrategia #6**: Coherencia espacial (distancia centroide &lt;20km)
- ✅ **Estrategia #7**: Validación vecindad (clustering)
- ✅ **Estrategia #8**: Auto-detección CRS (WGS84/ETRS89/ED50)

#### Scoring y Clasificación
- ✅ Sistema scoring 0-100 puntos multi-dimensional
- ✅ 5 niveles confianza: CRÍTICA/BAJA/MEDIA/ALTA/CONFIRMADO
- ✅ 4 recomendaciones: REJECT/MANUAL_REVIEW/ACCEPT_FLAG/ACCEPT
- ✅ Pesos configurables por estrategia
- ✅ Algoritmo agregación weighted average

#### Paso 3: Visualización Resultados
- ✅ Tabla resultados con react-table
- ✅ Columnas scoring, confianza, recomendación
- ✅ Colores semánticos por nivel (rojo/amarillo/verde)
- ✅ Filtros dinámicos (confianza, tipología, score)
- ✅ Badges tipología infraestructura (🏥🎓🚔🏛️⛪)
- ✅ Dashboard estadísticas agregadas
- ✅ Gráficos distribución confianza (Recharts)
- ✅ Toast notifications feedback usuario

#### Exportación
- ✅ Exportación CSV básica
- ✅ Botones descarga con formato
- ✅ Preservación metadata scoring

#### Testing y Documentación
- ✅ Tests unitarios estrategias validación
- ✅ Tests integración motor scoring
- ✅ Benchmarking performance 1000 registros (&lt;2s)
- ✅ README completo con instalación
- ✅ CONTRIBUTING.md con guías colaboración
- ✅ CHANGELOG.md actualizado
- ✅ Comentarios JSDoc funciones principales

### Infraestructura AWS (Validada, No Desplegada)

#### Docker Container Lambda
- ✅ Dockerfile multi-stage con lambgeo base
- ✅ pyproj 3.6.1-3.7.2 compilado correctamente
- ✅ PROJ 9.2.1 con custom SQLite 3.41.0
- ✅ Grid PENR2009.gsb incluido (/opt/share/proj)
- ✅ Validación transformación WGS84→UTM30→ED50
- ✅ Precisión submétrica validada (±50cm)
- ✅ Lambda handler Python funcional
- ✅ ARM64 Graviton2 configurado (20% ahorro)
- ✅ Testing Amazon Linux 2 environment

#### Arquitectura Serverless (Diseñada)
- ✅ Arquitectura AWS Lambda + S3 + CloudFront + API Gateway
- ✅ DynamoDB cache con geohash indexing
- ✅ EventBridge scheduled rules (refresh mensual)
- ✅ Step Functions orchestration 786 municipios
- ✅ CloudWatch monitoring + alarmas
- ✅ SNS notifications equipo técnico
- ✅ ElastiCache Redis caching (85-90% hit rate proyectado)
- ✅ IAM roles least privilege
- ✅ Secrets Manager credentials
- ✅ Cost estimation: €33/año operación estable

---

## 🚧 TAREAS PENDIENTES (Priorizadas)

### 🔴 FASE 1: GEOCODIFICACIÓN POR TIPOLOGÍA (Prioridad CRÍTICA)
**Timeline**: Semanas 1-2 | **Esfuerzo**: 2 dev × 2 sem = 4 dev-weeks  
**ROI Proyectado**: 875% | **Impacto**: +35-45% éxito geocodificación

#### Semana 1: Infraestructuras Sanitarias
**Objetivos**: Implementar geocodificación especializada para 1,500 centros salud Andalucía

##### Día 1-2: Clasificador Tipológico
- [ ] **feat**: Regex patterns 12 categorías PTEL
- [ ] **feat**: Función `classifyInfrastructure(name: string): InfraType`
- [ ] **feat**: Fallback a categoría "GENERIC" si no match
- [ ] **test**: Suite tests con 50 nombres reales por categoría

##### Día 3-4: WFS SICESS/SAS Sanitarios
- [ ] **feat**: Cliente WFS para servicios IECA
- [ ] **feat**: Clase `WFSHealthGeocoder implements Geocoder`
- [ ] **feat**: Query GetFeature con filtro bounding box municipal
- [ ] **feat**: Parse GML response y extracción coordenadas
- [ ] **feat**: Fuzzy matching nombres con Fuse.js (threshold 0.3)
- [ ] **feat**: Scoring calidad match (nombre exacto: 100, fuzzy 0.3: 70)
- [ ] **perf**: Cache resultados WFS en IndexedDB (TTL 90 días)
- [ ] **test**: Validación 30+ centros salud reales Granada/Almería

##### Día 5: Testing e Integración
- [ ] **test**: Suite end-to-end con CSV real municipio piloto
- [ ] **test**: Validación precisión ±2-10m vs CartoCiudad
- [ ] **feat**: Integración en pipeline principal
- [ ] **feat**: Métricas Telemetry: tasa éxito por tipología
- [ ] **docs**: Documentación API WFS SICESS/SAS

#### Semana 2: Resto Tipologías Críticas
**Objetivos**: Extender geocodificación especializada a educación, policía, cultura, religión

##### Día 1-2: Educación (3,800 centros)
- [ ] **feat**: Clase `WFSEducationGeocoder`
- [ ] **feat**: Integración WFS Consejería Educación
- [ ] **feat**: Parsers específicos nomenclatura educativa
- [ ] **feat**: Fuzzy matching con variantes nombres
- [ ] **test**: Validación 50 centros educativos provincias

##### Día 3: Policía y Bomberos (200+ instalaciones)
- [ ] **feat**: Clase `ISEPoliceGeocoder`
- [ ] **feat**: WFS ISE Infraestructuras Seguridad
- [ ] **feat**: Parser nomenclatura seguridad
- [ ] **test**: Validación instalaciones seguridad

##### Día 4: Cultura (7,000+ sitios)
- [ ] **feat**: Clase `IAPHCulturalGeocoder`
- [ ] **feat**: API IAPH Patrimonio Cultural
- [ ] **feat**: Query por municipio + tipología
- [ ] **feat**: Fuzzy matching patrimonio
- [ ] **test**: Validación 40 sitios culturales

##### Día 5: Religión OSM (1,500+ lugares)
- [ ] **feat**: Clase `OSMReligiousGeocoder`
- [ ] **feat**: Overpass API query lugares culto
- [ ] **feat**: Rate limiting 1 req/sec OSM
- [ ] **feat**: Filtro por religión
- [ ] **test**: Validación lugares culto Andalucía

**Entregables Semana 2**:
- ✅ 5 geocodificadores tipológicos producción
- ✅ Pipeline cascada integrado
- ✅ +35-45% mejora global éxito geocodificación
- ✅ Cobertura 4 tipologías principales (70% infraestructuras)

### 🟡 FASE 2: CACHE Y CASCADA OPTIMIZADA (Prioridad ALTA)
**Timeline**: Semanas 3-4 | **Esfuerzo**: 2 dev × 2 sem = 4 dev-weeks  
**ROI Proyectado**: 650% | **Impacto**: +20-30% rendimiento

#### Semana 3: Sistema de Cache Multinivel

##### Día 1-2: LocalStorage Cache
- [ ] **feat**: Clase `GeoCache` con localStorage backend
- [ ] **feat**: Hash key: `${name}_${municipio}_${tipo}`
- [ ] **feat**: Límite tamaño 5-10MB (quota localStorage)
- [ ] **feat**: Política eviction: LRU (Least Recently Used)
- [ ] **feat**: Métodos: `get()`, `set()`, `invalidate()`, `clear()`
- [ ] **perf**: Serialización JSON optimizada

##### Día 3-4: IndexedDB Cache (Datasets Grandes)
- [ ] **feat**: Clase `IndexedDBCache` con Dexie.js
- [ ] **feat**: Schema DB con Dexie
- [ ] **feat**: Capacidad 50-100MB por municipio
- [ ] **feat**: Query by municipio para batch processing
- [ ] **feat**: Compression LZ-string antes almacenar
- [ ] **feat**: Background sync con service worker (opcional)
- [ ] **perf**: Indexación optimizada por municipio + tipo

##### Día 5: Integración y Validación
- [ ] **feat**: Facade `CacheManager` decide localStorage vs IndexedDB
- [ ] **feat**: Hit rate metrics
- [ ] **feat**: Invalidación cache por cambios schema
- [ ] **test**: Testing hit rate &gt;70% con datos reales
- [ ] **test**: Performance benchmark: cache hit &lt;10ms
- [ ] **docs**: Documentación políticas cache

#### Semana 4: Cascada de Geocodificación Inteligente

##### Día 1-2: Orchestrator Cascada
- [ ] **feat**: Clase `CascadeOrchestrator`
- [ ] **feat**: 6 niveles fallback configurables (L0-L5)
- [ ] **feat**: Early exit en primer éxito con confianza &gt;70
- [ ] **feat**: Agregación resultados múltiples fuentes
- [ ] **feat**: Scoring agregado multi-fuente

##### Día 3: Retry Logic y Circuit Breaker
- [ ] **feat**: Exponential backoff para APIs rate-limited
- [ ] **feat**: Circuit breaker pattern por API
- [ ] **feat**: Failover automático a siguiente nivel
- [ ] **feat**: Métricas circuit breaker

##### Día 4-5: Testing e Integración
- [ ] **test**: Suite end-to-end con 100 direcciones variadas
- [ ] **test**: Simulación fallo API
- [ ] **test**: Validación rate limiting OSM
- [ ] **test**: Performance: 100 geocodificaciones &lt;30s
- [ ] **feat**: Integración completa en pipeline
- [ ] **feat**: Dashboard métricas cascada
- [ ] **docs**: Diagrama flujo cascada + runbook ops

### 🟢 FASE 3: VISOR CARTOGRÁFICO INTEGRADO (Prioridad MEDIA)
**Timeline**: Semanas 5-8 | **Esfuerzo**: 1.5 dev × 4 sem = 6 dev-weeks  
**ROI Proyectado**: 320% | **Impacto**: Corrección manual profesional

#### Semana 5: Fundamentos Mapa
- Integración react-leaflet
- Setup Leaflet CSS + assets
- Configuración EPSG:25830 con Proj4Leaflet
- Mapas base WMS (Ortofoto Andalucía, PNOA-MA, OSM)
- Control capas usuario

#### Semana 6: Visualización Puntos
- Renderizado marcadores por tipología
- MarkerCluster para performance
- Sincronización tabla-mapa bidireccional
- Popup contextual en marcador

#### Semana 7: Corrección Manual
- Modo edición click-to-set
- Drag-and-drop marcadores
- Geocodificación inversa CartoCiudad
- Controles edición (confirmar/skip/siguiente)

#### Semana 8: Exportación y Pulido
- Exportación GeoJSON/CSV/KML/QGIS
- Persistencia y recovery sesión
- Filtros avanzados
- Dashboard estadísticas
- Manual usuario

### 🟣 FASE 4: DESPLIEGUE AWS SERVERLESS (Prioridad BAJA)
**Timeline**: Semanas 9-14 | **Esfuerzo**: 2 dev × 6 sem = 12 dev-weeks  
**ROI Proyectado**: 280% | **Impacto**: Escalabilidad 786 municipios

- Setup cuenta AWS + IAM
- Lambda + ECR deployment
- DynamoDB cache
- Step Functions orchestration 786 municipios
- CloudWatch + X-Ray monitorización
- Security hardening ENS

---

## 📊 MATRIZ DE PRIORIDADES

| Fase | Prioridad | ROI | Esfuerzo | Timeline | Dependencias |
|------|-----------|-----|----------|----------|--------------|
| Fase 1: Geocodificación Tipológica | 🔴 CRÍTICA | 875% | 4 dev-weeks | Sem 1-2 | Ninguna |
| Fase 2: Cache y Cascada | 🟡 ALTA | 650% | 4 dev-weeks | Sem 3-4 | Fase 1 |
| Fase 3: Visor Cartográfico | 🟢 MEDIA | 320% | 6 dev-weeks | Sem 5-8 | Fase 2 |
| Fase 4: AWS Serverless | 🟣 BAJA | 280% | 12 dev-weeks | Sem 9-14 | Fase 3 |

---

## 📈 MÉTRICAS DE ÉXITO

### Métricas Técnicas

| Métrica | Baseline | Objetivo F1 | Objetivo F2 | Objetivo F3 | Final |
|---------|----------|-------------|-------------|-------------|-------|
| Completitud coords | 26.9% | 50-60% | 70-80% | 85-90% | **95-100%** |
| Éxito geocodificación | 55-70% | 75-85% | 85-92% | 90-95% | **95-100%** |
| Precisión media | ±100-500m | ±10-50m | ±5-25m | ±2-15m | **±2-25m** |
| Cache hit rate | N/A | N/A | 70-80% | 80-85% | **85-90%** |
| Latencia p95 | N/A | N/A | &lt;1s | &lt;800ms | **&lt;500ms** |

---

## 💰 PRESUPUESTO Y COSTES

### Inversión Desarrollo

| Fase | Esfuerzo | Coste (€50/h) | Timeline |
|------|----------|---------------|----------|
| Fase 1 | 4 dev-weeks | €8,000 | Sem 1-2 |
| Fase 2 | 4 dev-weeks | €8,000 | Sem 3-4 |
| Fase 3 | 6 dev-weeks | €12,000 | Sem 5-8 |
| Fase 4 | 12 dev-weeks | €24,000 | Sem 9-14 |
| **TOTAL** | **26 dev-weeks** | **€52,000** | **14 semanas** |

### Costes Operacionales (Mensuales)

#### Escenario MVP Browser-Only (Fase 1-3)
```
GitHub Pages hosting: €0
GitHub Actions CI/CD: €0 (2000 min/mes free tier)
APIs geocodificación: €0 (todas gratuitas)
Dominio custom (opcional): €1/mes
----------------------------------------
TOTAL: €0-1/mes
```

#### Escenario AWS Serverless (Fase 4)
```
Lambda + DynamoDB + S3 + CloudFront + CloudWatch: €30-45/mes
```

### ROI Proyectado

- **Inversión total**: €52,000 (desarrollo) + €360/año (ops AWS) = €52,360
- **Beneficio anual**: €642,015
- **ROI Año 1**: 1,126% 🚀
- **Payback period**: 29 días

---

## 🛠️ STACK TECNOLÓGICO FINAL

### Frontend
- React 18.3.1 + TypeScript 5.6 + Vite 5.4
- shadcn/ui + Tailwind CSS 3.4
- Leaflet 1.9.4 + react-leaflet + Proj4Leaflet
- Zustand, Recharts, Framer Motion
- IndexedDB (Dexie.js) + localStorage
- Vitest + React Testing Library

### Backend AWS (Opcional)
- AWS Lambda ARM64 Graviton2
- Python 3.11/3.12, pyproj 3.7.2, PROJ 9.4
- S3 + DynamoDB + ElastiCache Redis
- Step Functions, CloudWatch + X-Ray

### APIs Externas
- CartoCiudad IGN (primary, gratuita, ilimitada)
- CDAU Andalucía (gratuita, regional)
- SICESS/SAS sanitarios (gratuita, WFS)
- ISE seguridad (gratuita, API REST)
- IAPH patrimonio (gratuita, API REST)
- Nominatim OSM (gratuita, 1 req/s)

---

## ✅ CRITERIOS DE ACEPTACIÓN GLOBAL

### Sistema Listo Para Producción Cuando:

#### Funcionalidad
- ✅ Procesa 8 formatos archivo correctamente
- ✅ Normaliza UTF-8 con 27+ patrones
- ✅ Valida con 8 estrategias defensivas
- ✅ Geocodifica por tipología (4+ categorías)
- ✅ Sistema cache hit rate &gt;70%
- ✅ Visor mapa con corrección manual
- ✅ Exporta GeoJSON/CSV/KML

#### Calidad
- ✅ Éxito geocodificación &gt;95%
- ✅ Precisión ±2-25m según tipología
- ✅ Tests automatizados &gt;85% cobertura
- ✅ Zero bugs críticos en producción

#### Usabilidad
- ✅ Workflow wizard intuitivo (3 pasos)
- ✅ Corrección manual &lt;30s por punto
- ✅ Documentación usuario completa

#### Operaciones
- ✅ Coste operacional &lt;€50/mes
- ✅ CI/CD pipeline funcional

---

**FIN DEL PLAN MAESTRO**

**Última actualización**: 21 Noviembre 2025  
**Versión**: 1.0  
**Estado**: APROBADO PARA EJECUCIÓN