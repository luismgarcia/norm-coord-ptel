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
- ✅ **Estrategia #6**: Coherencia espacial (distancia centroide <20km)
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
- ✅ Benchmarking performance 1000 registros (<2s)
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
  ```typescript
  - Sanitario: /hospital|centro.salud|consultorio|ambulatorio/i
  - Educativo: /colegio|instituto|escuela|guardería/i
  - Policial: /policía|cuartel|comisaría|guardia.civil/i
  - Bomberos: /parque.bomberos|bomberos/i
  - Cultural: /museo|biblioteca|centro.cultural|teatro/i
  - Religioso: /iglesia|ermita|parroquia|convento/i
  - Deportivo: /polideportivo|pabellón|campo.fútbol/i
  - Municipal: /ayuntamiento|oficina.municipal/i
  ```
- [ ] **feat**: Función `classifyInfrastructure(name: string): InfraType`
- [ ] **feat**: Fallback a categoría "GENERIC" si no match
- [ ] **test**: Suite tests con 50 nombres reales por categoría

##### Día 3-4: WFS SICESS/SAS Sanitarios
- [ ] **feat**: Cliente WFS para servicios IECA
  ```typescript
  const WFS_SICESS_ENDPOINT = 'https://www.ideandalucia.es/wfs-avanza/services?'
  const WFS_SAS_ENDPOINT = 'https://www.juntadeandalucia.es/institutodeestadisticaycartografia/...'
  ```
- [ ] **feat**: Clase `WFSHealthGeocoder implements Geocoder`
- [ ] **feat**: Query GetFeature con filtro bounding box municipal
- [ ] **feat**: Parse GML response y extracción coordenadas
- [ ] **feat**: Fuzzy matching nombres con Fuse.js (threshold 0.3)
  ```typescript
  const fuse = new Fuse(wfsResults, {
    keys: ['name', 'alias'],
    threshold: 0.3,
    includeScore: true
  });
  ```
- [ ] **feat**: Scoring calidad match (nombre exacto: 100, fuzzy 0.3: 70)
- [ ] **perf**: Cache resultados WFS en IndexedDB (TTL 90 días)
- [ ] **test**: Validación 30+ centros salud reales Granada/Almería

##### Día 5: Testing e Integración
- [ ] **test**: Suite end-to-end con CSV real municipio piloto
- [ ] **test**: Validación precisión ±2-10m vs CartoCiudad
- [ ] **feat**: Integración en pipeline principal
- [ ] **feat**: Métricas Telemetry: tasa éxito por tipología
- [ ] **docs**: Documentación API WFS SICESS/SAS

**Entregables Semana 1**:
- ✅ Clasificador tipológico producción-ready
- ✅ Geocodificación sanitarios funcional
- ✅ +20-30% mejora en éxito geocodificación infraestructuras salud
- ✅ Tests automatizados con 95% cobertura

#### Semana 2: Resto Tipologías Críticas
**Objetivos**: Extender geocodificación especializada a educación, policía, cultura, religión

##### Día 1-2: Educación (3,800 centros)
- [ ] **feat**: Clase `WFSEducationGeocoder`
- [ ] **feat**: Integración WFS Consejería Educación
  - Centros educativos públicos: ~2,500
  - Centros concertados/privados: ~1,300
- [ ] **feat**: Parsers específicos nomenclatura educativa
  - "CEIP" → Centro Educación Infantil y Primaria
  - "IES" → Instituto Educación Secundaria
  - "CPR" → Colegio Público Rural
- [ ] **feat**: Fuzzy matching con variantes nombres
- [ ] **test**: Validación 50 centros educativos provincias

##### Día 3: Policía y Bomberos (200+ instalaciones)
- [ ] **feat**: Clase `ISEPoliceGeocoder`
- [ ] **feat**: WFS ISE Infraestructuras Seguridad
  - Comisarías Policía Nacional: ~40
  - Cuarteles Guardia Civil: ~120
  - Parques Bomberos: ~50
- [ ] **feat**: Parser nomenclatura seguridad
- [ ] **test**: Validación instalaciones seguridad

##### Día 4: Cultura (7,000+ sitios)
- [ ] **feat**: Clase `IAPHCulturalGeocoder`
- [ ] **feat**: API IAPH Patrimonio Cultural
  ```typescript
  const IAPH_API = 'https://guiadigital.iaph.es/api/inmuebles'
  ```
- [ ] **feat**: Query por municipio + tipología
  - Museos: ~300
  - Bibliotecas: ~800
  - Centros culturales: ~600
  - Patrimonio histórico: ~5,300
- [ ] **feat**: Fuzzy matching patrimonio
- [ ] **test**: Validación 40 sitios culturales

##### Día 5: Religión OSM (1,500+ lugares)
- [ ] **feat**: Clase `OSMReligiousGeocoder`
- [ ] **feat**: Overpass API query lugares culto
  ```
  [out:json][bbox:{{municipioBBOX}}];
  (
    node["amenity"="place_of_worship"];
    way["amenity"="place_of_worship"];
  );
  out geom;
  ```
- [ ] **feat**: Rate limiting 1 req/sec OSM
- [ ] **feat**: Filtro por religión (católica, protestante, islámica)
- [ ] **test**: Validación lugares culto Andalucía

**Entregables Semana 2**:
- ✅ 5 geocodificadores tipológicos producción
- ✅ Pipeline cascada integrado
- ✅ +35-45% mejora global éxito geocodificación
- ✅ Cobertura 4 tipologías principales (70% infraestructuras)
- ✅ Documentación completa APIs especializadas

### 🟡 FASE 2: CACHE Y CASCADA OPTIMIZADA (Prioridad ALTA)
**Timeline**: Semanas 3-4 | **Esfuerzo**: 2 dev × 2 sem = 4 dev-weeks  
**ROI Proyectado**: 650% | **Impacto**: +20-30% rendimiento

#### Semana 3: Sistema de Cache Multinivel

##### Día 1-2: LocalStorage Cache
- [ ] **feat**: Clase `GeoCache` con localStorage backend
- [ ] **feat**: Hash key: `${name}_${municipio}_${tipo}`
  ```typescript
  interface CacheEntry {
    key: string;
    coordinates: [number, number];
    crs: 'EPSG:25830';
    source: string;
    confidence: number;
    timestamp: number;
    ttl: number; // 90 días default
  }
  ```
- [ ] **feat**: Límite tamaño 5-10MB (quota localStorage)
- [ ] **feat**: Política eviction: LRU (Least Recently Used)
- [ ] **feat**: Métodos: `get()`, `set()`, `invalidate()`, `clear()`
- [ ] **perf**: Serialización JSON optimizada

##### Día 3-4: IndexedDB Cache (Datasets Grandes)
- [ ] **feat**: Clase `IndexedDBCache` con Dexie.js
- [ ] **feat**: Schema DB:
  ```typescript
  const db = new Dexie('PTELGeocache');
  db.version(1).stores({
    geocodes: '&key, municipio, tipo, timestamp',
    metadata: 'version, lastUpdate, size'
  });
  ```
- [ ] **feat**: Capacidad 50-100MB por municipio
- [ ] **feat**: Query by municipio para batch processing
- [ ] **feat**: Compression LZ-string antes almacenar
- [ ] **feat**: Background sync con service worker (opcional)
- [ ] **perf**: Indexación optimizada por municipio + tipo

##### Día 5: Integración y Validación
- [ ] **feat**: Facade `CacheManager` decide localStorage vs IndexedDB
  ```typescript
  if (datasetSize < 5MB) → localStorage
  else → IndexedDB
  ```
- [ ] **feat**: Hit rate metrics a CloudWatch
- [ ] **feat**: Invalidación cache por cambios schema
- [ ] **test**: Testing hit rate >70% con datos reales
- [ ] **test**: Performance benchmark: cache hit <10ms
- [ ] **docs**: Documentación políticas cache

**Entregables Semana 3**:
- ✅ Sistema cache multinivel producción
- ✅ Hit rate 70-85% proyectado
- ✅ Reducción 70-85% peticiones APIs externas
- ✅ Mejora latencia 80-90% en warm cache

#### Semana 4: Cascada de Geocodificación Inteligente

##### Día 1-2: Orchestrator Cascada
- [ ] **feat**: Clase `CascadeOrchestrator`
- [ ] **feat**: 6 niveles fallback configurables
  ```typescript
  Level 0: Cache local (localStorage/IndexedDB)
  Level 1: Geocodificación tipológica (WFS especializado)
  Level 2: CartoCiudad IGN (dirección postal)
  Level 3: CDAU Andalucía (normalización regional)
  Level 4: IDEE Geolocalizador (fallback nacional)
  Level 5: Nominatim OSM (último recurso, rate limit 1/s)
  ```
- [ ] **feat**: Early exit en primer éxito con confianza >70
- [ ] **feat**: Agregación resultados múltiples fuentes
  - Si 2+ fuentes coinciden ±50m → ALTA confianza
  - Si discrepancia >50m → marcar MANUAL_REVIEW
- [ ] **feat**: Scoring agregado multi-fuente

##### Día 3: Retry Logic y Circuit Breaker
- [ ] **feat**: Exponential backoff para APIs rate-limited
  ```typescript
  retry_delays = [1s, 2s, 4s, 8s, 16s]
  max_retries = 5
  ```
- [ ] **feat**: Circuit breaker pattern por API
  - Threshold: 50% error rate en 10 requests
  - Open circuit: skip API 60 segundos
  - Half-open: test 1 request antes re-enable
- [ ] **feat**: Failover automático a siguiente nivel
- [ ] **feat**: Métricas circuit breaker a CloudWatch

##### Día 4-5: Testing e Integración
- [ ] **test**: Suite end-to-end con 100 direcciones variadas
- [ ] **test**: Simulación fallo API (CartoCiudad down)
- [ ] **test**: Validación rate limiting OSM (1 req/s)
- [ ] **test**: Performance: 100 geocodificaciones <30s
- [ ] **feat**: Integración completa en pipeline
- [ ] **feat**: Dashboard métricas cascada
  - Tasa éxito por nivel
  - Latencia media por fuente
  - Hit rate cache
- [ ] **docs**: Diagrama flujo cascada + runbook ops

**Entregables Semana 4**:
- ✅ Sistema cascada 6 niveles producción
- ✅ Retry logic + circuit breaker robusto
- ✅ +20-30% mejora éxito vs single-source
- ✅ Resiliencia ante fallo APIs individuales
- ✅ Dashboard monitorización tiempo real

### 🟢 FASE 3: VISOR CARTOGRÁFICO INTEGRADO (Prioridad MEDIA)
**Timeline**: Semanas 5-8 | **Esfuerzo**: 1.5 dev × 4 sem = 6 dev-weeks  
**ROI Proyectado**: 320% | **Impacto**: Corrección manual profesional

#### Semana 5: Fundamentos Mapa

##### Día 1-2: Integración react-leaflet
- [ ] **feat**: Instalación dependencias
  ```bash
  npm install leaflet@1.9.4 react-leaflet@4.2.1 
  npm install proj4@2.9.0 proj4leaflet@1.0.1
  npm install leaflet.markercluster@1.5.3
  ```
- [ ] **feat**: Setup Leaflet CSS + assets
- [ ] **feat**: Componente `<MapView>` en Step3
- [ ] **feat**: Configuración EPSG:25830 con Proj4Leaflet
  ```typescript
  const crs = new L.Proj.CRS('EPSG:25830',
    '+proj=utm +zone=30 +ellps=GRS80 +units=m +no_defs',
    {
      resolutions: [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1, 0.5],
      origin: [0, 6000000]
    }
  );
  ```
- [ ] **feat**: Mapas base WMS
  - Ortofoto Andalucía 2022 (default)
  - PNOA-MA actualidad
  - OpenStreetMap (fallback)
- [ ] **test**: Testing multi-navegador (Chrome, Firefox, Safari, Edge)

##### Día 3-4: Capas Overlay Españolas
- [ ] **feat**: WMS CDAU Callejero Andalucía
  ```typescript
  const cdauLayer = L.tileLayer.wms(
    'https://www.ideandalucia.es/services/CDAU_wms/...',
    { layers: 'CDAU:callejero', transparent: true }
  );
  ```
- [ ] **feat**: WMS límites municipales
- [ ] **feat**: WMS red viaria
- [ ] **feat**: Control capas (L.control.layers)
  - Radio buttons: mapas base
  - Checkboxes: overlays
- [ ] **feat**: Alternancia usuario sin recargar

##### Día 5: Testing y Optimización
- [ ] **test**: Validación proyección correcta (comparar Google Maps)
- [ ] **test**: Performance carga capas WMS (<2s)
- [ ] **test**: Responsivo móvil (touch gestures)
- [ ] **docs**: Documentación capas disponibles
- [ ] **perf**: Lazy loading mapas (solo cargar en Step3)

**Entregable Semana 5**:
- ✅ Mapa funcional con proyección correcta
- ✅ Capas base oficiales españolas
- ✅ Overlay callejero CDAU
- ✅ Control alternancia capas usuario

#### Semana 6: Visualización Puntos

##### Día 1-2: Renderizado Marcadores
- [ ] **feat**: Carga datos desde Zustand store
- [ ] **feat**: Componente `<InfrastructureMarkers>`
- [ ] **feat**: MarkerCluster para performance >100 puntos
  ```typescript
  import MarkerClusterGroup from 'react-leaflet-cluster';
  ```
- [ ] **feat**: Iconografía por tipología
  - Sanitario: 🏥 (rojo)
  - Educativo: 🎓 (azul)
  - Policial: 🚔 (amarillo)
  - Cultural: 🏛️ (verde)
  - Religioso: ⛪ (morado)
- [ ] **feat**: Tamaño marcador por confianza
  - ALTA: 24px
  - MEDIA: 20px
  - BAJA: 16px
  - CRÍTICA: 12px + pulsating animation
- [ ] **perf**: Virtualization >1000 marcadores

##### Día 3-4: Sincronización Tabla-Mapa
- [ ] **feat**: Click fila tabla → highlight marcador
- [ ] **feat**: Click marcador → highlight fila tabla
- [ ] **feat**: Zoom automático a marcador seleccionado
- [ ] **feat**: Scroll tabla a fila seleccionada
- [ ] **feat**: Popup contextual en marcador
  ```typescript
  interface PopupContent {
    nombre: string;
    tipologia: string;
    coordenadasOriginales: string;
    coordenadasNormalizadas: string;
    score: number;
    confianza: string;
    estrategiaUsada: string;
    distanciaCentroide: string;
  }
  ```
- [ ] **feat**: Colores marcadores por confianza
  - ALTA: verde (#10b981)
  - MEDIA: amarillo (#f59e0b)
  - BAJA: naranja (#f97316)
  - CRÍTICA: rojo (#ef4444)

##### Día 5: Testing y Polish
- [ ] **test**: Performance 1000 puntos (<500ms render)
- [ ] **test**: Clustering correcto en zooms
- [ ] **test**: Sincronización tabla-mapa bidireccional
- [ ] **feat**: Loading states durante renderizado
- [ ] **feat**: Empty state (sin coordenadas válidas)

**Entregable Semana 6**:
- ✅ Visualización completa coordenadas
- ✅ Clustering performance >100 puntos
- ✅ Sincronización tabla-mapa bidireccional
- ✅ Feedback visual scoring integrado

#### Semana 7: Corrección Manual

##### Día 1-2: Click-to-Set
- [ ] **feat**: Modo edición activable por botón
- [ ] **feat**: Workflow:
  1. Seleccionar punto problemático en tabla
  2. Click "Corregir ubicación"
  3. Click en mapa → nueva ubicación
  4. Confirmar/Cancelar
- [ ] **feat**: Marcador dual (original + nuevo)
- [ ] **feat**: Línea punteada conexión + etiqueta distancia
- [ ] **feat**: Validación rangos válidos UTM30

##### Día 3: Drag-and-Drop
- [ ] **feat**: Marcadores draggable en modo edición
  ```typescript
  <Marker
    draggable={isEditMode}
    eventHandlers={{
      dragend: (e) => handleMarkerDrag(e.target.getLatLng())
    }}
  />
  ```
- [ ] **feat**: Snap-to-road opcional (CartoCiudad)
- [ ] **feat**: Validación distancia máxima (>5km warning)

##### Día 4: Geocodificación Inversa
- [ ] **feat**: Click mapa → query CartoCiudad reverse
  ```typescript
  const reverseGeocode = async (lat, lon) => {
    const url = `https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode?lon=${lon}&lat=${lat}`;
    // Returns: { address, municipality, postalCode }
  };
  ```
- [ ] **feat**: Popup con dirección obtenida
- [ ] **feat**: Auto-fill campos dirección si vacíos
- [ ] **feat**: Comparación antes/después
  - Distancia corregida
  - Nueva confianza (recalcular scoring)
  - Nueva dirección

##### Día 5: Controles Edición
- [ ] **feat**: Botones triple acción
  - ✅ Confirmar corrección
  - 🔄 Corregir manualmente
  - ⏭️ Skip (siguiente problemático)
- [ ] **feat**: Shortcuts teclado
  - Enter: Confirmar
  - Esc: Cancelar
  - →: Siguiente
  - ←: Anterior
- [ ] **feat**: Navegación siguiente/anterior/problemático
- [ ] **feat**: Auto-save cada 5 correcciones
- [ ] **test**: Testing flujo completo corrección

**Entregable Semana 7**:
- ✅ Corrección manual completa
- ✅ Click-to-set + drag-and-drop
- ✅ Geocodificación inversa integrada
- ✅ Navegación eficiente casos problemáticos

#### Semana 8: Exportación y Pulido

##### Día 1-2: Exportación Avanzada
- [ ] **feat**: Exportación GeoJSON completa
  ```json
  {
    "type": "FeatureCollection",
    "crs": { "type": "name", "properties": { "name": "EPSG:25830" }},
    "metadata": {
      "generatedBy": "PTEL Coordinate Normalizer v0.5.0",
      "generatedAt": "2025-11-21T10:30:00Z",
      "municipio": "Colomera",
      "totalFeatures": 187,
      "validationStats": { "alta": 156, "media": 23, "baja": 8 }
    },
    "features": [...]
  }
  ```
- [ ] **feat**: Exportación CSV extendida
  - Todas columnas originales
  - Coordenadas normalizadas (X_UTM30, Y_UTM30)
  - Scoring completo
  - Estrategia usada
  - Timestamp corrección manual
- [ ] **feat**: Exportación KML para Google Earth
- [ ] **feat**: Exportación QGIS Project (.qgs)

##### Día 3: Persistencia y Recovery
- [ ] **feat**: Auto-guardado IndexedDB cada 5 modificaciones
- [ ] **feat**: Auto-guardado temporal cada 2 minutos
- [ ] **feat**: Recovery sesión anterior en Step1
  ```typescript
  "¿Continuar con sesión anterior? (187 infraestructuras, 8 pendientes corrección)"
  ```
- [ ] **feat**: Botón guardar manual
- [ ] **feat**: Detección cambios no guardados (beforeunload)

##### Día 4: Filtros y Búsqueda
- [ ] **feat**: Sidebar filtros
  - Por confianza: [ALTA, MEDIA, BAJA, CRÍTICA]
  - Por tipología: [Sanitario, Educativo, ...]
  - Por estado: [Pendiente, Corregido, Confirmado]
  - Por score: [slider 0-100]
- [ ] **feat**: Búsqueda avanzada
  ```
  nombre:hospital AND confianza:BAJA
  tipologia:educativo score:<60
  ```
- [ ] **feat**: Aplicar filtros a mapa + tabla sincronizados
- [ ] **feat**: Contadores dinámicos filtros

##### Día 5: Dashboard y Documentación
- [ ] **feat**: Dashboard estadísticas avanzado
  - Gráfico evolución correcciones (timeline)
  - Mapa calor densidad infraestructuras
  - Distribución scoring (histograma)
  - Tabla top 10 problemas comunes
- [ ] **feat**: Barra progreso general
  ```
  Completitud: 87% (163/187)
  Alta confianza: 83% (156/187)
  Pendientes corrección: 8
  ```
- [ ] **feat**: Ayuda contextual inline
- [ ] **test**: Testing usabilidad 3 técnicos municipales
- [ ] **docs**: Manual usuario con screenshots
- [ ] **docs**: Video tutorial 5 min

**Entregable Semana 8**:
- ✅ Sistema completo producción-ready
- ✅ Exportación multi-formato avanzada
- ✅ Persistencia y recovery robusto
- ✅ Filtros y búsqueda potente
- ✅ Dashboard completo
- ✅ Documentación usuario final

### 🟣 FASE 4: DESPLIEGUE AWS SERVERLESS (Prioridad BAJA)
**Timeline**: Semanas 9-14 | **Esfuerzo**: 2 dev × 6 sem = 12 dev-weeks  
**ROI Proyectado**: 280% | **Impacto**: Escalabilidad 786 municipios

#### Semana 9-10: Infraestructura Base AWS

##### Semana 9: Setup Cuenta y Roles
- [ ] **infra**: Crear cuenta AWS organizacional
- [ ] **infra**: Habilitar regiones EU (eu-west-1 primary, eu-south-2 backup)
- [ ] **infra**: Setup IAM roles/policies least privilege
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:GetObject", "s3:PutObject"],
        "Resource": "arn:aws:s3:::ptel-geocoding-prod/*"
      }
    ]
  }
  ```
- [ ] **infra**: Configurar AWS Organizations + Control Tower
- [ ] **infra**: Billing alerts (€30, €40, €50 thresholds)
- [ ] **infra**: Cost Explorer dashboards

##### Semana 10: Lambda + ECR
- [ ] **infra**: Crear repositorio ECR
  ```bash
  aws ecr create-repository --repository-name ptel-geocoding
  ```
- [ ] **infra**: Build y push imagen Docker
  ```bash
  docker buildx build --platform linux/arm64 -t ptel-geocoding:latest .
  docker tag ptel-geocoding:latest 123456789012.dkr.ecr.eu-west-1.amazonaws.com/ptel-geocoding:latest
  docker push ...
  ```
- [ ] **infra**: Crear función Lambda desde ECR
- [ ] **infra**: Configurar ARM64 Graviton2
- [ ] **infra**: Memory allocation 1536MB (optimal)
- [ ] **infra**: Timeout 60s (transformaciones individuales)
- [ ] **infra**: Environment variables
  ```
  PROJ_LIB=/opt/share/proj
  PENR2009_PATH=/opt/share/proj/PENR2009.gsb
  ```
- [ ] **test**: Invocación test Lambda coordinata individual
- [ ] **test**: Validación precisión ±50cm

#### Semana 11-12: Cache y Orchestration

##### Semana 11: DynamoDB Cache
- [ ] **infra**: Crear tabla DynamoDB
  ```typescript
  {
    TableName: 'ptel-geocode-cache',
    KeySchema: [
      { AttributeName: 'cacheKey', KeyType: 'HASH' }, // ${name}_${municipio}_${tipo}
      { AttributeName: 'timestamp', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'cacheKey', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'N' },
      { AttributeName: 'geohash', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'geohash-index',
        KeySchema: [{ AttributeName: 'geohash', KeyType: 'HASH' }]
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    TimeToLiveSpecification: {
      Enabled: true,
      AttributeName: 'ttl' // 90 días
    }
  }
  ```
- [ ] **feat**: Lambda handler integración DynamoDB
  - Check cache antes transformación
  - Store resultado post-transformación
  - TTL 90 días
- [ ] **feat**: Geohash precision 7 para queries espaciales
- [ ] **test**: Validación hit rate >80% con datos sintéticos

##### Semana 12: Step Functions Orchestration
- [ ] **infra**: State machine 786 municipios
  ```json
  {
    "StartAt": "MapMunicipios",
    "States": {
      "MapMunicipios": {
        "Type": "Map",
        "ItemsPath": "$.municipios",
        "MaxConcurrency": 40,
        "Iterator": {
          "StartAt": "ProcessMunicipio",
          "States": {
            "ProcessMunicipio": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:...:ptel-geocoding",
              "Retry": [{
                "ErrorEquals": ["States.ALL"],
                "MaxAttempts": 3,
                "BackoffRate": 2.0
              }]
            }
          }
        }
      }
    }
  }
  ```
- [ ] **infra**: EventBridge scheduled rule (mensual)
  ```
  cron(0 2 1 * ? *) # 02:00 UTC primer domingo mes
  ```
- [ ] **feat**: Agregación resultados S3
- [ ] **feat**: SNS notification completion
- [ ] **test**: Dry-run 10 municipios piloto

#### Semana 13-14: Monitorización y Security

##### Semana 13: CloudWatch + X-Ray
- [ ] **infra**: CloudWatch Dashboard
  - Métricas: invocations, errors, duration, throttles
  - Custom metrics: precision_m, cache_hit_rate
- [ ] **infra**: Alarmas CloudWatch
  - Error rate >5% (5 min ventana)
  - Duration p99 >2s
  - Throttles >0
  - Cache miss rate >30%
- [ ] **infra**: X-Ray tracing habilitado
- [ ] **infra**: SNS topics alertas equipo
- [ ] **feat**: Structured logging JSON
  ```json
  {
    "timestamp": "2025-11-21T10:30:00Z",
    "level": "INFO",
    "municipio": "Colomera",
    "infraType": "hospital",
    "precision_m": 0.43,
    "duration_ms": 287,
    "cache_hit": false
  }
  ```

##### Semana 14: Security Hardening
- [ ] **infra**: Secrets Manager para credentials
- [ ] **infra**: CloudTrail logging habilitado (retention 90 días)
- [ ] **infra**: Encryption at-rest KMS
- [ ] **infra**: Encryption in-transit TLS 1.2+
- [ ] **infra**: AWS Config rules ENS compliance
- [ ] **infra**: Security audit AWS Inspector
- [ ] **infra**: WAF rules API Gateway (si expuesto público)
- [ ] **test**: Penetration testing básico
- [ ] **docs**: Runbooks incidentes y disaster recovery

**Entregable Semanas 9-14**:
- ✅ Infraestructura AWS serverless completa
- ✅ Lambda funcional con cache DynamoDB
- ✅ Orchestration 786 municipios Step Functions
- ✅ Monitorización CloudWatch + X-Ray
- ✅ Security hardening ENS compliant
- ✅ Coste operacional validado <€50/mes

---

## 📊 MATRIZ DE PRIORIDADES

| Fase | Prioridad | ROI | Esfuerzo | Timeline | Dependencias |
|------|-----------|-----|----------|----------|--------------|
| Fase 1: Geocodificación Tipológica | 🔴 CRÍTICA | 875% | 4 dev-weeks | Sem 1-2 | Ninguna |
| Fase 2: Cache y Cascada | 🟡 ALTA | 650% | 4 dev-weeks | Sem 3-4 | Fase 1 |
| Fase 3: Visor Cartográfico | 🟢 MEDIA | 320% | 6 dev-weeks | Sem 5-8 | Fase 2 |
| Fase 4: AWS Serverless | 🟣 BAJA | 280% | 12 dev-weeks | Sem 9-14 | Fase 3 |

**Criterios Priorización**:
1. **Impacto**: Mejora directa en éxito geocodificación (Fase 1)
2. **Dependencias**: Fase 2 requiere Fase 1, Fase 3 requiere Fase 2
3. **ROI**: Retorno inversión vs esfuerzo
4. **Riesgo**: Fase 1-2 bajo riesgo, Fase 4 medio-alto riesgo
5. **Usuarios**: Fase 1-3 impacto inmediato técnicos municipales

---

## 🎯 HITOS Y CHECKPOINTS

### Checkpoint Semana 2 (Post-Fase 1)
**Criterios Go/No-Go**:
- ✅ Éxito geocodificación sanitarios >25% mejora vs baseline
- ✅ Precisión ±2-10m validada con 30+ centros reales
- ✅ Tests automatizados >95% cobertura
- ✅ Documentación APIs WFS completa

**Acciones si No-Go**:
- Revisión arquitectura geocodificación tipológica
- Validación calidad datos WFS SICESS/SAS
- Análisis gaps fuzzy matching
- Decisión: continuar optimizando vs pivotar enfoque

### Checkpoint Semana 4 (Post-Fase 2)
**Criterios Go/No-Go**:
- ✅ Cache hit rate >70% con datos reales
- ✅ Sistema cascada 6 niveles funcional
- ✅ Circuit breaker operando correctamente
- ✅ Mejora global >35% éxito geocodificación

**Acciones si No-Go**:
- Optimización algoritmo cache (hash keys, TTL)
- Revisión políticas retry y fallback
- Análisis bottlenecks APIs externas
- Decisión: ajustar umbrales vs re-arquitecturar

### Checkpoint Semana 8 (Post-Fase 3)
**Criterios Go/No-Go**:
- ✅ Visor cartográfico funcional en 3 navegadores
- ✅ Corrección manual workflow fluido (<30s por punto)
- ✅ Testing usabilidad 3 técnicos municipales satisfactorio
- ✅ Exportación GeoJSON/CSV sin errores

**Acciones si No-Go**:
- Iteración UX basada en feedback usuarios
- Optimización performance renderizado mapa
- Simplificación flujo corrección manual
- Decisión: lanzar MVP vs completar features

### Checkpoint Semana 14 (Post-Fase 4)
**Criterios Go/No-Go**:
- ✅ Lambda procesando coordinatas con latencia <500ms p95
- ✅ Coste operacional validado <€50/mes
- ✅ Monitorización CloudWatch operativa
- ✅ Security audit passed

**Acciones si No-Go**:
- Optimización costes AWS (memoria, concurrency)
- Revisión arquitectura serverless
- Análisis alternativas (Vercel, Netlify Functions)
- Decisión: optimizar vs mantener browser-only

---

## 📈 MÉTRICAS DE ÉXITO

### Métricas Técnicas

| Métrica | Baseline | Objetivo Fase 1 | Objetivo Fase 2 | Objetivo Fase 3 | Objetivo Final |
|---------|----------|------------------|------------------|------------------|----------------|
| Completitud coordenadas | 26.9% | 50-60% | 70-80% | 85-90% | **95-100%** |
| Éxito geocodificación | 55-70% | 75-85% | 85-92% | 90-95% | **95-100%** |
| Precisión media | ±100-500m | ±10-50m | ±5-25m | ±2-15m | **±2-25m** |
| Cache hit rate | N/A | N/A | 70-80% | 80-85% | **85-90%** |
| Latencia p95 | N/A | N/A | <1s | <800ms | **<500ms** |

### Métricas Negocio

| Métrica | Valor Actual | Objetivo Q1 2026 | Objetivo Q2 2026 |
|---------|--------------|-------------------|-------------------|
| Municipios cubiertos | 1 piloto | 50 (6%) | 200 (25%) |
| Infraestructuras procesadas | ~200 | 10,000+ | 40,000+ |
| Tiempo procesamiento/municipio | 4-6 horas | 1-2 horas | 30-60 min |
| Coste por municipio | €0 | €0.06 | €0.04 |
| Satisfacción usuarios | N/A | 4.0/5.0 | 4.5/5.0 |

### Métricas Calidad

- **Cobertura tests**: >85% código core, >95% funciones críticas
- **Bugs críticos**: 0 en producción
- **Documentación**: 100% APIs públicas documentadas
- **Accesibilidad**: WCAG 2.1 Level AA
- **Performance**: Lighthouse score >90

---

## 🛠️ STACK TECNOLÓGICO FINAL

### Frontend
```typescript
{
  "framework": "React 18.3.1 + TypeScript 5.6",
  "build": "Vite 5.4",
  "ui": "shadcn/ui + Tailwind CSS 3.4",
  "maps": "Leaflet 1.9.4 + react-leaflet 4.2.1 + Proj4Leaflet",
  "state": "Zustand 4.4",
  "charts": "Recharts 2.8",
  "animations": "Framer Motion 10.16",
  "storage": "IndexedDB (Dexie.js) + localStorage",
  "http": "Axios 1.6",
  "testing": "Vitest + React Testing Library",
  "lint": "ESLint + Prettier"
}
```

### Backend AWS (Opcional)
```python
{
  "compute": "AWS Lambda + ARM64 Graviton2",
  "runtime": "Python 3.11/3.12",
  "container": "Docker multi-stage (lambgeo base)",
  "geospatial": "pyproj 3.7.2 + PROJ 9.4 + PENR2009.gsb",
  "storage": "S3 + DynamoDB",
  "cache": "ElastiCache Redis",
  "orchestration": "Step Functions",
  "monitoring": "CloudWatch + X-Ray",
  "ci/cd": "GitHub Actions + SAM"
}
```

### APIs Externas
```
Geocodificación:
├── CartoCiudad IGN (primary) - gratuita, ilimitada
├── CDAU Andalucía - gratuita, regional
├── IDEE Geolocalizador - gratuita, nacional
└── Nominatim OSM - gratuita, 1 req/s

Datos Especializados:
├── SICESS/SAS sanitarios - gratuita, WFS
├── Consejería Educación - gratuita, WFS
├── ISE seguridad - gratuita, API REST
├── IAPH patrimonio - gratuita, API REST
└── Overpass API OSM - gratuita, religiosos

Cartografía:
├── Ortofoto Andalucía 2022 - gratuita, WMS
├── PNOA-MA - gratuita, WMS
├── CDAU callejero - gratuita, WMS
└── OpenStreetMap - gratuita, tiles
```

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
Lambda (ARM64, 1536MB, 100K invoc/mes): €12/mes
DynamoDB (5GB storage, 1M reads, 100K writes): €8/mes
S3 (100GB storage, 10GB transfer): €3/mes
CloudFront (10GB data transfer): €1/mes
CloudWatch (10GB logs, 10 alarmas): €5/mes
Secrets Manager (3 secretos): €1/mes
ElastiCache Redis (opcional, t4g.micro): €15/mes
-------------------------------------------------
TOTAL (sin Redis): €30/mes
TOTAL (con Redis): €45/mes
```

### ROI Proyectado

#### Beneficios Cuantificables
```
Ahorro tiempo procesamiento:
  4h/municipio → 1h/municipio = 3h ahorradas
  786 municipios × 3h × €40/h = €94,320/año

Reducción errores (50% menos QA):
  100h × €40/h = €4,000/año

Valor geocodificación mejorada:
  +36,313 infraestructuras bien geocodificadas
  × €15/registro (vs manual)
  = €544,695 valor generado

TOTAL BENEFICIO: €642,015/año
```

#### Cálculo ROI
```
Inversión total: €52,000 (desarrollo) + €360/año (ops AWS) = €52,360
Beneficio anual: €642,015
ROI Año 1: (€642,015 - €52,360) / €52,360 = 1,126% 🚀
Payback period: 29 días
```

---

## 🔄 METODOLOGÍA Y WORKFLOW

### Desarrollo Iterativo

**Sprint Structure** (2 semanas):
```
Semana 1:
├── Lunes: Planning + estimación tareas
├── Martes-Jueves: Desarrollo features
├── Viernes: Code review + merge
└── Daily standups 15 min (async Slack)

Semana 2:
├── Lunes-Miércoles: Testing + bugfixes
├── Jueves: Documentación + demos
├── Viernes: Retrospectiva + deploy
└── Sprint review con stakeholders
```

### Git Workflow

**Branching Strategy**:
```
main (producción)
  ↑
develop (staging)
  ↑
feature/fase1-geocodificacion-sanitarios
feature/fase2-cache-sistema
feature/fase3-visor-mapa
fix/correccion-utf8-encoding
```

**Commit Convention**:
```bash
feat(geocoding): añadir WFSHealthGeocoder para SICESS
fix(validation): corregir detección coordenadas truncadas
docs(readme): actualizar instrucciones instalación
test(utils): añadir tests coordinateUtils
perf(cache): optimizar hit rate IndexedDB
```

### Testing Strategy

**Niveles Testing**:
```
1. Unit Tests (85% cobertura)
   - Funciones puras validación
   - Utils coordenadas
   - Parsers formatos

2. Integration Tests (70% cobertura)
   - Pipeline normalización completo
   - APIs externas (mocked)
   - Cache sistema

3. E2E Tests (casos críticos)
   - Workflow wizard completo
   - Corrección manual
   - Exportación

4. Performance Tests
   - Benchmarking 1000 registros <2s
   - Cache hit rate >70%
   - Renderizado mapa <500ms
```

---

## 📚 ENTREGABLES POR FASE

### Fase 1: Geocodificación Tipológica
- [ ] Código fuente geocodificadores tipológicos (5 clases)
- [ ] Suite tests automatizados (>95% cobertura)
- [ ] Documentación APIs WFS utilizadas
- [ ] Informe mejora cuantitativa (+35-45%)
- [ ] Demo video 3 min

### Fase 2: Cache y Cascada
- [ ] Sistema cache multinivel (localStorage + IndexedDB)
- [ ] Orchestrator cascada 6 niveles
- [ ] Retry logic + circuit breaker
- [ ] Dashboard métricas (hit rate, latencia)
- [ ] Runbook operaciones

### Fase 3: Visor Cartográfico
- [ ] Componentes React mapa completos
- [ ] Workflow corrección manual
- [ ] Exportación multi-formato
- [ ] Manual usuario con screenshots
- [ ] Video tutorial 5 min

### Fase 4: AWS Serverless
- [ ] Infraestructura Terraform/SAM
- [ ] Lambda functions + Step Functions
- [ ] CloudWatch dashboards + alarmas
- [ ] Security audit report
- [ ] Documentación despliegue

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

### Esta Semana (21-28 Nov)
1. **Lunes**: Revisión y aprobación Plan Maestro
2. **Martes**: Setup branch `feature/fase1-geocodificacion`
3. **Miércoles**: Implementar clasificador tipológico
4. **Jueves**: Iniciar WFSHealthGeocoder
5. **Viernes**: Sprint review progreso

### Semana Siguiente (28 Nov - 5 Dic)
1. Completar geocodificación sanitarios
2. Validar 30+ centros salud reales
3. Iniciar resto tipologías (educación, policía, cultura)
4. Testing A/B vs sistema actual
5. Documentación APIs WFS

### Primer Mes (Nov-Dic)
- ✅ Fase 1 completada (Geocodificación Tipológica)
- ✅ Fase 2 iniciada (Cache sistema)
- ✅ Mejora +35-45% éxito geocodificación
- ✅ Testing con 3 municipios piloto

---

## 📞 STAKEHOLDERS Y COMUNICACIÓN

### Equipo Core
- **Luis** (Tech Lead + Developer)
- **Colaboradores municipales** (Testing + feedback)
- **Soporte AWS** (Fase 4, opcional)

### Comunicación
- **Daily updates**: Slack/Discord asíncronos
- **Sprint reviews**: Viernes 16:00 (2 semanas)
- **Demos técnicos**: Fin cada fase
- **Reportes ejecutivos**: Mensual

### Escalation Path
```
Nivel 1: Luis (técnico municipal) - issues técnicos
Nivel 2: Coordinador emergencias - decisiones funcionales
Nivel 3: Dirección provincial - aprobaciones presupuesto
Nivel 4: AWS Support (si Fase 4) - infraestructura cloud
```

---

## 🎓 LECCIONES APRENDIDAS (A Documentar)

### Post-Fase 1
- Accuracy APIs WFS especializadas vs genéricas
- Patrones fuzzy matching más efectivos
- Edge cases datos municipales reales

### Post-Fase 2
- Estrategias cache óptimas (TTL, eviction)
- Circuit breaker thresholds calibrados
- Balance performance vs precisión cascada

### Post-Fase 3
- Patrones UX corrección manual más intuitivos
- Performance optimizations Leaflet >1000 puntos
- Feedback usuarios técnicos municipales

### Post-Fase 4
- Costes reales AWS vs proyecciones
- Optimizaciones Lambda (memory, concurrency)
- Monitorización métricas críticas

---

## ✅ CRITERIOS DE ACEPTACIÓN GLOBAL

### Sistema Listo Para Producción Cuando:

#### Funcionalidad
- ✅ Procesa 8 formatos archivo correctamente
- ✅ Normaliza UTF-8 con 27+ patrones
- ✅ Valida con 8 estrategias defensivas
- ✅ Geocodifica por tipología (4+ categorías)
- ✅ Sistema cache hit rate >70%
- ✅ Visor mapa con corrección manual
- ✅ Exporta GeoJSON/CSV/KML

#### Calidad
- ✅ Éxito geocodificación >95%
- ✅ Precisión ±2-25m según tipología
- ✅ Tests automatizados >85% cobertura
- ✅ Zero bugs críticos en producción
- ✅ Performance <2s procesamiento 1000 registros

#### Usabilidad
- ✅ Workflow wizard intuitivo (3 pasos)
- ✅ Corrección manual <30s por punto
- ✅ Testing 3+ técnicos municipales satisfactorio
- ✅ Documentación usuario completa

#### Operaciones
- ✅ Coste operacional <€50/mes
- ✅ Monitorización CloudWatch activa
- ✅ Backups automáticos configurados
- ✅ Runbooks incidentes documentados
- ✅ CI/CD pipeline funcional

---

## 📄 RESUMEN EJECUTIVO PARA DECISORES

### Problema
Solo 26.9% de infraestructuras críticas en documentos PTEL tienen coordenadas válidas. Cumplimiento Decreto 197/2024 en riesgo.

### Solución
Sistema web de normalización y geocodificación inteligente que aumenta completitud a 95-100% mediante:
1. Geocodificación por tipología (hospitales, colegios, comisarías)
2. Cache multinivel (70-85% reducción peticiones APIs)
3. Visor cartográfico con corrección manual asistida
4. Escalabilidad 786 municipios vía AWS serverless (opcional)

### Inversión vs Beneficio
- **Inversión**: €52K desarrollo + €360/año operación
- **Beneficio**: €642K/año (ahorro tiempo + valor datos)
- **ROI**: 1,126% primer año
- **Payback**: 29 días

### Timeline
- Fase 1-2 (críticas): 4 semanas → +35-45% mejora
- Fase 3 (importante): 4 semanas → corrección manual
- Fase 4 (opcional): 6 semanas → escalabilidad regional

### Riesgos Mitigados
- ✅ Dependencia APIs comerciales (todo gratuito español)
- ✅ Vendor lock-in (arquitectura browser-first)
- ✅ Complejidad operativa (mantenible por 1 técnico)
- ✅ Escalabilidad (diseño 786 municipios desde inicio)

---

**FIN DEL PLAN MAESTRO**

Este documento será la base para ejecución del proyecto PTEL. Revisión mensual obligatoria y actualización post cada fase.

**Última actualización**: 21 Noviembre 2025  
**Versión**: 1.0  
**Autor**: Claude + Luis (revisión técnica)  
**Estado**: APROBADO PARA EJECUCIÓN
