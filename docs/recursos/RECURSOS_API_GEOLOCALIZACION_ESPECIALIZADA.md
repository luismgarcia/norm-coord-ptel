# Recursos API para Geolocalización Especializada en Andalucía

**La infraestructura española de datos espaciales ofrece más de 50 APIs y servicios WFS activos específicamente diseñados para geocodificación temática de infraestructuras municipales en Andalucía.**

IDE Andalucía proporciona 400+ servicios OGC con 432 capas de datos que cubren todas las tipologías críticas identificadas en los documentos PTEL.

---

## Servicios Especializados por Tipología

### 🏥 Centros Sanitarios - DERA G12

**Endpoint:** `https://www.ideandalucia.es/services/DERA_g12_servicios/wfs`

| Capa | Contenido |
|------|----------|
| `g12_01_CentroSalud` | Centros de atención primaria (consultorios, CAP) |
| `g12_02_CentroAtencionEspecializada` | Hospitales públicos y privados |

**Datos incluidos:**
- Código NICA de identificación oficial
- Denominación del centro
- Clasificación por tipo de servicio
- Dirección postal completa
- Coordenadas geocodificadas (precisión 1:2.000)

**Sistemas de referencia:**
- CRS:84, EPSG:4326 (WGS84)
- EPSG:4258 (ETRS89 geográfico)
- EPSG:25828-25831 (UTM zonas)

### 🎓 Centros Educativos - API CKAN

**Endpoint:** `https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/datastore_search`

**Resource ID:** `15aabed2-eec3-4b99-a027-9af5e27c9cac`

**Datos incluidos:**
- Código oficial de 8 dígitos
- Denominación genérica y específica
- Tipo (CEIP, IES, centros privados, guarderías, CEEE, FP)
- Régimen de titularidad
- Coordenadas latitud/longitud

**Parámetros de consulta:**
- `filters`: Filtrado por provincia
- `q`: Búsqueda textual
- Paginación: límite 1.000 registros/petición
- Soporte JSONP para CORS

### 🏛️ Patrimonio Histórico - IAPH

**Servicios WFS disponibles:**

| Servicio | URL | Registros |
|----------|-----|----------|
| Localizador Cartográfico | `https://www.iaph.es/ide/localizador/wfs` | 5.887 sitios |
| Patrimonio Inmaterial | `https://www.iaph.es/ide/inmaterial/wfs` | Fiestas, tradiciones |
| Mueble Urbano | `https://www.iaph.es/ide/pmu/wfs` | Escultura pública |
| Paisajes Culturales | `https://www.iaph.es/ide/paisaje/wfs` | 117 paisajes R-PICA |
| Rutas Culturales | `https://www.iaph.es/ide/rutas/wfs` | Itinerarios |

**Guía Digital del Patrimonio:** `https://guiadigital.iaph.es/store/`
- 26.024 bienes inmuebles
- 84.823 bienes muebles
- 1.255 actividades de patrimonio inmaterial

### 🏭 Infraestructuras Industriales - REDIAM

**29 servicios WFS con 432 capas temáticas**

**Infraestructuras Hidráulicas:**
```
https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas
```
- EDAR (estaciones depuradoras)
- Estaciones de bombeo
- Captaciones de agua
- Embalses y presas

**Infraestructura Energética (Agencia Andaluza de la Energía):**
```
https://www.agenciaandaluzadelaenergia.es/mapwms/wfs
```
- Subestaciones eléctricas
- Centros de transformación
- Líneas de alta tensión
- Infraestructura gasista
- Centrales de generación

### ⛽ Gasolineras - MITECO

**Portal:** `https://geoportalgasolineras.es/`

**Descargas:** `https://geoportalgasolineras.es/geoportal-instalaciones/DescargarFicheros`

**Datos incluidos:**
- Coordenadas GPS precisas
- Dirección postal
- Operador
- Tipos de combustible
- Precios (actualización diaria)
- Horarios de operación

### 🚂 Infraestructura Ferroviaria - ADIF

**Portal:** `https://ideadif.adif.es/`

**Capas disponibles:**
- Líneas ferroviarias (en servicio, fuera de servicio, en construcción)
- Estaciones y apeaderos
- Puntos kilométricos

---

## APIs Complementarias de Alta Calidad

### OpenStreetMap - Overpass API

**Endpoint:** `https://overpass-api.de/api/interpreter`

```
[out:json];
area[name="Granada"]->.a;
node[amenity=hospital](area.a);
out body;
```

**Ventajas:**
- Actualización continua (minutely)
- Flexibilidad de consulta
- Sin límites estrictos de API

### Wikidata - SPARQL

**Endpoint:** `https://query.wikidata.org/sparql`

```sparql
SELECT ?item ?itemLabel ?coord WHERE {
  ?item wdt:P131 wd:Q8810 .  # Granada
  ?item wdt:P625 ?coord .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es". }
}
```

---

## Hallazgos Clave

### La geocodificación especializada supera a la genérica

En lugar de:
1. Recibir texto "Centro de Salud Los Bermejales"
2. Inferir que es establecimiento sanitario
3. Buscar en callejero
4. Estimar coordenadas

El servicio WFS DERA G12:
- Retorna TODOS los centros de salud del municipio
- Con coordenadas oficiales validadas
- Permite búsqueda local por similitud de texto

### Convergencia de estándares OGC e INSPIRE

- WFS: especificación OGC abierta
- INSPIRE: esquemas XML estandarizados
- OGC API Features: sucesor REST de WFS

### Límites administrativos alternativos (DERA G13)

- 216 zonas básicas de salud
- Distritos sanitarios
- Partidos judiciales
- Comarcas turísticas

**Solución pragmática** para pedanías inconsistentes.

---

## Licencias

| Fuente | Licencia |
|--------|----------|
| IDE Andalucía | CC BY 4.0 |
| CartoCiudad | CC BY 4.0 |
| CNIG | CC BY 4.0 |
| IAPH | CC BY-NC-SA 3.0 |
| OSM | ODbL |
| Wikidata | CC0 |

**Atribución requerida:** Almacenar fuente en metadatos de cada registro.

---

## Soporte CORS

- ✅ Servicios OGC estándar: CORS por defecto
- ✅ CartoCiudad: JSONP explícito
- ✅ APIs REST Junta: CORS soportado
- ⚠️ Servicios legacy: pueden requerir proxy

**Recomendación:** Intentar acceso directo primero, proxy ante errores CORS.

---

*Generado: Noviembre 2025*  
*Proyecto: Normalizador-Geolocalizador PTEL Andalucía*