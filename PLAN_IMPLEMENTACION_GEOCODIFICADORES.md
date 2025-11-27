# Plan de Implementación de Geocodificadores PTEL

## Documento de Planificación para Integración de Recursos de Geocodificación

**Versión:** 1.0  
**Fecha:** Noviembre 2025  
**Estado:** Planificación  
**Objetivo:** Guía técnica para implementar todos los recursos de geocodificación identificados para el sistema PTEL Andalucía.

---

## Resumen Ejecutivo

Este documento detalla los **12 recursos de geocodificación** pendientes de implementación, organizados por prioridad y ROI. La implementación completa elevaría la cobertura de geocodificación del **~45% actual al ~85-90%**.

### Estado Actual vs Objetivo

```
COBERTURA ACTUAL (~45%)
██████████████████░░░░░░░░░░░░░░░░░░░░░░

OBJETIVO CON TODOS LOS RECURSOS (~85-90%)
██████████████████████████████████████░░
```

### Distribución por Prioridad

| Prioridad | Recursos | Tiempo Total | Impacto Acumulado |
|-----------|----------|--------------|-------------------|
| 🔴 ALTA | 4 recursos | 10-14 horas | +40-55% cobertura |
| 🟡 MEDIA | 4 recursos | 10-14 horas | +8-12% cobertura |
| 🟢 BAJA | 4 recursos | 11-15 horas | +2-3% cobertura |
| **TOTAL** | **12 recursos** | **31-43 horas** | **+50-70% cobertura** |

---

## PRIORIDAD ALTA (Implementar Primero)

### 1. CartoCiudad API — Fallback Universal

**Prioridad:** 🔴 CRÍTICA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +25-35% cobertura global  
**ROI:** ⭐⭐⭐⭐⭐

#### Descripción
Servicio de geocodificación del Instituto Geográfico Nacional (IGN) que cubre todas las direcciones postales de España. Es el **fallback universal** cuando los geocodificadores especializados no encuentran resultados.

#### Endpoints

| Servicio | URL | Método |
|----------|-----|--------|
| Geocodificación | `https://www.cartociudad.es/geocoder/api/geocoder/findJsonp` | GET |
| Geocodificación inversa | `https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode` | GET |
| Candidatos | `https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp` | GET |

#### Parámetros Geocodificación

```typescript
interface CartoCiudadParams {
  q: string;           // Dirección a buscar (obligatorio)
  limit?: number;      // Número máximo de resultados (default: 10)
  countrycodes?: string; // Código país (ES)
  autocancel?: boolean;  // Cancelar búsquedas anteriores
}
```

#### Ejemplo de Respuesta

```json
{
  "id": "180001234",
  "address": "Calle Gran Vía 45, Granada",
  "type": "portal",
  "lat": 37.176487,
  "lng": -3.598557,
  "portalNumber": 45,
  "postalCode": "18001",
  "municipality": "Granada",
  "province": "Granada",
  "countryCode": "ES",
  "stateMsg": "success",
  "state": 1
}
```

#### Implementación Propuesta

```typescript
// src/services/geocoding/generic/CartoCiudadGeocoder.ts

export class CartoCiudadGeocoder {
  private readonly BASE_URL = 'https://www.cartociudad.es/geocoder/api/geocoder';
  
  async geocode(address: string, municipality?: string): Promise<GeocodingResult | null> {
    const query = municipality ? `${address}, ${municipality}` : address;
    
    const response = await fetch(
      `${this.BASE_URL}/findJsonp?q=${encodeURIComponent(query)}&limit=5`
    );
    
    const data = await response.json();
    
    if (data.state !== 1 || !data.lat || !data.lng) {
      return null;
    }
    
    // Convertir WGS84 a UTM30 ETRS89
    const [x, y] = this.wgs84ToUtm30(data.lng, data.lat);
    
    return {
      x,
      y,
      confidence: this.calculateConfidence(data.type),
      source: 'CartoCiudad',
      originalAddress: address,
      matchedAddress: data.address
    };
  }
  
  private calculateConfidence(type: string): number {
    const confidenceMap: Record<string, number> = {
      'portal': 95,
      'street': 70,
      'municipality': 40,
      'province': 20
    };
    return confidenceMap[type] || 50;
  }
}
```

#### Consideraciones Técnicas

- **Sistema de referencia:** WGS84 (EPSG:4326) → Convertir a UTM30 ETRS89 (EPSG:25830)
- **Rate limiting:** Sin límite documentado, pero usar caché agresivo
- **CORS:** ✅ Soportado
- **Licencia:** CC BY 4.0
- **Actualización:** Trimestral

#### Tests de Validación

```typescript
// Tests mínimos requeridos
describe('CartoCiudadGeocoder', () => {
  it('should geocode exact address', async () => {
    const result = await geocoder.geocode('Calle Gran Vía 45', 'Granada');
    expect(result).not.toBeNull();
    expect(result.confidence).toBeGreaterThanOrEqual(90);
  });
  
  it('should handle address with typos', async () => {
    const result = await geocoder.geocode('C/ Grn Via 45', 'Granada');
    expect(result).not.toBeNull();
  });
  
  it('should return null for non-existent address', async () => {
    const result = await geocoder.geocode('Calle Inventada 99999', 'Granada');
    expect(result).toBeNull();
  });
});
```

---

### 2. CDAU — Callejero Digital Andalucía Unificado

**Prioridad:** 🔴 CRÍTICA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +10-15% precisión en Andalucía  
**ROI:** ⭐⭐⭐⭐

#### Descripción
Callejero oficial de los 786 municipios andaluces con precisión a nivel de portal/edificio. Mayor precisión que CartoCiudad para direcciones andaluzas.

#### Endpoints

| Servicio | URL |
|----------|-----|
| Portal CDAU | `http://www.callejerodeandalucia.es` |
| Dataset abierto | `https://www.juntadeandalucia.es/datosabiertos/portal/dataset/callejero-digital-de-andalucia-unificado-cdau` |
| API REST | `https://www.callejerodeandalucia.es/portal/api/geocoder` |

#### Estructura de Datos

```typescript
interface CDAURecord {
  via_codigo: string;        // Código único de vía
  via_nombre: string;        // Nombre oficial de vía
  via_tipo: string;          // Tipo: Calle, Avenida, Plaza...
  numero_policia: number;    // Número de portal
  municipio_ine: string;     // Código INE municipio
  municipio_nombre: string;  // Nombre municipio
  provincia: string;         // Provincia
  codigo_postal: string;     // CP
  x_etrs89: number;          // Coordenada X UTM30
  y_etrs89: number;          // Coordenada Y UTM30
}
```

#### Implementación Propuesta

```typescript
// src/services/geocoding/generic/CDAUGeocoder.ts

export class CDAUGeocoder {
  private readonly API_URL = 'https://www.callejerodeandalucia.es/portal/api/geocoder';
  
  async geocode(options: {
    street: string;
    number?: string;
    municipality: string;
    province?: string;
  }): Promise<GeocodingResult | null> {
    
    const params = new URLSearchParams({
      via: options.street,
      numero: options.number || '',
      municipio: options.municipality,
      provincia: options.province || ''
    });
    
    const response = await fetch(`${this.API_URL}?${params}`);
    const data = await response.json();
    
    if (!data.success || !data.results?.length) {
      return null;
    }
    
    const best = data.results[0];
    
    return {
      x: best.x_etrs89,
      y: best.y_etrs89,
      confidence: this.calculateConfidence(best),
      source: 'CDAU',
      matchedAddress: `${best.via_tipo} ${best.via_nombre} ${best.numero_policia}`,
      metadata: {
        codigoVia: best.via_codigo,
        codigoINE: best.municipio_ine
      }
    };
  }
}
```

#### Consideraciones Técnicas

- **Sistema de referencia:** Ya en UTM30 ETRS89 (EPSG:25830) — No requiere conversión
- **Cobertura:** Solo Andalucía (786 municipios)
- **Precisión:** Portal/edificio (~5m)
- **CORS:** Verificar (posible proxy necesario)
- **Prioridad:** Usar ANTES que CartoCiudad para direcciones andaluzas

---

### 3. REDIAM Infraestructuras Hidráulicas

**Prioridad:** 🔴 ALTA  
**Tiempo estimado:** 3-4 horas  
**Impacto:** +3-5% registros PTEL  
**ROI:** ⭐⭐⭐⭐

#### Descripción
Servicio WFS de la Red de Información Ambiental de Andalucía con infraestructuras hidráulicas críticas: EDAR, captaciones, embalses, estaciones depuradoras.

#### Endpoints

| Servicio | URL |
|----------|-----|
| WFS Hidráulicas | `https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas` |
| Catálogo REDIAM | `https://www.juntadeandalucia.es/medioambiente/portal/web/rediam` |

#### Capas Disponibles

| Capa | Contenido | Registros aprox. |
|------|-----------|------------------|
| `EDAR` | Estaciones depuradoras | ~500 |
| `Captaciones` | Puntos de captación agua | ~1,200 |
| `Embalses` | Presas y embalses | ~80 |
| `Desaladoras` | Plantas desalinización | ~15 |

#### Implementación Propuesta

```typescript
// src/services/geocoding/specialized/WFSHydraulicGeocoder.ts

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
  
  protected parseFeature(feature: any): WFSFeature | null {
    const props = feature.properties || {};
    const geom = feature.geometry;
    
    if (!geom?.coordinates) return null;
    
    const [x, y] = geom.coordinates;
    
    return {
      name: props.NOMBRE || props.DENOMINACION || '',
      x,
      y,
      municipality: props.MUNICIPIO || '',
      province: props.PROVINCIA || '',
      properties: {
        capacity: props.CAPACIDAD || props.HAB_EQUIV || '',
        status: props.ESTADO || '',
        type: props.TIPO || ''
      }
    };
  }
  
  async geocodeWithAutoLayer(options: WFSSearchOptions) {
    const nameLower = options.name.toLowerCase();
    
    // Detectar tipo por nombre
    if (nameLower.includes('edar') || nameLower.includes('depuradora')) {
      this.config.layerName = 'EDAR';
    } else if (nameLower.includes('embalse') || nameLower.includes('presa')) {
      this.config.layerName = 'Embalses';
    } else if (nameLower.includes('captacion') || nameLower.includes('pozo')) {
      this.config.layerName = 'Captaciones';
    }
    
    return this.geocode(options);
  }
}
```

#### Tipologías PTEL Cubiertas

- EDAR (Estaciones Depuradoras de Aguas Residuales)
- Plantas potabilizadoras (ETAP)
- Embalses y presas
- Captaciones de agua
- Desaladoras

---

### 4. Agencia Andaluza de la Energía WFS

**Prioridad:** 🔴 ALTA  
**Tiempo estimado:** 3-4 horas  
**Impacto:** +2-4% registros PTEL  
**ROI:** ⭐⭐⭐

#### Descripción
Servicio WFS con infraestructuras energéticas de Andalucía: subestaciones eléctricas, líneas de alta tensión, centros de transformación, gasoductos.

#### Endpoints

| Servicio | URL |
|----------|-----|
| WFS Energía | `https://www.agenciaandaluzadelaenergia.es/mapwms/wfs` |
| Geoportal | `https://www.agenciaandaluzadelaenergia.es/Cartografia/` |

#### Capas Disponibles (19 capas)

| Capa | Contenido |
|------|-----------|
| `Subestaciones` | Subestaciones eléctricas |
| `Lineas_AT` | Líneas alta tensión |
| `CT_Distribucion` | Centros transformación |
| `Gasoductos` | Red de gas natural |
| `Estaciones_GN` | Estaciones reguladoras gas |
| `Centrales_Renovables` | Parques eólicos, solares |

#### Implementación Propuesta

```typescript
// src/services/geocoding/specialized/WFSEnergyGeocoder.ts

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
  
  async geocodeWithAutoLayer(options: WFSSearchOptions) {
    const nameLower = options.name.toLowerCase();
    
    if (nameLower.includes('subestacion') || nameLower.includes('set ')) {
      this.config.layerName = 'Subestaciones';
    } else if (nameLower.includes('linea') || nameLower.includes('lat ')) {
      this.config.layerName = 'Lineas_AT';
    } else if (nameLower.includes('centro transformacion') || nameLower.includes('ct ')) {
      this.config.layerName = 'CT_Distribucion';
    } else if (nameLower.includes('parque eolico') || nameLower.includes('planta solar')) {
      this.config.layerName = 'Centrales_Renovables';
    }
    
    return this.geocode(options);
  }
}
```

#### Tipologías PTEL Cubiertas

- Subestaciones eléctricas (críticas para emergencias)
- Centros de transformación
- Parques eólicos y plantas solares
- Infraestructura gasista

---

## PRIORIDAD MEDIA

### 5. OpenRTA — Registro Turismo Andalucía

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +3-5% registros PTEL  
**ROI:** ⭐⭐⭐

#### Descripción
Registro oficial de establecimientos turísticos de Andalucía. Útil para identificar **centros de acogida** en emergencias (hoteles grandes, albergues, campings).

#### Endpoints

| Servicio | URL |
|----------|-----|
| Dataset OpenRTA | `https://www.juntadeandalucia.es/datosabiertos/portal/dataset/openrta` |
| Buscador web | `https://www.juntadeandalucia.es/turismoydeporte/opencms/areas/turismo/registro-turismo/` |

#### Tipologías con Coordenadas

| Tipo | Cobertura | Utilidad PTEL |
|------|-----------|---------------|
| Hoteles 4-5★ | ✅ Alta | Centros acogida masiva |
| Albergues | ✅ Alta | Acogida grupos |
| Campings | ✅ Alta | Zonas concentración |
| Oficinas turismo | ✅ Alta | Puntos información |
| Casas rurales | ⚠️ Parcial | Acogida rural |

#### Implementación Propuesta

```typescript
// src/services/geocoding/specialized/OpenRTAGeocoder.ts

export class OpenRTAGeocoder {
  private readonly API_URL = 'https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/datastore_search';
  private readonly RESOURCE_ID = 'openrta-alojamientos'; // Verificar ID real
  
  async geocode(options: {
    name: string;
    municipality: string;
    facilityType?: 'hotel' | 'albergue' | 'camping';
  }): Promise<GeocodingResult | null> {
    
    const filters: Record<string, string> = {
      municipio: options.municipality
    };
    
    if (options.facilityType) {
      filters.tipo = options.facilityType;
    }
    
    const response = await fetch(`${this.API_URL}?` + new URLSearchParams({
      resource_id: this.RESOURCE_ID,
      filters: JSON.stringify(filters),
      limit: '100'
    }));
    
    const data = await response.json();
    
    if (!data.success || !data.result?.records?.length) {
      return null;
    }
    
    // Fuzzy match por nombre
    const bestMatch = this.findBestMatch(options.name, data.result.records);
    
    if (!bestMatch) return null;
    
    return {
      x: parseFloat(bestMatch.coordenada_x),
      y: parseFloat(bestMatch.coordenada_y),
      confidence: bestMatch.score * 100,
      source: 'OpenRTA',
      metadata: {
        categoria: bestMatch.categoria,
        capacidad: bestMatch.plazas
      }
    };
  }
}
```

---

### 6. REDIAM Equipamientos Uso Público

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +3-5% registros PTEL  
**ROI:** ⭐⭐

#### Descripción
Equipamientos de uso público en espacios naturales: centros de visitantes, áreas recreativas, miradores, senderos señalizados.

#### Endpoints

| Servicio | URL |
|----------|-----|
| WMS Equipamientos | `https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_Equipamientos_Uso_Publico_Andalucia` |
| WMS Espacios Naturales | `http://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_Espacios_Naturales_Protegidos` |

#### Tipologías PTEL Cubiertas

- Centros de visitantes
- Áreas recreativas (concentración personas)
- Campamentos públicos
- Senderos (rutas evacuación)
- Miradores y observatorios

---

### 7. Catastro INSPIRE

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 4-5 horas  
**Impacto:** Validación cruzada  
**ROI:** ⭐⭐

#### Descripción
Servicio WFS del Catastro para validación cruzada de coordenadas y obtención de geometrías de parcelas/edificios.

#### Endpoints

| Servicio | URL | Uso |
|----------|-----|-----|
| WFS Direcciones | `https://ovc.catastro.meh.es/INSPIRE/wfsAD.aspx` | Validar direcciones |
| WFS Edificios | `https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx` | Geometría edificios |
| API RC→Coords | `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx` | Ref. catastral |

#### Uso Principal
- **NO para geocodificación primaria** (lento, complejo)
- **SÍ para validación** de coordenadas obtenidas por otros medios
- Verificar que coordenadas caen dentro de parcela esperada

---

### 8. DERA G11 Patrimonio

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +1-2% registros PTEL  
**ROI:** ⭐⭐

#### Descripción
Capa de patrimonio histórico de DERA complementaria a DERA G09 Cultura (ya implementado). Incluye BIC y zonas arqueológicas no cubiertas por G09.

#### Endpoints

| Servicio | URL |
|----------|-----|
| WFS DERA G11 | `https://www.ideandalucia.es/services/DERA_g11_patrimonio/wfs` |

#### Capas Adicionales

- `g11_01_BIC` — Bienes de Interés Cultural
- `g11_02_ZonaArqueologica` — Zonas arqueológicas protegidas
- `g11_03_ConjuntoHistorico` — Conjuntos históricos

**Nota:** Verificar solapamiento con DERA G09 para evitar duplicados.

---

## PRIORIDAD BAJA

### 9. MITECO Gasolineras

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 2 horas  
**Impacto:** +1% registros PTEL  
**ROI:** ⭐

#### Endpoints

| Servicio | URL |
|----------|-----|
| Geoportal Gasolineras | `https://geoportalgasolineras.es/` |
| API precios | `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/` |

#### Notas
- Pocas gasolineras aparecen en documentos PTEL (<1%)
- Implementar solo si hay demanda específica

---

### 10. IDEADIF — Red Ferroviaria

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +0.5-1% registros PTEL  
**ROI:** ⭐

#### Endpoints

| Servicio | URL |
|----------|-----|
| Geoportal IDEADIF | `https://ideadif.adif.es/` |
| WMS INSPIRE | Disponible en geoportal |

#### Notas
- Solo ~30 estaciones en Andalucía
- Implementar si se procesan PTELs con infraestructura ferroviaria

---

### 11. ENAIRE AIP — Helipuertos

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 3-4 horas  
**Impacto:** +0.2% registros PTEL  
**ROI:** ⭐

#### Endpoints

| Servicio | URL |
|----------|-----|
| Portal AIP | `https://aip.enaire.es/` |
| Datos aeronáuticos | Formato AIXM/OACI |

#### Notas
- Solo ~15 helipuertos en Andalucía
- Formato complejo (ciclo AIRAC 28 días)
- Implementar solo para PTELs con helipuertos específicos

---

### 12. Patronatos Provinciales

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 4-6 horas  
**Impacto:** Variable  
**ROI:** ⭐

#### Descripción
8 APIs/portales diferentes, uno por provincia. Alto esfuerzo de mantenimiento, datos mayormente duplicados con otros recursos.

#### URLs por Provincia

| Provincia | URL | Madurez |
|-----------|-----|---------|
| Málaga | `https://idemap.es/apiIDEMAP/` | ⭐⭐⭐⭐⭐ |
| Granada | `http://siggra.dipgra.es` | ⭐⭐⭐⭐ |
| Cádiz | `https://www.dipucadiz.es/idecadiz/` | ⭐⭐⭐⭐ |
| Jaén | `https://ide.dipujaen.es/geoportal/` | ⭐⭐⭐ |
| Sevilla | `https://www.dipusevilla.es/ideasevilla/` | ⭐⭐⭐ |
| Córdoba | EPRINSA OpenData | ⭐⭐⭐ |
| Almería | Geoportal Dipalme | ⭐⭐ |
| Huelva | turismohuelva.org | ⭐ |

#### Recomendación
Implementar solo IDEMAP Málaga (API REST bien documentada) si hay necesidad específica.

---

## Integración en GeocodingOrchestrator

### Flujo Actualizado con Todos los Recursos

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTRADA: Registro PTEL                       │
│         (nombre, dirección, municipio, tipología)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PASO 1: Clasificar tipología                       │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   SANITARIO   │   │   EDUCATIVO   │   │   INDUSTRIAL  │
│  WFSHealth    │   │  WFSEducation │   │  WFSHydraulic │
│  (DERA G12)   │   │  (API CKAN)   │   │  WFSEnergy    │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼ Sin match especializado
┌─────────────────────────────────────────────────────────────────┐
│           PASO 2: Fallback CDAU (solo Andalucía)                │
│                                                                 │
│   CDAUGeocoder → Dirección + Municipio → Coordenadas UTM30     │
│   Precisión: Portal/edificio (~5m)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Sin resultado CDAU
┌─────────────────────────────────────────────────────────────────┐
│           PASO 3: Fallback CartoCiudad (España)                 │
│                                                                 │
│   CartoCiudadGeocoder → Dirección → WGS84 → UTM30              │
│   Precisión: Variable (portal/calle/municipio)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Sin resultado
┌─────────────────────────────────────────────────────────────────┐
│           PASO 4: Flag para revisión manual                     │
│                                                                 │
│   → GEOCODING_NEEDED = true                                    │
│   → Cola de pendientes                                         │
│   → Visor Leaflet para corrección manual                       │
└─────────────────────────────────────────────────────────────────┘
```

### Modificaciones Requeridas en GeocodingOrchestrator.ts

```typescript
// Añadir imports
import { CartoCiudadGeocoder } from './generic/CartoCiudadGeocoder';
import { CDAUGeocoder } from './generic/CDAUGeocoder';
import { WFSHydraulicGeocoder } from './specialized/WFSHydraulicGeocoder';
import { WFSEnergyGeocoder } from './specialized/WFSEnergyGeocoder';

// En constructor
this.cartoCiudadGeocoder = new CartoCiudadGeocoder();
this.cdauGeocoder = new CDAUGeocoder();
this.hydraulicGeocoder = new WFSHydraulicGeocoder();
this.energyGeocoder = new WFSEnergyGeocoder();

// En método geocode(), añadir casos:
case InfrastructureType.HYDRAULIC:
  geocodingResult = await this.hydraulicGeocoder.geocodeWithAutoLayer(searchOptions);
  geocoderUsed = geocodingResult ? 'specialized:hydraulic' : geocoderUsed;
  break;

case InfrastructureType.ENERGY:
  geocodingResult = await this.energyGeocoder.geocodeWithAutoLayer(searchOptions);
  geocoderUsed = geocodingResult ? 'specialized:energy' : geocoderUsed;
  break;

// Modificar genericFallback()
private async genericFallback(options: WFSSearchOptions): Promise<GeocodingResult | null> {
  // Intento 1: CDAU (más preciso para Andalucía)
  let result = await this.cdauGeocoder.geocode({
    street: options.name,
    municipality: options.municipality,
    province: options.province
  });
  
  if (result && result.confidence >= 70) {
    return result;
  }
  
  // Intento 2: CartoCiudad (fallback nacional)
  const address = `${options.name}, ${options.municipality}`;
  result = await this.cartoCiudadGeocoder.geocode(address);
  
  return result;
}
```

---

## Checklist de Implementación

### Prioridad Alta (10-14h)

- [ ] **CartoCiudad API**
  - [ ] Crear `src/services/geocoding/generic/CartoCiudadGeocoder.ts`
  - [ ] Implementar conversión WGS84 → UTM30
  - [ ] Integrar en `genericFallback()`
  - [ ] Tests unitarios
  - [ ] Test con datos reales PTEL

- [ ] **CDAU**
  - [ ] Crear `src/services/geocoding/generic/CDAUGeocoder.ts`
  - [ ] Verificar formato respuesta API
  - [ ] Integrar ANTES de CartoCiudad en fallback
  - [ ] Tests unitarios

- [ ] **REDIAM Hidráulicas**
  - [ ] Crear `src/services/geocoding/specialized/WFSHydraulicGeocoder.ts`
  - [ ] Mapear capas: EDAR, Embalses, Captaciones
  - [ ] Añadir `InfrastructureType.HYDRAULIC`
  - [ ] Integrar en orquestador
  - [ ] Tests unitarios

- [ ] **Agencia Energía WFS**
  - [ ] Crear `src/services/geocoding/specialized/WFSEnergyGeocoder.ts`
  - [ ] Mapear capas: Subestaciones, Líneas AT
  - [ ] Añadir `InfrastructureType.ENERGY`
  - [ ] Integrar en orquestador
  - [ ] Tests unitarios

### Prioridad Media (10-14h)

- [ ] **OpenRTA**
- [ ] **REDIAM Equipamientos**
- [ ] **Catastro INSPIRE**
- [ ] **DERA G11 Patrimonio**

### Prioridad Baja (11-15h)

- [ ] **MITECO Gasolineras**
- [ ] **IDEADIF**
- [ ] **ENAIRE AIP**
- [ ] **Patronatos provinciales**

---

## Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Nov 2025 | Documento inicial con 12 recursos |

---

*Documento generado para el proyecto PTEL Andalucía - Normalizador de Coordenadas*
