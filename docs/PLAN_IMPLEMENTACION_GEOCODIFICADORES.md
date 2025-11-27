# Plan de Implementación de Geocodificadores PTEL Andalucía

## Documento Técnico para Implementación de Recursos de Geocodificación

**Versión:** 1.0  
**Fecha:** Noviembre 2025  
**Estado:** Planificación  
**Autor:** Proyecto PTEL Normalizador de Coordenadas

---

## Resumen Ejecutivo

Este documento detalla el plan de implementación de **12 recursos de geocodificación** organizados por prioridad y ROI. El objetivo es aumentar la cobertura de geocodificación del **~45% actual al ~85-90%** mediante la integración sistemática de APIs y servicios WFS oficiales españoles y andaluces.

### Estado Actual vs Objetivo

```
COBERTURA ACTUAL:  ███████████████████░░░░░░░░░░░░░░░░░░░░░  ~45%
OBJETIVO FASE A:   ██████████████████████████████████████░░░  ~85%
OBJETIVO COMPLETO: ████████████████████████████████████████░  ~90%
```

### Recursos Ya Implementados

| Geocodificador | Archivo | Tipologías | Estado |
|----------------|---------|------------|--------|
| `WFSHealthGeocoder` | `src/services/geocoding/specialized/WFSHealthGeocoder.ts` | Sanitarios | ✅ Funcional |
| `WFSEducationGeocoder` | `src/services/geocoding/specialized/WFSEducationGeocoder.ts` | Educativos | ✅ Funcional |
| `WFSCulturalGeocoder` | `src/services/geocoding/specialized/WFSCulturalGeocoder.ts` | Culturales | ✅ Funcional |
| `WFSSecurityGeocoder` | `src/services/geocoding/specialized/WFSSecurityGeocoder.ts` | Seguridad | ⚠️ API no pública |

---

## Priorización de Implementación

### Matriz de Decisión

| # | Recurso | Tiempo | Impacto | ROI | Acumulado |
|---|---------|--------|---------|-----|-----------|
| 1 | CartoCiudad API | 2-3h | +25-35% | ⭐⭐⭐⭐⭐ | +25-35% |
| 2 | CDAU | 2-3h | +10-15% | ⭐⭐⭐⭐ | +35-50% |
| 3 | REDIAM Hidráulicas | 3-4h | +3-5% | ⭐⭐⭐⭐ | +38-55% |
| 4 | Agencia Energía WFS | 3-4h | +2-4% | ⭐⭐⭐ | +40-59% |
| 5 | OpenRTA | 2-3h | +3-5% | ⭐⭐⭐ | +43-64% |
| 6 | REDIAM Equipamientos | 2-3h | +3-5% | ⭐⭐ | +46-69% |
| 7 | Catastro INSPIRE | 4-5h | Validación | ⭐⭐ | — |
| 8 | DERA G11 Patrimonio | 2-3h | +1-2% | ⭐⭐ | +47-71% |
| 9 | MITECO Gasolineras | 2h | +1% | ⭐ | +48-72% |
| 10 | IDEADIF | 2-3h | +0.5-1% | ⭐ | +48-73% |
| 11 | ENAIRE AIP | 3-4h | +0.2% | ⭐ | +48-73% |
| 12 | Patronatos Provinciales | 4-6h | Variable | ⭐ | +50-75% |

### Fases de Implementación

| Fase | Recursos | Tiempo Total | Impacto |
|------|----------|--------------|---------|
| **A: Alta Prioridad** | 1-4 | 10-14 horas | +40-55% |
| **B: Media Prioridad** | 5-8 | 10-14 horas | +8-12% |
| **C: Baja Prioridad** | 9-12 | 11-15 horas | +2-3% |

---

## FASE A: ALTA PRIORIDAD

### 1. CartoCiudad API (IGN/CNIG)

**Prioridad:** 🔴 CRÍTICA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +25-35% cobertura global  
**Rol:** Fallback universal cuando fallan geocodificadores especializados

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **Endpoint Base** | `https://www.cartociudad.es/geocoder/api/geocoder/` |
| **Método Geocodificación** | `findJsonp` o `find` |
| **Método Inverso** | `reverseGeocode` |
| **Formato Respuesta** | JSON |
| **Sistema Coordenadas** | WGS84 (EPSG:4326) |
| **Autenticación** | No requerida |
| **Rate Limit** | ~100 req/min (no documentado oficialmente) |
| **CORS** | ✅ Soportado |
| **Licencia** | CC BY 4.0 |

#### Endpoints Disponibles

```
# Geocodificación directa
GET https://www.cartociudad.es/geocoder/api/geocoder/findJsonp?q={dirección}

# Con filtros
GET https://www.cartociudad.es/geocoder/api/geocoder/findJsonp?q={dirección}&type=street&tip_via=calle&id={municipio}

# Geocodificación inversa
GET https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode?lon={lon}&lat={lat}

# Candidatos (autocompletado)
GET https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp?q={texto}&limit=10
```

#### Estructura de Respuesta

```json
{
  "id": "280796",
  "province": "Granada",
  "muni": "Granada",
  "type": "portal",
  "address": "Calle Real de la Alhambra",
  "postalCode": "18009",
  "poblacion": "Granada",
  "geom": "POINT(-3.5878 37.1767)",
  "tip_via": "Calle",
  "lat": 37.1767,
  "lng": -3.5878,
  "portalNumber": 1,
  "stateMsg": "Resultado exacto",
  "state": 1,
  "countryCode": "011"
}
```

#### Implementación Propuesta

**Archivo:** `src/services/geocoding/generic/CartoCiudadGeocoder.ts`

```typescript
export class CartoCiudadGeocoder {
  private readonly BASE_URL = 'https://www.cartociudad.es/geocoder/api/geocoder';
  
  async geocode(address: string, municipality?: string): Promise<GeocodingResult | null>;
  async reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodingResult | null>;
  async getCandidates(query: string, limit?: number): Promise<Candidate[]>;
}
```

#### Integración con Orquestador

Modificar `GeocodingOrchestrator.ts`:

```typescript
private async genericFallback(options: WFSSearchOptions): Promise<GeocodingResult | null> {
  const cartoCiudad = new CartoCiudadGeocoder();
  const address = `${options.name}, ${options.municipality}, ${options.province}`;
  return await cartoCiudad.geocode(address, options.municipality);
}
```

#### Consideraciones

- Requiere transformación WGS84 → UTM30 (usar proj4)
- Implementar retry con backoff exponencial
- Cache de resultados por dirección normalizada
- Validar que coordenadas estén en Andalucía

---

### 2. CDAU - Callejero Digital de Andalucía Unificado

**Prioridad:** 🔴 CRÍTICA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +10-15% precisión en Andalucía  
**Rol:** Geocodificación de alta precisión para direcciones andaluzas

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **Portal Dataset** | `https://www.juntadeandalucia.es/datosabiertos/portal/dataset/cdau` |
| **API Base** | `http://www.callejerodeandalucia.es/geocoderv2/api/` |
| **Formato** | JSON |
| **Sistema Coordenadas** | ETRS89 UTM30 (EPSG:25830) |
| **Cobertura** | 786 municipios andaluces |
| **Precisión** | Nivel de portal/edificio |
| **CORS** | ⚠️ Puede requerir proxy |

#### Endpoints Disponibles

```
# Geocodificación
GET http://www.callejerodeandalucia.es/geocoderv2/api/geocoder/findJsonp?q={dirección}

# Búsqueda por municipio
GET http://www.callejerodeandalucia.es/geocoderv2/api/geocoder/findJsonp?q={dirección}&cod_mun={código_ine}

# Portal específico
GET http://www.callejerodeandalucia.es/geocoderv2/api/geocoder/portal?via={id_via}&numero={num}
```

#### Estructura de Respuesta

```json
{
  "id": "18087001234",
  "type": "portal",
  "address": "CALLE REAL 45",
  "muni_name": "Granada",
  "muni_code": "18087",
  "prov_name": "Granada",
  "postal_code": "18009",
  "x": 447856.23,
  "y": 4114567.89,
  "srs": "EPSG:25830"
}
```

#### Implementación Propuesta

**Archivo:** `src/services/geocoding/generic/CDAUGeocoder.ts`

```typescript
export class CDAUGeocoder {
  private readonly BASE_URL = 'http://www.callejerodeandalucia.es/geocoderv2/api/geocoder';
  
  async geocode(address: string, municipalityCode?: string): Promise<GeocodingResult | null>;
  async geocodePortal(streetId: string, number: number): Promise<GeocodingResult | null>;
  async findStreet(streetName: string, municipality: string): Promise<Street[]>;
}
```

#### Códigos INE Municipios

Incluir lookup table de códigos INE para los 786 municipios andaluces:

```typescript
const MUNICIPALITY_CODES: Record<string, string> = {
  'Granada': '18087',
  'Almería': '04013',
  'Málaga': '29067',
  // ... 783 más
};
```

#### Consideraciones

- Ya devuelve UTM30 (no requiere transformación)
- Mayor precisión que CartoCiudad para Andalucía
- Usar como primera opción antes de CartoCiudad
- Puede tener problemas CORS → preparar proxy opcional

---

### 3. REDIAM Infraestructuras Hidráulicas

**Prioridad:** 🟠 ALTA  
**Tiempo estimado:** 3-4 horas  
**Impacto:** +3-5% registros PTEL  
**Rol:** Geocodificación de EDAR, captaciones, embalses, depósitos

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **Endpoint WFS** | `https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas` |
| **Versión WFS** | 1.1.0 / 2.0.0 |
| **Formato Salida** | GeoJSON, GML |
| **Sistema Coordenadas** | ETRS89 UTM30 (EPSG:25830) |
| **Autenticación** | No requerida |
| **CORS** | ✅ Soportado |

#### Capas Disponibles

| Capa | Contenido | Registros aprox. |
|------|-----------|------------------|
| `EDAR` | Estaciones depuradoras | ~800 |
| `Captaciones` | Puntos de captación agua | ~2,000 |
| `Embalses` | Embalses y presas | ~100 |
| `Depositos` | Depósitos de agua | ~1,500 |
| `Conducciones` | Tuberías principales | Líneas |

#### Ejemplo Consulta WFS

```
https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas?
  service=WFS
  &version=2.0.0
  &request=GetFeature
  &typeName=EDAR
  &outputFormat=application/json
  &CQL_FILTER=MUNICIPIO='Granada'
```

#### Estructura de Respuesta

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [447123.45, 4112345.67]
  },
  "properties": {
    "NOMBRE": "EDAR Granada Sur",
    "MUNICIPIO": "Granada",
    "PROVINCIA": "Granada",
    "CAPACIDAD_HE": 250000,
    "ESTADO": "En servicio",
    "TITULAR": "Emasagra"
  }
}
```

#### Implementación Propuesta

**Archivo:** `src/services/geocoding/specialized/WFSHydraulicGeocoder.ts`

```typescript
export enum HydraulicFacilityType {
  EDAR = 'EDAR',
  CAPTACION = 'CAPTACION',
  EMBALSE = 'EMBALSE',
  DEPOSITO = 'DEPOSITO'
}

export class WFSHydraulicGeocoder extends WFSBaseGeocoder {
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      wfsEndpoint: 'https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas',
      layerName: 'EDAR',
      fuzzyThreshold: 0.3,
      timeout: 15000,
      outputSRS: 'EPSG:25830'
    };
  }
  
  async geocodeWithAutoLayer(options: HydraulicSearchOptions): Promise<GeocodingResult | null>;
}
```

#### Integración con Clasificador

Añadir tipos al `InfrastructureClassifier`:

```typescript
// Patrones para infraestructuras hidráulicas
const HYDRAULIC_PATTERNS = [
  /\bEDAR\b/i,
  /\bdepuradora\b/i,
  /\bembalse\b/i,
  /\bpresa\b/i,
  /\bdep[oó]sito\s*(de\s*)?agua\b/i,
  /\bcaptaci[oó]n\b/i,
  /\bpotabilizadora\b/i
];
```

---

### 4. Agencia Andaluza de la Energía WFS

**Prioridad:** 🟠 ALTA  
**Tiempo estimado:** 3-4 horas  
**Impacto:** +2-4% registros PTEL  
**Rol:** Geocodificación de subestaciones, líneas AT, centrales

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **Endpoint WFS** | `https://www.agenciaandaluzadelaenergia.es/mapwms/wfs` |
| **Versión WFS** | 1.1.0 |
| **Capas** | 19 disponibles |
| **Sistema Coordenadas** | ETRS89 UTM30 (EPSG:25830) |
| **Cumplimiento** | INSPIRE Annex III Energy Resources |
| **Actualización** | Junio 2025 |

#### Capas Principales

| Capa | Contenido | Geometría |
|------|-----------|-----------|
| `Subestaciones` | Subestaciones eléctricas | Punto |
| `CentrosTransformacion` | Centros de transformación | Punto |
| `LineasAltaTension` | Líneas de alta tensión | Línea |
| `Gasoductos` | Red de gas natural | Línea |
| `EstacionesRegulacion` | Estaciones regulación gas | Punto |
| `CentralesGeneracion` | Centrales eléctricas | Punto |

#### Ejemplo Consulta WFS

```
https://www.agenciaandaluzadelaenergia.es/mapwms/wfs?
  service=WFS
  &version=1.1.0
  &request=GetFeature
  &typeName=Subestaciones
  &outputFormat=application/json
  &BBOX=430000,4100000,460000,4130000,EPSG:25830
```

#### Implementación Propuesta

**Archivo:** `src/services/geocoding/specialized/WFSEnergyGeocoder.ts`

```typescript
export enum EnergyFacilityType {
  SUBSTATION = 'SUBESTACION',
  TRANSFORMER = 'CENTRO_TRANSFORMACION',
  POWER_LINE = 'LINEA_AT',
  GAS_STATION = 'ESTACION_GAS',
  POWER_PLANT = 'CENTRAL'
}

export class WFSEnergyGeocoder extends WFSBaseGeocoder {
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      wfsEndpoint: 'https://www.agenciaandaluzadelaenergia.es/mapwms/wfs',
      layerName: 'Subestaciones',
      fuzzyThreshold: 0.35,
      timeout: 15000,
      outputSRS: 'EPSG:25830'
    };
  }
}
```

#### Integración con Clasificador

```typescript
const ENERGY_PATTERNS = [
  /\bsubestaci[oó]n\b/i,
  /\bcentro\s*(de\s*)?transformaci[oó]n\b/i,
  /\bl[ií]nea\s*(de\s*)?(alta\s*)?tensi[oó]n\b/i,
  /\bcentral\s*(el[eé]ctrica|t[eé]rmica|solar|e[oó]lica)\b/i,
  /\bparque\s*(e[oó]lico|solar|fotovoltaico)\b/i,
  /\bgasoducto\b/i
];
```

---

## FASE B: MEDIA PRIORIDAD

### 5. OpenRTA - Registro de Turismo de Andalucía

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +3-5% registros PTEL (centros acogida emergencias)

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **Portal Dataset** | `https://www.juntadeandalucia.es/datosabiertos/portal/dataset/openrta` |
| **Formato** | CSV, JSON |
| **Sistema Coordenadas** | WGS84 / ETRS89 |
| **Cobertura** | Hoteles, campings, albergues, oficinas turismo |
| **Actualización** | Continua (registro oficial) |

#### Tipologías con Coordenadas

- ✅ Hoteles, hostales, pensiones
- ✅ Campings y áreas acampada
- ✅ Albergues
- ✅ Oficinas de turismo
- ⚠️ Casas rurales (incorporación progresiva)
- ⚠️ VFTs (parcial)

#### Implementación Propuesta

**Archivo:** `src/services/geocoding/specialized/OpenRTAGeocoder.ts`

```typescript
export class OpenRTAGeocoder {
  private readonly DATASET_URL = 'https://www.juntadeandalucia.es/datosabiertos/portal/dataset/openrta';
  
  async geocodeAccommodation(name: string, municipality: string): Promise<GeocodingResult | null>;
  async findLargeCapacityVenues(municipality: string, minCapacity: number): Promise<Venue[]>;
}
```

#### Utilidad PTEL

Identificar establecimientos con capacidad de acogida masiva para evacuaciones:
- Hoteles >100 habitaciones
- Albergues juveniles
- Campings con instalaciones cubiertas
- Pabellones deportivos (si incluidos)

---

### 6. REDIAM Equipamientos Uso Público

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +3-5% registros PTEL

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **Endpoint WMS/WFS** | `https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_Equipamientos_Uso_Publico_Andalucia` |
| **Contenido** | Centros visitantes, miradores, áreas recreativas, senderos |
| **Sistema Coordenadas** | ETRS89 UTM30 |

#### Capas Principales

| Capa | Contenido |
|------|-----------|
| `CentrosVisitantes` | Centros de interpretación |
| `AreasRecreativas` | Merenderos, zonas picnic |
| `Miradores` | Puntos panorámicos |
| `Senderos` | Rutas señalizadas (líneas) |
| `Campamentos` | Zonas acampada controlada |

#### Implementación Propuesta

**Archivo:** `src/services/geocoding/specialized/WFSPublicUseGeocoder.ts`

---

### 7. Catastro INSPIRE

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 4-5 horas  
**Impacto:** Validación cruzada de coordenadas

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **WFS Direcciones** | `https://ovc.catastro.meh.es/INSPIRE/wfsAD.aspx` |
| **WFS Edificios** | `https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx` |
| **API Coordenadas RC** | `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx` |
| **Sistema** | ETRS89 |

#### Uso Principal

- Validación cruzada de coordenadas obtenidas por otros métodos
- Obtención de geometría de parcelas/edificios
- Referencia catastral → coordenadas

#### Implementación Propuesta

**Archivo:** `src/services/validation/CatastroValidator.ts`

```typescript
export class CatastroValidator {
  async validateCoordinates(x: number, y: number): Promise<ValidationResult>;
  async getParcelGeometry(refCatastral: string): Promise<Geometry | null>;
  async coordinatesToRefCatastral(x: number, y: number): Promise<string | null>;
}
```

---

### 8. DERA G11 Patrimonio

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +1-2% registros PTEL

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **Endpoint WFS** | `https://www.ideandalucia.es/services/DERA_g11_patrimonio/wfs` |
| **Capas** | BIC, zonas arqueológicas, conjuntos históricos |
| **Solapamiento** | Parcial con DERA G09 (ya implementado) |

#### Capas Adicionales (no cubiertas por G09)

| Capa | Contenido |
|------|-----------|
| `g11_01_BIC` | Bienes de Interés Cultural (oficial) |
| `g11_02_ZonaArqueologica` | Zonas protección arqueológica |
| `g11_03_ConjuntoHistorico` | Cascos históricos protegidos |

#### Decisión de Implementación

Evaluar si las capas de G11 aportan registros no cubiertos por G09. Si el solapamiento es >80%, puede omitirse.

---

## FASE C: BAJA PRIORIDAD

### 9. MITECO Gasolineras

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 2 horas  
**Impacto:** +1% registros PTEL

#### Especificaciones

| Parámetro | Valor |
|-----------|-------|
| **Portal** | `https://geoportalgasolineras.es/` |
| **API** | REST JSON |
| **Cobertura** | Todas las estaciones de servicio España |

#### Implementación

Solo si aparecen gasolineras en documentos PTEL (poco común).

---

### 10. IDEADIF - Red Ferroviaria

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +0.5-1% registros PTEL

#### Especificaciones

| Parámetro | Valor |
|-----------|-------|
| **Portal** | `https://ideadif.adif.es/` |
| **Contenido** | Estaciones, apeaderos, trazado vías |
| **Formato** | WMS INSPIRE Transport Networks |

#### Registros en Andalucía

- ~60 estaciones principales
- ~40 apeaderos
- Infraestructura muy específica

---

### 11. ENAIRE AIP - Helipuertos

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 3-4 horas  
**Impacto:** +0.2% registros PTEL

#### Especificaciones

| Parámetro | Valor |
|-----------|-------|
| **Portal** | `https://aip.enaire.es/` |
| **Formato** | OACI, ciclo AIRAC (28 días) |
| **Registros Andalucía** | ~15 helipuertos |

#### Consideraciones

- Formato muy específico (aviación)
- Pocos registros pero críticos para emergencias
- Requiere parser especializado AIRAC

---

### 12. Patronatos Provinciales

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 4-6 horas  
**Impacto:** Variable

#### APIs por Provincia

| Provincia | Portal | Madurez | API |
|-----------|--------|---------|-----|
| Málaga | `https://idemap.es` | ⭐⭐⭐⭐⭐ | REST completa |
| Granada | `http://siggra.dipgra.es` | ⭐⭐⭐⭐ | WMS/WFS |
| Cádiz | `https://www.dipucadiz.es/idecadiz/` | ⭐⭐⭐⭐ | SPARQL |
| Jaén | `https://ide.dipujaen.es/geoportal/` | ⭐⭐⭐ | WMS |
| Sevilla | `https://www.dipusevilla.es/ideasevilla/` | ⭐⭐⭐ | WMS |
| Córdoba | EPRINSA | ⭐⭐⭐ | OpenData |
| Almería | Dipalme | ⭐⭐ | Básico |
| Huelva | — | ⭐ | Sin API |

#### Consideraciones

- 8 implementaciones diferentes
- Alto coste de mantenimiento
- Datos frecuentemente duplicados con fuentes autonómicas
- Implementar solo si hay gaps específicos provinciales

---

## Arquitectura de Integración

### Estructura de Carpetas Propuesta

```
src/services/geocoding/
├── index.ts
├── GeocodingOrchestrator.ts          # Ya existe
├── generic/
│   ├── CartoCiudadGeocoder.ts        # NUEVO - Fase A
│   ├── CDAUGeocoder.ts               # NUEVO - Fase A
│   └── index.ts
├── specialized/
│   ├── WFSBaseGeocoder.ts            # Ya existe
│   ├── WFSHealthGeocoder.ts          # Ya existe
│   ├── WFSEducationGeocoder.ts       # Ya existe
│   ├── WFSCulturalGeocoder.ts        # Ya existe
│   ├── WFSSecurityGeocoder.ts        # Ya existe
│   ├── WFSHydraulicGeocoder.ts       # NUEVO - Fase A
│   ├── WFSEnergyGeocoder.ts          # NUEVO - Fase A
│   ├── OpenRTAGeocoder.ts            # NUEVO - Fase B
│   ├── WFSPublicUseGeocoder.ts       # NUEVO - Fase B
│   └── index.ts
└── validation/
    ├── CatastroValidator.ts          # NUEVO - Fase B
    └── index.ts
```

### Flujo de Geocodificación Actualizado

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTRADA: Registro PTEL                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PASO 1: Clasificar tipología                       │
│    Sanitario │ Educativo │ Cultural │ Hidráulico │ Energía │...│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           PASO 2: Geocodificador especializado                  │
│   WFSHealth │ WFSEducation │ WFSHydraulic │ WFSEnergy │ ...    │
│             → Si match >70% → Coordenadas oficiales ✓           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Sin match
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           PASO 3: Fallback CDAU (Andalucía)                     │
│   → Dirección → Coordenadas UTM30                               │
│   → Si match → Confianza MEDIA-ALTA                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Sin resultado
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           PASO 4: Fallback CartoCiudad (Nacional)               │
│   → Dirección → Coordenadas WGS84 → Transformar UTM30          │
│   → Si match → Confianza MEDIA                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Sin resultado
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           PASO 5: Flag para revisión manual                     │
│   → GEOCODING_NEEDED = true                                     │
│   → Visor Leaflet para corrección                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Checklist de Implementación

### Fase A - Alta Prioridad

- [ ] **CartoCiudad API**
  - [ ] Crear `CartoCiudadGeocoder.ts`
  - [ ] Implementar geocodificación directa
  - [ ] Implementar geocodificación inversa
  - [ ] Añadir transformación WGS84 → UTM30
  - [ ] Integrar como fallback en orquestador
  - [ ] Tests unitarios
  
- [ ] **CDAU**
  - [ ] Crear `CDAUGeocoder.ts`
  - [ ] Implementar lookup códigos INE
  - [ ] Implementar geocodificación
  - [ ] Evaluar necesidad proxy CORS
  - [ ] Integrar antes de CartoCiudad en fallback
  - [ ] Tests unitarios

- [ ] **REDIAM Hidráulicas**
  - [ ] Crear `WFSHydraulicGeocoder.ts`
  - [ ] Implementar capas EDAR, Captaciones, Embalses
  - [ ] Añadir patrones al clasificador
  - [ ] Integrar en orquestador
  - [ ] Tests unitarios

- [ ] **Agencia Energía WFS**
  - [ ] Crear `WFSEnergyGeocoder.ts`
  - [ ] Implementar capas Subestaciones, Centrales
  - [ ] Añadir patrones al clasificador
  - [ ] Integrar en orquestador
  - [ ] Tests unitarios

### Fase B - Media Prioridad

- [ ] OpenRTA
- [ ] REDIAM Equipamientos
- [ ] Catastro INSPIRE
- [ ] DERA G11 Patrimonio

### Fase C - Baja Prioridad

- [ ] MITECO Gasolineras
- [ ] IDEADIF
- [ ] ENAIRE AIP
- [ ] Patronatos Provinciales

---

## Métricas de Éxito

| Métrica | Actual | Objetivo Fase A | Objetivo Final |
|---------|--------|-----------------|----------------|
| Cobertura geocodificación | ~45% | ~85% | ~90% |
| Precisión media | ~15m | ~10m | ~8m |
| Tiempo medio por registro | ~500ms | ~400ms | ~350ms |
| Tasa fallback exitoso | 0% | 70% | 80% |

---

## Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Nov 2025 | Documento inicial |

---

*Documento generado para el proyecto PTEL Andalucía - Normalizador de Coordenadas v4.2*
