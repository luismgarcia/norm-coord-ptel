# 📋 FASE 2: CACHE Y CASCADA - PLAN DE DESARROLLO
**Branch**: `feature/fase2-cache-cascada`  
**Inicio**: 23 Noviembre 2025  
**Duración estimada**: 3-4 semanas  
**Objetivo**: Sistema cache multinivel + cascada fallback 6 niveles

---

## 🎯 OBJETIVOS DE FASE 2

### Métricas Objetivo
- ✅ Hit rate cache: **70-85%**
- ✅ Reducción peticiones APIs: **70-85%**
- ✅ Mejora latencia warm cache: **80-90%**
- ✅ Mejora éxito geocodificación: **+10-15%** adicional
- ✅ Cache hit latency: **<10ms**

### ROI Esperado
- **Inversión**: €8,000 (2 dev × 2 sem)
- **ROI**: 650%
- **Beneficio acumulado**: €190,000 (con Fase 1)

---

## 📅 CRONOGRAMA DETALLADO

### SEMANA 3: SISTEMA CACHE MULTINIVEL

#### Día 1-2: LocalStorage Cache ✅ PRIORIDAD CRÍTICA
**Archivos a crear**:
```
src/services/cache/
├── GeoCache.ts                    [localStorage backend]
├── types.ts                       [interfaces cache]
└── utils/
    ├── hashGenerator.ts           [key hashing]
    └── lruEviction.ts             [política LRU]
```

**Funcionalidades**:
- [x] Clase `GeoCache` con localStorage backend
- [x] Hash key: `${name}_${municipio}_${tipo}`
- [x] Interface `CacheEntry`:
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
- [x] Límite tamaño 5-10MB (quota localStorage)
- [x] Política eviction: LRU (Least Recently Used)
- [x] Métodos: `get()`, `set()`, `invalidate()`, `clear()`
- [x] Serialización JSON optimizada

**Tests**:
- [ ] Test set/get básico
- [ ] Test TTL expiration
- [ ] Test LRU eviction
- [ ] Test límite quota
- [ ] Performance benchmark <10ms

---

#### Día 3-4: IndexedDB Cache
**Archivos a crear**:
```
src/services/cache/
├── IndexedDBCache.ts              [IndexedDB backend]
└── utils/
    ├── dbMigrations.ts            [schema versioning]
    └── compression.ts             [LZ-string compression]
```

**Funcionalidades**:
- [ ] Clase `IndexedDBCache` con Dexie.js
- [ ] Schema DB:
  ```typescript
  const db = new Dexie('PTELGeocache');
  db.version(1).stores({
    geocodes: '&key, municipio, tipo, timestamp',
    metadata: 'version, lastUpdate, size'
  });
  ```
- [ ] Capacidad 50-100MB por municipio
- [ ] Query by municipio para batch processing
- [ ] Compression LZ-string antes almacenar
- [ ] Indexación optimizada por municipio + tipo

**Dependencias a añadir**:
```bash
npm install dexie lz-string
npm install -D @types/dexie
```

**Tests**:
- [ ] Test CRUD operaciones
- [ ] Test queries complejas
- [ ] Test compresión/descompresión
- [ ] Test migración schema
- [ ] Performance benchmark datasets grandes

---

#### Día 5: Integración Cache Manager
**Archivos a crear**:
```
src/services/cache/
└── CacheManager.ts                [Facade unificado]
```

**Funcionalidades**:
- [ ] Facade `CacheManager` decide localStorage vs IndexedDB
  ```typescript
  if (datasetSize < 5MB) → localStorage
  else → IndexedDB
  ```
- [ ] Hit rate metrics exportables
- [ ] Invalidación cache por cambios schema
- [ ] API unificada para ambos backends

**Tests**:
- [ ] Test selección backend automática
- [ ] Test métricas hit rate
- [ ] Test invalidación selectiva
- [ ] End-to-end con datos reales
- [ ] Validar hit rate >70%

---

### SEMANA 4: CASCADA GEOCODIFICACIÓN INTELIGENTE

#### Día 1-2: Orchestrator Cascada ✅ PRIORIDAD CRÍTICA
**Archivos a crear**:
```
src/services/geocoding/
├── CascadeOrchestrator.ts         [Orquestador principal]
├── types.ts                       [interfaces cascada]
└── providers/
    ├── CartoCiudadProvider.ts     [Nivel 2]
    ├── CDAUProvider.ts            [Nivel 3]
    ├── IDEEProvider.ts            [Nivel 4]
    └── NominatimProvider.ts       [Nivel 5]
```

**Funcionalidades**:
- [ ] Clase `CascadeOrchestrator`
- [ ] 6 niveles fallback configurables:
  ```typescript
  Level 0: Cache local (localStorage/IndexedDB)
  Level 1: Geocodificación tipológica (WFS especializado)
  Level 2: CartoCiudad IGN (dirección postal)
  Level 3: CDAU Andalucía (normalización regional)
  Level 4: IDEE Geolocalizador (fallback nacional)
  Level 5: Nominatim OSM (último recurso, rate limit 1/s)
  ```
- [ ] Early exit en primer éxito con confianza >70
- [ ] Agregación resultados múltiples fuentes:
  - Si 2+ fuentes coinciden ±50m → ALTA confianza
  - Si discrepancia >50m → marcar MANUAL_REVIEW
- [ ] Scoring agregado multi-fuente

**Tests**:
- [ ] Test cascada completa
- [ ] Test early exit
- [ ] Test agregación multi-fuente
- [ ] Test manejo errores por nivel
- [ ] Validar mejora +10-15%

---

#### Día 3: Retry Logic y Circuit Breaker
**Archivos a crear**:
```
src/services/geocoding/
└── resilience/
    ├── RetryManager.ts            [Exponential backoff]
    ├── CircuitBreaker.ts          [Pattern circuit breaker]
    └── types.ts                   [interfaces resiliencia]
```

**Funcionalidades**:
- [ ] Exponential backoff para APIs rate-limited:
  ```typescript
  retry_delays = [1s, 2s, 4s, 8s, 16s]
  max_retries = 5
  ```
- [ ] Circuit breaker pattern por API:
  - Threshold: 50% error rate en 10 requests
  - Open circuit: skip API 60 segundos
  - Half-open: test 1 request antes re-enable
- [ ] Failover automático a siguiente nivel
- [ ] Métricas circuit breaker exportables

**Tests**:
- [ ] Test exponential backoff
- [ ] Test circuit breaker states
- [ ] Test failover automático
- [ ] Simulación API failures
- [ ] Métricas resiliencia

---

#### Día 4-5: Testing e Integración Final
**Archivos a crear**:
```
src/tests/
└── integration/
    ├── fase2-cache.test.ts
    ├── fase2-cascada.test.ts
    └── fase2-end-to-end.test.ts
```

**Funcionalidades**:
- [ ] Suite end-to-end con 100 direcciones variadas
- [ ] Simulación fallo API (CartoCiudad down)
- [ ] Validación hit rate real vs proyectado
- [ ] Performance benchmarks completos
- [ ] Integración en pipeline principal App.tsx

**Documentación**:
- [ ] README cache system
- [ ] README cascada providers
- [ ] Diagramas arquitectura (Mermaid)
- [ ] Guía troubleshooting

---

## 📊 MÉTRICAS A TRACKEAR

### Cache System
```typescript
interface CacheMetrics {
  hitRate: number;           // Objetivo: 70-85%
  missRate: number;
  avgHitLatency: number;     // Objetivo: <10ms
  avgMissLatency: number;
  totalEntries: number;
  sizeBytes: number;
  evictions: number;
}
```

### Cascada System
```typescript
interface CascadeMetrics {
  successRateByLevel: Record<number, number>;
  avgAttemptsPerGeocode: number;
  circuitBreakerTrips: Record<string, number>;
  multiSourceAgreements: number;
  manualReviewFlagged: number;
}
```

---

## 🚀 ENTREGABLES FASE 2

### Código
- ✅ Sistema cache multinivel (localStorage + IndexedDB)
- ✅ CacheManager facade unificado
- ✅ CascadeOrchestrator con 6 niveles
- ✅ 4 providers geocodificación adicionales
- ✅ Retry logic + circuit breaker
- ✅ Suite tests >85% cobertura

### Documentación
- ✅ README arquitectura cache
- ✅ README cascada providers
- ✅ Diagramas Mermaid
- ✅ Runbook operaciones
- ✅ Troubleshooting guide

### Métricas Validación
- ✅ Hit rate cache 70-85%
- ✅ Reducción 70-85% peticiones APIs
- ✅ Mejora latencia 80-90% warm cache
- ✅ Mejora éxito +10-15% adicional
- ✅ Cache hit <10ms

---

## 📝 NOTAS DESARROLLO

### Prioridades
1. **CRÍTICO**: localStorage cache + orchestrator básico (funcionalidad mínima)
2. **ALTO**: IndexedDB + retry logic (robustez)
3. **MEDIO**: Circuit breaker + agregación multi-fuente (optimización)
4. **BAJO**: Métricas avanzadas + visualización (nice-to-have)

### Dependencias Nuevas
```json
{
  "dependencies": {
    "dexie": "^4.0.0",
    "lz-string": "^1.5.0"
  },
  "devDependencies": {
    "@types/dexie": "^4.0.0"
  }
}
```

### APIs Externas a Integrar
1. **CartoCiudad IGN**: https://www.cartociudad.es/geocoder/api/geocoder/
2. **CDAU Andalucía**: https://www.juntadeandalucia.es/institutodeestadisticaycartografia/CDAU/
3. **IDEE Geolocalizador**: https://www.idee.es/csw-discover-II
4. **Nominatim OSM**: https://nominatim.openstreetmap.org/

---

**Última actualización**: 23 Noviembre 2025 20:00h  
**Estado**: 🚀 INICIANDO DESARROLLO
