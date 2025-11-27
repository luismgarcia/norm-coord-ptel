# Recursos de Geocodificación para PTEL Andalucía
## Catálogo Consolidado de APIs, WFS y Bases de Datos Oficiales

**Versión:** 1.0  
**Fecha:** Noviembre 2025  
**Objetivo:** Documento único de referencia para geocodificación de infraestructuras críticas en documentos PTEL de los 786 municipios andaluces.

---

## Resumen Ejecutivo

Este catálogo consolida **más de 50 recursos públicos** organizados por impacto en la geocodificación PTEL. La arquitectura recomendada prioriza servicios especializados por tipología (WFS temáticos con coordenadas oficiales) sobre geocodificación genérica (CartoCiudad), reduciendo errores del 40-60% al 5-15%.

### Cobertura por Prioridad

| Prioridad | Tipologías PTEL | % Registros | Mejora Esperada |
|-----------|-----------------|-------------|-----------------|
| 🔴 **CRÍTICA** | Sanitarios, Educativos | 30-40% | +50-70% éxito |
| 🟠 **ALTA** | Patrimonio, Industrial, Energía | 15-25% | +40-60% éxito |
| 🟡 **MEDIA** | Acogida, Espacios Naturales, Turismo | 10-20% | +30-50% éxito |
| 🟢 **BASE** | Direcciones genéricas | 100% | Fallback universal |
| ⚪ **SIN COBERTURA** | Seguridad, Servicios básicos | 15-25% | Sin API pública |

---

## TIER 1: RECURSOS CRÍTICOS (Implementar Primero)

### 1.1 Centros Sanitarios — DERA G12 + SICESS

**Impacto:** 15-20% de registros PTEL  
**Mejora estimada:** +50-70% éxito geocodificación  
**Fuente:** Sistema de Información de Centros, Establecimientos y Servicios Sanitarios (SAS)

| Recurso | URL | Formato |
|---------|-----|---------|
| **WFS DERA G12** | `https://www.ideandalucia.es/services/DERA_g12_servicios/wfs` | WFS 1.1/2.0 |
| Capa Centros Salud | `g12_01_CentroSalud` | GeoJSON/GML |
| Capa Hospitales | `g12_02_CentroAtencionEspecializada` | GeoJSON/GML |
| Zonas Básicas Salud | `DERA_g13_limites_administrativos/wfs` → `g13_07_ZonaBasicaSalud` | Polígonos |

**Campos disponibles:**
- Código NICA (identificación oficial)
- Denominación del centro
- Tipo de servicio (CAP, hospital, consultorio)
- Dirección postal completa
- Municipio y provincia
- **Coordenadas ETRS89** (precisión 1:2.000)

**Ejemplo consulta WFS:**
```
https://www.ideandalucia.es/services/DERA_g12_servicios/wfs?
  service=WFS&version=2.0.0&request=GetFeature
  &typeName=g12_01_CentroSalud
  &outputFormat=application/json
  &CQL_FILTER=municipio='Granada'
```

**Actualización:** Semestral (ciclo SICESS)  
**Licencia:** CC BY 4.0  
**CORS:** ✅ Soportado

---

### 1.2 Centros Educativos — API CKAN Junta Andalucía

**Impacto:** 15-20% de registros PTEL  
**Mejora estimada:** +50-70% éxito geocodificación  
**Fuente:** Consejería de Desarrollo Educativo y Formación Profesional

| Recurso | URL |
|---------|-----|
| **API REST CKAN** | `https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/datastore_search` |
| Resource ID | `15aabed2-eec3-4b99-a027-9af5e27c9cac` |
| Dataset | Directorio de centros docentes no universitarios |

**Campos disponibles:**
- Código oficial (8 dígitos)
- Denominación genérica y específica
- Tipo: CEIP, IES, guarderías 0-3, CEEE, FP, privados/concertados
- Régimen de titularidad
- Dirección postal completa
- **Latitud y Longitud** (WGS84)
- Teléfono y fax

**Ejemplo consulta API:**
```javascript
fetch('https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/datastore_search?' + 
  new URLSearchParams({
    resource_id: '15aabed2-eec3-4b99-a027-9af5e27c9cac',
    filters: JSON.stringify({ provincia: 'Granada' }),
    limit: 100
  }))
  .then(r => r.json())
  .then(data => console.log(data.result.records));
```

**Actualización:** Anual (curso escolar)  
**Licencia:** CC BY 4.0  
**CORS:** ✅ Soportado (JSONP disponible)

---

## TIER 2: RECURSOS ALTA PRIORIDAD

### 2.1 Patrimonio Histórico — IAPH + IDE Cultura

**Impacto:** 5-10% de registros PTEL (monumentos BIC requieren planes evacuación especiales)  
**Fuente:** Instituto Andaluz del Patrimonio Histórico

| Servicio | URL | Registros |
|----------|-----|-----------|
| **WFS Localizador IAPH** | `https://www.iaph.es/ide/localizador/wfs` | 5.887 sitios |
| WFS Patrimonio Inmaterial | `https://www.iaph.es/ide/inmaterial/wfs` | Fiestas, tradiciones |
| WFS Rutas Culturales | `https://www.iaph.es/ide/rutas/wfs` | 21 itinerarios |
| **API Guía Digital** | `https://guiadigital.iaph.es/store/` | 100.000+ registros |
| WFS IDE Cultura (BIC) | `https://ws096.juntadeandalucia.es/geoserver/bica_public/wfs` | CGPHA oficial |

**Tipologías cubiertas:**
- Bienes de Interés Cultural (BIC)
- Monumentos y edificios históricos
- Sitios arqueológicos
- Conjuntos históricos
- Zonas patrimoniales

**Actualización:** Junio 2025 (IDE Cultura)  
**Licencia:** CC BY-NC-SA 3.0 (uso gubernamental permitido)

---

### 2.2 Infraestructura Industrial — REDIAM

**Impacto:** 5-10% de registros PTEL  
**Fuente:** Red de Información Ambiental de Andalucía

| Servicio | URL | Contenido |
|----------|-----|-----------|
| **WFS Infraestructuras Hidráulicas** | `https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas` | EDAR, captaciones, embalses |
| WFS Instalaciones Industriales | Portal REDIAM | Industrias IPPC |
| WMS Vertederos | Portal REDIAM | Gestión residuos |

**Campos EDAR:**
- Capacidad (habitantes equivalentes)
- Fases tratamiento
- Punto de vertido
- Población servida
- Coordenadas UTM

---

### 2.3 Infraestructura Energética — Agencia Andaluza Energía

**Impacto:** 3-5% de registros PTEL  
**Fuente:** Agencia Andaluza de la Energía (actualización junio 2025)

| Capa | Contenido |
|------|-----------|
| Subestaciones eléctricas | Niveles de tensión |
| Centros de transformación | Distribución urbana/rural |
| Líneas alta tensión | Trazado vectorial |
| Infraestructura gasista | Gasoductos, estaciones reguladoras |
| Centrales generación | Renovables y convencionales |

**URL WFS:** `https://www.agenciaandaluzadelaenergia.es/mapwms/wfs`  
**Capas:** 19 disponibles  
**Cumplimiento:** INSPIRE Annex III Energy Resources

---

### 2.4 Transporte — ADIF + ENAIRE

| Infraestructura | Fuente | URL |
|-----------------|--------|-----|
| **Red ferroviaria** | IDEADIF | `https://ideadif.adif.es/` |
| Estaciones/apeaderos | ADIF | WMS INSPIRE Transport Networks |
| **Helipuertos** | ENAIRE AIP | `https://aip.enaire.es/` |
| Aeródromos | ENAIRE | Formato OACI, ciclo AIRAC 28 días |

---

## TIER 3: RECURSOS PRIORIDAD MEDIA (Turismo/Acogida)

### 3.1 Alojamientos Turísticos — OpenRTA

**Impacto:** 3-5% de registros PTEL (centros de acogida en emergencias)  
**Fuente:** Registro de Turismo de Andalucía

| Recurso | URL |
|---------|-----|
| **Dataset OpenRTA** | `https://www.juntadeandalucia.es/datosabiertos/portal/dataset/openrta` |
| Buscador web | `https://www.juntadeandalucia.es/turismoydeporte/opencms/areas/turismo/registro-turismo/` |

**Tipologías con coordenadas:**
- ✅ Hoteles, hostales, pensiones
- ✅ Campings y áreas acampada
- ✅ Albergues
- ✅ Oficinas de turismo
- ⚠️ Casas rurales (incorporación progresiva)
- ⚠️ VFTs - Viviendas fines turísticos

**Utilidad PTEL:** Identificar establecimientos con capacidad de acogida masiva para evacuaciones.

---

### 3.2 Espacios Naturales y Equipamientos — REDIAM

**Impacto:** 5-8% de registros PTEL (zonas riesgo incendio, concentración personas)

| Servicio | URL | Contenido |
|----------|-----|-----------|
| **WMS Equipamientos Uso Público** | `https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_Equipamientos_Uso_Publico_Andalucia` | Centros visitantes, miradores, áreas recreativas |
| **WMS Espacios Naturales** | `http://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_Espacios_Naturales_Protegidos` | Parques, Red Natura 2000 |
| KML Senderos | Portal REDIAM | Rutas señalizadas |

**Utilidad PTEL:**
- Zonas de concentración de personas (áreas recreativas, campings)
- Rutas de evacuación/búsqueda (senderos)
- Riesgos específicos (incendios forestales)

---

### 3.3 Playas — MITECO + REDIAM

**Impacto:** 2-4% de registros PTEL (municipios costeros)

| Servicio | URL |
|----------|-----|
| **WMS Guía de Playas** | `https://wms.mapama.gob.es/sig/Costas/playas/wms.aspx` |
| Descarga CSV | `https://www.miteco.gob.es/es/costas/servicios/guia-playas/` |

**Campos:** Nombre, municipio, coordenadas, servicios, banderas.

---

## TIER 4: GEOCODIFICACIÓN BASE (Fallback Universal)

### 4.1 CartoCiudad — IGN/CNIG

**Cobertura:** 100% de direcciones postales España  
**Uso:** Fallback cuando no hay servicio especializado

| Servicio | URL |
|----------|-----|
| **API Geocoder** | `https://www.cartociudad.es/geocoder/api/geocoder/findJsonp?q=[DIRECCIÓN]` |
| Geocodificación inversa | `https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode?lon=&lat=` |
| Descargas CNIG | `https://centrodedescargas.cnig.es` |

**Sistema referencia:** WGS84 (EPSG:4326)  
**Actualización:** Trimestral  
**Licencia:** CC BY 4.0

---

### 4.2 CDAU — Callejero Digital Andalucía Unificado

**Cobertura:** 786 municipios andaluces  
**Fuente:** Colaboración ayuntamientos + Junta Andalucía

| Recurso | URL |
|---------|-----|
| **Portal CDAU** | `http://www.callejerodeandalucia.es` |
| Dataset abierto | `https://www.juntadeandalucia.es/datosabiertos/portal/dataset/callejero-digital-de-andalucia-unificado-cdau` |

**Contenido:** Portales geolocalizados a nivel de edificio, viales con nomenclatura oficial, códigos postales, secciones censales.

---

### 4.3 Catastro INSPIRE

| Servicio | URL | Uso |
|----------|-----|-----|
| **WFS Direcciones** | `https://ovc.catastro.meh.es/INSPIRE/wfsAD.aspx` | Validación cruzada |
| WFS Edificios | `https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx` | Geometría parcelas |
| API Coordenadas RC | `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx` | Ref. catastral → coords |

---

## TIER 5: RECURSOS PROVINCIALES COMPLEMENTARIOS

### Matriz de Madurez por Diputación

| Provincia | Geoportal/IDE | Turismo geocodificado | Madurez |
|-----------|---------------|----------------------|---------|
| **Málaga** | `https://idemap.es` + API REST | Costa del Sol BigData | ⭐⭐⭐⭐⭐ |
| **Granada** | `http://siggra.dipgra.es` | Turgranada +4.000 recursos | ⭐⭐⭐⭐ |
| **Cádiz** | `https://www.dipucadiz.es/idecadiz/` | OpenData + SPARQL | ⭐⭐⭐⭐ |
| **Jaén** | `https://ide.dipujaen.es/geoportal/` | GR247 GPX/KML/SHP | ⭐⭐⭐ |
| **Sevilla** | `https://www.dipusevilla.es/ideasevilla/` | PRODETUR PID | ⭐⭐⭐ |
| **Córdoba** | EPRINSA OpenData | Paisajes con Historia | ⭐⭐⭐ |
| **Almería** | Geoportal Dipalme | Patronato básico | ⭐⭐ |
| **Huelva** | — | turismohuelva.org (sin API) | ⭐ |

### Recursos destacados por provincia

**Málaga - IDEMAP API REST:**
```
https://idemap.es/apiIDEMAP/plidma/getInstalacionBYxy/{x}/{y}/{metros}
https://idemap.es/apiIDEMAP/senderos/getPuntosFromGr_CSV/{GR}/{metros}
```

**Jaén - Sendero GR247:**
- 478 km señalizados, 21 etapas
- Descargas: GPX, KML, XLS, SHP
- URL: `http://www.sierrasdecazorlaseguraylasvillas.es/gr247/`

**Granada - Turgranada:**
- 4.000+ recursos geocodificados
- 1.100 alojamientos, 800 restaurantes
- 400 monumentos, 90 museos

---

## MATRIZ CONSOLIDADA: Tipología PTEL → Recurso Óptimo

| Tipología PTEL | Recurso Primario | Recurso Fallback | % Cobertura |
|----------------|------------------|------------------|-------------|
| **Hospitales** | DERA G12 `g12_02` | CartoCiudad | 95%+ |
| **Centros de Salud** | DERA G12 `g12_01` | CartoCiudad | 95%+ |
| **Farmacias** | Overpass `amenity=pharmacy` | CartoCiudad | 85% |
| **Colegios CEIP** | API CKAN Educación | Overpass `amenity=school` | 98%+ |
| **Institutos IES** | API CKAN Educación | Overpass | 98%+ |
| **Guarderías** | API CKAN Educación | CartoCiudad | 90% |
| **Policía Local** | ❌ Sin API pública | Ayuntamiento web | <50% |
| **Guardia Civil** | ❌ Sin API pública | — | <30% |
| **Bomberos** | ❌ Sin API pública | Diputación | <50% |
| **Monumentos BIC** | IAPH Localizador + IDE Cultura | DERA G11 | 90%+ |
| **Museos** | IAPH + DERA G11 | Overpass | 85% |
| **EDAR** | REDIAM Hidráulicas | — | 95%+ |
| **Subestaciones** | Agencia Energía WFS | — | 90%+ |
| **Gasolineras** | MITECO Geoportal | Overpass | 98%+ |
| **Estaciones tren** | IDEADIF | Overpass | 95%+ |
| **Helipuertos** | ENAIRE AIP | — | 100% |
| **Hoteles (acogida)** | OpenRTA | Patronatos | 80%+ |
| **Albergues** | OpenRTA | REDIAM | 75% |
| **Campings** | OpenRTA + REDIAM | — | 85% |
| **Playas** | MITECO + REDIAM | — | 95%+ |
| **Espacios Naturales** | REDIAM EENNPP | MITECO | 98%+ |
| **Senderos** | REDIAM Equipamientos | Patronatos | 80% |
| **Áreas recreativas** | REDIAM Equipamientos | — | 85% |

---

## FLUJO DE GEOCODIFICACIÓN RECOMENDADO

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTRADA: Registro PTEL                       │
│         (nombre, dirección, municipio, tipología)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PASO 1: Clasificar tipología                       │
│    ┌──────────────┬──────────────┬──────────────┐              │
│    │  Sanitario   │  Educativo   │  Patrimonio  │   ...        │
│    └──────┬───────┴──────┬───────┴──────┬───────┘              │
└───────────┼──────────────┼──────────────┼───────────────────────┘
            │              │              │
            ▼              ▼              ▼
┌───────────────────────────────────────────────────────────────┐
│           PASO 2: Consultar servicio especializado            │
│                                                               │
│   DERA G12 WFS    API CKAN EDU    IAPH WFS     OpenRTA       │
│   (hospitales)    (colegios)      (BIC)        (hoteles)     │
│                                                               │
│   → Buscar por municipio + nombre aproximado (fuzzy)         │
│   → Si match >80% → Coordenadas oficiales ✓                  │
└───────────────────────────────────────────────────────────────┘
            │
            │ Sin match
            ▼
┌───────────────────────────────────────────────────────────────┐
│           PASO 3: Fallback geocodificación genérica           │
│                                                               │
│   CDAU/CartoCiudad → Dirección postal → Coordenadas          │
│                                                               │
│   → Precisión: portal/edificio                               │
│   → Confianza: MEDIA                                         │
└───────────────────────────────────────────────────────────────┘
            │
            │ Sin resultado
            ▼
┌───────────────────────────────────────────────────────────────┐
│           PASO 4: Fuentes comunitarias                        │
│                                                               │
│   Overpass API (OSM) → amenity/building tags                 │
│   Nominatim → Búsqueda textual                               │
│                                                               │
│   → Confianza: BAJA (requiere validación)                    │
└───────────────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────┐
│           PASO 5: Flag para revisión manual                   │
│                                                               │
│   → GEOCODING_NEEDED = true                                  │
│   → Guardar en cola de pendientes                            │
│   → Visor Leaflet para corrección manual                     │
└───────────────────────────────────────────────────────────────┘
```

---

## LIMITACIONES CONOCIDAS

### Tipologías SIN cobertura API pública:

| Tipología | Razón | Alternativa |
|-----------|-------|-------------|
| **Policía Local** | Datos no publicados | Scraping web ayuntamientos |
| **Guardia Civil** | Seguridad nacional | Listados manuales |
| **Bomberos** | Competencia provincial | Contacto diputaciones |
| **Servicios agua/luz/gas** | Datos empresas privadas | Catastro + estimación |
| **Viviendas particulares** | Privacidad | Solo CartoCiudad/Catastro |
| **Pequeños comercios** | Sin registro obligatorio | Overpass OSM |

### Problemas técnicos identificados:

- **CORS:** Algunos WFS legacy requieren proxy server-side
- **Límites WFS:** Paginación necesaria para >1.000 features
- **Actualizaciones:** Frecuencia variable (diaria a anual)
- **Formatos:** Predomina WFS 1.1 sobre REST JSON moderno

---

## ANEXO: URLs de Referencia Rápida

### Geocodificación base
```
CartoCiudad API:     https://www.cartociudad.es/geocoder/api/geocoder/
CDAU Dataset:        https://www.juntadeandalucia.es/datosabiertos/portal/dataset/cdau
Catastro WFS:        https://ovc.catastro.meh.es/INSPIRE/wfsAD.aspx
```

### Servicios especializados Andalucía
```
DERA G12 Servicios:  https://www.ideandalucia.es/services/DERA_g12_servicios/wfs
DERA G11 Patrimonio: https://www.ideandalucia.es/services/DERA_g11_patrimonio/wfs
DERA G13 Límites:    https://www.ideandalucia.es/services/DERA_g13_limites_administrativos/wfs
API Educación:       https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/datastore_search
IAPH Localizador:    https://www.iaph.es/ide/localizador/wfs
IDE Cultura BIC:     https://ws096.juntadeandalucia.es/geoserver/bica_public/wfs
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
Guía Playas MITECO:  https://wms.mapama.gob.es/sig/Costas/playas/wms.aspx
```

### Nacional
```
CNIG Descargas:      https://centrodedescargas.cnig.es
MITECO Gasolineras:  https://geoportalgasolineras.es/
IDEADIF Ferrocarril: https://ideadif.adif.es/
ENAIRE Helipuertos:  https://aip.enaire.es/
```

### Diputaciones provinciales
```
IDEMAP Málaga:       https://idemap.es/geoportal
SIGGRA Granada:      http://siggra.dipgra.es
IDECádiz:            https://www.dipucadiz.es/idecadiz/
IDEJaén:             https://ide.dipujaen.es/geoportal/
IDESevilla:          https://www.dipusevilla.es/ideasevilla/
```

---

## Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Nov 2025 | Documento inicial consolidado |

---

*Documento generado para el proyecto PTEL Andalucía - Normalizador de Coordenadas v4.2*
