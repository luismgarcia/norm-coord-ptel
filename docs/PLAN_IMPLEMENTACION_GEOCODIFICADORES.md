# Plan de Implementación de Geocodificadores PTEL

## Resumen Ejecutivo

Este documento detalla los **12 recursos de geocodificación** identificados para el sistema PTEL Andalucía, organizados por prioridad de implementación según su ROI (Return On Investment).

**Estado actual:** 4 geocodificadores implementados (~45% cobertura)  
**Objetivo:** 12 geocodificadores (~85-90% cobertura)  
**Tiempo total estimado:** 31-43 horas

---

## Índice

1. [Estado Actual](#estado-actual)
2. [Recursos por Prioridad](#recursos-por-prioridad)
3. [Alta Prioridad (1-4)](#alta-prioridad)
4. [Media Prioridad (5-8)](#media-prioridad)
5. [Baja Prioridad (9-12)](#baja-prioridad)
6. [Cronograma Recomendado](#cronograma-recomendado)
7. [Dependencias Técnicas](#dependencias-técnicas)

---

## Estado Actual

### Geocodificadores Implementados

| Geocodificador | Archivo | Servicio | Estado |
|----------------|---------|----------|--------|
| `WFSHealthGeocoder` | `src/services/geocoding/specialized/WFSHealthGeocoder.ts` | DERA G12 | ✅ Funcional |
| `WFSEducationGeocoder` | `src/services/geocoding/specialized/WFSEducationGeocoder.ts` | API CKAN | ✅ Funcional |
| `WFSCulturalGeocoder` | `src/services/geocoding/specialized/WFSCulturalGeocoder.ts` | DERA G09 | ✅ Funcional |
| `WFSSecurityGeocoder` | `src/services/geocoding/specialized/WFSSecurityGeocoder.ts` | ISE | ⚠️ API no pública |

### Gap Crítico

El `GeocodingOrchestrator.ts` tiene un método `genericFallback()` marcado como **TODO**:

```typescript
private async genericFallback(options: WFSSearchOptions): Promise<GeocodingResult | null> {
  // Placeholder - implementar CartoCiudad en Fase 2
  console.warn('Fallback genérico no implementado aún (Fase 2)');
  return null;
}
```

**Consecuencia:** Si falla el geocodificador especializado, el sistema retorna `null` sin alternativa.

---

## Recursos por Prioridad

| # | Recurso | Prioridad | Tiempo | Impacto | ROI |
|---|---------|-----------|--------|---------|-----|
| 1 | CartoCiudad API | 🔴 CRÍTICA | 2-3h | +25-35% | ⭐⭐⭐⭐⭐ |
| 2 | CDAU | 🔴 CRÍTICA | 2-3h | +10-15% | ⭐⭐⭐⭐ |
| 3 | REDIAM Hidráulicas | 🟠 ALTA | 3-4h | +3-5% | ⭐⭐⭐⭐ |
| 4 | Agencia Energía WFS | 🟠 ALTA | 3-4h | +2-4% | ⭐⭐⭐ |
| 5 | OpenRTA | 🟡 MEDIA | 2-3h | +3-5% | ⭐⭐⭐ |
| 6 | REDIAM Equipamientos | 🟡 MEDIA | 2-3h | +3-5% | ⭐⭐ |
| 7 | Catastro INSPIRE | 🟡 MEDIA | 4-5h | Validación | ⭐⭐ |
| 8 | DERA G11 Patrimonio | 🟡 MEDIA | 2-3h | +1-2% | ⭐⭐ |
| 9 | MITECO Gasolineras | 🟢 BAJA | 2h | +1% | ⭐ |
| 10 | IDEADIF | 🟢 BAJA | 2-3h | +0.5-1% | ⭐ |
| 11 | ENAIRE AIP | 🟢 BAJA | 3-4h | +0.2% | ⭐ |
| 12 | Patronatos Provinciales | 🟢 BAJA | 4-6h | Variable | ⭐ |

---

## Alta Prioridad

### 1. CartoCiudad API (IGN/CNIG)

**Prioridad:** 🔴 CRÍTICA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +25-35% cobertura global (fallback universal)

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **Endpoint Geocoder** | `https://www.cartociudad.es/geocoder/api/geocoder/findJsonp` |
| **Endpoint Reverse** | `https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode` |
| **Endpoint Candidates** | `https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp` |
| **Formato respuesta** | JSON/JSONP |
| **Sistema coordenadas** | WGS84 (EPSG:4326) |
| **Límite requests** | Sin límite documentado (uso razonable) |
| **CORS** | ✅ Soportado |
| **Autenticación** | No requerida |

#### Ejemplo de Consulta

```javascript
// Geocodificación directa
const url = 'https://www.cartociudad.es/geocoder/api/geocoder/findJsonp?' + 
  new URLSearchParams({
    q: 'Calle Gran Vía 1, Granada',
    type: 'portal',
    tip_via: null,
    id: null,
    portal: null,
    municipio: 'Granada',
    provincia: 'Granada',
    comunidad: 'Andalucía',
    countrycodes: 'es'
  });

// Respuesta esperada
{
  "id": "180870001234",
  "province": "Granada",
  "muni": "Granada",
  "type": "portal",
  "address": "GRAN VIA",
  "portalNumber": 1,
  "geom": "POINT(-3.598765 37.176543)",
  "tip_via": "CALLE",
  "lat": 37.176543,
  "lng": -3.598765,
  "stateMsg": "Resultado exacto",
  "state": 1,
  "countryCode": "011"
}
```

#### Campos de Respuesta

| Campo | Descripción | Uso PTEL |
|-------|-------------|----------|
| `lat`, `lng` | Coordenadas WGS84 | Transformar a UTM30 |
| `state` | 1=exacto, 2=aproximado | Calcular confianza |
| `stateMsg` | Descripción del match | Logging/debug |
| `type` | portal/municipio/provincia | Filtrar precisión |
| `muni` | Municipio normalizado | Validación cruzada |

#### Implementación Propuesta

```typescript
// src/services/geocoding/generic/CartoCiudadGeocoder.ts

export class CartoCiudadGeocoder {
  private readonly BASE_URL = 'https://www.cartociudad.es/geocoder/api/geocoder';
  
  async geocode(address: string, municipality: string, province: string): Promise<GeocodingResult | null> {
    const params = new URLSearchParams({
      q: `${address}, ${municipality}`,
      municipio: municipality,
      provincia: province,
      type: 'portal'
    });
    
    const response = await fetch(`${this.BASE_URL}/findJsonp?${params}`);
    const data = await response.json();
    
    if (data.state !== 1 && data.state !== 2) {
      return null;
    }
    
    // Transformar WGS84 → UTM30
    const [x, y] = proj4('EPSG:4326', 'EPSG:25830', [data.lng, data.lat]);
    
    return {
      x,
      y,
      confidence: data.state === 1 ? 85 : 60,
      source: 'CartoCiudad',
      originalAddress: address,
      matchedAddress: data.address
    };
  }
}
```

#### Integración con Orquestador

Modificar `GeocodingOrchestrator.ts`:

```typescript
import { CartoCiudadGeocoder } from './generic/CartoCiudadGeocoder';

private cartoCiudadGeocoder = new CartoCiudadGeocoder();

private async genericFallback(options: WFSSearchOptions): Promise<GeocodingResult | null> {
  return this.cartoCiudadGeocoder.geocode(
    options.name,
    options.municipality,
    options.province
  );
}
```

---

### 2. CDAU (Callejero Digital Andalucía Unificado)

**Prioridad:** 🔴 CRÍTICA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +10-15% precisión en Andalucía

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **Portal** | `http://www.callejerodeandalucia.es` |
| **Dataset** | `https://www.juntadeandalucia.es/datosabiertos/portal/dataset/callejero-digital-de-andalucia-unificado-cdau` |
| **API WFS** | `https://www.callejerodeandalucia.es/services/cdau/wfs` |
| **Capas** | `cdau_portal`, `cdau_vial`, `cdau_tramo` |
| **Formato** | WFS 2.0 / GeoJSON |
| **Sistema coordenadas** | ETRS89 UTM30 (EPSG:25830) |
| **CORS** | ⚠️ Requiere verificación |
| **Cobertura** | 786 municipios andaluces |

#### Campos Disponibles

| Campo | Descripción |
|-------|-------------|
| `INE_MUN` | Código INE municipio |
| `MUNICIPIO` | Nombre municipio |
| `TIPO_VIA` | Calle, Avenida, Plaza... |
| `NOMBRE_VIA` | Nombre normalizado |
| `NUM_PORTAL` | Número de portal |
| `COD_POSTAL` | Código postal |
| `X_ETRS89`, `Y_ETRS89` | Coordenadas UTM30 |

#### Ejemplo Consulta WFS

```
https://www.callejerodeandalucia.es/services/cdau/wfs?
  service=WFS
  &version=2.0.0
  &request=GetFeature
  &typeName=cdau_portal
  &outputFormat=application/json
  &CQL_FILTER=MUNICIPIO='Granada' AND NOMBRE_VIA ILIKE '%Gran Vía%'
```

#### Ventaja sobre CartoCiudad

- **Precisión:** Nivel de portal/edificio (vs calle en CartoCiudad)
- **Coordenadas nativas:** Ya en UTM30 ETRS89 (sin transformación)
- **Actualización:** Más frecuente para Andalucía

---

### 3. REDIAM Infraestructuras Hidráulicas

**Prioridad:** 🟠 ALTA  
**Tiempo estimado:** 3-4 horas  
**Impacto:** +3-5% registros (EDAR, captaciones, embalses)

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **Endpoint WFS** | `https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas` |
| **Capas principales** | `edar`, `captaciones`, `embalses`, `depuradoras` |
| **Formato** | WFS 1.1 / GML |
| **Sistema coordenadas** | ETRS89 UTM30 (EPSG:25830) |
| **CORS** | ⚠️ Puede requerir proxy |
| **Registros** | ~500 EDAR + ~200 embalses + captaciones |

#### Tipologías PTEL Cubiertas

| Tipología | Capa REDIAM | Registros estimados |
|-----------|-------------|---------------------|
| EDAR | `edar` | ~450 |
| Depuradoras | `depuradoras` | ~50 |
| Embalses | `embalses` | ~80 |
| Captaciones agua | `captaciones` | ~300 |
| Desaladoras | `desaladoras` | ~15 |

#### Campos Clave

```
DENOMINACION: "EDAR Granada Sur"
MUNICIPIO: "Granada"
PROVINCIA: "Granada"
CAPACIDAD_HE: 500000  // Habitantes equivalentes
CAUDAL_M3DIA: 120000
TITULAR: "EMASAGRA"
X_UTM: 447123.45
Y_UTM: 4111234.56
```

#### Implementación Propuesta

```typescript
// src/services/geocoding/specialized/WFSHydraulicGeocoder.ts

export class WFSHydraulicGeocoder extends WFSBaseGeocoder {
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      wfsEndpoint: 'https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas',
      layerName: 'edar',
      fuzzyThreshold: 0.35,
      timeout: 20000,
      outputSRS: 'EPSG:25830'
    };
  }
  
  // Cambio automático entre capas: edar, embalses, captaciones
  async geocodeWithAutoLayer(options: WFSSearchOptions) {
    const nameLower = options.name.toLowerCase();
    
    if (nameLower.includes('edar') || nameLower.includes('depuradora')) {
      this.config.layerName = 'edar';
    } else if (nameLower.includes('embalse') || nameLower.includes('presa')) {
      this.config.layerName = 'embalses';
    } else if (nameLower.includes('captación') || nameLower.includes('potabilizadora')) {
      this.config.layerName = 'captaciones';
    }
    
    return this.geocode(options);
  }
}
```

---

### 4. Agencia Andaluza de la Energía WFS

**Prioridad:** 🟠 ALTA  
**Tiempo estimado:** 3-4 horas  
**Impacto:** +2-4% registros (infraestructura energética crítica)

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **Endpoint WFS** | `https://www.agenciaandaluzadelaenergia.es/mapwms/wfs` |
| **Capas** | 19 disponibles |
| **Formato** | WFS 1.1 / GML |
| **Sistema coordenadas** | ETRS89 UTM30 |
| **Cumplimiento** | INSPIRE Annex III Energy Resources |
| **Última actualización** | Junio 2025 |

#### Capas Principales

| Capa | Contenido | Registros est. |
|------|-----------|----------------|
| `subestaciones_electricas` | Subestaciones por nivel tensión | ~200 |
| `centros_transformacion` | CTs urbanos/rurales | ~1.000 |
| `lineas_alta_tension` | Trazado vectorial LAT | Líneas |
| `infraestructura_gas` | Gasoductos, ERMs | ~100 |
| `centrales_generacion` | Renovables y convencionales | ~150 |
| `parques_eolicos` | Aerogeneradores | ~180 parques |
| `plantas_fotovoltaicas` | Instalaciones FV | ~300 |

#### Tipologías PTEL Cubiertas

- Subestaciones eléctricas (infraestructura crítica)
- Centros de transformación
- Estaciones reguladoras de gas
- Centrales de generación (puntos de riesgo)

#### Implementación Propuesta

```typescript
// src/services/geocoding/specialized/WFSEnergyGeocoder.ts

export enum EnergyFacilityType {
  SUBSTATION = 'SUBESTACION',
  TRANSFORMER = 'CENTRO_TRANSFORMACION',
  GAS_STATION = 'ESTACION_GAS',
  POWER_PLANT = 'CENTRAL_GENERACION',
  WIND_FARM = 'PARQUE_EOLICO',
  SOLAR_PLANT = 'PLANTA_FOTOVOLTAICA'
}

export class WFSEnergyGeocoder extends WFSBaseGeocoder {
  protected getDefaultConfig(): SpecializedGeocoderConfig {
    return {
      wfsEndpoint: 'https://www.agenciaandaluzadelaenergia.es/mapwms/wfs',
      layerName: 'subestaciones_electricas',
      fuzzyThreshold: 0.4,
      timeout: 15000,
      outputSRS: 'EPSG:25830'
    };
  }
}
```

---

## Media Prioridad

### 5. OpenRTA (Registro Turismo Andalucía)

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +3-5% registros (centros acogida emergencias)

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **Dataset** | `https://www.juntadeandalucia.es/datosabiertos/portal/dataset/openrta` |
| **Formatos** | CSV, JSON, XML |
| **Sistema coordenadas** | WGS84 / ETRS89 |
| **Registros** | ~15.000 establecimientos |
| **Actualización** | Continua (registro oficial) |

#### Tipologías con Coordenadas

| Tipología | Registros | Coordenadas |
|-----------|-----------|-------------|
| Hoteles | ~2.500 | ✅ Completas |
| Hostales/Pensiones | ~1.800 | ✅ Completas |
| Campings | ~180 | ✅ Completas |
| Albergues | ~120 | ✅ Completas |
| Oficinas turismo | ~200 | ✅ Completas |
| Casas rurales | ~3.500 | ⚠️ Parciales |
| VFTs | ~6.000 | ⚠️ En proceso |

#### Utilidad PTEL

Identificar establecimientos con **capacidad de acogida masiva** para evacuaciones:
- Hoteles >100 plazas
- Albergues municipales
- Campings con infraestructura

---

### 6. REDIAM Equipamientos Uso Público

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +3-5% registros (espacios naturales, senderos)

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **WMS** | `https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_Equipamientos_Uso_Publico_Andalucia` |
| **WFS** | Verificar disponibilidad |
| **Capas** | Centros visitantes, miradores, áreas recreativas, senderos |

#### Tipologías PTEL

- Áreas recreativas (concentración personas)
- Centros de visitantes (puntos de reunión)
- Senderos señalizados (rutas evacuación/búsqueda)
- Miradores (puntos de control)

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
| **API RC→Coords** | `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx` |
| **Formato** | INSPIRE GML |

#### Uso Principal

- **Validación cruzada:** Confirmar coordenadas obtenidas de otras fuentes
- **Geometría parcelas:** Para infraestructuras sin punto exacto
- **Referencia catastral:** Si disponible en PTEL

---

### 8. DERA G11 Patrimonio

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +1-2% registros (complemento a G09 Cultura)

#### Especificaciones Técnicas

| Parámetro | Valor |
|-----------|-------|
| **WFS** | `https://www.ideandalucia.es/services/DERA_g11_patrimonio/wfs` |
| **Capas** | BIC, zonas arqueológicas, conjuntos históricos |

#### Diferencia con G09 Cultura

- **G09:** Museos, bibliotecas, teatros (equipamientos culturales activos)
- **G11:** Bienes inmuebles protegidos (monumentos, yacimientos, zonas)

---

## Baja Prioridad

### 9. MITECO Gasolineras

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 2 horas  
**Impacto:** +1% registros

| Parámetro | Valor |
|-----------|-------|
| **Geoportal** | `https://geoportalgasolineras.es/` |
| **API** | Requiere scraping o descarga manual |

---

### 10. IDEADIF (Red Ferroviaria)

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +0.5-1% registros

| Parámetro | Valor |
|-----------|-------|
| **Portal** | `https://ideadif.adif.es/` |
| **WMS** | INSPIRE Transport Networks |

---

### 11. ENAIRE AIP (Helipuertos)

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 3-4 horas  
**Impacto:** +0.2% registros (~15 helipuertos en Andalucía)

| Parámetro | Valor |
|-----------|-------|
| **Portal** | `https://aip.enaire.es/` |
| **Formato** | OACI, ciclo AIRAC 28 días |
| **Complejidad** | Alta (formato aeronáutico específico) |

---

### 12. Patronatos Provinciales

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 4-6 horas  
**Impacto:** Variable (datos duplicados con otros recursos)

| Provincia | API/Portal | Madurez |
|-----------|------------|---------|
| Málaga | IDEMAP API REST | ⭐⭐⭐⭐⭐ |
| Granada | Turgranada | ⭐⭐⭐⭐ |
| Cádiz | IDECádiz SPARQL | ⭐⭐⭐⭐ |
| Jaén | GR247 GPX/KML | ⭐⭐⭐ |
| Sevilla | PRODETUR | ⭐⭐⭐ |
| Córdoba | EPRINSA | ⭐⭐⭐ |
| Almería | Dipalme | ⭐⭐ |
| Huelva | Sin API | ⭐ |

**Nota:** Requiere 8 implementaciones diferentes con mantenimiento elevado.

---

## Cronograma Recomendado

### Fase 1: Alta Prioridad (10-14 horas)

| Semana | Recurso | Horas | Entregable |
|--------|---------|-------|------------|
| 1 | CartoCiudad | 2-3h | `CartoCiudadGeocoder.ts` + fallback funcional |
| 1 | CDAU | 2-3h | `CDAUGeocoder.ts` + mayor precisión Andalucía |
| 2 | REDIAM Hidráulicas | 3-4h | `WFSHydraulicGeocoder.ts` |
| 2 | Agencia Energía | 3-4h | `WFSEnergyGeocoder.ts` |

**Resultado esperado:** ~85% cobertura (vs ~45% actual)

### Fase 2: Media Prioridad (10-14 horas)

| Semana | Recurso | Horas | Entregable |
|--------|---------|-------|------------|
| 3 | OpenRTA | 2-3h | `OpenRTAGeocoder.ts` |
| 3 | REDIAM Equipamientos | 2-3h | `WFSEquipmentGeocoder.ts` |
| 4 | Catastro INSPIRE | 4-5h | `CatastroValidator.ts` |
| 4 | DERA G11 | 2-3h | Ampliar `WFSCulturalGeocoder.ts` |

**Resultado esperado:** ~90-95% cobertura

### Fase 3: Baja Prioridad (11-15 horas) - Opcional

Solo implementar si hay demanda específica de tipologías no cubiertas.

---

## Dependencias Técnicas

### Librerías Requeridas

```json
{
  "dependencies": {
    "proj4": "^2.9.0",       // Ya instalada - transformaciones coordenadas
    "axios": "^1.6.0",       // Ya instalada - HTTP requests
    "fuse.js": "^7.0.0"      // Ya instalada - fuzzy matching
  }
}
```

### Configuración CORS

Algunos servicios WFS legacy pueden requerir proxy:

```typescript
// vite.config.ts - proxy desarrollo
export default defineConfig({
  server: {
    proxy: {
      '/api/rediam': {
        target: 'https://www.juntadeandalucia.es/medioambiente',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rediam/, '')
      }
    }
  }
});
```

### Estructura de Archivos Propuesta

```
src/services/geocoding/
├── GeocodingOrchestrator.ts      # Ya existe - modificar
├── index.ts                       # Ya existe
├── generic/                       # NUEVO
│   ├── CartoCiudadGeocoder.ts    # Prioridad 1
│   └── CDAUGeocoder.ts           # Prioridad 2
├── specialized/                   # Ya existe
│   ├── WFSBaseGeocoder.ts        # Ya existe
│   ├── WFSHealthGeocoder.ts      # Ya existe
│   ├── WFSEducationGeocoder.ts   # Ya existe
│   ├── WFSCulturalGeocoder.ts    # Ya existe
│   ├── WFSSecurityGeocoder.ts    # Ya existe
│   ├── WFSHydraulicGeocoder.ts   # Prioridad 3
│   ├── WFSEnergyGeocoder.ts      # Prioridad 4
│   ├── OpenRTAGeocoder.ts        # Prioridad 5
│   └── WFSEquipmentGeocoder.ts   # Prioridad 6
└── validators/                    # NUEVO
    └── CatastroValidator.ts      # Prioridad 7
```

---

## Métricas de Éxito

| Métrica | Actual | Objetivo Fase 1 | Objetivo Final |
|---------|--------|-----------------|----------------|
| Cobertura global | ~45% | ~85% | ~90% |
| Registros con fallback | 0% | 70% | 80% |
| Tipologías especializadas | 4 | 6 | 10 |
| Tiempo medio geocodificación | - | <500ms | <300ms |

---

## Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Nov 2025 | Documento inicial - 12 recursos identificados |

---

*Documento generado para el proyecto PTEL Andalucía - Normalizador de Coordenadas*
