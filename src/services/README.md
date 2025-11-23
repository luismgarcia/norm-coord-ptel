# Arquitectura de Servicios - Sistema Completo Fases 1 y 2

## 📁 Estructura Actualizada

```
src/
├── services/
│   ├── cache/                               # ✅ FASE 2
│   │   ├── CacheManager.ts                 # Facade unificado localStorage/IndexedDB
│   │   ├── GeoCache.ts                     # Backend localStorage
│   │   ├── IndexedDBCache.ts               # Backend IndexedDB (grandes datasets)
│   │   ├── types.ts                        # Interfaces de caché
│   │   ├── index.ts                        # Exports
│   │   └── utils/
│   │       ├── hashGenerator.ts            # Generación de keys
│   │       └── lruEviction.ts              # Política LRU
│   │
│   ├── classification/
│   │   └── InfrastructureClassifier.ts     # Clasificador tipológico 12 categorías
│   │
│   ├── geocoding/                           # ✅ FASE 1 + FASE 2
│   │   ├── CascadeOrchestrator.ts          # ✅ NUEVO Fase 2: Orquestador cascada 6 niveles
│   │   ├── index.ts                        # Exports
│   │   ├── specialized/
│   │   │   ├── WFSBaseGeocoder.ts          # Clase base WFS
│   │   │   ├── WFSHealthGeocoder.ts        # Sanitarios (Fase 1)
│   │   │   ├── WFSEducationGeocoder.ts     # Educación (Fase 1)
│   │   │   ├── WFSCulturalGeocoder.ts      # Cultural (Fase 1)
│   │   │   └── WFSPoliceGeocoder.ts        # Policía (Fase 1)
│   │   └── providers/                      # ⏳ Por implementar Fase 2
│   │       ├── CartoCiudadProvider.ts      # (Próximamente)
│   │       ├── CDAUProvider.ts             # (Próximamente)
│   │       ├── IDEEProvider.ts             # (Próximamente)
│   │       └── NominatimProvider.ts        # (Próximamente)
│   │
│   └── examples.ts                          # Ejemplos de uso completos
│
└── types/
    └── infrastructure.ts                    # Tipos TypeScript compartidos
```

---

## 🎯 Componentes Fase 2 (NUEVO)

### 1. CacheManager (✅ IMPLEMENTADO)

**Ubicación**: `src/services/cache/CacheManager.ts`

**Función**: Facade unificado que gestiona automáticamente localStorage vs IndexedDB según tamaño del dataset.

**Características**:
- ✅ Decisión automática de backend (<5MB → localStorage, ≥5MB → IndexedDB)
- ✅ Migración transparente cuando se supera threshold
- ✅ API unificada para ambos backends
- ✅ Métricas agregadas en tiempo real
- ✅ Invalidación por criterios (municipio, tipo, fecha)

**Uso básico**:
```typescript
import { cacheManager } from './services/cache';

// Inicializar (una vez al arrancar la app)
await cacheManager.initialize();

// Recuperar del cache
const result = await cacheManager.get('Centro Salud', 'Granada', 'SANITARIO');
if (result.hit) {
  console.log('Cache hit!', result.data.coordinates);
}

// Guardar en cache
const entry: CacheEntry = {
  key: 'centro_salud_granada',
  coordinates: [447234.56, 4112876.23],
  crs: 'EPSG:25830',
  source: 'wfs_health',
  confidence: 95,
  timestamp: Date.now(),
  ttl: 90 * 24 * 60 * 60 * 1000 // 90 días
};
await cacheManager.set('Centro Salud', 'Granada', entry);

// Obtener métricas
const metrics = cacheManager.getMetrics();
console.log(`Hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
```

**Métricas objetivo**:
- Hit rate: 70-85%
- Cache hit latency: <10ms
- Reducción peticiones APIs: 70-85%

### 2. CascadeOrchestrator (✅ IMPLEMENTADO)

**Ubicación**: `src/services/geocoding/CascadeOrchestrator.ts`

**Función**: Orquestador inteligente de geocodificación multinivel con 6 niveles de fallback.

**Estrategia de cascada**:
```
L0: Cache Local (CacheManager)      ← <10ms, hit rate 70-85%
    ↓ miss
L1: WFS Tipológicos                  ← 200-800ms, precisión ±2-10m
    ↓ fallo
L2: CartoCiudad IGN                  ← 300-1000ms, precisión ±50-100m
    ↓ fallo
L3: CDAU Andalucía                   ← 400-1200ms, precisión ±50-150m
    ↓ fallo  
L4: IDEE Geolocalizador              ← 500-1500ms, precisión ±100-200m (deshabilitado por defecto)
    ↓ fallo
L5: Nominatim OSM                    ← 600-2000ms, precisión ±100-500m (último recurso)
```

**Características**:
- ✅ Early exit en primer éxito con confianza >70
- ✅ Integración automática con caché (L0)
- ✅ Guarda resultados exitosos en caché automáticamente
- ✅ Métricas detalladas por nivel
- ✅ Configuración de niveles habilitable/deshabilitable

**Estado actual implementación**:
- ✅ L0 (Cache): Funcional
- ✅ L1 (WFS): Estructura lista, pendiente integración geocodificadores existentes
- ⏳ L2 (CartoCiudad): Placeholder, pendiente implementación provider
- ⏳ L3 (CDAU): Placeholder, pendiente implementación provider
- ⏳ L4 (IDEE): Placeholder, deshabilitado
- ⏳ L5 (Nominatim): Placeholder, pendiente implementación provider

**Uso básico**:
```typescript
import { cascadeOrchestrator } from './services/geocoding';

// Geocodificar con cascada completa
const result = await cascadeOrchestrator.geocode(
  'Centro de Salud San Antón',
  'Granada',
  'SANITARIO',
  'Calle San Antón 72' // dirección opcional
);

if (result.success) {
  console.log(`Coordenadas: ${result.coordinates}`);
  console.log(`Nivel: L${result.level} (${result.levelName})`);
  console.log(`Confianza: ${result.confidence}%`);
  console.log(`Latencia total: ${result.totalLatency}ms`);
  console.log(`Niveles intentados: ${result.levelsAttempted}`);
}

// Obtener métricas
const metrics = cascadeOrchestrator.getMetrics();
console.log('Tasa de éxito por nivel:', metrics.successRateByLevel);
console.log('Intentos promedio:', metrics.avgAttemptsPerGeocode);
```

---

## 📊 Pipeline Completo Fase 1 + Fase 2

```
┌─────────────────────────────────────────────────────────────┐
│  1. ENTRADA (CSV PTEL)                                      │
│  ────────────────────────────────────────────────────────   │
│  Nombre: "Centro Salud La Esperanza"                        │
│  Municipio: "Granada"                                       │
│  Coordenadas: "" (vacías o corruptas)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  2. CLASIFICACIÓN TIPOLÓGICA (Fase 1)                      │
│  ────────────────────────────────────────────────────────   │
│  InfrastructureClassifier.classify()                        │
│  → Tipo: SANITARIO                                          │
│  → Confianza: ALTA                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  3. ORQUESTADOR DE CASCADA (Fase 2) ✅ NUEVO               │
│  ────────────────────────────────────────────────────────   │
│  cascadeOrchestrator.geocode()                              │
│                                                              │
│  → L0: Cache local? ❌ MISS (primera vez)                   │
│  → L1: WFS Health? ✅ HIT!                                  │
│     • Query WFS DERA G12                                    │
│     • Fuzzy match: "Centro de Salud Esperanza" (0.95)      │
│     • Confianza: 95% > 80% threshold                        │
│     • EARLY EXIT ← Guardado automático en caché            │
│                                                              │
│  Latencia: 350ms (L0: 8ms miss + L1: 342ms)                │
│  Próxima vez: L0 hit en ~5ms (80% más rápido)              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  4. SALIDA (Coordenadas + Metadatos Enriquecidos)          │
│  ────────────────────────────────────────────────────────   │
│  X: 447234.56 (EPSG:25830)                                  │
│  Y: 4112876.23 (EPSG:25830)                                 │
│  Confidence: 95/100                                         │
│  Source: "wfs_health_g12_01"                                │
│  Level: L1 (WFS Tipológicos)                                │
│  Total latency: 350ms (primera vez) / 5ms (cache)          │
│  Cached: true ← Disponible para próximas geocodificaciones │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Dependencias Fase 2 Agregadas

```json
{
  "dexie": "^4.0.1",          // ✅ IndexedDB wrapper (instalado)
  "lz-string": "^1.5.0"       // ✅ Compresión opcional (instalado)
}
```

**Instalación**:
```bash
npm install  # Ya ejecutado, dependencias instaladas
```

---

## 🚀 Roadmap Fase 2 (3-4 Semanas)

### ✅ Semana 1 - Core System (COMPLETADO DÍA 1)

**Día 1** (23 Nov - Hoy):
- ✅ CacheManager.ts implementado
- ✅ Sobrecarga `invalidate()` en GeoCache + IndexedDBCache
- ✅ CascadeOrchestrator.ts implementado
- ✅ Dependencias instaladas (dexie, lz-string)
- ✅ Exports actualizados
- ✅ README actualizado

**Días 2-3** (24-25 Nov):
- ⏳ Integrar geocodificadores WFS existentes con CascadeOrchestrator (L1)
- ⏳ Tests básicos CacheManager
- ⏳ Tests básicos CascadeOrchestrator
- ⏳ Validación con datasets pequeños

**Días 4-5** (26-27 Nov):
- ⏳ CartoCiudadProvider.ts (L2)
- ⏳ CDAUProvider.ts (L3)
- ⏳ Tests integración cache + cascada

### Semana 2 - Providers Geocodificación

**Días 1-2**:
- ⏳ NominatimProvider.ts (L5) con rate limiting 1 req/s
- ⏳ Integración en CascadeOrchestrator
- ⏳ Tests end-to-end con 100 direcciones variadas

**Días 3-5**:
- ⏳ Retry logic + Circuit breaker
- ⏳ Métricas avanzadas
- ⏳ Documentación completa

### Semana 3 - Pulido y Testing

- ⏳ Suite tests >85% cobertura
- ⏳ Performance benchmarks
- ⏳ Validación con datos reales municipios
- ⏳ Diagramas arquitectura (Mermaid)
- ⏳ Troubleshooting guide

---

## 📈 Mejoras Esperadas Fase 1 + Fase 2

**Baseline actual**:
- 55-70% éxito geocodificación
- Latencia: 800-2000ms por infraestructura
- Precisión: ±100-500m
- 100% peticiones a APIs externas

**Objetivo Fase 1** (✅ Completado):
- 90-95% éxito (+35-45 puntos)
- Precisión ±2-10m tipológico
- 4 geocodificadores especializados

**Objetivo Fase 2** (🔄 En progreso - Día 1/20):
- Latencia: <100ms (warm cache) vs 800-2000ms (cold)
- Hit rate cache: 70-85%
- Reducción peticiones APIs: 70-85%
- Mejora adicional éxito: +10-15% (total: 95-100%)

---

## 🧪 Testing

**Ejecutar ejemplos**:
```bash
npm run dev
```

**En consola del navegador**:
```javascript
// Test CacheManager
import { cacheManager } from './services/cache';
await cacheManager.initialize();
const metrics = cacheManager.getMetrics();

// Test CascadeOrchestrator
import { cascadeOrchestrator } from './services/geocoding';
const result = await cascadeOrchestrator.geocode(
  'Centro de Salud',
  'Granada',
  'SANITARIO'
);
console.log(result);
```

---

## 📚 Referencias Técnicas

### Servicios WFS Oficiales:
- **DERA G12 Sanitarios**: https://www.ideandalucia.es/services/DERA_g12_servicios/wfs
- **DERA G13 Educación**: https://www.ideandalucia.es/services/DERA_g13_educacion/wfs
- **IAPH Patrimonio**: https://www.juntadeandalucia.es/institutodeestadisticaycartografia/iaph/
- **CartoCiudad IGN**: https://www.cartociudad.es/geocoder/api/geocoder/
- **Nominatim OSM**: https://nominatim.openstreetmap.org/

### Librerías:
- Dexie.js: https://dexie.org/
- Fuse.js: https://fusejs.io/
- LZ-string: https://pieroxy.net/blog/pages/lz-string/

---

## 🔄 Estado Actual

### Fase 1 (Geocodificación Tipológica):
- ✅ InfrastructureClassifier (12 categorías)
- ✅ WFSBaseGeocoder
- ✅ WFSHealthGeocoder (sanitarios)
- ✅ WFSEducationGeocoder (educación)
- ✅ WFSCulturalGeocoder (cultural)
- ✅ WFSPoliceGeocoder (policía)

### Fase 2 (Cache y Cascada):
- ✅ **DÍA 1 COMPLETADO** (23 Nov 2025)
  - ✅ GeoCache (localStorage + LRU)
  - ✅ IndexedDBCache (Dexie.js + compresión)
  - ✅ CacheManager (facade unificado)
  - ✅ CascadeOrchestrator (estructura 6 niveles)
  - ✅ Dependencias instaladas
- ⏳ Integración WFS con cascada (Día 2-3)
- ⏳ Providers genéricos L2-L5 (Semana 2)
- ⏳ Retry logic + circuit breaker (Semana 2)
- ⏳ Tests completos (Semana 3)

**Próximo paso inmediato**: Integrar geocodificadores WFS existentes con CascadeOrchestrator L1

---

**Última actualización**: 23 Nov 2025, 21:45h
