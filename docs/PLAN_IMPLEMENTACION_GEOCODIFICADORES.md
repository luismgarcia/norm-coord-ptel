# Plan de Implementación de Geocodificadores PTEL

## Resumen Ejecutivo

Este documento detalla los **12 recursos de geocodificación** identificados para el proyecto PTEL Andalucía, organizados por prioridad de implementación según su ROI (relación esfuerzo/impacto).

**Estado actual:** 4 geocodificadores implementados (Sanitarios, Educación, Cultura, Seguridad)  
**Gap crítico:** Sin fallback genérico (CartoCiudad) - si falla especializado → resultado NULL  
**Cobertura actual:** ~45%  
**Cobertura potencial:** ~85-90%

---

## Resumen de Prioridades

| Prioridad | Recursos | Tiempo | Impacto | Tipologías |
|-----------|----------|--------|---------|------------|
| 🔴 **ALTA** | 1-4 | 10-14h | +40-55% | Fallback universal, EDAR, Energía |
| 🟡 **MEDIA** | 5-8 | 10-14h | +8-12% | Turismo, Espacios naturales, Catastro |
| 🟢 **BAJA** | 9-12 | 11-15h | +2-3% | Gasolineras, Trenes, Helipuertos |

---

## PRIORIDAD ALTA (Implementar Primero)

### 1. CartoCiudad API — IGN/CNIG

**Prioridad:** 🔴 CRÍTICA  
**Esfuerzo:** 2-3 horas  
**Impacto:** +25-35% cobertura global  
**ROI:** ⭐⭐⭐⭐⭐

#### Descripción
Servicio de geocodificación del Instituto Geográfico Nacional. Es el **fallback universal** cuando fallan los geocodificadores especializados.

#### Endpoints

| Servicio | URL |
|----------|-----|
| Geocodificación directa | `https://www.cartociudad.es/geocoder/api/geocoder/findJsonp` |
| Geocodificación inversa | `https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode` |
| Candidatos | `https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp` |

#### Ejemplo de Uso

```typescript
// Geocodificación directa
const response = await fetch(
  `https://www.cartociudad.es/geocoder/api/geocoder/findJsonp?` +
  new URLSearchParams({
    q: 'Calle Gran Vía 1, Granada',
    type: 'portal',
    tip_via: '',
    id: '1',
    portal: '',
    municipio: 'Granada',
    provincia: 'Granada',
    countrycode: 'es'
  })
);

const data = await response.json();
// Respuesta incluye: lat, lng, address, type, muni, province, postalCode
```

#### Campos de Respuesta

```typescript
interface CartoCiudadResult {
  lat: number;           // Latitud WGS84
  lng: number;           // Longitud WGS84
  address: string;       // Dirección normalizada
  type: string;          // 'portal', 'municipio', 'provincia', etc.
  muni: string;          // Municipio
  province: string;      // Provincia
  postalCode: string;    // Código postal
  countryCode: string;   // 'es'
  state: number;         // Estado de la respuesta
  stateMsg: string;      // Mensaje de estado
}
```

#### Notas de Implementación

- Sistema de coordenadas: **WGS84 (EPSG:4326)** → Requiere conversión a UTM30
- Rate limit: Sin límite documentado, pero usar con moderación
- CORS: ✅ Soportado
- Licencia: CC BY 4.0
- Actualización: Trimestral

#### Integración Propuesta

```typescript
// src/services/geocoding/fallback/CartoCiudadGeocoder.ts
export class CartoCiudadGeocoder {
  private readonly BASE_URL = 'https://www.cartociudad.es/geocoder/api/geocoder';
  
  async geocode(address: string, municipality: string, province: string): Promise<GeocodingResult | null> {
    // 1. Llamar a candidatesJsonp para obtener opciones
    // 2. Seleccionar mejor candidato
    // 3. Convertir WGS84 → UTM30 ETRS89
    // 4. Retornar resultado con confianza MEDIA
  }
}
```

---

### 2. CDAU — Callejero Digital Andalucía Unificado

**Prioridad:** 🔴 CRÍTICA  
**Esfuerzo:** 2-3 horas  
**Impacto:** +10-15% precisión en Andalucía  
**ROI:** ⭐⭐⭐⭐

#### Descripción
Callejero oficial de los 786 municipios andaluces con precisión a nivel de portal/edificio. Mejor precisión que CartoCiudad para direcciones andaluzas.

#### Endpoints

| Servicio | URL |
|----------|-----|
| Portal web | `http://www.callejerodeandalucia.es` |
| Dataset abierto | `https://www.juntadeandalucia.es/datosabiertos/portal/dataset/callejero-digital-de-andalucia-unificado-cdau` |
| WFS | `https://www.callejerodeandalucia.es/servicios/cdau/wfs` |

#### Ejemplo Consulta WFS

```
https://www.callejerodeandalucia.es/servicios/cdau/wfs?
  service=WFS
  &version=2.0.0
  &request=GetFeature
  &typeName=cdau:Portal
  &outputFormat=application/json
  &CQL_FILTER=municipio='Granada' AND tipo_via='CALLE' AND nombre_via ILIKE '%Gran Vía%'
```

#### Campos Disponibles

- `id_portal`: Identificador único
- `tipo_via`: Tipo de vía (CALLE, AVENIDA, PLAZA...)
- `nombre_via`: Nombre de la vía
- `numero`: Número de portal
- `municipio`: Municipio
- `provincia`: Provincia
- `codigo_postal`: Código postal
- `geometry`: Punto (EPSG:25830)

#### Notas de Implementación

- Sistema de coordenadas: **UTM30 ETRS89 (EPSG:25830)** → Nativo, sin conversión
- Precisión: Nivel portal/edificio (~2-5m)
- CORS: ⚠️ Puede requerir proxy
- Licencia: CC BY 4.0

---

### 3. REDIAM Infraestructuras Hidráulicas

**Prioridad:** 🟠 ALTA  
**Esfuerzo:** 3-4 horas  
**Impacto:** +3-5% registros PTEL  
**ROI:** ⭐⭐⭐⭐

#### Descripción
Infraestructuras hidráulicas de Andalucía: EDAR, captaciones, embalses, depósitos. Críticas para emergencias de contaminación, sequía, inundaciones.

#### Endpoints

| Servicio | URL | Contenido |
|----------|-----|-----------|
| WFS Hidráulicas | `https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas` | EDAR, captaciones |
| WMS Embalses | `https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_Embalses_Andalucia` | Presas, embalses |

#### Capas Disponibles

| Capa | Contenido | Registros aprox. |
|------|-----------|------------------|
| `EDAR` | Estaciones depuradoras | ~800 |
| `Captaciones` | Puntos de captación agua | ~2,000 |
| `Depositos` | Depósitos de agua | ~1,500 |
| `Embalses` | Presas y embalses | ~80 |

#### Ejemplo Consulta WFS

```
https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas?
  service=WFS
  &version=1.1.0
  &request=GetFeature
  &typeName=EDAR
  &outputFormat=application/json
  &CQL_FILTER=provincia='Granada'
```

#### Campos EDAR

```typescript
interface EDAREsult {
  denominacion: string;      // Nombre EDAR
  municipio: string;
  provincia: string;
  capacidad_he: number;      // Habitantes equivalentes
  tipo_tratamiento: string;  // Primario, secundario, terciario
  punto_vertido: string;     // Río, mar, etc.
  estado: string;            // En servicio, en construcción
  geometry: Point;           // EPSG:25830
}
```

#### Notas de Implementación

- Sistema de coordenadas: UTM30 ETRS89
- CORS: ⚠️ Puede requerir proxy
- Actualización: Anual

---

### 4. Agencia Andaluza de la Energía — WFS

**Prioridad:** 🟠 ALTA  
**Esfuerzo:** 3-4 horas  
**Impacto:** +2-4% registros PTEL  
**ROI:** ⭐⭐⭐

#### Descripción
Infraestructuras energéticas de Andalucía: subestaciones eléctricas, líneas de alta tensión, centros de transformación, infraestructura gasista.

#### Endpoints

| Servicio | URL |
|----------|-----|
| WFS Energía | `https://www.agenciaandaluzadelaenergia.es/mapwms/wfs` |
| Visor cartográfico | `https://www.agenciaandaluzadelaenergia.es/cartografia/` |

#### Capas Disponibles (19 total)

| Capa | Contenido |
|------|-----------|
| `Subestaciones` | Subestaciones eléctricas |
| `LineasAT` | Líneas alta tensión (>45kV) |
| `CentrosTransformacion` | Centros de transformación |
| `Gasoductos` | Red de gasoductos |
| `EstacionesRegulacion` | Estaciones regulación gas |
| `CentralesGeneracion` | Centrales eléctricas |

#### Ejemplo Consulta WFS

```
https://www.agenciaandaluzadelaenergia.es/mapwms/wfs?
  service=WFS
  &version=1.1.0
  &request=GetFeature
  &typeName=Subestaciones
  &outputFormat=application/json
  &CQL_FILTER=provincia='Granada'
```

#### Notas de Implementación

- Sistema de coordenadas: UTM30 ETRS89
- Cumplimiento: INSPIRE Annex III Energy Resources
- Actualización: Junio 2025
- CORS: ⚠️ Verificar

---

## PRIORIDAD MEDIA

### 5. OpenRTA — Registro de Turismo de Andalucía

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** 2-3 horas  
**Impacto:** +3-5% registros PTEL  
**ROI:** ⭐⭐⭐

#### Descripción
Alojamientos turísticos oficiales: hoteles, albergues, campings, oficinas de turismo. Útil para identificar **centros de acogida** en emergencias.

#### Endpoints

| Servicio | URL |
|----------|-----|
| Dataset OpenRTA | `https://www.juntadeandalucia.es/datosabiertos/portal/dataset/openrta` |
| Buscador web | `https://www.juntadeandalucia.es/turismoydeporte/opencms/areas/turismo/registro-turismo/` |

#### Tipologías con Coordenadas

- ✅ Hoteles, hostales, pensiones
- ✅ Campings y áreas acampada
- ✅ Albergues
- ✅ Oficinas de turismo
- ⚠️ Casas rurales (incorporación progresiva)
- ⚠️ VFTs (Viviendas fines turísticos)

#### Campos Disponibles

```typescript
interface OpenRTAResult {
  denominacion: string;
  tipo_establecimiento: string;
  categoria: string;        // Estrellas, etc.
  direccion: string;
  municipio: string;
  provincia: string;
  codigo_postal: string;
  telefono: string;
  plazas: number;           // Capacidad
  coordenada_x: number;     // ETRS89
  coordenada_y: number;
}
```

---

### 6. REDIAM Equipamientos Uso Público

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** 2-3 horas  
**Impacto:** +3-5% registros PTEL  
**ROI:** ⭐⭐

#### Descripción
Equipamientos de uso público en espacios naturales: centros de visitantes, áreas recreativas, miradores, senderos.

#### Endpoints

| Servicio | URL |
|----------|-----|
| WMS Equipamientos | `https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_Equipamientos_Uso_Publico_Andalucia` |
| WMS Espacios Naturales | `http://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_Espacios_Naturales_Protegidos` |

#### Capas Disponibles

- `CentrosVisitantes`: Centros de interpretación
- `AreasRecreativas`: Merenderos, zonas picnic
- `Miradores`: Puntos panorámicos
- `Senderos`: Rutas señalizadas
- `Campamentos`: Campamentos juveniles
- `RefugiosMontana`: Refugios de montaña

---

### 7. Catastro INSPIRE — WFS

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** 4-5 horas  
**Impacto:** Validación cruzada  
**ROI:** ⭐⭐

#### Descripción
Servicio oficial de Catastro para validación de direcciones y parcelas. No para geocodificación primaria, sino para **validación cruzada** de resultados.

#### Endpoints

| Servicio | URL | Uso |
|----------|-----|-----|
| WFS Direcciones | `https://ovc.catastro.meh.es/INSPIRE/wfsAD.aspx` | Direcciones postales |
| WFS Edificios | `https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx` | Geometría edificios |
| WFS Parcelas | `https://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx` | Parcelas catastrales |
| API Coordenadas | `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx` | Ref. catastral → coords |

#### Ejemplo: Referencia Catastral → Coordenadas

```xml
POST https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx

<Consulta_CPMRC>
  <Provincia>18</Provincia>
  <Municipio>087</Municipio>
  <RC>1234567VG1234A</RC>
</Consulta_CPMRC>
```

---

### 8. DERA G11 Patrimonio Histórico

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** 2-3 horas  
**Impacto:** +1-2% registros PTEL  
**ROI:** ⭐⭐

#### Descripción
Complementa el geocodificador cultural (DERA G09) con capas adicionales de patrimonio histórico: BIC, zonas arqueológicas, conjuntos históricos.

#### Endpoints

| Servicio | URL |
|----------|-----|
| WFS DERA G11 | `https://www.ideandalucia.es/services/DERA_g11_patrimonio/wfs` |

#### Capas Disponibles

- `g11_01_BIC`: Bienes de Interés Cultural
- `g11_02_ZonaArqueologica`: Zonas arqueológicas
- `g11_03_ConjuntoHistorico`: Conjuntos históricos
- `g11_04_JardinHistorico`: Jardines históricos

#### Nota
Ya existe `WFSCulturalGeocoder` usando DERA G09. Este recurso añadiría capas complementarias al mismo geocodificador.

---

## PRIORIDAD BAJA

### 9. MITECO Gasolineras

**Prioridad:** 🟢 BAJA  
**Esfuerzo:** 2 horas  
**Impacto:** +1% registros PTEL  
**ROI:** ⭐

#### Descripción
Geoportal de gasolineras del Ministerio de Transición Ecológica. Las gasolineras rara vez aparecen en documentos PTEL.

#### Endpoints

| Servicio | URL |
|----------|-----|
| Geoportal | `https://geoportalgasolineras.es/` |
| API REST | `https://geoportalgasolineras.es/rest/busqueda/` |

#### Ejemplo API

```javascript
fetch('https://geoportalgasolineras.es/rest/busqueda/', {
  method: 'POST',
  body: JSON.stringify({
    provincia: 'GRANADA',
    municipio: 'GRANADA'
  })
})
```

---

### 10. IDEADIF — Red Ferroviaria

**Prioridad:** 🟢 BAJA  
**Esfuerzo:** 2-3 horas  
**Impacto:** +0.5-1% registros PTEL  
**ROI:** ⭐

#### Descripción
Infraestructura ferroviaria de ADIF: estaciones, apeaderos, líneas. Andalucía tiene ~30-40 estaciones principales.

#### Endpoints

| Servicio | URL |
|----------|-----|
| Portal IDEADIF | `https://ideadif.adif.es/` |
| WMS INSPIRE | `https://ideadif.adif.es/geoserver/wms` |

#### Capas

- `Estaciones`: Estaciones de pasajeros
- `Apeaderos`: Paradas secundarias
- `LineasFerreas`: Trazado de vías

---

### 11. ENAIRE AIP — Helipuertos

**Prioridad:** 🟢 BAJA  
**Esfuerzo:** 3-4 horas  
**Impacto:** +0.2% registros PTEL  
**ROI:** ⭐

#### Descripción
Información aeronáutica oficial de ENAIRE. Andalucía tiene ~15 helipuertos. Formato complejo (ciclo AIRAC 28 días).

#### Endpoints

| Servicio | URL |
|----------|-----|
| Portal AIP | `https://aip.enaire.es/` |
| eAIP España | `https://aip.enaire.es/AIP/` |

#### Nota
Los datos AIP requieren parsing de documentos PDF/XML en formato OACI. Implementación compleja para muy pocos registros.

---

### 12. Patronatos Provinciales

**Prioridad:** 🟢 BAJA  
**Esfuerzo:** 4-6 horas  
**Impacto:** Variable  
**ROI:** ⭐

#### Descripción
8 APIs diferentes (una por provincia) con datos turísticos. Alto esfuerzo de mantenimiento, datos frecuentemente duplicados con OpenRTA y REDIAM.

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
| Huelva | turismohuelva.org | ⭐ |

#### Recomendación
Solo implementar IDEMAP Málaga si se necesita cobertura específica de Costa del Sol.

---

## Arquitectura de Integración

### Estructura de Directorios Propuesta

```
src/services/geocoding/
├── GeocodingOrchestrator.ts      # Ya existe
├── index.ts
├── specialized/                   # Ya existe
│   ├── WFSBaseGeocoder.ts
│   ├── WFSHealthGeocoder.ts      # ✅ Implementado
│   ├── WFSEducationGeocoder.ts   # ✅ Implementado
│   ├── WFSCulturalGeocoder.ts    # ✅ Implementado
│   ├── WFSSecurityGeocoder.ts    # ⚠️ API no pública
│   ├── WFSHydraulicGeocoder.ts   # 🔴 Por implementar
│   └── WFSEnergyGeocoder.ts      # 🔴 Por implementar
├── fallback/                      # 🔴 Nueva carpeta
│   ├── CartoCiudadGeocoder.ts    # 🔴 Por implementar
│   └── CDAUGeocoder.ts           # 🔴 Por implementar
└── complementary/                 # 🟡 Futura
    ├── OpenRTAGeocoder.ts
    ├── REDIAMEquipGeocoder.ts
    └── CatastroValidator.ts
```

### Flujo de Geocodificación Actualizado

```
┌─────────────────────────────────────────────────────────────┐
│                 ENTRADA: Registro PTEL                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│          PASO 1: Clasificar tipología (existente)           │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│   Sanitario      │ │  Educativo   │ │   EDAR       │
│ WFSHealthGeocoder│ │WFSEducation  │ │WFSHydraulic  │
└────────┬─────────┘ └──────┬───────┘ └──────┬───────┘
         │                  │                │
         └─────────────────┼────────────────┘
                           │
                           ▼ Sin match
┌─────────────────────────────────────────────────────────────┐
│          PASO 2: Fallback CDAU (Andalucía)                  │
│                    🔴 POR IMPLEMENTAR                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ Sin match
┌─────────────────────────────────────────────────────────────┐
│          PASO 3: Fallback CartoCiudad (Nacional)            │
│                    🔴 POR IMPLEMENTAR                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ Sin match
┌─────────────────────────────────────────────────────────────┐
│          PASO 4: Flag GEOCODING_NEEDED                      │
│                    Visor Leaflet manual                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Cronograma de Implementación

### Fase 1: Alta Prioridad (Semana 1-2)

| Día | Tarea | Horas |
|-----|-------|-------|
| 1 | CartoCiudadGeocoder + tests | 3h |
| 2 | CDAUGeocoder + tests | 3h |
| 3 | WFSHydraulicGeocoder + tests | 4h |
| 4 | WFSEnergyGeocoder + tests | 4h |
| 5 | Integración en Orchestrator + validación | 3h |

**Total Fase 1:** 17h (incluye testing)

### Fase 2: Media Prioridad (Semana 3-4)

| Día | Tarea | Horas |
|-----|-------|-------|
| 1 | OpenRTAGeocoder | 3h |
| 2 | REDIAMEquipGeocoder | 3h |
| 3 | CatastroValidator | 5h |
| 4 | Extensión WFSCulturalGeocoder (DERA G11) | 3h |
| 5 | Integración + validación | 3h |

**Total Fase 2:** 17h

### Fase 3: Baja Prioridad (Opcional)

Solo si hay necesidad específica documentada.

---

## Métricas de Éxito

| Métrica | Actual | Objetivo Fase 1 | Objetivo Fase 2 |
|---------|--------|-----------------|-----------------|
| Cobertura geocodificación | ~45% | ~75-80% | ~85-90% |
| Tasa de fallback exitoso | 0% | ~60-70% | ~70-80% |
| Tiempo medio geocodificación | N/A | <500ms | <500ms |
| Registros sin coordenadas | ~55% | ~20-25% | ~10-15% |

---

## Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Nov 2025 | Documento inicial con 12 recursos |

---

*Documento generado para el proyecto PTEL Andalucía - Normalizador de Coordenadas v4.2*
