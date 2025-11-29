# Recursos API para geolocalización especializada en Andalucía

**La infraestructura española de datos espaciales ofrece más de 50 APIs y servicios WFS activos específicamente diseñados para geocodificación temática de infraestructuras municipales en Andalucía.** IDE Andalucía proporciona 400+ servicios OGC con 432 capas de datos que cubren todas las tipologías críticas identificadas en los documentos PTEL: desde los 26.000 centros sanitarios del Servicio Andaluz de Salud hasta instalaciones industriales documentadas por REDIAM, pasando por centros educativos con coordenadas oficiales actualizadas en enero 2025 y más de 100.000 registros de patrimonio histórico del IAPH. Estos servicios combinan datos oficiales validados, protocolos WFS/WMS estándar con soporte CORS, actualización regular (última: junio 2025), y acceso gratuito sin autenticación compleja bajo licencias Creative Commons BY 4.0.

El ecosistema permite implementar geocodificación por tipología especializada en lugar de depender exclusivamente de geocodificadores genéricos, reduciendo errores críticos al consultar directamente bases oficiales pre-geocodificadas.

## Servicios especializados por tipología crítica

### Centros Sanitarios (DERA G12)

**URL WFS**: https://www.ideandalucia.es/services/DERA_g12_servicios/wfs

**Capas disponibles**:
- `g12_01_CentroSalud`: Centros de atención primaria (consultorios, CAP)
- `g12_02_CentroAtencionEspecializada`: Hospitales públicos y privados

**Datos incluidos**:
- Código NICA oficial
- Denominación del centro
- Clasificación por tipo de servicio
- Dirección postal completa
- Municipio y provincia
- Coordenadas ETRS89 (precisión 1:2.000)

**Actualización**: Semestral (SICESS - Sistema de Información de Centros, Establecimientos y Servicios Sanitarios)

### Centros Educativos (API REST Junta)

**URL API**: https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/datastore_search

**Resource ID**: 15aabed2-eec3-4b99-a027-9af5e27c9cac

**Datos incluidos**:
- Código oficial 8 dígitos
- Denominación genérica y específica
- Tipo de centro (CEIP, IES, FP, etc.)
- Régimen de titularidad
- Dirección postal completa
- Teléfono y fax
- **Latitud y longitud** para cada centro

**Actualización**: Anual (curso académico)

### Patrimonio Histórico (IAPH + IDE Cultura)

**URLs WFS**:
- Localizador: https://www.iaph.es/ide/localizador/wfs (5.887 sitios)
- Inmaterial: https://www.iaph.es/ide/inmaterial/wfs
- Mueble Urbano: https://www.iaph.es/ide/pmu/wfs
- Paisajes: https://www.iaph.es/ide/paisaje/wfs (117 R-PICA)
- Rutas: https://www.iaph.es/ide/rutas/wfs

**Cobertura total**: 100.000+ registros

### Infraestructuras Hidráulicas (REDIAM)

**URL WFS**: https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas

**Capas**: EDAR, estaciones bombeo, captaciones, embalses, conducciones

### Infraestructura Energética (Agencia Andaluza Energía)

**URL WFS**: https://www.agenciaandaluzadelaenergia.es/mapwms/wfs

**Capas (19 total)**: Subestaciones, centros transformación, líneas AT, gasistas, petroleras

**Actualización**: Junio 2025

## Nomenclátores oficiales

### CartoCiudad (IGN)

**URL API**: http://www.cartociudad.es/geocoder/api/

**Características**:
- Geocodificación forward/reverse
- Sin autenticación requerida
- Sin límites de cuota documentados
- CORS via JSONP
- Licencia CC BY 4.0

**Campos respuesta**:
- `muniCode`: Código INE municipio (validación)
- `state`: 1=exacto, 2-5=aproximado, 10=sin coincidencia

### CDAU (Callejero Digital Andalucía Unificado)

**URL WFS**: https://www.callejerodeandalucia.es/servicios/cdau/wfs

**Capas**: Vías, tramos, portales, manzanas, zonas verdes

**Restricción**: Requiere filtrado espacial obligatorio (bbox o municipio)

### NGA (Nomenclátor Geográfico Andalucía)

**URL WFS**: http://www.ideandalucia.es/wfs-nga/services

**Cobertura**: 232.000+ entidades geográficas

**Categorías**: Administrativas, poblaciones, hidrografía, orografía, patrimonio, infraestructuras

## Límites administrativos (DERA G13)

**URL WFS**: http://www.ideandalucia.es/services/DERA_g13_limites_administrativos/wfs

**Capas**:
- Términos municipales (códigos INE)
- Distritos sanitarios
- Zonas básicas de salud (ZBS)
- Partidos judiciales
- Comarcas turísticas
- Demarcaciones hidrográficas

## Estrategia de integración recomendada

### Cascada óptima

```
1. Cache local (hit rate esperado: 40-60%)
   ↓
2. WFS tipología especializada (sanitarios, educativos, patrimonio)
   ↓
3. CartoCiudad (direcciones genéricas)
   ↓
4. LocationIQ/Geoapify (fallback comercial)
   ↓
5. Nominatim OSM (último recurso)
```

### Validación territorial

1. Point-in-polygon contra DERA G13 (verificar municipio)
2. Validar código INE contra nomenclátor INE local
3. Cruzar con NGA para topónimos

## Licencias

| Servicio | Licencia | Almacenamiento |
|----------|----------|----------------|
| IDE Andalucía | CC BY 4.0 | ✅ Permitido |
| CartoCiudad | CC BY 4.0 | ✅ Permitido |
| IAPH | CC BY-NC-SA 3.0 | ✅ Uso gubernamental |
| OSM/Nominatim | ODbL | ✅ Con atribución |

---

*Actualizado: Noviembre 2025*  
*Proyecto: PTEL Andalucía - Sistema de Geocodificación*