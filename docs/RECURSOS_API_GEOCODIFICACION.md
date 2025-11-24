# Recursos API para Geolocalización Especializada en Andalucía

**La infraestructura española de datos espaciales ofrece más de 50 APIs y servicios WFS activos específicamente diseñados para geocodificación temática de infraestructuras municipales en Andalucía.** IDE Andalucía proporciona 400+ servicios OGC con 432 capas de datos que cubren todas las tipologías críticas identificadas en los documentos PTEL: desde los 26.000 centros sanitarios del Servicio Andaluz de Salud hasta instalaciones industriales documentadas por REDIAM, pasando por centros educativos con coordenadas oficiales actualizadas en enero 2025 y más de 100.000 registros de patrimonio histórico del IAPH.

---

## Servicios Especializados por Tipología Crítica

### Centros Sanitarios (DERA G12)

**URL WFS**: `https://www.ideandalucia.es/services/DERA_g12_servicios/wfs`

| Capa | Descripción | Registros |
|------|-------------|-----------|
| g12_01_CentroSalud | Centros de atención primaria | ~1,500 |
| g12_02_CentroAtencionEspecializada | Hospitales y centros especializados | ~200 |

**Campos disponibles**:
- Código NICA (identificación oficial)
- Denominación del centro
- Clasificación por tipo de servicio
- Dirección postal completa
- Municipio y provincia
- Coordenadas ETRS89

**Sistemas de referencia**: CRS:84, EPSG:4326, EPSG:4258, EPSG:25828-25831

### Centros Educativos (API CKAN)

**URL API**: `https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/datastore_search`

**Resource ID**: `15aabed2-eec3-4b99-a027-9af5e27c9cac`

```javascript
// Ejemplo de consulta
fetch(`${API_URL}?resource_id=${RESOURCE_ID}&filters={"provincia":"Granada"}`)
```

**Campos disponibles**:
- Código oficial (8 dígitos)
- Denominación genérica/específica
- Tipo: CEIP, IES, CEEE, FP, guardería
- Régimen de titularidad
- **Latitud y longitud**
- Dirección postal, teléfono

### Patrimonio Histórico (IAPH)

**Servicios WFS**:

| Servicio | URL | Registros |
|----------|-----|-----------|
| Localizador Cartográfico | `https://www.iaph.es/ide/localizador/wfs` | 5,887 |
| Patrimonio Inmaterial | `https://www.iaph.es/ide/inmaterial/wfs` | 1,255 |
| Patrimonio Mueble Urbano | `https://www.iaph.es/ide/pmu/wfs` | Variable |
| Paisajes Culturales | `https://www.iaph.es/ide/paisaje/wfs` | 117 |
| Rutas Culturales | `https://www.iaph.es/ide/rutas/wfs` | 21 |

**API REST IAPH**: `https://guiadigital.iaph.es/store/`
- 26,024 bienes inmuebles
- 84,823 bienes muebles
- 100,000+ registros totales

### Infraestructuras Industriales (REDIAM)

**WFS Infraestructuras Hidráulicas**: 
`https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas`

- EDAR (estaciones depuradoras)
- Estaciones de bombeo
- Captaciones de agua
- Embalses y presas

**WFS Agencia Andaluza de la Energía**:
`https://www.agenciaandaluzadelaenergia.es/mapwms/wfs`

- 19 capas actualizadas a junio 2025
- Subestaciones eléctricas
- Centros de transformación
- Líneas de alta tensión
- Centrales de generación

### Gasolineras (MITECO)

**Portal**: `https://geoportalgasolineras.es/`

**Descargas CSV/ZIP**: `https://geoportalgasolineras.es/geoportal-instalaciones/DescargarFicheros`

- Coordenadas GPS de precisión
- Dirección postal
- Operador
- Tipos de combustible
- **Actualización diaria de precios**

---

## Infraestructura Regional (IDE Andalucía)

### CDAU - Callejero Digital de Andalucía Unificado

| Servicio | URL |
|----------|-----|
| WFS | `https://www.callejerodeandalucia.es/servicios/cdau/wfs` |
| WMS | `https://www.callejerodeandalucia.es/servicios/cdau/wms` |
| WMTS | `https://www.callejerodeandalucia.es/servicios/base/gwc/service/wms` |

**Capas disponibles**:
- Vías con tipología
- Tramos con direcciones
- Portales con coordenadas precisas
- Manzanas urbanas
- Zonas verdes

**Sistemas de referencia nativos**: EPSG:25830, EPSG:23030

### NGA - Nomenclátor Geográfico de Andalucía

**WFS 1.1.0**: `http://www.ideandalucia.es/wfs-nga/services`

**WFS-INSPIRE 2.0.0**: `https://www.ideandalucia.es/wfs-nga-inspire/services`

- **232,000+ entidades geográficas**
- Áreas administrativas, entidades de población
- Hidrografía, orografía, patrimonio
- Infraestructuras, servicios

### ISE - Inventario de Sedes y Equipamientos

**WFS**: `https://www.ideandalucia.es/services/ise/wfs`

- Actualizado 22 julio 2025
- Equipamientos puntuales, lineales, áreas
- Salud, educación, deportes, turismo

### DERA G13 - Límites Administrativos

**WFS**: `http://www.ideandalucia.es/services/DERA_g13_limites_administrativos/wfs`

- Términos municipales
- Provincias
- Distritos sanitarios
- 216 zonas básicas de salud
- Partidos judiciales
- Comarcas turísticas

---

## Nomenclátores Oficiales

### INE - Nomenclátor de Población

**URL**: `https://www.ine.es/nomen2/index.do`

**Estructura códigos INE (11 dígitos)**: `PPMMMCCSSNN`
- PP: Provincia
- MMM: Municipio
- CC: Entidad colectiva
- SS: Entidad singular
- NN: Núcleo/diseminado

### CartoCiudad (IGN/CNIG)

**API REST**: `http://www.cartociudad.es/geocoder/api/`

| Endpoint | Función |
|----------|---------|
| `/geocoder/findJsonp` | Geocodificación directa |
| `/reverseGeocode` | Geocodificación inversa |

**Características**:
- Sin autenticación requerida
- Soporte JSONP/CORS
- Límites ilimitados
- Licencia CC BY 4.0

### NGBE - Nomenclátor Geográfico Básico de España

**WFS**: `https://www.ign.es/wfs-inspire/ngbe`

**OGC API Features**: `https://api-features.idee.es/collections`

- 232,000+ topónimos
- Actualizaciones mensuales
- Interfaz REST moderna

---

## Fuentes Complementarias

### Overpass API (OpenStreetMap)

**URL**: `https://overpass-api.de/api/interpreter`

**Interface visual**: `https://overpass-turbo.eu/`

```
// Ejemplo: Centros de salud en Granada
[out:json][timeout:25];
area[name="Granada"]["admin_level"="8"]->.searchArea;
(
  node["amenity"="clinic"](area.searchArea);
  node["amenity"="hospital"](area.searchArea);
);
out center;
```

**Características**:
- Actualizaciones cada minuto
- Sin límites de cuota
- Rate limit: 1 req/segundo

### Nominatim (OSM)

**URL**: `https://nominatim.openstreetmap.org/`

| Endpoint | Función |
|----------|---------|
| `/search` | Geocodificación |
| `/reverse` | Geocodificación inversa |
| `/lookup` | Detalles por ID |

**Parámetros útiles**:
- `countrycodes=es` (filtrar España)
- `format=json`
- Rate limit: 1 req/segundo

### Wikidata Query Service

**SPARQL Endpoint**: `https://query.wikidata.org/bigdata/namespace/wdq/sparql`

**Propiedades útiles**:
- P625: Coordenadas
- P131: Ubicación administrativa
- P772: Código INE
- P1082: Población

---

## Mapeo Tipología → Servicio

| Tipología PTEL | Servicio Primario | Fallback |
|----------------|-------------------|----------|
| SANITARIO | DERA G12 WFS | CartoCiudad |
| EDUCATIVO | API CKAN Educación | Overpass amenity=school |
| CULTURAL | WFS IAPH | Wikidata |
| POLICIAL | ISE | Overpass amenity=police |
| BOMBEROS | ISE | Overpass amenity=fire_station |
| EMERGENCIAS | DERA G12 | Nominatim |
| DEPORTIVO | ISE | Overpass leisure=sports_centre |
| MUNICIPAL | ISE | Overpass office=government |
| COMBUSTIBLE | Geoportal Gasolineras | Overpass amenity=fuel |
| GENERICO | CartoCiudad | Nominatim |

---

## Licencias

| Fuente | Licencia | Uso Comercial |
|--------|----------|---------------|
| IDE Andalucía | CC BY 4.0 | ✅ Sí |
| CartoCiudad | CC BY 4.0 | ✅ Sí |
| IAPH | CC BY-NC-SA 3.0 | ❌ No (gubernamental OK) |
| OpenStreetMap | ODbL | ✅ Sí (share-alike) |
| Wikidata | CC0 | ✅ Sí (dominio público) |

---

## Consideraciones Técnicas

### CORS

- Servicios OGC (WFS/WMS): CORS por defecto
- CartoCiudad: JSONP explícito
- APIs REST Junta: CORS habilitado
- Legacy diputaciones: puede requerir proxy

### Recomendaciones

1. **Intento directo primero**, fallback a proxy si falla CORS
2. **Caché local agresivo** para reducir consultas
3. **Validación cruzada** entre múltiples fuentes
4. **Refresh diferenciado** según frecuencia de actualización:
   - Estructura (límites): anual
   - Operativos (precios): 24-48h
   - Infraestructura: trimestral

---

**Última actualización**: 24 Noviembre 2025  
**Versión**: 1.0  
**Licencia documento**: CC BY 4.0
