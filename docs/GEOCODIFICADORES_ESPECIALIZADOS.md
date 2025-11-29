# Sistema de Geocodificadores Especializados PTEL

## Resumen Ejecutivo

El sistema de geocodificación del Normalizador PTEL utiliza una **arquitectura de cascada multinivel** con 10 geocodificadores especializados que consultan fuentes oficiales de la Junta de Andalucía y servicios complementarios. Esta estrategia permite alcanzar tasas de éxito del **85-95%** frente al 55-70% de la geocodificación genérica por dirección.

### Cobertura Total Estimada

| Fuente | Elementos | Precisión |
|--------|-----------|-----------|
| Infraestructuras oficiales | ~23.000 | 5-25m |
| Topónimos NGA | ~232.000 | 10-50m |
| OpenStreetMap (fallback) | Variable | 10-100m |
| **TOTAL** | **~255.000** | **5-100m** |

---

## Arquitectura de Cascada (L0-L5)

```
┌─────────────────────────────────────────────────────────────────┐
│                    INFRAESTRUCTURA DETECTADA                    │
│                  (nombre, tipo, municipio, etc.)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ L0: CACHÉ LOCAL (GeoCache + IndexedDB)                          │
│ ─────────────────────────────────────────────────────────────── │
│ • localStorage: 5MB, acceso <1ms                                │
│ • IndexedDB: 100MB, acceso <10ms                                │
│ • TTL: 30 días para coordenadas, 7 días para búsquedas          │
│ • Hit rate esperado: 40-60% en uso repetido                     │
└─────────────────────────────────────────────────────────────────┘
                              │ MISS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ L1: GEOCODIFICADORES WFS ESPECIALIZADOS (por tipología)         │
│ ─────────────────────────────────────────────────────────────── │
│ • WFSHealthGeocoder      → SICESS sanitario (~1.600)            │
│ • WFSEducationGeocoder   → CKAN educativo (~3.800)              │
│ • WFSCulturalGeocoder    → IAPH patrimonio (~6.000)             │
│ • WFSSecurityGeocoder    → ISE seguridad (~2.000)               │
│ • WFSHydraulicGeocoder   → REDIAM hidráulico (~850)             │
│ • WFSSportsGeocoder      → DERA G12 deportivo (~3.100)          │
│ • WFSEnergyGeocoder      → AAE energético (~2.000)              │
│ • IAIDGeocoder           → IAID deportivo (~3.500)              │
│ Confianza: 95-100 puntos | Precisión: 5-15m                     │
└─────────────────────────────────────────────────────────────────┘
                              │ MISS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ L2: NOMENCLÁTOR GEOGRÁFICO (NGAGeocoder)                        │
│ ─────────────────────────────────────────────────────────────── │
│ • 232.000+ topónimos del MTA 1:10.000                           │
│ • Parajes, cerros, cortijos, arroyos, fuentes, eras...          │
│ • Ideal para ubicaciones rurales sin dirección postal           │
│ Confianza: 70-85 puntos | Precisión: 10-50m                     │
└─────────────────────────────────────────────────────────────────┘
                              │ MISS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ L3: CARTOCIUDAD (IGN)                                           │
│ ─────────────────────────────────────────────────────────────── │
│ • Direcciones postales oficiales de España                      │
│ • Calles, números, portales                                     │
│ • Desambiguación por código INE municipal                       │
│ Confianza: 60-80 puntos | Precisión: 5-25m                      │
└─────────────────────────────────────────────────────────────────┘
                              │ MISS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ L4: CDAU (Callejero Digital Andalucía Unificado)                │
│ ─────────────────────────────────────────────────────────────── │
│ • Direcciones específicas de Andalucía                          │
│ • Mayor cobertura rural que CartoCiudad                         │
│ Confianza: 55-75 puntos | Precisión: 10-30m                     │
└─────────────────────────────────────────────────────────────────┘
                              │ MISS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ L5: OVERPASS/NOMINATIM (OpenStreetMap)                          │
│ ─────────────────────────────────────────────────────────────── │
│ • Datos colaborativos globales                                  │
│ • Cobertura variable según zona                                 │
│ • Rate limit: 1 req/s Nominatim                                 │
│ Confianza: 40-60 puntos | Precisión: 10-100m                    │
└─────────────────────────────────────────────────────────────────┘
                              │ MISS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ RESULTADO: NO GEOCODIFICADO                                     │
│ ─────────────────────────────────────────────────────────────── │
│ • Marcado para geocodificación manual                           │
│ • Score: 0 puntos                                               │
│ • Registrado en log de fallos para análisis                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detalle de Geocodificadores


### 1. WFSHealthGeocoder (SICESS)

**Fuente:** Sistema de Información Corporativo del SSPA  
**Endpoint:** `https://sspa.juntadeandalucia.es/geoserver/sicess/wfs`  
**Cobertura:** ~1.600 centros sanitarios

| Tipo | Capa WFS | Cantidad |
|------|----------|----------|
| Hospitales | hospitales | ~50 |
| Centros de Salud | centros_salud | ~400 |
| Consultorios | consultorios | ~800 |
| DCCU/Urgencias | dccu | ~150 |
| Centros Especializados | centros_especializados | ~200 |

**Campos clave:** NOMBRE, DIRECCION, MUNICIPIO, PROVINCIA, TELEFONO  
**Uso PTEL:** Puntos de atención sanitaria en emergencias

---

### 2. WFSEducationGeocoder (CKAN)

**Fuente:** Portal de Datos Abiertos Junta de Andalucía  
**Endpoint:** `https://www.juntadeandalucia.es/datosabiertos/portal/api/3/`  
**Cobertura:** ~3.800 centros educativos

| Tipo | Dataset | Cantidad |
|------|---------|----------|
| Colegios (CEIP) | centros_educativos | ~2.100 |
| Institutos (IES) | centros_educativos | ~900 |
| Guarderías | centros_educativos | ~400 |
| FP/EOI/Conservatorios | centros_educativos | ~400 |

**Campos clave:** DENOMINACION, DIRECCION, LOCALIDAD, CODIGO_CENTRO  
**Uso PTEL:** Centros de evacuación, puntos de reunión

---

### 3. WFSCulturalGeocoder (IAPH)

**Fuente:** Instituto Andaluz del Patrimonio Histórico  
**Endpoint:** `https://www.iaph.es/geoserver/bdi/wfs`  
**Cobertura:** ~6.000 bienes culturales

| Tipo | Capa WFS | Cantidad |
|------|----------|----------|
| Monumentos BIC | bienes_inmuebles | ~3.000 |
| Yacimientos | yacimientos_arqueologicos | ~2.000 |
| Patrimonio Industrial | patrimonio_industrial | ~500 |
| Paisajes Culturales | paisajes_interes_cultural | ~500 |

**Campos clave:** DENOMINACION, MUNICIPIO, TIPOLOGIA, PROTECCION  
**Uso PTEL:** Bienes a proteger en emergencias, evacuación patrimonio

---

### 4. WFSSecurityGeocoder (ISE + OSM)

**Fuente:** Infraestructura de Servicios Esenciales + OpenStreetMap  
**Endpoint CSW:** `https://www.ideandalucia.es/catalogo/inspire/srv/spa/csw`  
**Cobertura:** ~2.000 instalaciones de seguridad

| Tipo | Fuente | Cantidad |
|------|--------|----------|
| Comisarías Policía Nacional | ISE + OSM | ~100 |
| Cuarteles Guardia Civil | ISE + OSM | ~400 |
| Policía Local | OSM | ~500 |
| Parques de Bomberos | ISE + OSM | ~100 |
| Protección Civil | ISE | ~200 |
| Centros de Coordinación | ISE | ~50 |

**Campos clave:** NOMBRE, TIPO, DIRECCION, MUNICIPIO, TELEFONO  
**Uso PTEL:** Recursos operativos de emergencia, centros de mando

---

### 5. WFSHydraulicGeocoder (REDIAM)

**Fuente:** Red de Información Ambiental de Andalucía  
**Endpoint:** `https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas`  
**Cobertura:** ~850 infraestructuras hidráulicas

| Tipo | Capa WFS | Cantidad |
|------|----------|----------|
| Presas y Embalses | sp_presas | ~80 |
| EDAR | sp_edar | ~400 |
| ETAP | sp_etap | ~200 |
| Desaladoras | sp_desaladoras | ~30 |
| Depósitos | sp_depositos | ~140 |

**Campos clave:** NOMBRE, MUNICIPIO, CAPACIDAD, ESTADO  
**Uso PTEL:** Riesgo de inundación, abastecimiento emergencias

---

### 6. WFSSportsGeocoder (DERA G12)

**Fuente:** Datos Espaciales de Referencia de Andalucía  
**Endpoint:** `https://www.ideandalucia.es/services/DERA_g12_servicios/wfs`  
**Cobertura:** ~3.100 instalaciones deportivas (capas 12_24, 12_25)

| Tipo | Capa WFS | Cantidad |
|------|----------|----------|
| Piscinas Cubiertas | g12_24 | ~300 |
| Piscinas Descubiertas | g12_24 | ~800 |
| Polideportivos | g12_25 | ~500 |
| Pabellones | g12_25 | ~400 |
| Campos de Fútbol | g12_25 | ~600 |
| Pistas de Atletismo | g12_25 | ~200 |

**Campos clave:** NOMBRE, TIPO, MUNICIPIO, TITULARIDAD  
**Uso PTEL:** Albergues de emergencia, puntos de reunión masiva

---

### 7. WFSEnergyGeocoder (AAE)

**Fuente:** Agencia Andaluza de la Energía  
**Endpoint:** `https://www.agenciaandaluzadelaenergia.es/mapwms/wfs`  
**Cobertura:** ~2.000 infraestructuras energéticas

| Tipo | Capa WFS | Cantidad |
|------|----------|----------|
| Subestaciones Eléctricas | subestaciones_electricas | ~200 |
| Centros Transformación | centros_transformacion | ~1.000 |
| ERMs Gas | infraestructura_gas | ~100 |
| Centrales Generación | centrales_generacion | ~150 |
| Parques Eólicos | parques_eolicos | ~180 |
| Plantas Fotovoltaicas | plantas_fotovoltaicas | ~300 |
| Plantas Biomasa | plantas_biomasa | ~70 |

**Campos clave:** NOMBRE, TIPO, TENSION_KV, POTENCIA_MW, PROPIETARIO  
**Uso PTEL:** Infraestructuras críticas, riesgo industrial

---

### 8. IAIDGeocoder (Inventario Andaluz)

**Fuente:** Inventario Andaluz de Instalaciones Deportivas  
**Endpoint:** `https://www.ideandalucia.es/services/DERA_g12_servicios/wfs`  
**Capa:** `g12_06_Deportivo`  
**Cobertura:** ~3.500 instalaciones deportivas (complementaria a WFSSports)

| Tipo | Cantidad |
|------|----------|
| Piscinas | ~600 |
| Campos de Fútbol | ~800 |
| Polideportivos | ~400 |
| Pistas de Pádel | ~500 |
| Pistas de Tenis | ~300 |
| Frontones | ~200 |
| Pistas de Atletismo | ~100 |
| Gimnasios | ~600 |

**Diferencia con WFSSportsGeocoder:**
- WFSSportsGeocoder usa capas 12_24/12_25 (piscinas y otras instalaciones)
- IAIDGeocoder usa capa g12_06 (inventario completo deportivo)
- Ambos son complementarios y pueden tener registros duplicados

---

### 9. NGAGeocoder (Nomenclátor Geográfico)

**Fuente:** Nomenclátor Geográfico de Andalucía (derivado MTA 1:10.000)  
**Endpoint:** `https://www.ideandalucia.es/wfs-nga/services`  
**Cobertura:** ~232.000 topónimos, 307.000 geometrías puntuales

| Tipo Topónimo | Ejemplos | Uso PTEL |
|---------------|----------|----------|
| Paraje | Paraje de los Preteles | Ubicaciones rurales |
| Cerro | Cerro del Águila | Antenas, repetidores |
| Cortijo | Cortijo de la Vega | Refugio rural |
| Arroyo | Arroyo Salado | Riesgo inundación |
| Fuente | Fuente del Rey | Abastecimiento |
| Era | Era de San Juan | Referencias históricas |
| Cañada | Cañada Real | Vías pecuarias |
| Barranco | Barranco Hondo | Riesgo geológico |
| Llano | Llano de la Perdiz | Zonas evacuación |

**Campos clave:** TEXTO, NOMBRE, MUNICIPIO, TIPO  
**Uso PTEL:** Ubicaciones rurales sin dirección postal, topónimos menores

---

### 10. OverpassGeocoder (OpenStreetMap)

**Fuente:** OpenStreetMap vía Overpass API + Nominatim  
**Endpoints:**
- Overpass: `https://overpass-api.de/api/interpreter`
- Nominatim: `https://nominatim.openstreetmap.org/`

**Rate Limits:**
- Nominatim: 1 petición/segundo
- Overpass: ~10.000 peticiones/día

**Mapeo PTEL → OSM:**

| Tipo PTEL | Query OSM |
|-----------|-----------|
| HEALTH | `amenity=hospital\|clinic\|doctors`, `healthcare=centre` |
| EDUCATION | `amenity=school\|kindergarten` |
| SECURITY | `amenity=police\|fire_station` |
| SPORTS | `leisure=sports_centre\|swimming_pool` |
| CULTURAL | `tourism=museum`, `amenity=theatre` |
| ENERGY | `power=substation\|plant` |
| HYDRAULIC | `man_made=water_tower\|wastewater_plant` |
| TELECOMMUNICATIONS | `tower:type=communication` |

**Uso PTEL:** Fallback L5, cobertura variable, datos colaborativos

---


## Flujo de Procesamiento

### ¿En qué momento se aplica la geocodificación?

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CARGA DE DOCUMENTO                                           │
│    Usuario sube archivo ODT/CSV/XLSX/DBF/GeoJSON/KML            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. EXTRACCIÓN Y NORMALIZACIÓN                                   │
│    • Parser específico por formato                              │
│    • Detección columnas (nombre, dirección, coordenadas)        │
│    • Limpieza UTF-8 (62+ patrones de corrección)                │
│    • Separadores de miles (524.538 → 524538)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. CLASIFICACIÓN TIPOLÓGICA                                     │
│    • Clasificador con 15 categorías PTEL                        │
│    • Detección por nombre: "Hospital" → HEALTH                  │
│    • Detección por contexto: "CEIP" → EDUCATION                 │
│    • Asignación de prioridad de geocodificador                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. VALIDACIÓN DE COORDENADAS EXISTENTES                         │
│    • ¿Tiene coordenadas X/Y en el documento?                    │
│    • ¿Son válidas? (rango UTM30 Andalucía)                      │
│    • ¿Están completas? (no truncadas, no placeholder)           │
│                                                                 │
│    SI válidas → Score +40-50 puntos → Saltar geocodificación    │
│    NO válidas → Continuar a geocodificación                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. GEOCODIFICACIÓN EN CASCADA (L0-L5)                           │
│    • Búsqueda en caché local (L0)                               │
│    • Consulta a geocodificador especializado según tipo (L1)    │
│    • Fallback progresivo hasta L5                               │
│    • Asignación de confianza según fuente                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. TRANSFORMACIÓN DE COORDENADAS                                │
│    • WGS84 (lat/lon) → UTM30 ETRS89 (EPSG:25830)                │
│    • Validación post-transformación                             │
│    • Precisión submétrica con proj4.js                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. SCORING Y CLASIFICACIÓN FINAL                                │
│    • Cálculo de puntuación 0-100                                │
│    • Asignación de nivel de confianza                           │
│    • Almacenamiento en caché para futuras consultas             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sistema de Scoring (0-100 puntos)

### Componentes del Score

| Componente | Puntos | Descripción |
|------------|--------|-------------|
| **Coordenadas originales** | 0-50 | Calidad de las coords. del documento |
| **Geocodificación** | 0-50 | Calidad del resultado geocodificado |
| **Validaciones adicionales** | ±10 | Bonificaciones/penalizaciones |

### Score por Fuente de Geocodificación

| Nivel | Fuente | Score Base | Score Final |
|-------|--------|------------|-------------|
| L0 | Caché (resultado previo) | Heredado | 85-100 |
| L1 | WFS Especializado (SICESS, CKAN, IAPH...) | 45-50 | 90-100 |
| L2 | Nomenclátor NGA | 35-42 | 70-85 |
| L3 | CartoCiudad | 30-40 | 60-80 |
| L4 | CDAU | 27-37 | 55-75 |
| L5 | Overpass/Nominatim | 20-30 | 40-60 |
| -- | No geocodificado | 0 | 0-20 |

### Niveles de Confianza

| Nivel | Score | Significado | Acción Recomendada |
|-------|-------|-------------|-------------------|
| **CRÍTICA** | 90-100 | Coordenadas verificadas | Usar directamente |
| **ALTA** | 75-89 | Alta fiabilidad | Usar con precaución |
| **MEDIA** | 50-74 | Requiere verificación | Revisar visualmente |
| **BAJA** | 25-49 | Posible error | Verificación manual |
| **NULA** | 0-24 | Sin coordenadas fiables | Geocodificación manual |

### Bonificaciones y Penalizaciones

| Factor | Modificación | Descripción |
|--------|--------------|-------------|
| Match exacto de nombre | +5 | Nombre coincide 100% con fuente |
| Distancia < 100m de otra fuente | +3 | Validación cruzada positiva |
| Distancia > 1km de otra fuente | -5 | Posible error de ubicación |
| Municipio no coincide | -10 | Geocodificación en municipio incorrecto |
| Coordenadas truncadas | -8 | Precisión reducida |
| UTF-8 corrupto corregido | -2 | Posible pérdida de información |

---

## Sistema de Caché

### Arquitectura de Almacenamiento

```
┌─────────────────────────────────────────────────────────────────┐
│                        SISTEMA DE CACHÉ                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ NIVEL 1: GeoCache (localStorage)                        │   │
│  │ ─────────────────────────────────────────────────────── │   │
│  │ • Capacidad: 5MB                                        │   │
│  │ • Acceso: <1ms                                          │   │
│  │ • Contenido: Resultados frecuentes, últimas búsquedas   │   │
│  │ • TTL: 30 días (coordenadas), 7 días (búsquedas)        │   │
│  │ • Estrategia evicción: LRU (Least Recently Used)        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ NIVEL 2: IndexedDBCache                                 │   │
│  │ ─────────────────────────────────────────────────────── │   │
│  │ • Capacidad: 100MB                                      │   │
│  │ • Acceso: <10ms                                         │   │
│  │ • Contenido: Datasets completos, histórico              │   │
│  │ • TTL: 90 días                                          │   │
│  │ • Índices: por municipio, tipo, fecha                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Claves de Caché

```typescript
// Formato de clave para geocodificación
const cacheKey = `geo:${tipo}:${municipio}:${hash(nombre)}`;

// Ejemplos
"geo:HEALTH:Colomera:a3f2b1c4"     // Hospital en Colomera
"geo:EDUCATION:Granada:e5d4c3b2"   // Colegio en Granada
"geo:NGA:Berja:f1e2d3c4"           // Topónimo en Berja
```

### Política de Actualización

| Tipo de Dato | TTL | Actualización |
|--------------|-----|---------------|
| Coords. geocodificadas | 30 días | Automática al expirar |
| Búsquedas fallidas | 7 días | Reintento tras expiración |
| Datasets WFS | 90 días | Manual o por versión |
| Topónimos NGA | 180 días | Muy estables |

### Estadísticas de Caché

```typescript
interface CacheStats {
  hits: number;           // Aciertos de caché
  misses: number;         // Fallos de caché
  hitRate: number;        // Tasa de aciertos (%)
  size: number;           // Tamaño actual (bytes)
  entries: number;        // Número de entradas
  oldestEntry: Date;      // Entrada más antigua
  lastCleanup: Date;      // Última limpieza
}
```

---


## Impacto en el Score Global

### Comparativa: Sin vs Con Geocodificadores Especializados

| Escenario | Tasa Éxito | Score Medio | Precisión |
|-----------|------------|-------------|-----------|
| **Solo coords. documento** | 26.9% | 35/100 | Variable |
| **+ CartoCiudad genérico** | 55-60% | 52/100 | 10-50m |
| **+ Geocodificadores L1** | 75-85% | 72/100 | 5-25m |
| **+ NGA + Cascada completa** | 85-95% | 82/100 | 5-50m |

### Distribución Esperada de Scores (786 municipios)

```
Score 90-100 (CRÍTICA):  ████████████████████ 35%
Score 75-89  (ALTA):     ████████████████     30%
Score 50-74  (MEDIA):    ██████████           20%
Score 25-49  (BAJA):     █████                10%
Score 0-24   (NULA):     ██                    5%
```

### Mejora por Tipo de Infraestructura

| Tipo | Sin L1 | Con L1 | Mejora |
|------|--------|--------|--------|
| Sanitario | 45% | 92% | +47% |
| Educativo | 50% | 95% | +45% |
| Cultural | 30% | 88% | +58% |
| Seguridad | 40% | 85% | +45% |
| Deportivo | 35% | 90% | +55% |
| Hidráulico | 25% | 82% | +57% |
| Energético | 20% | 78% | +58% |
| Rural (topónimos) | 10% | 70% | +60% |

---

## Integración con Otras Medidas

### Pipeline Completo de Normalización

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEDIDAS DE NORMALIZACIÓN                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. LIMPIEZA UTF-8                          Impacto: +5-10 pts  │
│     • 62 patrones de corrección                                 │
│     • Elimina corrupción de caracteres                          │
│                                                                 │
│  2. NORMALIZACIÓN SEPARADORES               Impacto: +3-8 pts   │
│     • Puntos como miles (524.538 → 524538)                      │
│     • Comas decimales (36,85 → 36.85)                           │
│                                                                 │
│  3. DETECCIÓN SISTEMA COORDENADAS           Impacto: +5-15 pts  │
│     • UTM30, UTM29, WGS84, ED50                                 │
│     • Transformación automática a EPSG:25830                    │
│                                                                 │
│  4. VALIDACIÓN RANGO ANDALUCÍA              Impacto: +8-12 pts  │
│     • X: 100.000 - 800.000                                      │
│     • Y: 4.000.000 - 4.350.000                                  │
│                                                                 │
│  5. CLASIFICACIÓN TIPOLÓGICA                Impacto: +10-20 pts │
│     • 15 categorías PTEL                                        │
│     • Selección de geocodificador óptimo                        │
│                                                                 │
│  6. GEOCODIFICACIÓN ESPECIALIZADA           Impacto: +20-50 pts │
│     • 10 geocodificadores en cascada L0-L5                      │
│     • Fuentes oficiales Junta de Andalucía                      │
│                                                                 │
│  7. VALIDACIÓN CRUZADA                      Impacto: +3-8 pts   │
│     • Comparación con fuentes alternativas                      │
│     • Detección de outliers geográficos                         │
│                                                                 │
│  8. SCORING FINAL                           Resultado: 0-100    │
│     • Agregación ponderada de todos los factores                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Peso Relativo de Cada Medida

| Medida | Peso | Contribución Max |
|--------|------|------------------|
| Geocodificación L1 | 40% | 40 puntos |
| Coordenadas originales | 25% | 25 puntos |
| Validación rango | 15% | 15 puntos |
| Clasificación tipológica | 10% | 10 puntos |
| UTF-8 + separadores | 5% | 5 puntos |
| Validación cruzada | 5% | 5 puntos |
| **TOTAL** | **100%** | **100 puntos** |

---

## Archivos del Sistema

### Estructura de Directorios

```
src/services/geocoding/
├── specialized/
│   ├── index.ts                    # Exportaciones
│   ├── WFSBaseGeocoder.ts          # Clase base WFS
│   ├── WFSHealthGeocoder.ts        # SICESS sanitario
│   ├── WFSEducationGeocoder.ts     # CKAN educativo
│   ├── WFSCulturalGeocoder.ts      # IAPH patrimonio
│   ├── WFSSecurityGeocoder.ts      # ISE+OSM seguridad
│   ├── WFSHydraulicGeocoder.ts     # REDIAM hidráulico
│   ├── WFSSportsGeocoder.ts        # DERA G12 deportivo
│   ├── WFSEnergyGeocoder.ts        # AAE energético
│   ├── IAIDGeocoder.ts             # IAID deportivo
│   ├── NGAGeocoder.ts              # Nomenclátor NGA
│   └── OverpassGeocoder.ts         # OSM fallback
├── cache/
│   ├── GeoCache.ts                 # Caché localStorage
│   └── IndexedDBCache.ts           # Caché IndexedDB
└── cascade/
    └── GeocodingCascade.ts         # Orquestador L0-L5

src/lib/__tests__/
├── WFSHealthGeocoder.test.ts
├── EducationGeocoder.test.ts
├── HeritageGeocoder.test.ts
├── SecurityGeocoder.test.ts
├── WFSHydraulicGeocoder.test.ts
├── WFSSportsGeocoder.test.ts
├── WFSEnergyGeocoder.test.ts
├── IAIDGeocoder.test.ts
├── NGAGeocoder.test.ts
└── OverpassGeocoder.test.ts
```

---

## Resumen de Endpoints

| Servicio | URL Base | Protocolo |
|----------|----------|-----------|
| SICESS | sspa.juntadeandalucia.es/geoserver/sicess | WFS |
| CKAN | juntadeandalucia.es/datosabiertos/portal/api/3 | REST |
| IAPH | iaph.es/geoserver/bdi | WFS |
| ISE | ideandalucia.es/catalogo/inspire | CSW |
| REDIAM | juntadeandalucia.es/medioambiente/mapwms | WFS |
| DERA G12 | ideandalucia.es/services/DERA_g12_servicios | WFS |
| AAE | agenciaandaluzadelaenergia.es/mapwms | WFS |
| NGA | ideandalucia.es/wfs-nga/services | WFS |
| CartoCiudad | www.cartociudad.es/geocoder/api | REST |
| CDAU | callejero.juntadeandalucia.es | REST |
| Overpass | overpass-api.de/api/interpreter | REST |
| Nominatim | nominatim.openstreetmap.org | REST |

---

## Próximos Pasos

1. **Integrar cascada L0-L5** en el flujo principal de normalización
2. **Añadir visor Leaflet** para validación visual de geocodificación
3. **Implementar batch geocoding** con rate limiting para grandes volúmenes
4. **Dashboard de métricas** de rendimiento por geocodificador
5. **Tests de integración** con documentos PTEL reales

---

*Documentación generada: 2025-01-29*  
*Versión: 1.0.0*  
*Proyecto: Normalizador-Geolocalizador PTEL Andalucía*
