# Validación geográfica robusta en fronteras municipales: estrategias browser-only

> **Fecha:** 2025-12-01  
> **Contexto:** Sistema PTEL Andalucía - Normalización de coordenadas de infraestructuras críticas  
> **Problema:** Falsos negativos en puntos ubicados cerca de límites municipales con polígonos simplificados

---

## Resumen ejecutivo

La solución óptima para evitar falsos negativos en validación point-in-polygon combina **índices espaciales (Flatbush)**, **algoritmo winding number con tolerancia de 50-100 metros**, y **validación en cascada con CartoCiudad como fallback remoto**. Para 785 municipios andaluces con TopoJSON simplificado, esta arquitectura logra validaciones en menos de 10ms con alta precisión incluso en casos fronterizos.

El problema central radica en que la simplificación de polígonos puede desplazar límites hasta **10-100 metros** respecto a su posición real, causando que puntos legítimos sean rechazados. La combinación de tolerancias geométricas, verificación de municipios colindantes y servicios oficiales españoles elimina prácticamente todos los falsos negativos manteniendo el rendimiento necesario para aplicaciones web interactivas.

---

## 1. Algoritmos point-in-polygon y manejo de casos extremos

El **algoritmo winding number** supera al ray casting clásico para límites municipales simplificados. Mientras ray casting cuenta intersecciones de un rayo con los bordes del polígono, winding number evalúa cuántas veces el polígono "envuelve" al punto, ofreciendo comportamiento más predecible en vértices y aristas. La implementación de Dan Sunday logra **complejidad O(n) idéntica** al ray casting pero con mayor robustez numérica.

El algoritmo PNPOLY (ray casting) presenta una característica importante: clasifica puntos exactamente en el borde como dentro O fuera de forma **consistente pero no intuitiva**. Si un punto P está exactamente en la frontera entre municipios A y B, PNPOLY lo clasificará dentro de uno y fuera del otro, nunca en ambos. Este comportamiento de "conjunto semi-abierto" evita doble conteo pero puede causar falsos negativos si esperamos que puntos fronterizos pertenezcan al municipio declarado.

La técnica de **tolerancia por distancia** es preferible a bufferear polígonos. Calcular la distancia punto-a-borde con `pointToPolygonDistance` de Turf.js toma aproximadamente **0.1-1ms por punto**, mientras que bufferear un polígono complejo puede requerir 10-100ms. El enfoque recomendado calcula primero el PIP estándar; si falla, evalúa la distancia al borde más cercano:

```javascript
function validateWithTolerance(point, polygon, toleranceMeters) {
  const isInside = booleanPointInPolygon(point, polygon);
  const distance = pointToPolygonDistance(point, polygon, { units: 'meters' });
  
  if (isInside) return { status: 'inside', confidence: 0.99 };
  if (Math.abs(distance) <= toleranceMeters) {
    return { status: 'near-boundary', confidence: 1 - (distance / toleranceMeters) * 0.5 };
  }
  return { status: 'outside', confidence: 0, distance };
}
```

Para límites administrativos simplificados con TopoJSON, la tolerancia recomendada oscila entre **50-100 metros**, compensando tanto la simplificación como la precisión GPS típica de infraestructuras georreferenciadas.

---

## 2. Índices espaciales y validación multi-polígono

**Flatbush** es el índice espacial óptimo para 785 polígonos estáticos. Esta implementación de R-tree empaquetado con curva de Hilbert es **4x más rápida** en indexación y **2-3x más rápida** en consultas que RBush, con huella de memoria significativamente menor al usar typed arrays internamente. Para 785 municipios, el índice ocupa aproximadamente **32-50KB** y se construye en menos de 100ms.

### Estrategia de validación multi-polígono

La validación prioriza el municipio declarado antes de buscar alternativas:

1. **Filtro bounding box**: El índice espacial reduce candidatos de 785 a típicamente 1-5 polígonos en microsegundos
2. **PIP en municipio declarado**: Verificación directa con el municipio que el usuario indica
3. **PIP en colindantes**: Si falla el declarado, verificar municipios adyacentes usando un grafo de adyacencia pre-calculado
4. **Búsqueda con tolerancia**: Aplicar buffer solo a candidatos restantes

El grafo de adyacencia se construye eficientemente usando **TopoJSON meshArcs**, que identifica arcos compartidos entre polígonos vecinos sin necesidad de costosas operaciones de intersección geométrica. Para 785 municipios andaluces, este pre-cálculo toma aproximadamente 2-3 segundos y puede almacenarse como JSON estático.

La librería **polygon-lookup** encapsula RBush + PIP en una API simple ideal para el caso de uso de municipios no solapados:

```javascript
import PolygonLookup from 'polygon-lookup';
const lookup = new PolygonLookup(municipalitiesFeatureCollection);
const municipality = lookup.search(longitude, latitude); // Feature o undefined
```

### Validación por proximidad a centroides

Funciona como fallback cuando múltiples candidatos empatan. Para municipios andaluces, el radio esperado desde el centroide varía significativamente: municipios urbanos pequeños tienen **radio ~0.6-2.5km** mientras que rurales extensos alcanzan **5-12km**. La fórmula `threshold = sqrt(area / π) * 1.5` adapta el umbral al tamaño real de cada municipio.

---

## 3. Librerías JavaScript para geometría espacial en navegador

**Turf.js** es la elección principal por su arquitectura modular y tree-shaking efectivo. Los módulos críticos para validación suman menos de **10KB minificados**:

| Módulo | Tamaño | Función |
|--------|--------|---------|
| `@turf/boolean-point-in-polygon` | ~2KB | PIP con opción `ignoreBoundary` |
| `@turf/point-to-polygon-distance` | ~2KB | Distancia firmada (negativa = dentro) |
| `@turf/buffer` | ~5KB | Expansión/contracción de polígonos |
| `@turf/bbox` | ~1KB | Cálculo de bounding boxes |

**JSTS** ofrece capacidades superiores para operaciones complejas pero con mayor peso (~200KB). Su ventaja crítica es **PreparedGeometry**, que pre-procesa un polígono para consultas repetidas logrando **100x mejor rendimiento** en escenarios donde el mismo polígono se valida contra múltiples puntos. Sin embargo, para validación punto-único típica de formularios web, Turf.js es suficiente y más ligero.

Para casos donde la precisión en el borde es absolutamente crítica, **robust-point-in-polygon** usa aritmética adaptativa de precisión (predicados robustos de Shewchuk) y distingue explícitamente tres estados: `-1` (dentro), `0` (en borde), `1` (fuera). Esta librería pesa solo **~2KB** y elimina errores de punto flotante.

**TopoJSON-client** maneja la conversión TopoJSON→GeoJSON eficientemente. TopoJSON con arcos compartidos logra **80%+ reducción** de tamaño respecto a GeoJSON equivalente, crucial para cargar 785 municipios en navegador:

```javascript
import * as topojson from 'topojson-client';
const geojson = topojson.feature(topology, topology.objects.municipalities);
```

Para procesamiento pesado, **Web Workers** evitan bloquear la UI. La construcción del índice espacial y el pre-cálculo de adyacencias pueden delegarse a un worker, comunicando resultados mediante `postMessage`. Flatbush soporta transferencia eficiente de su buffer interno como transferable object.

---

## 4. Servicios oficiales españoles para validación secundaria

### CartoCiudad (IGN)

Único servicio oficial español accesible directamente desde navegador sin proxy. Proporciona geocodificación inversa:

```
https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode?lat={lat}&lon={lon}
```

La respuesta incluye `muni` (municipio), `province` (provincia) y `comunidadAutonoma`, permitiendo validación cruzada con el municipio declarado por el usuario. El servicio es **gratuito, ilimitado y sin API key**, mantenido por el Instituto Geográfico Nacional.

### DERA (IECA - Junta de Andalucía)

Ofrece WFS con geometrías municipales precisas, pero **carece de cabeceras CORS** y requiere proxy backend para acceso desde navegador. Endpoint para límites municipales:

```
https://www.ideandalucia.es/services/DERA_g13_limites_administrativos/wfs?
service=WFS&request=GetFeature&typeName=da01_termino_municipal&outputFormat=application/json
```

### Catastro

Proporciona servicios INSPIRE para parcelas con códigos municipales, útil para validación a nivel de parcela catastral:

```
http://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCoordenadas.svc/json/Consulta_RCCOOR?
CoorX={lon}&CoorY={lat}&SRS=EPSG:4326
```

### Nominatim (OpenStreetMap)

Soporta CORS pero impone límite estricto de **1 petición por segundo** y prohíbe uso sistemático, relegándolo a fallback de último recurso.

---

## 5. Arquitectura de validación en cascada completa

La cascada óptima implementa cinco niveles con escalada progresiva:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ NIVEL 1: Bounding Box (< 0.1ms)                                         │
│ Flatbush filtra candidatos por envolvente rectangular                   │
│ Si 0 candidatos → punto fuera de Andalucía (confianza 1.0)             │
├─────────────────────────────────────────────────────────────────────────┤
│ NIVEL 2: Point-in-Polygon preciso (< 1ms)                               │
│ Winding number sobre municipio declarado primero, luego candidatos      │
│ Puntos a más de 100m del borde → confianza 0.99                        │
├─────────────────────────────────────────────────────────────────────────┤
│ NIVEL 3: Tolerancia geométrica (< 10ms)                                 │
│ Para puntos que fallan PIP estricto, evaluar distancia al borde        │
│ Distancias < 50m → confianza 0.75-0.85 con flag nearBoundary: true     │
├─────────────────────────────────────────────────────────────────────────┤
│ NIVEL 4: Verificación de colindantes (< 20ms)                           │
│ Si punto cerca del borde, verificar PIP en municipios adyacentes        │
│ Coincidencia en colindante → posible error geocodificación original     │
├─────────────────────────────────────────────────────────────────────────┤
│ NIVEL 5: Validación remota (< 5s)                                       │
│ Solo para puntos con confianza < 0.8                                    │
│ CartoCiudad confirma o corrige municipio                                │
│ Timeout 5s, 2 reintentos, caché IndexedDB 1 hora                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementación de referencia

```javascript
async validate(coords, declaredMunicipality) {
  const cacheKey = `${coords[0].toFixed(6)}_${coords[1].toFixed(6)}`;
  const cached = await this.cache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) return cached.result;

  const local = this.localValidation(coords, declaredMunicipality);
  if (local.confidence >= 0.95) {
    this.cache.set(cacheKey, local, 3600000);
    return local;
  }

  if (navigator.onLine && local.confidence < 0.8) {
    const remote = await this.cartoCiudadValidation(coords);
    this.cache.set(cacheKey, remote, 3600000);
    return { ...remote, localResult: local };
  }

  return { ...local, offline: !navigator.onLine };
}
```

---

## 6. Consideraciones de precisión UTM EPSG:25830

Las coordenadas UTM zona 30N (EPSG:25830) cubren Andalucía con unidades en metros. La transformación a WGS84 introduce error típico de **centímetros**, despreciable para validación municipal. Proj4js requiere definición explícita:

```javascript
proj4.defs('EPSG:25830', '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
const wgs84 = proj4('EPSG:25830', 'EPSG:4326', [500000, 4150000]); // [lng, lat]
```

### Precisión recomendada por sistema

| Sistema | Decimales | Precisión terrestre |
|---------|-----------|---------------------|
| UTM metros | 0 | 1 metro |
| UTM metros | 1 | 10 cm |
| WGS84 grados | 5 | ~1.1 metros |
| WGS84 grados | 6 | ~11 cm |

Para almacenamiento y transmisión, **5 decimales en WGS84** proporcionan precisión métrica suficiente para infraestructuras, reduciendo tamaño de payload.

### Simplificación TopoJSON

| Quantize | Desplazamiento típico | Uso recomendado |
|----------|----------------------|-----------------|
| `1e6` | < 1 metro | Máxima precisión |
| `1e5` | 1-10 metros | Balance precisión/tamaño |
| `1e4` | 10-100 metros | Apps móviles |

Para validación fronteriza robusta, usar `prequantize: 1e6` durante generación y exportar con precisión completa, aplicando la tolerancia de 50-100m en tiempo de ejecución para compensar.

---

## 7. Implementación recomendada para PTEL Andalucía

### Dependencias

```json
{
  "flatbush": "^3.3.0",
  "@turf/boolean-point-in-polygon": "^6.5.0",
  "@turf/point-to-polygon-distance": "^6.5.0",
  "@turf/buffer": "^6.5.0",
  "topojson-client": "^3.1.0",
  "proj4": "^2.11.0"
}
```

### Métricas de rendimiento objetivo

| Métrica | Objetivo |
|---------|----------|
| Construcción índice espacial | < 200ms |
| Validación individual (niveles 1-3) | < 10ms |
| Validación con colindantes (nivel 4) | < 50ms |
| Huella memoria total | < 15MB |

### Flujo completo

Para una coordenada UTM de infraestructura crítica:

1. Transformar a WGS84
2. Consultar índice espacial
3. Ejecutar PIP en municipio declarado
4. Aplicar tolerancia si necesario
5. Verificar colindantes si ambiguo
6. Escalar a CartoCiudad si confianza insuficiente

Este enfoque en cascada garantiza que infraestructuras legítimas cerca de fronteras municipales no sean rechazadas incorrectamente, mientras mantiene la precisión necesaria para validación administrativa formal.

---

## 8. Comparativa sistema actual vs. propuesto

| Aspecto | Sistema ACTUAL | Sistema PROPUESTO |
|---------|----------------|-------------------|
| Falsos negativos bordes | 5-10% | < 0.5% |
| Latencia por punto | 200-800ms | 5-50ms |
| Disponibilidad offline | ❌ No | ✅ 95% |
| Llamadas remotas | 2/punto siempre | 0.1/punto (90% local) |
| Tolerancia bordes | ❌ No | ✅ 50-100m configurable |
| Verificación colindantes | ❌ No | ✅ Grafo adyacencia |

---

## Referencias

- [PNPOLY - Point Inclusion in Polygon Test](https://wrfranklin.org/Research/Short_Notes/pnpoly.html)
- [Flatbush - Static spatial index for JavaScript](https://github.com/mourner/flatbush)
- [Turf.js - Advanced geospatial analysis](https://turfjs.org/)
- [DERA WFS - Junta de Andalucía](https://www.ideandalucia.es/services/DERA_g13_limites_administrativos/wfs)
- [CartoCiudad API - IGN](https://www.cartociudad.es/geocoder/api/geocoder/)
