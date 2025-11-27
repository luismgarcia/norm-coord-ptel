# Guía completa para geocodificar infraestructuras municipales sin dirección postal en Andalucía

> **Versión**: 1.0  
> **Fecha**: Noviembre 2025  
> **Aplicación**: Normalizador-Geolocalizador PTEL Andalucía

---

## Resumen ejecutivo

El geocoding de infraestructuras rurales en municipios pequeños como **Colomera (Granada)** es viable mediante la combinación de fuentes oficiales andaluzas y servicios colaborativos. Las fuentes más efectivas son **IDE Andalucía** con servicios WFS para datos vectoriales, el **Nomenclátor Geográfico de Andalucía** para topónimos locales, y **InfoAntenas** del Ministerio para torres de telecomunicaciones. La automatización es posible en la mayoría de casos mediante estándares OGC (WMS/WFS) y APIs REST, aunque algunas fuentes críticas como InfoAntenas carecen de API pública.

Para el caso específico de Colomera (código INE: 18052), se han identificado **más de 20 fuentes de datos** con diferentes niveles de automatización, cubriendo instalaciones deportivas, antenas de telecomunicaciones, topónimos rurales, equipamientos municipales e instalaciones industriales.

---

## IDE Andalucía y DERA: la columna vertebral de datos espaciales

La **Infraestructura de Datos Espaciales de Andalucía (IDEAndalucía)** constituye el recurso más completo para geocodificación en la región, con **más de 400 servicios WMS/WFS** y **45.000 conjuntos de datos** catalogados. Los Datos Espaciales de Referencia de Andalucía (DERA) proporcionan capas temáticas actualizadas que incluyen instalaciones deportivas, servicios municipales e infraestructuras energéticas.

### Servicios WFS clave:

| Temática | WFS Endpoint |
|----------|--------------|
| Servicios municipales | `https://www.ideandalucia.es/services/DERA_g12_servicios/wfs?` |
| Límites administrativos | `https://www.ideandalucia.es/services/DERA_g13_limites_administrativos/wfs?` |
| Infraestructuras energéticas | `https://www.ideandalucia.es/services/DERA_g10_infra_energetica/wfs?` |
| Sistema urbano | `https://www.ideandalucia.es/services/DERA_g7_sistema_urbano/wfs?` |

Para filtrar datos por municipio en cualquier servicio WFS, se utiliza el filtro `nombre_municipio = 'NombreMunicipio'` o `cod_mun = 'CODIGO_INE'`.

El visor DERA en `https://www.juntadeandalucia.es/institutodeestadisticaycartografia/visores/dera/` permite consulta visual y descarga directa en formatos SHP y GML.

---

## Nomenclátor Geográfico de Andalucía para topónimos rurales

El **Nomenclátor Geográfico de Andalucía (NGA)** contiene **232.000 topónimos con 307.000 geometrías puntuales** derivadas del Mapa Topográfico de Andalucía 1:10.000. Es la fuente definitiva para localizar parajes, cerros, eras y otros topónimos que no tienen dirección postal formal.

### Acceso al NGA:

| Servicio | URL |
|----------|-----|
| Buscador web | `https://www.ideandalucia.es/nomenclator/buscador.jsp` |
| WFS 1.1 | `https://www.ideandalucia.es/wfs-nga/services?` |
| WFS INSPIRE 2.0 | `https://www.ideandalucia.es/wfs-nga-inspire/services?` |
| WMS | `https://www.ideandalucia.es/services/nga_inspire/wms?` |

### Ejemplo de consulta WFS:

```
https://www.ideandalucia.es/wfs-nga/services?
  service=WFS
  &version=1.1.0
  &request=GetFeature
  &typeName=NGA:GN_NGA
  &Filter=<Filter>
    <PropertyIsEqualTo>
      <PropertyName>MUNICIPIO</PropertyName>
      <Literal>Colomera</Literal>
    </PropertyIsEqualTo>
  </Filter>
```

---

## Instalaciones deportivas: el Censo IAID como fuente primaria

El **Inventario Andaluz de Instalaciones Deportivas (IAID)**, regulado por el Decreto 48/2022, es la fuente oficial para equipamientos deportivos en Andalucía.

### Acceso:

- **Visor web**: `https://www.juntadeandalucia.es/deporte/Censo_Andalucia/`
- **API REST**: `https://www.juntadeandalucia.es/datosabiertos/portal/dataset/censo-de-instalaciones-deportivas`

### Operaciones API:

| Endpoint | Descripción |
|----------|-------------|
| `/all` | Descarga masiva completa |
| `/search` | Búsqueda con filtros por municipio |
| `/{bid}` | Consulta por identificador |

---

## InfoAntenas: torres de telecomunicaciones

El portal **InfoAntenas** del Ministerio (`https://geoportal.minetur.gob.es/VCTEL/vcne.do`) es la **única fuente oficial que proporciona ubicaciones exactas de estaciones de telefonía móvil** en España.

**Limitación**: InfoAntenas **carece de API pública**, requiriendo consultas manuales.

### Alternativas automatizables:

1. **OpenStreetMap** - etiquetas `tower:type=communication` y `man_made=mast`
2. **Nomenclátor Geográfico** - buscar el topónimo donde se ubica la antena (cerro, paraje)
3. **Catastro** - parcelas con infraestructuras de telecomunicaciones

---

## OpenStreetMap y Overpass API

**OpenStreetMap** constituye el complemento más potente para datos no cubiertos por fuentes oficiales.

### Consulta Overpass para infraestructuras de un municipio:

```
[out:json][timeout:60];
area[name="NOMBRE_MUNICIPIO"][admin_level=8]->.searchArea;
(
  nwr["leisure"="sports_centre"](area.searchArea);
  nwr["leisure"="swimming_pool"](area.searchArea);
  nwr["leisure"="pitch"](area.searchArea);
  nwr["tower:type"="communication"](area.searchArea);
  nwr["landuse"="industrial"](area.searchArea);
  nwr["amenity"](area.searchArea);
);
out center;
```

### Consulta específica para antenas:

```
[out:json];
area[name="NOMBRE_MUNICIPIO"][admin_level=8]->.searchArea;
(
  node["man_made"="mast"]["tower:type"="communication"](area.searchArea);
  node["man_made"="tower"]["tower:type"="communication"](area.searchArea);
);
out;
```

### Nominatim (geocodificación OSM):

```
https://nominatim.openstreetmap.org/search?q=piscina+municipal+MUNICIPIO+PROVINCIA&format=json
```

**Límite**: 1 request/segundo sin API key.

---

## Catastro INSPIRE

Los servicios INSPIRE del Catastro proporcionan parcelas, edificios y toponimia catastral.

### Endpoints:

| Servicio | URL |
|----------|-----|
| Portal INSPIRE | `https://www.catastro.hacienda.gob.es/webinspire/index.html` |
| WMS | `http://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx` |
| WFS | `http://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx` |
| Descarga ATOM | Por municipio, incluye GML con parcelas y TEXTOS |

La capa **TEXTOS** contiene rotulación de parajes en la cartografía catastral.

---

## SIGGRA y recursos provinciales

La **Diputación de Granada** opera el sistema **SIGGRA** con datos de la **EIEL (Encuesta de Infraestructuras y Equipamientos Locales)**.

| Recurso | URL |
|---------|-----|
| Visor SIGGRA | `https://siggra.dipgra.es/siggra/` |
| Portal IDE Granada | `https://idegranada.dipgra.es/portal/` |

---

## Registros industriales

### PRTR-España (con coordenadas):

Base de datos de ~6.000 complejos industriales con latitud/longitud.

- **Descarga**: Formato MS Access y GeoJSON
- **URL**: `https://prtr-es.es/`

### Registro Integrado Industrial Nacional:

- **Consulta pública**: `https://industria.gob.es/registros-industriales/RII/Paginas/consultas-publicas.aspx`
- **Datasets**: `https://datos.gob.es/catalogo/e05024301-consulta-registro-integrado-industrial-division-a`

---

## Matriz de recursos por tipología

| Tipo de infraestructura | Fuente primaria | Fuente complementaria | Automatización |
|------------------------|-----------------|----------------------|----------------|
| **Instalaciones deportivas** | IAID/Censo Deportivo + DERA WFS | OpenStreetMap Overpass | ALTA |
| **Antenas telecomunicaciones** | InfoAntenas (manual) | OSM + NGA topónimos | BAJA-MEDIA |
| **Topónimos/parajes** | NGA WFS + Catastro TEXTOS | SIGPAC + IGN NGBE | ALTA |
| **Equipamientos municipales** | SIGGRA/EIEL + CDAU | IDEAndalucía DERA | ALTA |
| **Instalaciones industriales** | PRTR (coords) + RII (direcciones) | Catastro WFS | ALTA |

---

## Cascada de geocodificación recomendada

```
L0: CACHÉ LOCAL
    → IndexedDB + localStorage
    
L1: WFS ESPECIALIZADO POR TIPOLOGÍA
    → DERA Salud, Educación, Patrimonio, Energía
    
L2: NOMENCLÁTOR GEOGRÁFICO ANDALUCÍA
    → WFS NGA para topónimos
    
L3: CENSO INSTALACIONES DEPORTIVAS IAID
    → API REST datos abiertos
    
L4: OPENSTREETMAP OVERPASS
    → Consultas específicas por tipología
    
L5: CATASTRO INSPIRE
    → WFS parcelas + TEXTOS
    
L6: SIGGRA/EIEL DIPUTACIONES
    → WFS equipamientos provinciales
    
L7: CDAU
    → Callejero Digital Andalucía
    
L8: CARTOCIUDAD IGN
    → Geocodificador nacional
    
L9: NOMINATIM OSM
    → Fallback final
```

---

## Códigos INE de referencia

Para filtrar datos en servicios WFS, usar el código INE del municipio:

| Municipio | Código INE |
|-----------|------------|
| Colomera | 18052 |
| Granada | 18087 |
| Almería | 04013 |

Consulta completa: `https://www.ine.es/daco/daco42/codmun/codmunmapa.htm`

---

## Referencias

- [IDE Andalucía](https://www.ideandalucia.es/)
- [DERA - IECA](https://www.juntadeandalucia.es/institutodeestadisticaycartografia/dega/datos-espaciales-de-referencia-de-andalucia-dera)
- [Nomenclátor Geográfico de Andalucía](https://www.ideandalucia.es/nomenclator/)
- [CDAU](https://www.callejerodeandalucia.es/)
- [Catastro INSPIRE](https://www.catastro.hacienda.gob.es/webinspire/index.html)
- [Overpass API](https://overpass-api.de/)
- [IAID - Censo Deportivo](https://www.juntadeandalucia.es/organismos/culturaydeporte/areas/deporte/instalaciones-deportivas/inventario-iaid.html)
