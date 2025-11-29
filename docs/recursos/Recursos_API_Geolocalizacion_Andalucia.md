# Recursos API para geolocalización especializada en Andalucía

**La infraestructura española de datos espaciales ofrece más de 50 APIs y servicios WFS activos específicamente diseñados para geocodificación temática de infraestructuras municipales en Andalucía.** IDE Andalucía proporciona 400+ servicios OGC con 432 capas de datos que cubren todas las tipologías críticas identificadas en los documentos PTEL: desde los 26.000 centros sanitarios del Servicio Andaluz de Salud hasta instalaciones industriales documentadas por REDIAM, pasando por centros educativos con coordenadas oficiales actualizadas en enero 2025 y más de 100.000 registros de patrimonio histórico del IAPH. Estos servicios combinan datos oficiales validados, protocolos WFS/WMS estándar con soporte CORS, actualización regular (última: junio 2025), y acceso gratuito sin autenticación compleja bajo licencias Creative Commons BY 4.0.

El ecosistema permite implementar geocodificación por tipología especializada en lugar de depender exclusivamente de geocodificadores genéricos, reduciendo errores críticos al consultar directamente bases oficiales pre-geocodificadas. La arquitectura federada INSPIRE garantiza coherencia entre fuentes primarias (SICESS para salud, Consejería de Educación, IAPH para patrimonio) y servicios de distribución estandarizados, mientras que recursos no oficiales de calidad como OpenStreetMap Overpass API y Wikidata complementan con mayor frecuencia de actualización y flexibilidad de consulta. La convergencia de estándares OGC, cumplimiento con directivas EU, y políticas de datos abiertos crea un entorno técnico óptimo para integración sin barreras administrativas ni técnicas.

## Servicios especializados por tipología crítica

IDE Andalucía estructura sus Datos Espaciales de Referencia (DERA) en 13 grupos temáticos con servicios WFS y WMS dedicados que permiten consultas directas por sector sin filtrar grandes volúmenes genéricos. Esta arquitectura especializada transforma la geocodificación de infraestructuras críticas en consultas espaciales precisas contra catálogos oficiales validados.

### Centros Sanitarios

Para **centros sanitarios**, el servicio DERA G12 Servicios en https://www.ideandalucia.es/services/DERA_g12_servicios/wfs proporciona acceso a dos capas fundamentales: g12_01_CentroSalud contiene los centros de atención primaria (consultorios médicos, centros de salud CAP), mientras que g12_02_CentroAtencionEspecializada incluye hospitales públicos y privados con centros periféricos de especialidades. Los datos provienen directamente de SICESS (Sistema de Información de Centros, Establecimientos y Servicios Sanitarios), la base autorizada del Servicio Andaluz de Salud.

Cada registro incluye:
- Código NICA de identificación oficial
- Denominación del centro
- Clasificación por tipo de servicio
- Dirección postal completa
- Municipio y provincia
- Coordenadas geocodificadas con calidad cartográfica a escala 1:2.000

El sistema de referencia soporta múltiples proyecciones:
- CRS:84 y EPSG:4326 para WGS84
- EPSG:4258 para ETRS89 geográfico
- Zonas UTM EPSG:25828-25831 para ETRS89 proyectado

Las actualizaciones son semestrales siguiendo el ciclo de revisión de SICESS.

### Centros Educativos

Los **centros educativos** cuentan con API REST moderna de la Junta de Andalucía implementada sobre plataforma CKAN. El endpoint https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/datastore_search con resource_id 15aabed2-eec3-4b99-a027-9af5e27c9cac accede al Directorio de centros docentes no universitarios publicado en enero 2025 con datos del curso 2023/2024.

La respuesta JSON incluye para cada centro:
- Código oficial de 8 dígitos
- Denominación genérica y específica
- Tipo de centro (CEIP, IES, centros privados y concertados, guarderías 0-3 años, centros de educación especial CEEE, formación profesional)
- Régimen de titularidad
- Dirección postal completa
- Teléfono y fax de contacto
- **Coordenadas de latitud y longitud**

El sistema permite filtrado programático por provincia mediante parámetro filters, búsqueda textual con parámetro q, y paginación con límite de 1.000 registros por petición. El soporte JSONP mediante callbacks habilita acceso CORS directo desde navegadores sin proxy.

### Patrimonio Histórico

El **patrimonio histórico** dispone de infraestructura dual combinando APIs REST del IAPH con servicios WFS de IDE Cultura. La Guía Digital del Patrimonio Cultural en https://guiadigital.iaph.es/store/ expone API Store con acceso a más de 100.000 registros estructurados:

- 26.024 bienes inmuebles (sitios arqueológicos, monumentos, edificios históricos)
- 84.823 bienes muebles (patrimonio portable)
- 1.255 actividades de patrimonio inmaterial (tradiciones, fiestas, oficios)
- 117 paisajes culturales del registro R-PICA
- 21 rutas culturales georreferenciadas

Cinco servicios WFS especializados del IAPH:

| Servicio | URL | Contenido |
|----------|-----|-----------||
| Localizador Cartográfico | https://www.iaph.es/ide/localizador/wfs | 5.887 sitios georreferenciados incluyendo BIC |
| Patrimonio Inmaterial | https://www.iaph.es/ide/inmaterial/wfs | Fiestas y tradiciones con ubicación geográfica |
| Patrimonio Mueble Urbano | https://www.iaph.es/ide/pmu/wfs | Escultura pública y placas conmemorativas |
| Paisajes de Interés Cultural | https://www.iaph.es/ide/paisaje/wfs | 117 paisajes R-PICA |
| Rutas Culturales | https://www.iaph.es/ide/rutas/wfs | Itinerarios georreferenciados |

### Infraestructuras Industriales y Críticas

Las **infraestructuras industriales y críticas** están documentadas exhaustivamente por REDIAM (Red de Información Ambiental de Andalucía) mediante 29 servicios WFS que abarcan 432 capas temáticas.

El servicio de Infraestructuras Hidráulicas en https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas proporciona:
- EDAR (estaciones depuradoras de aguas residuales) con capacidad de tratamiento
- Estaciones de bombeo con caudales
- Captaciones de agua superficial y subterránea
- Embalses y presas con características técnicas
- Conducciones principales de distribución

Para infraestructura energética, la Agencia Andaluza de la Energía opera servicios en https://www.agenciaandaluzadelaenergia.es/mapwms/wfs con 19 capas actualizadas a junio 2025:
- Subestaciones eléctricas con niveles de tensión
- Centros de transformación distribuidos
- Líneas de alta tensión con trazado vectorial
- Infraestructura gasista incluyendo gasoductos y estaciones reguladoras
- Centrales de generación eléctrica renovables y convencionales

Todos los servicios cumplen estándares INSPIRE Annex III Energy Resources.

### Gasolineras

Las **gasolineras** tienen cobertura nacional consolidada mediante el Geoportal Gasolineras del MITECO en https://geoportalgasolineras.es/. El dataset contiene:
- Coordenadas GPS de precisión
- Dirección postal
- Identificación de operador
- Tipos de combustible disponibles
- Precios actualizados diariamente
- Horarios de operación

Descargas directas CSV/ZIP desde https://geoportalgasolineras.es/geoportal-instalaciones/DescargarFicheros.

### Infraestructura Ferroviaria

La **infraestructura ferroviaria** está documentada por ADIF mediante IDEADIF en https://ideadif.adif.es/ con servicios WMS INSPIRE Annex I Transport Networks. Las capas incluyen:
- Líneas ferroviarias clasificadas por estado
- Estaciones y apeaderos con categorización funcional
- Puntos kilométricos para referenciación lineal

## Infraestructura regional de datos espaciales

IDE Andalucía constituye el backbone técnico de la información geoespacial regional, coordinando más de 400 servicios distribuidos en arquitectura federada que cumple la Directiva INSPIRE 2007/2/CE.

### Callejero Digital de Andalucía Unificado (CDAU)

El **CDAU** representa el servicio fundamental para geocodificación a nivel de portal. Los servicios WFS en https://www.callejerodeandalucia.es/servicios/cdau/wfs publican:
- Vías con tipología (calle, avenida, plaza, carretera)
- Tramos de vía con direcciones inicial y final para interpolación
- Portales con numeración oficial y coordenadas precisas ETRS89
- Polígonos de manzanas urbanas
- Geometrías de zonas verdes

Sistemas de referencia nativos:
- ETRS89 UTM huso 30N (EPSG:25830)
- ED50 UTM 30N (EPSG:23030) para compatibilidad con cartografía histórica

**IMPORTANTE:** Las descargas WFS requieren obligatoriamente filtrado espacial mediante bbox o filtro por municipio debido al volumen masivo de datos.

### Nomenclátor Geográfico de Andalucía (NGA)

El **NGA** ofrece resolución de topónimos mediante dos servicios paralelos:
- WFS estándar versión 1.1.0 en http://www.ideandalucia.es/wfs-nga/services
- WFS-INSPIRE versión 2.0.0 en https://www.ideandalucia.es/wfs-nga-inspire/services

La base de datos contiene **más de 232.000 entidades geográficas** extraídas del Mapa Topográfico de Andalucía escala 1:10.000, estructuradas en categorías:
- Áreas administrativas (términos municipales, provincias, pedanías)
- Entidades de población (capitales, cabeceras, núcleos principales, diseminados)
- Hidrografía (ríos, arroyos, embalses, lagunas, fuentes)
- Orografía (sierras, montes, picos, collados, cañadas)
- Patrimonio (castillos, iglesias, ermitas, yacimientos)
- Infraestructuras (carreteras, puentes, viaductos)
- Servicios (depósitos de agua, antenas)
- Equipamientos (cementerios, campos de fútbol, cortijos históricos)

### Inventario de Sedes y Equipamientos (ISE)

El **ISE** documenta la infraestructura física de la Junta de Andalucía con actualización muy reciente del 22 de julio de 2025. Los servicios WFS en https://www.ideandalucia.es/services/ise/wfs publican cuatro tipos de features:

1. **Estructura organizativa jerárquica** (consejerías, secretarías generales, direcciones generales)
2. **Equipamientos puntuales** (edificios administrativos, centros sanitarios, educativos, deportivos, turísticos)
3. **Equipamientos lineales** (carreteras gestionadas, senderos señalizados, vías verdes)
4. **Áreas de gestión** (parques naturales, reservas, montes públicos)

### Diputaciones Provinciales

Las **ocho diputaciones provinciales** aportan servicios complementarios:

| Diputación | Portal | Destacado |
|------------|--------|-----------||
| Jaén | https://ide.dipujaen.es/geoportal/ | 61 de 97 municipios con datos EIEL |
| Málaga | http://www.idemap.es/ | Cartografía urbana vectorial 1:1.000 |
| Sevilla | IDEASevilla | 325 datasets espaciales |

## Nomenclátores oficiales y sistemas de validación

### Instituto Nacional de Estadística (INE)

El **INE** publica anualmente el Nomenclátor de Población del Padrón Continuo en https://www.ine.es/nomen2/index.do con fecha de referencia 1 de enero.

Estructura de códigos INE de 11 dígitos (PPMMMCCSSNN):
- PP: Código provincia (04 Almería, 11 Cádiz, 14 Córdoba, 18 Granada, 21 Huelva, 23 Jaén, 29 Málaga, 41 Sevilla)
- MMM: Código municipio dentro de provincia (001-999)
- CC: Entidad colectiva (00 si no existe, solo presente en Almería)
- SS: Entidad singular (01-99)
- NN: Núcleo o diseminado (00-99)

### CartoCiudad

**CartoCiudad** del IGN/CNIG ofrece la API REST más completa para geocodificación y validación de direcciones españolas en http://www.cartociudad.es/geocoder/api/.

Endpoints principales:
- `/geocoder/findJsonp`: Consultas de texto libre (direcciones, topónimos, puntos kilométricos, referencias catastrales)
- `/reverseGeocode`: Coordenadas a dirección

Características:
- **Sin autenticación requerida**
- **Soporte CORS mediante JSONP**
- Actualizaciones trimestrales
- Licencia CC BY 4.0 scne.es

### IECA - Nomenclátor de Andalucía

Para **Andalucía específicamente**, el IECA publica el Nomenclátor de Entidades y Núcleos de Población de Andalucía en https://www.juntadeandalucia.es/institutodeestadisticaycartografia/dega/nomenclator-de-entidades-y-nucleos-de-poblacion-de-andalucia

Las descargas CSV y Excel anuales incluyen:
- Entidades singulares, núcleos, diseminados
- Entidades colectivas (exclusivamente en Almería)
- Población desagregada por sexo y grupos de edad
- Series históricas desde 1991

### Servicios WFS de Límites Administrativos DERA G13

Los **servicios WFS de límites administrativos** en http://www.ideandalucia.es/services/DERA_g13_limites_administrativos/wfs complementan nomenclátores alfanuméricos con geometrías vectoriales de alta precisión:

- Términos municipales con polígonos certificados y códigos INE
- Provincias con límites oficiales
- Línea de costa actualizada
- Partidos judiciales
- Distritos sanitarios
- Zonas básicas de salud (ZBS)
- Áreas cinegéticas
- Comarcas turísticas
- Demarcaciones hidrográficas

**Las divisiones administrativas alternativas (sanitarias, judiciales, turísticas) actúan funcionalmente como comarcas** para análisis territorial más fino que el municipio.

## Recursos no oficiales de calidad verificable

### Overpass API

**Overpass API** en https://overpass-api.de/api/interpreter representa el método más potente y flexible para consultar datos OpenStreetMap mediante lenguaje declarativo Overpass QL.

Permite **consultas arbitrarias combinando cualquier etiqueta OSM**:
- `amenity=school` para centros educativos
- `amenity=hospital` para hospitales
- `amenity=clinic` para consultorios
- `historic=monument` para monumentos
- `man_made=water_tower` para depósitos de agua
- `man_made=wastewater_plant` para EDAR
- `power=substation` para subestaciones eléctricas
- `power=transformer` para centros de transformación
- `emergency=fire_station` para parques de bomberos

Las instancias públicas replican base OSM completa con **actualizaciones cada minuto**.

**Overpass Turbo** en https://overpass-turbo.eu/ proporciona interfaz web WYSIWYG para construir consultas interactivamente.

### Nominatim

**Nominatim** en https://nominatim.openstreetmap.org/ ofrece geocodificación directa e inversa sobre OSM mediante API REST sencilla:

Endpoints:
- `/search` para búsqueda de direcciones y lugares
- `/reverse` para coordenadas a dirección
- `/lookup` para obtener detalles de elementos OSM por ID

**Política de uso:** máximo 1 request por segundo, exige User-Agent identificativo.

### Wikidata Query Service

**Wikidata Query Service** en https://query.wikidata.org/ proporciona endpoint SPARQL con **licencia CC0 dominio público**.

Propiedades útiles:
- P625: Coordenadas
- P131: Ubicación administrativa jerárquica
- P1082: Población
- P772: Código INE
- P856: Página web oficial

**La utilidad principal para PTEL es enriquecimiento multilingüe**: etiquetas en decenas de idiomas, descripciones textuales, enlaces a Wikipedia.

### API REST Red de Consorcios de Transporte (CTAN)

El servicio **API REST de la CTAN** en https://api.ctan.es/ proporciona infraestructura de transporte público metropolitano en formato GTFS estándar internacional.

Los feeds GTFS incluyen:
- `shapes.txt`: Geometrías lineales de rutas completas
- `stops.txt`: Paradas geocodificadas con nombre y coordenadas WGS84
- `routes.txt`: Información de líneas
- `trips.txt`: Viajes programados
- `stop_times.txt`: Horarios de paso

**Actualizaciones semanales del feed estático.**

### GeoAPI.es

Para **códigos postales completos**, GeoAPI.es en https://api.geoapi.es/ ofrece API REST con tier gratuito.

Endpoints estructurados:
- `/comunidades`: 17 comunidades autónomas
- `/provincias`: 50 provincias con códigos NUTS
- `/municipios`: Todos los municipios con código INE
- `/codigos-postales`: Más de 10.000 códigos postales españoles
- `/vias`: Calles dentro de municipio

**Actualizaciones bianuales en enero y julio.**

### Portal de Datos Abiertos datos.gob.es

El **Portal datos.gob.es** actúa como metabuscador federado de datasets de todas las administraciones públicas españolas.

Endpoints:
- `/api/3/action/package_list`: Lista completa de datasets
- `/api/3/action/package_search`: Búsquedas por texto libre con filtros
- `/api/3/action/package_show`: Metadatos completos de dataset específico
- **Endpoint SPARQL** en http://datos.gob.es/virtuoso/sparql

Agrega aproximadamente 20.000 datasets.

## Estrategia de integración y arquitectura de validación

### Capa Primaria de Geocodificación

Utilizar **CartoCiudad** como servicio principal para resolver direcciones y portales. Para infraestructuras sin dirección postal precisa, recurrir a **geocodificación por tipología especializada** consultando servicios WFS temáticos:

| Tipología | Servicio Primario | Filtro |
|-----------|-------------------|--------|
| Centros sanitarios | DERA G12 WFS | Municipio + nombre |
| Centros educativos | API CKAN Educación | Provincia + texto |
| Patrimonio histórico | WFS IAPH Localizador | BBOX municipal |
| EDAR y captaciones | WFS REDIAM | Municipio |
| Subestaciones | WFS Agencia Energía | Municipio |

### Capa de Validación Territorial

Cruzar coordenadas obtenidas con múltiples nomenclátores:

1. Consulta spatial point-in-polygon contra WFS DERA G13 Límites Administrativos
2. CartoCiudad reverse geocoding para obtener código INE
3. Validar código INE contra nomenclátor INE local
4. Verificar topónimo contra NGA WFS
5. Consultar DERA G13 capas temáticas (distrito sanitario, comarca turística)

**Las discrepancias entre fuentes deben generar flags de alerta** para revisión manual.

### Sistema de Fallback Jerárquico

Implementar resilencia ante fallos de servicios mediante cascada:

1. Si WFS especializado falla → CartoCiudad
2. Si CartoCiudad falla → Nominatim OSM con countrycodes=es
3. Si Nominatim falla → Overpass API
4. Si todo falla → Marcar para geocodificación manual

### Caching Local

**El caching local es crítico para performance y disponibilidad:**

- Descargar nomenclátores INE/IECA completos anualmente en CSV
- Cachear respuestas de WFS por municipio durante 30-90 días
- Implementar cache HTTP transparente para servicios WMS/WFS
- Almacenar resultados de geocodificación previamente validados

## Hallazgos clave y consideraciones técnicas

### Geocodificación Especializada vs Genérica

**La geocodificación especializada supera sistemáticamente a la genérica para infraestructuras oficiales.** El servicio WFS DERA G12 retorna directamente todos los centros de salud del municipio con coordenadas oficiales validadas, permitiendo búsqueda local por similitud de texto sin ambigüedad.

### Convergencia de Estándares

La **convergencia de estándares OGC e INSPIRE** garantiza sostenibilidad técnica a largo plazo. Los servicios WFS implementan especificación OGC abierta con centenares de clientes disponibles.

La transición gradual hacia **OGC API Features como sucesor REST de WFS** está en marcha, ofreciendo interfaz más sencilla que no requiere conocimiento de sintaxis Filter Encoding XML.

### Límites Administrativos Alternativos

Los **límites administrativos alternativos de DERA G13** (216 zonas básicas de salud, distritos sanitarios, partidos judiciales, comarcas turísticas) proporcionan solución pragmática al problema de pedanías inconsistentes. **Estas divisiones actúan como comarcas funcionales** para análisis territorial más fino que el municipio.

### Frecuencia de Actualización

La **frecuencia de actualización distribuida** requiere estrategia de sincronización diferenciada:

| Tipo de Datos | Frecuencia | Estrategia Cache |
|---------------|------------|------------------|
| OSM | Minutely | 24-48 horas |
| NGBE | Mensual | 30 días |
| CartoCiudad | Trimestral | 90 días |
| DERA salud | Semestral | 180 días |
| Nomenclátores poblacionales | Anual | 365 días |

### Soporte CORS

**El soporte CORS está generalizado pero no universal.** La recomendación pragmática para aplicaciones browser-only es implementar lógica que intente primero acceso directo y recurra a proxy ante errores CORS.

### Licencias

Las **licencias Creative Commons BY 4.0** (IDE Andalucía, CartoCiudad, CNIG), CC BY-NC-SA 3.0 (IAPH), ODbL (OSM), y CC0 (Wikidata) cubren todo el espectro identificado con compatibilidad para uso en emergencias.

**La atribución requerida** debe implementarse en metadatos de cada registro geocodificado almacenando fuente utilizada.

---

*Actualizado: Noviembre 2025*  
*Proyecto: Normalizador-Geolocalizador PTEL Andalucía*
