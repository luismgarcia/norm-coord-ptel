# Desambiguación de municipios en CartoCiudad: guía técnica completa

**El problema de confusión entre municipios como Colomera (Granada) y Colomers (Girona) tiene solución oficial**: la API CartoCiudad incluye desde agosto 2024 parámetros de filtrado por provincia, municipio y comunidad autónoma que eliminan la ambigüedad. Además, cada respuesta devuelve el código INE del municipio (`muniCode`), permitiendo validación programática. Para un sistema de emergencias en Andalucía, la combinación de estos filtros con el servicio CDAU (Callejero Digital de Andalucía Unificado) ofrece la máxima fiabilidad.

---

## Anatomía del problema: por qué CartoCiudad confunde municipios

El geocodificador de CartoCiudad utiliza **Elasticsearch con algoritmo Soundex**, un sistema fonético que agrupa nombres por similitud de pronunciación. Esto explica por qué "Colomera" y "Colomers" se consideran candidatos equivalentes: sus códigos fonéticos son prácticamente idénticos.

El servicio devuelve resultados ordenados por categoría, no por precisión geográfica: primero poblaciones (**2** registros), luego municipios (**3**), después callejero urbano (**7**), carreteras (**4**), portales (**6**) y finalmente topónimos (**3**). Con un máximo de **35 resultados por búsqueda**, la priorización favorece la similitud fonética sobre la localización geográfica, lo que resulta problemático cuando existen municipios con nombres parecidos en provincias distintas.

España mantiene aproximadamente **34 municipios con nombres repetidos** en diferentes provincias, herencia de un intento fallido de renombrado en 1916 que solo afectó a 573 municipios. Los patrones más problemáticos incluyen terminaciones catalanas versus castellanas (-ers/-era, -es/-a), variaciones con artículos (El/La/Los/Las), y nombres bilingües (Sant/San/Santa).

---

## Solución principal: parámetros de filtrado en la API REST

La actualización de agosto 2024 introdujo filtros específicos que resuelven completamente el problema de desambiguación:

| Parámetro | Función | Ejemplo |
|-----------|---------|--------|
| `provincia_filter` | Restringe a provincia(s) específica(s) | `Granada,Almería` |
| `municipio_filter` | Limita a municipio(s) concreto(s) | `Colomera` |
| `comunidad_autonoma_filter` | Filtra por comunidad autónoma | `Andalucía` |
| `cod_postal_filter` | Acota por código(s) postal(es) | `18121,18122` |
| `poblacion_filter` | Filtra por población/núcleo | `Colomera` |

**Ejemplo de llamada para sistema de emergencias andaluz:**

```
https://www.cartociudad.es/geocoder/api/geocoder/candidates?q=Calle%20Real%205%20Colomera&provincia_filter=Granada&limit=5
```

El endpoint `/candidates` busca coincidencias aproximadas, mientras que `/find` devuelve la geometría completa del resultado seleccionado. Para máxima precisión, se recomienda usar primero `/candidates` con filtros, seleccionar el candidato correcto verificando el código INE, y luego llamar a `/find` con el `id` y `type` del candidato elegido.

---

## Campos de respuesta críticos para validación

Cada resultado de CartoCiudad incluye campos que permiten verificación programática:

```json
{
  "muni": "Colomera",
  "muniCode": "18051",           // Código INE - verificar contra tabla
  "province": "Granada",
  "provinceCode": "18",          // Códigos Andalucía: 04,11,14,18,21,23,29,41
  "comunidadAutonoma": "Andalucía",
  "comunidadAutonomaCode": "01",
  "postalCode": "18121",
  "lat": 37.3889,
  "lng": -3.7147,
  "state": 1,                    // 1=exacto, 2-5=aproximado, 10=sin coincidencia
  "stateMsg": "Resultado exacto de la búsqueda"
}
```

El campo **`state`** es crucial para emergencias: valores de 1 a 3 indican alta confianza, mientras que valores superiores a 5 sugieren resultados aproximados que requieren revisión manual. Un `state` de 10 significa que no se encontró coincidencia exacta y se devuelve la entidad administrativa superior.

---

## Estructura de códigos INE y fuentes oficiales

Los códigos INE de municipios siguen el patrón **PP-MMM** (provincia 2 dígitos, municipio 3 dígitos). Por ejemplo, **18054** corresponde a Colomera: el `18` identifica Granada y el `054` es el código secuencial del municipio.

**Fuentes oficiales de datos:**

- **Descarga Excel**: `https://www.ine.es/daco/daco42/codmun/` (actualización anual, 1 de enero)
- **API JSON del INE**: `https://servicios.ine.es/wstempus/js/ES/VALORES_VARIABLE/19` (hasta 500 registros por página)
- **Nomenclátor Geográfico**: Centro de Descargas del CNIG, incluye coordenadas de centroides

Para un sistema de emergencias, se recomienda mantener una **tabla local de códigos INE** sincronizada anualmente, lo que permite validación instantánea sin dependencia de servicios externos.

---

## CDAU: la alternativa óptima para Andalucía

El Callejero Digital de Andalucía Unificado (CDAU) es el servicio regional oficial, regulado por la Ley 9/2023, y ofrece ventajas significativas para geocodificación de emergencias:

**Características distintivas:**
- Cobertura exclusiva de los **778 municipios andaluces** (sin posibilidad de confusión con otras comunidades)
- Acepta **código INE como parámetro obligatorio** de entrada
- Devuelve campo de **similaridad** que indica exactitud del resultado
- Incluye núcleos de población, diseminados y parajes
- Mantenido directamente por los ayuntamientos (máxima actualización)

**Limitaciones a considerar:** desde enero 2024 requiere autorización previa a través del sistema NAOS de la Junta de Andalucía, y utiliza protocolo SOAP en lugar de REST.

La estrategia óptima combina ambos servicios: usar CDAU como fuente primaria cuando se dispone del código INE del municipio, y CartoCiudad con filtros como respaldo o para direcciones donde solo se conoce el texto libre.

---

## Servicios complementarios para validación cruzada

| Servicio | URL | Uso recomendado |
|----------|-----|----------------|
| **Catastro** | `ovc.catastro.meh.es/ovcservweb/` | Validación a nivel de parcela, requiere código provincia obligatorio |
| **OGC-API Features IGN** | `api-features.ign.es/collections/address/` | Consulta por bounding box y atributos administrativos |
| **Geolocalizador IDEE** | `geolocalizador.idee.es/v1/` | Geocodificación inversa en formato GeoJSON |
| **Nomenclátor NGBE** | `api-features.ign.es/` (colección NGBE) | Verificación de topónimos oficiales |

El Catastro resulta especialmente útil porque **exige obligatoriamente** especificar provincia y municipio, lo que elimina cualquier ambigüedad desde el origen de la consulta.

---

## Conclusión

El problema de desambiguación municipal en CartoCiudad está resuelto a nivel de API mediante los parámetros de filtrado introducidos en 2024. Para un sistema de emergencias en Andalucía con tolerancia cero a errores, la estrategia recomendada combina:

1. **Pre-filtrado obligatorio** con `provincia_filter` o `comunidad_autonoma_filter=Andalucía`
2. **Validación del código INE** (`muniCode`) en cada respuesta contra tabla de referencia local
3. **Uso de CDAU** como fuente primaria cuando se conoce el código INE del municipio
4. **Verificación del campo `state`** para detectar resultados aproximados que requieran revisión
5. **Logging exhaustivo** de cada geocodificación para auditoría y mejora continua

La licencia de CartoCiudad (CC BY 4.0) permite uso libre sin límites de peticiones ni registro. El contacto técnico oficial para reportar casos problemáticos es `cartociudad@transportes.gob.es`.