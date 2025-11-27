# Plan de Implementación de Geocodificadores PTEL Andalucía

## Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estado Actual](#estado-actual)
3. [Recursos a Implementar](#recursos-a-implementar)
4. [Especificaciones Técnicas por Recurso](#especificaciones-técnicas-por-recurso)
5. [Plan de Implementación por Fases](#plan-de-implementación-por-fases)
6. [Arquitectura de Integración](#arquitectura-de-integración)
7. [Testing y Validación](#testing-y-validación)

---

## Resumen Ejecutivo

Este documento detalla el plan de implementación de 12 recursos de geocodificación para el sistema PTEL Andalucía. El objetivo es aumentar la cobertura de geocodificación del **~45% actual** al **85-90%** mediante la integración progresiva de APIs y servicios WFS oficiales.

### Métricas Objetivo

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Cobertura geocodificación | ~45% | 85-90% |
| Éxito fallback genérico | 0% | 70%+ |
| Tipologías cubiertas | 4 | 12+ |
| Tiempo medio geocodificación | N/A | <2s/registro |

---

## Estado Actual

### Geocodificadores Implementados

| Geocodificador | Archivo | Servicio | Estado |
|----------------|---------|----------|--------|
| `WFSHealthGeocoder` | `src/services/geocoding/specialized/WFSHealthGeocoder.ts` | DERA G12 | ✅ Funcional |
| `WFSEducationGeocoder` | `src/services/geocoding/specialized/WFSEducationGeocoder.ts` | API CKAN Educación | ✅ Funcional |
| `WFSCulturalGeocoder` | `src/services/geocoding/specialized/WFSCulturalGeocoder.ts` | DERA G09 | ✅ Funcional |
| `WFSSecurityGeocoder` | `src/services/geocoding/specialized/WFSSecurityGeocoder.ts` | ISE Seguridad | ⚠️ API no pública |

### Gap Crítico Identificado

El método `genericFallback()` en `GeocodingOrchestrator.ts` está marcado como TODO:

```typescript
private async genericFallback(options: WFSSearchOptions): Promise<GeocodingResult | null> {
  // Placeholder - implementar CartoCiudad en Fase 2
  console.warn('Fallback genérico no implementado aún (Fase 2)');
  return null;
}
```

**Impacto:** Si el geocodificador especializado falla, el sistema devuelve `null` sin alternativa.

---

## Recursos a Implementar

### Tabla Completa Priorizada

| # | Recurso | Prioridad | Esfuerzo | Impacto | ROI | Tipologías |
|---|---------|-----------|----------|---------|-----|------------|
| 1 | CartoCiudad API | 🔴 CRÍTICA | 2-3h | +25-35% | ⭐⭐⭐⭐⭐ | Fallback universal |
| 2 | CDAU | 🔴 CRÍTICA | 2-3h | +10-15% | ⭐⭐⭐⭐ | Direcciones 786 municipios |
| 3 | REDIAM Hidráulicas | 🟠 ALTA | 3-4h | +3-5% | ⭐⭐⭐⭐ | EDAR, captaciones, embalses |
| 4 | Agencia Energía WFS | 🟠 ALTA | 3-4h | +2-4% | ⭐⭐⭐ | Subestaciones, líneas AT |
| 5 | OpenRTA | 🟡 MEDIA | 2-3h | +3-5% | ⭐⭐⭐ | Hoteles, albergues, campings |
| 6 | REDIAM Equipamientos | 🟡 MEDIA | 2-3h | +3-5% | ⭐⭐ | Espacios naturales, senderos |
| 7 | Catastro INSPIRE | 🟡 MEDIA | 4-5h | Validación | ⭐⭐ | Parcelas, edificios |
| 8 | DERA G11 Patrimonio | 🟡 MEDIA | 2-3h | +1-2% | ⭐⭐ | BIC, zonas arqueológicas |
| 9 | MITECO Gasolineras | 🟢 BAJA | 2h | +1% | ⭐ | Estaciones servicio |
| 10 | IDEADIF | 🟢 BAJA | 2-3h | +0.5-1% | ⭐ | Estaciones tren |
| 11 | ENAIRE AIP | 🟢 BAJA | 3-4h | +0.2% | ⭐ | Helipuertos |
| 12 | Patronatos provinciales | 🟢 BAJA | 4-6h | Variable | ⭐ | Turismo complementario |

### Tiempo Total Estimado

| Opción | Recursos | Tiempo | Impacto |
|--------|----------|--------|---------|
| A - Solo Alta | 1-4 | 10-14h | +40-55% |
| B - Alta + Media | 1-8 | 20-28h | +48-67% |
| C - Todos | 1-12 | 31-43h | +50-70% |

---

## Especificaciones Técnicas por Recurso

### 1. CartoCiudad API (IGN/CNIG)

**Prioridad:** 🔴 CRÍTICA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +25-35% cobertura global (fallback universal)

#### Endpoints

| Operación | URL | Método |
|-----------|-----|--------|
| Geocodificación directa | `https://www.cartociudad.es/geocoder/api/geocoder/findJsonp` | GET |
| Geocodificación inversa | `https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode` | GET |
| Candidatos | `https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp` | GET |

#### Parámetros Geocodificación

```typescript
interface CartoCiudadParams {
  q: string;           // Dirección a buscar
  limit?: number;      // Máximo resultados (default: 10)
  countrycodes?: string; // "es" para España
  autocancel?: boolean;  // Cancelar búsquedas previas
}
```

#### Ejemplo de Respuesta

```json
{
  "id": "180790001234",
  "province": "Granada",
  "muni": "Granada",
  "type": "portal",
  "address": "CALLE SAN ANTON 72",
  "postalCode": "18005",
  "lat": 37.17734,
  "lng": -3.59856,
  "stateMsg": "OK",
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
    
    const response = await fetch(`${this.BASE_URL}/findJsonp?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.state !== 1) return null;
    
    return {
      x: data.lng,  // Nota: CartoCiudad devuelve WGS84
      y: data.lat,
      confidence: this.calculateConfidence(data),
      source: 'CartoCiudad',
      address: data.address,
      // Transformar a UTM30 si es necesario
    };
  }
}
```

#### Notas Técnicas

- **Sistema de coordenadas:** WGS84 (EPSG:4326) - requiere transformación a UTM30
- **CORS:** ✅ Soportado
- **Límite:** Sin límite documentado, pero usar throttling 100ms entre peticiones
- **Licencia:** CC BY 4.0

---

### 2. CDAU (Callejero Digital Andalucía Unificado)

**Prioridad:** 🔴 CRÍTICA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +10-15% precisión en Andalucía

#### Endpoints

| Recurso | URL |
|---------|-----|
| Portal CDAU | `http://www.callejerodeandalucia.es` |
| Dataset abierto | `https://www.juntadeandalucia.es/datosabiertos/portal/dataset/cdau` |
| API búsqueda | `http://www.callejerodeandalucia.es/servicios/cdau/` |

#### Estructura de Datos

```json
{
  "codigo_via": "18087000123",
  "tipo_via": "CALLE",
  "nombre_via": "SAN ANTON",
  "numero": "72",
  "municipio": "Granada",
  "provincia": "Granada",
  "codigo_postal": "18005",
  "x_utm": 447850.23,
  "y_utm": 4114567.89,
  "srs": "EPSG:25830"
}
```

#### Ventajas sobre CartoCiudad

- Coordenadas nativas en UTM30 ETRS89 (sin transformación)
- Mayor precisión a nivel de portal/edificio
- Datos específicos de los 786 municipios andaluces
- Incluye códigos de vía oficiales

#### Implementación Propuesta

```typescript
// src/services/geocoding/generic/CDAUGeocoder.ts

export class CDAUGeocoder {
  async geocode(options: {
    via: string;
    numero?: string;
    municipio: string;
  }): Promise<GeocodingResult | null> {
    // Implementación específica CDAU
  }
}
```

---

### 3. REDIAM Infraestructuras Hidráulicas

**Prioridad:** 🟠 ALTA  
**Tiempo estimado:** 3-4 horas  
**Impacto:** +3-5% registros (EDAR, embalses, captaciones)

#### Endpoint WFS

```
https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas
```

#### Capas Disponibles

| Capa | Contenido | Registros aprox. |
|------|-----------|------------------|
| `EDAR` | Estaciones depuradoras | ~800 |
| `Captaciones` | Puntos captación agua | ~2,000 |
| `Embalses` | Presas y embalses | ~100 |
| `Desaladoras` | Plantas desalinización | ~20 |

#### Campos EDAR

```json
{
  "DENOMINACION": "EDAR Motril",
  "MUNICIPIO": "Motril",
  "PROVINCIA": "Granada",
  "CAPACIDAD_HE": 150000,
  "ESTADO": "En servicio",
  "COORDENADA_X": 456789.12,
  "COORDENADA_Y": 4067890.34
}
```

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
}
```

---

### 4. Agencia Andaluza de la Energía WFS

**Prioridad:** 🟠 ALTA  
**Tiempo estimado:** 3-4 horas  
**Impacto:** +2-4% registros (subestaciones, líneas AT)

#### Endpoint WFS

```
https://www.agenciaandaluzadelaenergia.es/mapwms/wfs
```

#### Capas Disponibles (19 total)

| Capa | Contenido |
|------|-----------|
| `Subestaciones` | Subestaciones eléctricas |
| `CentrosTransformacion` | Centros transformación |
| `LineasAltaTension` | Trazado líneas AT |
| `Gasoductos` | Red gasista |
| `CentralesGeneracion` | Centrales eléctricas |

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
}
```

---

### 5. OpenRTA (Registro Turismo Andalucía)

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +3-5% registros (hoteles, albergues, campings)

#### Endpoint

```
https://www.juntadeandalucia.es/datosabiertos/portal/dataset/openrta
```

#### Tipologías con Coordenadas

- ✅ Hoteles, hostales, pensiones
- ✅ Campings y áreas acampada
- ✅ Albergues
- ✅ Oficinas de turismo
- ⚠️ Casas rurales (incorporación progresiva)

#### Utilidad PTEL

Identificar establecimientos con capacidad de acogida masiva para evacuaciones de emergencia.

#### Implementación Propuesta

```typescript
// src/services/geocoding/specialized/OpenRTAGeocoder.ts

export class OpenRTAGeocoder {
  private readonly API_URL = 'https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/datastore_search';
  
  async geocode(options: {
    name: string;
    municipality: string;
    type?: 'hotel' | 'camping' | 'albergue';
  }): Promise<GeocodingResult | null> {
    // Implementación
  }
}
```

---

### 6. REDIAM Equipamientos Uso Público

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +3-5% registros (espacios naturales, senderos)

#### Endpoint WMS/WFS

```
https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_Equipamientos_Uso_Publico_Andalucia
```

#### Contenido

- Centros de visitantes
- Miradores
- Áreas recreativas
- Campamentos
- Senderos señalizados

---

### 7. Catastro INSPIRE

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 4-5 horas  
**Impacto:** Validación cruzada de coordenadas

#### Endpoints

| Servicio | URL |
|----------|-----|
| WFS Direcciones | `https://ovc.catastro.meh.es/INSPIRE/wfsAD.aspx` |
| WFS Edificios | `https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx` |
| API Coordenadas RC | `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx` |

#### Uso Principal

Validación cruzada de coordenadas obtenidas por otros geocodificadores. No es geocodificador primario.

---

### 8. DERA G11 Patrimonio

**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +1-2% registros (BIC, zonas arqueológicas)

#### Endpoint WFS

```
https://www.ideandalucia.es/services/DERA_g11_patrimonio/wfs
```

#### Nota

Complementa `WFSCulturalGeocoder` existente (DERA G09). Añade capas específicas de BIC y zonas arqueológicas no incluidas en G09.

---

### 9. MITECO Gasolineras

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 2 horas  
**Impacto:** +1% registros

#### Endpoint

```
https://geoportalgasolineras.es/
```

#### Nota

Muy pocas gasolineras aparecen en documentos PTEL. Implementar solo si hay demanda específica.

---

### 10. IDEADIF (Red Ferroviaria)

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 2-3 horas  
**Impacto:** +0.5-1% registros

#### Endpoint

```
https://ideadif.adif.es/
```

#### Contenido

- Estaciones de tren (~30 en Andalucía)
- Apeaderos
- Infraestructura ferroviaria

---

### 11. ENAIRE AIP (Helipuertos)

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 3-4 horas  
**Impacto:** +0.2% registros

#### Endpoint

```
https://aip.enaire.es/
```

#### Nota

Solo ~15 helipuertos en Andalucía. Formato OACI con ciclo AIRAC (28 días). Complejidad alta para impacto bajo.

---

### 12. Patronatos Provinciales

**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 4-6 horas  
**Impacto:** Variable

#### Matriz de Madurez

| Provincia | Portal | Madurez |
|-----------|--------|---------|
| Málaga | `https://idemap.es` | ⭐⭐⭐⭐⭐ |
| Granada | `http://siggra.dipgra.es` | ⭐⭐⭐⭐ |
| Cádiz | `https://www.dipucadiz.es/idecadiz/` | ⭐⭐⭐⭐ |
| Jaén | `https://ide.dipujaen.es/geoportal/` | ⭐⭐⭐ |
| Sevilla | `https://www.dipusevilla.es/ideasevilla/` | ⭐⭐⭐ |
| Córdoba | EPRINSA OpenData | ⭐⭐⭐ |
| Almería | Geoportal Dipalme | ⭐⭐ |
| Huelva | — | ⭐ |

#### Nota

8 APIs diferentes con formatos heterogéneos. Alto coste de mantenimiento. Datos frecuentemente duplicados con otros recursos.

---

## Plan de Implementación por Fases

### Fase 1: Alta Prioridad (10-14 horas)

```
Semana 1
├── Día 1-2: CartoCiudad API
│   ├── CartoCiudadGeocoder.ts
│   ├── Integración en GeocodingOrchestrator.genericFallback()
│   ├── Tests unitarios
│   └── Validación con datos reales
│
├── Día 2-3: CDAU
│   ├── CDAUGeocoder.ts
│   ├── Integración como fallback secundario (Andalucía)
│   └── Tests
│
├── Día 3-4: REDIAM Hidráulicas
│   ├── WFSHydraulicGeocoder.ts
│   ├── Integración en clasificador (InfrastructureType.HYDRAULIC)
│   └── Tests
│
└── Día 4-5: Agencia Energía
    ├── WFSEnergyGeocoder.ts
    ├── Integración en clasificador (InfrastructureType.ENERGY)
    └── Tests
```

### Fase 2: Media Prioridad (10-14 horas)

```
Semana 2
├── OpenRTA (2-3h)
├── REDIAM Equipamientos (2-3h)
├── Catastro INSPIRE (4-5h)
└── DERA G11 Patrimonio (2-3h)
```

### Fase 3: Baja Prioridad (11-15 horas)

```
Semana 3+ (opcional)
├── MITECO Gasolineras (2h)
├── IDEADIF (2-3h)
├── ENAIRE AIP (3-4h)
└── Patronatos provinciales (4-6h)
```

---

## Arquitectura de Integración

### Flujo de Geocodificación Actualizado

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTRADA: Registro PTEL                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PASO 1: Clasificar tipología                       │
│    InfrastructureClassifier.classify(name)                      │
│                                                                 │
│    Tipos soportados (actualizado):                              │
│    • HEALTH → WFSHealthGeocoder                                 │
│    • EDUCATION → WFSEducationGeocoder                           │
│    • CULTURAL → WFSCulturalGeocoder                             │
│    • SECURITY → WFSSecurityGeocoder                             │
│    • HYDRAULIC → WFSHydraulicGeocoder (NUEVO)                   │
│    • ENERGY → WFSEnergyGeocoder (NUEVO)                         │
│    • ACCOMMODATION → OpenRTAGeocoder (NUEVO)                    │
│    • GENERIC → Fallback                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           PASO 2: Geocodificador especializado                  │
│                                                                 │
│   Si match >70% confianza → Retornar resultado                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Sin match
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           PASO 3: Fallback CDAU (Andalucía)                     │
│                                                                 │
│   CDAUGeocoder.geocode(address, municipality)                   │
│   Coordenadas nativas UTM30 ETRS89                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Sin resultado
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           PASO 4: Fallback CartoCiudad (Nacional)               │
│                                                                 │
│   CartoCiudadGeocoder.geocode(address)                          │
│   Transformar WGS84 → UTM30                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Sin resultado
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           PASO 5: Flag revisión manual                          │
│                                                                 │
│   GEOCODING_NEEDED = true                                       │
│   Cola pendientes → Visor Leaflet                               │
└─────────────────────────────────────────────────────────────────┘
```

### Estructura de Archivos Propuesta

```
src/services/geocoding/
├── GeocodingOrchestrator.ts      # Orquestador principal (actualizar)
├── index.ts
├── generic/                       # NUEVO: Geocodificadores genéricos
│   ├── CartoCiudadGeocoder.ts    # Fallback nacional
│   ├── CDAUGeocoder.ts           # Fallback Andalucía
│   └── index.ts
└── specialized/
    ├── WFSBaseGeocoder.ts
    ├── WFSHealthGeocoder.ts      # Existente
    ├── WFSEducationGeocoder.ts   # Existente
    ├── WFSCulturalGeocoder.ts    # Existente
    ├── WFSSecurityGeocoder.ts    # Existente
    ├── WFSHydraulicGeocoder.ts   # NUEVO
    ├── WFSEnergyGeocoder.ts      # NUEVO
    ├── OpenRTAGeocoder.ts        # NUEVO
    └── index.ts
```

---

## Testing y Validación

### Casos de Prueba por Geocodificador

#### CartoCiudad

```typescript
const testCases = [
  { input: 'Calle San Antón 72, Granada', expected: { lat: 37.177, lng: -3.598 } },
  { input: 'Avenida de la Constitución 1, Sevilla', expected: { lat: 37.386, lng: -5.992 } },
  { input: 'Dirección inexistente 99999', expected: null },
];
```

#### CDAU

```typescript
const testCases = [
  { input: { via: 'San Antón', numero: '72', municipio: 'Granada' }, expectedPrecision: 'portal' },
  { input: { via: 'Real', municipio: 'Colomera' }, expectedPrecision: 'via' },
];
```

#### Validación Cruzada

Para cada resultado de geocodificación, validar:

1. Coordenadas dentro de bounding box del municipio
2. Distancia a coordenada Catastro (si disponible) < 100m
3. Tipo de vía coincide con clasificación

### Métricas de Éxito

| Métrica | Umbral Aceptable |
|---------|------------------|
| Precisión geocodificación | >85% |
| Recall (cobertura) | >80% |
| Tiempo respuesta P95 | <3s |
| Tasa de error | <5% |

---

## Anexo: URLs de Referencia Rápida

### Geocodificación Base

```
CartoCiudad API:     https://www.cartociudad.es/geocoder/api/geocoder/
CDAU Dataset:        https://www.juntadeandalucia.es/datosabiertos/portal/dataset/cdau
Catastro WFS:        https://ovc.catastro.meh.es/INSPIRE/wfsAD.aspx
```

### Servicios Especializados Andalucía

```
DERA G12 Servicios:  https://www.ideandalucia.es/services/DERA_g12_servicios/wfs
DERA G09 Cultura:    https://www.ideandalucia.es/services/DERA_g09_cultura/wfs
DERA G11 Patrimonio: https://www.ideandalucia.es/services/DERA_g11_patrimonio/wfs
DERA G13 Límites:    https://www.ideandalucia.es/services/DERA_g13_limites_administrativos/wfs
API Educación:       https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/datastore_search
```

### REDIAM Medio Ambiente

```
Equipamientos:       https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_Equipamientos_Uso_Publico_Andalucia
Espacios Naturales:  http://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_Espacios_Naturales_Protegidos
Infraestr. Hidráu.:  https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas
```

### Turismo y Acogida

```
OpenRTA:             https://www.juntadeandalucia.es/datosabiertos/portal/dataset/openrta
```

### Nacional

```
CNIG Descargas:      https://centrodedescargas.cnig.es
MITECO Gasolineras:  https://geoportalgasolineras.es/
IDEADIF Ferrocarril: https://ideadif.adif.es/
ENAIRE Helipuertos:  https://aip.enaire.es/
```

---

## Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Nov 2025 | Documento inicial con 12 recursos priorizados |

---

*Documento generado para el proyecto PTEL Andalucía - Normalizador de Coordenadas v4.2*
