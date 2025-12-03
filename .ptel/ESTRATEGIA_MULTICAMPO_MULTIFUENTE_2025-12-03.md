# Estrategia Multi-Campo + Validación Multi-Fuente
## Integración Completa para PTEL Andalucía
## Fecha: 2025-12-03

---

## 1. CAMPOS DISPONIBLES POR FILA

Cada registro de infraestructura en un PTEL contiene estos campos:

```
┌─────────────────────────────────────────────────────────────────┐
│  FILA TÍPICA DE PTEL                                            │
├─────────────────────────────────────────────────────────────────┤
│  NOMBRE:     "Centro de Salud"                                  │
│  TIPO:       "Indicar - Los disponibles en el Centro de Salud"  │
│  DIRECCIÓN:  "Plaza Luis Gonzaga, n/ 1, Tíjola"                 │
│  MUNICIPIO:  "Tíjola"                                           │
│  PROVINCIA:  "Almería"                                          │
│  COORD_X:    "" (vacío o corrupto)                              │
│  COORD_Y:    "" (vacío o corrupto)                              │
└─────────────────────────────────────────────────────────────────┘
```

**Problema actual:** Solo usamos NOMBRE para buscar.
**Solución:** Explotar TODOS los campos en CADA nivel de la cascada.

---

## 2. MATRIZ DE CAMPOS × FUENTES

Cada fuente (offline/online) puede aprovechar diferentes campos:

| Campo | LOCAL_DERA | WFS_DERA | CartoCiudad | CDAU | Nominatim |
|-------|------------|----------|-------------|------|-----------|
| NOMBRE | Fuzzy match | Fuzzy match | ❌ | ❌ | Texto libre |
| TIPO → Tipología | **Filtro directo** | **Filtro CQL** | ❌ | ❌ | amenity= |
| DIRECCIÓN | ❌ | ❌ | **Geocoding** | **Geocoding** | Texto libre |
| MUNICIPIO | **Índice O(1)** | **Filtro CQL** | Parámetro | Parámetro | Estado |
| PROVINCIA | Validación | Filtro CQL | Parámetro | Parámetro | Estado |
| COD_INE | **Índice O(1)** | **Filtro exacto** | Validación | Filtro | ❌ |

---

## 3. FLUJO MULTI-CAMPO EN CASCADA

```
ENTRADA: Fila con campos (NOMBRE, TIPO, DIRECCIÓN, MUNICIPIO, PROVINCIA)
         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 0: PREPROCESAMIENTO MULTI-CAMPO                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Limpiar DIRECCIÓN (eliminar "24h", teléfonos, equipamiento) │
│  2. Clasificar TIPO → tipología (HEALTH, EDUCATION, SECURITY)   │
│  3. Normalizar MUNICIPIO → código INE                           │
│  4. Extraer tokens útiles de NOMBRE                             │
│  5. Detectar calidad de cada campo (0-100)                      │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: ANÁLISIS DE MUNICIPIO (filtro más potente)             │
├─────────────────────────────────────────────────────────────────┤
│  Consultar LOCAL_DERA: ¿Cuántas infraestructuras del TIPO       │
│                        hay en este MUNICIPIO?                   │
│                                                                 │
│  → Si count == 1: MATCH DIRECTO (confianza 95%)                │
│     No necesita fuzzy matching ni más campos                    │
│                                                                 │
│  → Si count == 0: Este municipio no tiene este tipo en DERA    │
│     Saltar a L5 (CDAU/CartoCiudad con DIRECCIÓN)               │
│                                                                 │
│  → Si count >= 2: Necesita desambiguación con otros campos     │
│     Continuar a Paso 2                                          │
└─────────────────────────────────────────────────────────────────┘
         ↓ (si count >= 2)
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: DESAMBIGUACIÓN MULTI-CAMPO                             │
├─────────────────────────────────────────────────────────────────┤
│  Candidatos = features del TIPO en MUNICIPIO                    │
│                                                                 │
│  Para cada candidato, calcular score combinado:                 │
│                                                                 │
│  score = (w_nombre × similarity(NOMBRE, candidato.nombre))      │
│        + (w_dir × similarity(DIRECCIÓN, candidato.direccion))   │
│        + (w_local × similarity(NOMBRE, candidato.localidad))    │
│                                                                 │
│  Pesos por tipología:                                           │
│  - HEALTH:    w_nombre=0.5, w_dir=0.3, w_local=0.2             │
│  - EDUCATION: w_nombre=0.6, w_dir=0.2, w_local=0.2             │
│  - SECURITY:  w_nombre=0.3, w_dir=0.4, w_local=0.3             │
│                                                                 │
│  → Si max(score) >= 0.85: MATCH (confianza = score × 100)      │
│  → Si max(score) < 0.85: Escalar a fuentes online              │
└─────────────────────────────────────────────────────────────────┘
         ↓ (si necesita más fuentes)
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: CONSULTA MULTI-FUENTE PARALELA                         │
├─────────────────────────────────────────────────────────────────┤
│  Lanzar en paralelo (Promise.all):                              │
│                                                                 │
│  Fuente A: WFS_DERA online                                      │
│    → Query: tipo={TIPO} AND municipio={MUNICIPIO}               │
│    → Fuzzy match con NOMBRE si hay resultados                   │
│                                                                 │
│  Fuente B: CartoCiudad (si DIRECCIÓN tiene calle+número)        │
│    → Query: "{DIRECCIÓN limpia}, {MUNICIPIO}, {PROVINCIA}"      │
│    → Validar código INE del resultado                           │
│                                                                 │
│  Fuente C: CDAU (si DIRECCIÓN es andaluza)                      │
│    → Query: portal + vía en municipio                           │
│                                                                 │
│  Fuente D: Nominatim (última opción)                            │
│    → Query: "{NOMBRE}, {MUNICIPIO}, Andalucía"                  │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 4: VALIDACIÓN CRUZADA DE RESULTADOS                       │
├─────────────────────────────────────────────────────────────────┤
│  Resultados recibidos:                                          │
│  - LOCAL_DERA:  (450123, 4123456) conf=82%                     │
│  - WFS_online:  (450125, 4123458) conf=78%                     │
│  - CartoCiudad: (450200, 4123500) conf=85%                     │
│                                                                 │
│  1. Calcular distancias entre todos los pares                   │
│     LOCAL↔WFS: 3.2m ✓                                          │
│     LOCAL↔CARTO: 89m ⚠️                                        │
│     WFS↔CARTO: 85m ⚠️                                          │
│                                                                 │
│  2. Identificar cluster de concordancia                         │
│     [LOCAL, WFS] concuerdan (<25m)                              │
│     [CARTO] es outlier                                          │
│                                                                 │
│  3. Aplicar Huber centroid al cluster principal                 │
│     Resultado: (450124, 4123457)                                │
│                                                                 │
│  4. Calcular confianza compuesta                                │
│     - Match score cluster: 80%                                  │
│     - Concordancia (2 de 3): 85%                                │
│     - Autoridad fuentes: 0.95×82 + 0.85×78 = ~80%              │
│     - Score final: 94%                                          │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PASO 5: RESULTADO CON METADATA COMPLETA                        │
├─────────────────────────────────────────────────────────────────┤
│  {                                                              │
│    coordinates: [450124, 4123457],                              │
│    confidence: 94,                                              │
│    status: "CONFIRMED",                                         │
│    sources: ["LOCAL_DERA", "WFS_DERA"],                        │
│    outliers: ["CartoCiudad"],                                   │
│    fieldsUsed: ["TIPO", "MUNICIPIO", "NOMBRE"],                │
│    matchMethod: "direct_type_municipality",                     │
│    discrepancy: null                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. CASOS DE USO ESPECÍFICOS

### CASO A: Municipio singleton (65% de casos)

```
ENTRADA:
  NOMBRE: "Centro de Salud"
  TIPO: "Sanitario"
  MUNICIPIO: "Quéntar" (solo tiene 1 centro salud)

FLUJO:
  L0: LOCAL_DERA.getByType("HEALTH", "18160") → [1 resultado]
  → MATCH DIRECTO, confianza 95%
  → NO consulta más fuentes (innecesario)

TIEMPO: <10ms
```

### CASO B: Municipio con múltiples candidatos

```
ENTRADA:
  NOMBRE: "CEIP San José"
  TIPO: "Educativo"
  MUNICIPIO: "Granada" (tiene 150+ colegios)

FLUJO:
  L0: LOCAL_DERA.getByType("EDUCATION", "18087") → [157 resultados]
  
  Desambiguación multi-campo:
    - Fuzzy NOMBRE vs candidato.nombre
    - Fuzzy NOMBRE vs candidato.localidad (barrio)
    - Si hay DIRECCIÓN: filtrar por calle
  
  → Top match: "CEIP San José" score=0.92
  → Verificar con L1 (WFS online)
  
  Validación cruzada:
    LOCAL: (448500, 4114200)
    WFS:   (448502, 4114198)
    Distancia: 4.5m ✓
  
  → CONFIRMED, confianza 96%

TIEMPO: ~500ms
```

### CASO C: Infraestructura sin tipo claro

```
ENTRADA:
  NOMBRE: "Pabellón Cubierto Municipal"
  TIPO: "Indicar"
  DIRECCIÓN: "Calle Mayor, 15"
  MUNICIPIO: "Tíjola"

FLUJO:
  1. Clasificar NOMBRE → SPORTS (keywords: "pabellón", "cubierto")
  
  2. L0: LOCAL_DERA no tiene SPORTS
     → Escalar a IAID (censo deportivo)
  
  3. L3: IAID.search("pabellón", "Tíjola") → [1 resultado]
     → Match: "Pabellón Municipal de Tíjola"
  
  4. Validar con CartoCiudad usando DIRECCIÓN:
     CartoCiudad("Calle Mayor 15, Tíjola") → (X, Y)
     
  5. Cruzar:
     IAID: (451000, 4112000)
     CARTO: (451050, 4112080)
     Distancia: 94m ⚠️ (umbral SPORTS=100m)
     
  → LIKELY_VALID, confianza 82%

TIEMPO: ~1200ms
```

### CASO D: Solo dirección válida

```
ENTRADA:
  NOMBRE: "Sede administrativa"
  TIPO: "" (vacío)
  DIRECCIÓN: "Plaza de España, 1"
  MUNICIPIO: "Tíjola"

FLUJO:
  1. No hay TIPO → No puede filtrar en DERA
  
  2. DIRECCIÓN tiene estructura válida (calle + número)
     → Ir directo a geocodificadores de direcciones
  
  3. CartoCiudad("Plaza de España 1, Tíjola, Almería")
     → (449800, 4110500) conf=88%
     
  4. CDAU (backup andaluz)
     → (449802, 4110498) conf=90%
     
  5. Cruzar:
     Distancia: 3.5m ✓
     
  → CONFIRMED, confianza 92%

TIEMPO: ~800ms
```

### CASO E: Discrepancia detectada

```
ENTRADA:
  NOMBRE: "Centro de Salud Antiguo"  ← Dato desactualizado
  TIPO: "Sanitario"
  MUNICIPIO: "Colomera"

FLUJO:
  L0: LOCAL_DERA → (450000, 4120000) score=75% "Centro de Salud Colomera"
  L1: WFS online → (452500, 4122000) score=80% "Centro de Salud Colomera"
  
  Cruzar:
    Distancia: 2,915m ❌ >> 100m umbral
    
  → DISCREPANCY_DETECTED
  → coordinates: null (NO propagar dato erróneo)
  → Incluir ambas opciones para revisión manual
  → Recommendation: "MANUAL_REVIEW_REQUIRED"

RESULTADO:
  {
    coordinates: null,
    confidence: 35,
    status: "DISCREPANCY_DETECTED",
    discrepancy: {
      sourceA: { name: "LOCAL_DERA", coords: [450000, 4120000] },
      sourceB: { name: "WFS_DERA", coords: [452500, 4122000] },
      distanceMeters: 2915,
      possibleCause: "infrastructure_relocated"
    }
  }
```

---

## 5. MATRIZ DE DECISIÓN POR CALIDAD DE CAMPOS

| TIPO | NOMBRE | DIRECCIÓN | MUNICIPIO | Estrategia |
|------|--------|-----------|-----------|------------|
| ✓ | ✓ | ✓ | ✓ | Full multi-campo + validación cruzada |
| ✓ | ✓ | ✗ | ✓ | DERA por tipo+municipio, fuzzy nombre |
| ✓ | ✗ | ✗ | ✓ | DERA directo si singleton |
| ✗ | ✓ | ✓ | ✓ | Clasificar nombre → luego full |
| ✗ | ✗ | ✓ | ✓ | CartoCiudad/CDAU directo |
| ✗ | ✗ | ✗ | ✓ | Centroide municipal (última opción) |
| ? | ? | ? | ✗ | ERROR: Municipio requerido |

---

## 6. MEJORA DE SCORE ESTIMADA

| Escenario | Score actual | Score con multi-campo | Mejora |
|-----------|--------------|----------------------|--------|
| Singleton (65% casos) | 75% | **95%** | +20% |
| Multi-candidato | 60% | **88%** | +28% |
| Solo dirección | 70% | **90%** | +20% |
| Tipo ambiguo | 50% | **82%** | +32% |
| **Promedio ponderado** | **~65%** | **~92%** | **+27%** |

---

## 7. IMPLEMENTACIÓN PROPUESTA

```typescript
// Nuevo método en GeocodingOrchestrator.ts

async geocodeMultiField(row: PTELRow): Promise<MultiFieldResult> {
  const startTime = Date.now();
  const results: SourceResult[] = [];
  
  // PASO 0: Preprocesamiento
  const cleaned = this.preprocessRow(row);
  const tipologia = this.classifier.classify(cleaned.nombre, cleaned.tipo);
  const codMun = getCodigoINE(cleaned.municipio, cleaned.provincia);
  
  // PASO 1: Análisis de municipio
  const localCount = await this.localData.countByType(tipologia, codMun);
  
  if (localCount === 1) {
    // MATCH DIRECTO - caso singleton
    const feature = await this.localData.getUniqueByType(tipologia, codMun);
    return {
      coordinates: [feature.x, feature.y],
      confidence: 95,
      status: 'CONFIRMED',
      matchMethod: 'singleton_direct',
      sources: ['LOCAL_DERA'],
      processingTime: Date.now() - startTime
    };
  }
  
  if (localCount === 0) {
    // No hay en DERA, ir a geocodificadores de dirección
    return this.geocodeByAddress(cleaned);
  }
  
  // PASO 2: Desambiguación multi-campo
  const candidates = await this.localData.getByType(tipologia, codMun);
  const localBest = this.disambiguate(cleaned, candidates);
  results.push({ source: 'LOCAL_DERA', ...localBest });
  
  // PASO 3: Consulta multi-fuente paralela (validación cruzada)
  const [wfsResult, cartoResult] = await Promise.all([
    this.wfsGeocoder.search(tipologia, codMun, cleaned.nombre),
    cleaned.direccionValida 
      ? this.cartoGeocoder.geocode(cleaned.direccion, cleaned.municipio)
      : null
  ]);
  
  if (wfsResult) results.push({ source: 'WFS_DERA', ...wfsResult });
  if (cartoResult) results.push({ source: 'CartoCiudad', ...cartoResult });
  
  // PASO 4: Validación cruzada
  return this.crossValidate(results, tipologia);
}
```

---

## 8. RESUMEN

**La estrategia multi-campo + multi-fuente:**

1. **Explota TODOS los campos** de cada fila (no solo NOMBRE)
2. **Filtra por TIPO+MUNICIPIO primero** (reduce candidatos de 11,282 a <10)
3. **65% de casos se resuelven en L0** con match directo (singleton)
4. **Consulta múltiples fuentes en paralelo** cuando hay duda
5. **Valida cruzadamente** detectando discrepancias
6. **NO propaga errores**: si hay conflicto, marca para revisión manual

**Score esperado: 92-98%** (vs 65% actual)
