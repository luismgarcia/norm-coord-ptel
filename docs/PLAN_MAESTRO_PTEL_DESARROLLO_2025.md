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
| Coste operacional | €0/mes | menos de €50/mes | Cumple |

---

## 📊 MATRIZ DE PRIORIDADES

| Fase | Prioridad | ROI | Esfuerzo | Timeline | Dependencias |
|------|-----------|-----|----------|----------|--------------|
| Fase 1: Geocodificación Tipológica | CRÍTICA | 875% | 4 dev-weeks | Sem 1-2 | Ninguna |
| Fase 2: Cache y Cascada | ALTA | 650% | 4 dev-weeks | Sem 3-4 | Fase 1 |
| Fase 3: Visor Cartográfico | MEDIA | 320% | 6 dev-weeks | Sem 5-8 | Fase 2 |
| Fase 4: AWS Serverless | BAJA | 280% | 12 dev-weeks | Sem 9-14 | Fase 3 |

---

## ✅ TAREAS COMPLETADAS (v0.4.0)

### Fase 0: Fundación (100% Completo)

#### Infraestructura Base
- Setup React 18 + TypeScript + Vite con strict mode
- Configuración Tailwind CSS + shadcn/ui components
- Sistema routing wizard 3 pasos (Upload → Process → View)
- State management con Zustand
- Despliegue GitHub Pages con CD automático
- ESLint + Prettier configurados

#### Paso 1: Upload de Archivos
- Componente drag-and-drop multi-archivo (hasta 10 simultáneos)
- Soporte CSV, XLSX, ODS, ODT, DBF, GeoJSON, KML/KMZ
- Validación tamaño archivo (menos de 50MB)
- Preview primeras 5 filas con detección encoding
- Mapeo inteligente columnas (auto-detecta X/Y, lat/lon)

#### Sistema de Normalización UTF-8
- 27 patrones de corrección caracteres corrompidos
- Mapeo Ã→ñ, Ã©→é, Ã¡→á (y 24 patrones más)
- Detección y corrección coordenadas truncadas (Y sin "4" inicial)
- Auto-recuperación ~10-15% registros truncados

#### Sistema de Validación Defensiva (8 Estrategias)
- Estrategia #1: Validación formato sintáctico
- Estrategia #2: Validación rangos UTM30 Andalucía
- Estrategia #3: Detección caracteres especiales
- Estrategia #4: Validación decimales y precisión
- Estrategia #5: Validación longitud dígitos
- Estrategia #6: Coherencia espacial (distancia centroide menos de 20km)
- Estrategia #7: Validación vecindad (clustering)
- Estrategia #8: Auto-detección CRS (WGS84/ETRS89/ED50)

#### Scoring y Clasificación
- Sistema scoring 0-100 puntos multi-dimensional
- 5 niveles confianza: CRÍTICA/BAJA/MEDIA/ALTA/CONFIRMADO
- 4 recomendaciones: REJECT/MANUAL_REVIEW/ACCEPT_FLAG/ACCEPT

---

## 🚧 FASE 1: GEOCODIFICACIÓN POR TIPOLOGÍA (Prioridad CRÍTICA)

**Timeline**: Semanas 1-2 | **Esfuerzo**: 4 dev-weeks  
**ROI Proyectado**: 875% | **Impacto**: +35-45% éxito geocodificación

### Semana 1: Infraestructuras Sanitarias

#### Clasificador Tipológico
- Regex patterns 12 categorías PTEL
  - Sanitario: /hospital|centro.salud|consultorio|ambulatorio/i
  - Educativo: /colegio|instituto|escuela|guardería/i
  - Policial: /policía|cuartel|comisaría|guardia.civil/i
  - Bomberos: /parque.bomberos|bomberos/i
  - Cultural: /museo|biblioteca|centro.cultural|teatro/i
  - Religioso: /iglesia|ermita|parroquia|convento/i
  - Deportivo: /polideportivo|pabellón|campo.fútbol/i
  - Municipal: /ayuntamiento|oficina.municipal/i

#### WFS SICESS/SAS Sanitarios
- Cliente WFS para servicios IECA
- Clase WFSHealthGeocoder implements Geocoder
- Query GetFeature con filtro bounding box municipal
- Parse GML response y extracción coordenadas
- Fuzzy matching nombres con Fuse.js (threshold 0.3)
- Cache resultados WFS en IndexedDB (TTL 90 días)

### Semana 2: Resto Tipologías Críticas

#### Educación (3,800 centros)
- Clase WFSEducationGeocoder
- Integración WFS Consejería Educación
- Parsers específicos nomenclatura educativa (CEIP, IES, CPR)

#### Policía y Bomberos (200+ instalaciones)
- Clase ISEPoliceGeocoder
- WFS ISE Infraestructuras Seguridad

#### Cultura (7,000+ sitios)
- Clase IAPHCulturalGeocoder
- API IAPH Patrimonio Cultural

---

## 🟡 FASE 2: CACHE Y CASCADA OPTIMIZADA (Prioridad ALTA)

**Timeline**: Semanas 3-4 | **Esfuerzo**: 4 dev-weeks  
**ROI Proyectado**: 650% | **Impacto**: +20-30% rendimiento

### Sistema de Cache Multinivel

#### LocalStorage Cache
- Clase GeoCache con localStorage backend
- Hash key: nombre_municipio_tipo
- Límite tamaño 5-10MB
- Política eviction: LRU

#### IndexedDB Cache (Datasets Grandes)
- Clase IndexedDBCache con Dexie.js
- Capacidad 50-100MB por municipio
- Compression LZ-string

### Cascada de Geocodificación Inteligente

#### Orchestrator Cascada 6 niveles
- Level 0: Cache local (localStorage/IndexedDB)
- Level 1: Geocodificación tipológica (WFS especializado)
- Level 2: CartoCiudad IGN (dirección postal)
- Level 3: CDAU Andalucía (normalización regional)
- Level 4: IDEE Geolocalizador (fallback nacional)
- Level 5: Nominatim OSM (último recurso, rate limit 1/s)

#### Circuit Breaker Pattern
- Threshold: 50% error rate en 10 requests
- Open circuit: skip API 60 segundos
- Exponential backoff para APIs rate-limited

---

## 🟢 FASE 3: VISOR CARTOGRÁFICO INTEGRADO (Prioridad MEDIA)

**Timeline**: Semanas 5-8 | **Esfuerzo**: 6 dev-weeks  
**ROI Proyectado**: 320% | **Impacto**: Corrección manual profesional

### Fundamentos Mapa
- Integración react-leaflet + Proj4Leaflet
- Configuración EPSG:25830
- Mapas base WMS (Ortofoto Andalucía, PNOA-MA, OSM)
- Overlay CDAU Callejero

### Visualización Puntos
- MarkerCluster para performance más de 100 puntos
- Iconografía por tipología (Sanitario, Educativo, Policial, etc.)
- Sincronización tabla-mapa bidireccional

### Corrección Manual
- Click-to-set ubicación
- Drag-and-drop marcadores
- Geocodificación inversa CartoCiudad

### Exportación Avanzada
- GeoJSON con metadata completa
- CSV extendido con scoring
- KML para Google Earth

---

## 🟣 FASE 4: DESPLIEGUE AWS SERVERLESS (Prioridad BAJA)

**Timeline**: Semanas 9-14 | **Esfuerzo**: 12 dev-weeks  
**ROI Proyectado**: 280% | **Impacto**: Escalabilidad 786 municipios

### Infraestructura AWS
- Lambda + ECR (ARM64 Graviton2)
- DynamoDB Cache con geohash indexing
- Step Functions para orchestration 786 municipios
- CloudWatch + X-Ray monitoring

### Costes Operacionales Proyectados
- Lambda + DynamoDB + S3: ~€30/mes
- Con ElastiCache Redis: ~€45/mes

---

## 💰 PRESUPUESTO Y ROI

### Inversión Desarrollo
| Fase | Esfuerzo | Coste estimado |
|------|----------|----------------|
| Fase 1 | 4 dev-weeks | €8,000 |
| Fase 2 | 4 dev-weeks | €8,000 |
| Fase 3 | 6 dev-weeks | €12,000 |
| Fase 4 | 12 dev-weeks | €24,000 |
| **TOTAL** | **26 dev-weeks** | **€52,000** |

### Beneficios Cuantificables
- Ahorro tiempo: 786 municipios × 3h × €40/h = €94,320/año
- Reducción errores QA: €4,000/año
- Valor geocodificación: €544,695

### ROI
- **Inversión**: €52,360
- **Beneficio anual**: €642,015
- **ROI Año 1**: 1,126%
- **Payback**: 29 días

---

## ✅ CRITERIOS DE ACEPTACIÓN

### Funcionalidad
- Procesa 8 formatos archivo correctamente
- Normaliza UTF-8 con 27+ patrones
- Valida con 8 estrategias defensivas
- Geocodifica por tipología (4+ categorías)
- Sistema cache hit rate más de 70%
- Visor mapa con corrección manual
- Exporta GeoJSON/CSV/KML

### Calidad
- Éxito geocodificación más de 95%
- Precisión ±2-25m según tipología
- Tests automatizados más de 85% cobertura
- Zero bugs críticos en producción

### Usabilidad
- Workflow wizard intuitivo (3 pasos)
- Corrección manual menos de 30s por punto
- Documentación usuario completa

---

**Última actualización**: 21 Noviembre 2025  
**Versión**: 1.0  
**Estado**: APROBADO PARA EJECUCIÓN
