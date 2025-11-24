# FAQ Técnico - Sistema PTEL Coordinate Normalizer
## Preguntas Frecuentes y Soluciones

> Guía con las preguntas frecuentes más importantes para la normalización de coordenadas PTEL.

**Versión**: 1.1  
**Última actualización**: 24 noviembre 2025

---

## 📋 Categorías

1. [Encoding y Caracteres](#encoding-y-caracteres)
2. [Coordenadas y CRS](#coordenadas-y-crs)
3. [Geocodificación](#geocodificación)
4. [Validación y Scoring](#validación-y-scoring)
5. [Formatos de Archivo](#formatos-de-archivo)
6. [Errores Comunes](#errores-comunes)

---

## 🔤 Encoding y Caracteres

### ¿Por qué aparecen caracteres raros como "Ã³", "Ã¡", "Ã±"?

**Causa**: Corrupción UTF-8 (mojibake) - archivo Windows-1252 interpretado como UTF-8.

**Solución automática**: El sistema corrige 52 patrones comunes:
- `Ã³` → `ó`
- `Ã¡` → `á`
- `Ã©` → `é`
- `Ã±` → `ñ`

**Prevención**:
- LibreOffice: Guardar como CSV → "Unicode (UTF-8)"
- Excel: "Guardar como → CSV UTF-8"
- QGIS: Exportar con "UTF-8 encoding"

### ¿Cómo corrijo caracteres manualmente?

**Método 1 - LibreOffice**:
1. Abrir archivo con encoding "ISO-8859-1"
2. Guardar como CSV con "Unicode (UTF-8)"

**Método 2 - Línea de comandos**:
```bash
iconv -f WINDOWS-1252 -t UTF-8 archivo.csv > archivo_utf8.csv
```

**Método 3 - Script Python**:
```python
import codecs
with open('archivo.csv', 'r', encoding='iso-8859-1') as f:
    content = f.read()
with open('archivo_utf8.csv', 'w', encoding='utf-8') as f:
    f.write(content)
```

---

## 🌍 Coordenadas y CRS

### ¿Qué sistema de coordenadas usa el sistema?

**Sistema de salida**: EPSG:25830 (UTM zona 30N ETRS89)

**Sistemas de entrada detectados automáticamente**:
- EPSG:4326 (WGS84 lat/lon)
- EPSG:4258 (ETRS89 geográficas)
- EPSG:23030 (ED50 UTM zona 30N)
- EPSG:32630 (WGS84 UTM zona 30N)
- +20 sistemas adicionales

### ¿Cómo detecto si mis coordenadas están transpuestas (X↔Y)?

**Síntomas**:
- X tiene 7 dígitos, Y tiene 6 dígitos (típico UTM30 es inverso)
- Coordenadas fuera de Andalucía tras conversión

**Solución automática**: La estrategia de validación #5 detecta transposiciones:
```typescript
// Si X parece Y e Y parece X
const xPareceY = digitosX === 7 && digitosY === 6
```

**Alerta generada**: "⚠️ Posible transposición X ↔ Y detectada"

### ¿Qué rango de coordenadas es válido para Andalucía?

**UTM30 ETRS89 (EPSG:25830)**:
- X: 160,000 - 770,000 metros
- Y: 3,960,000 - 4,280,000 metros

**WGS84 (EPSG:4326)**:
- Longitud: -7.5° a -1.6°
- Latitud: 35.9° a 38.7°

---

## 🔍 Geocodificación

### ¿Qué APIs de geocodificación usa el sistema?

**Primarias (gratuitas, sin límite)**:
1. CartoCiudad (IGN) - Direcciones
2. CDAU - Callejero Andalucía
3. WFS DERA - Servicios especializados

**Especializadas por tipología**:
- SANITARIO: WFS SICESS/SAS
- EDUCATIVO: API CKAN Educación
- CULTURAL: WFS IAPH
- POLICIAL: WFS ISE

**Fallback**:
- Nominatim (OSM) - 1 req/segundo
- Visor manual Leaflet

### ¿Por qué la geocodificación tipológica es mejor?

**Geocodificación genérica**: 
- "Centro de Salud Los Bermejales" → busca en callejero → puede fallar

**Geocodificación tipológica**:
- Detecta tipo: SANITARIO
- Consulta WFS DERA G12
- Retorna coordenadas oficiales validadas

**Resultado**: 72% éxito vs 50-55% anterior (+30% mejora)

### ¿Qué hago si la geocodificación falla?

**Cascada de fallbacks automática**:
1. Servicio tipológico (WFS)
2. CartoCiudad
3. CDAU
4. Nominatim
5. Visor manual (Fase 3)

**Si todo falla**: El sistema marca con score <40 para revisión manual futura.

---

## 📊 Validación y Scoring

### ¿Cómo funciona el sistema de scoring 0-100?

**8 estrategias de validación**:

| Estrategia | Puntos | Descripción |
|------------|--------|-------------|
| 1. Rango UTM30 | 15 | Dentro de límites Andalucía |
| 2. Caracteres especiales | 10 | Sin corrupción UTF-8 |
| 3. Posición decimal | 15 | Precisión correcta |
| 4. Longitud dígitos | 10 | 6 dígitos X, 7 dígitos Y |
| 5. Transposición | 10 | X/Y no intercambiados |
| 6. Coherencia formato | 10 | Detección sistema confiable |
| 7. Validación EPSG | 10 | Conversión exitosa |
| 8. Proximidad vecinos | 20 | <20km de otros puntos |

### ¿Qué significan los niveles de confianza?

| Nivel | Score | Acción Recomendada |
|-------|-------|-------------------|
| HIGH | 76-100 | ✅ Uso directo en QGIS |
| MEDIUM | 51-75 | ⚠️ Revisar manualmente |
| LOW | 26-50 | 🔍 Geocodificar con CartoCiudad |
| CRITICAL | 0-25 | ❌ Rechazar o corregir |
| CONFIRMED | Manual | 🔵 Validado por usuario |

### ¿Por qué la proximidad de vecinos da 20 puntos (la más alta)?

**Razón**: Es el indicador más fiable de coherencia espacial.

**Lógica**:
- Infraestructuras PTEL suelen estar agrupadas por municipio
- Una coordenada aislada (>20km de vecinos) es sospechosa
- Outliers espaciales indican posible error de geocodificación

---

## 📁 Formatos de Archivo

### ¿Qué formatos de entrada soporta el sistema?

| Formato | Extensión | Soporte |
|---------|-----------|---------|
| CSV | .csv | ✅ Completo |
| Excel | .xlsx, .xls | ✅ Completo |
| OpenDocument | .ods, .odt | ✅ Completo |
| GeoJSON | .geojson | ✅ Completo |
| KML/KMZ | .kml, .kmz | ✅ Completo |
| Shapefile | .shp | ⚠️ Via conversión |
| DBF | .dbf | ✅ Básico |

### ¿Qué formatos de exportación están disponibles?

**CSV (UTF-8 con BOM)**:
- Compatible QGIS
- Columnas: originales + X_UTM30 + Y_UTM30 + Score + Confianza

**Excel (XLSX)**:
- Formato nativo
- Colores por nivel de confianza

**GeoJSON**:
- CRS: EPSG:25830
- Properties incluyen score y alertas

**KML**:
- Compatible Google Earth
- Descripción con metadatos

---

## ⚠️ Errores Comunes

### Error: "No se pudieron detectar columnas de coordenadas"

**Causas posibles**:
1. Nombres de columna no estándar
2. Datos en formato no numérico
3. Archivo vacío

**Solución**:
- Renombrar columnas a: `X`, `Y`, `LON`, `LAT`, `COORD_X`, `COORD_Y`
- Verificar que valores son numéricos
- Eliminar filas vacías al inicio

### Error: "Coordenadas fuera de rango"

**Causa**: Coordenadas no corresponden a Andalucía.

**Verificar**:
1. Sistema de referencia correcto
2. No hay transposición X↔Y
3. Valores no truncados

**Solución**: El sistema intentará detectar y corregir automáticamente.

### Error: "Score muy bajo en todo el archivo"

**Causas comunes**:
1. Encoding incorrecto
2. Sistema de coordenadas equivocado
3. Datos muy corruptos

**Diagnóstico**:
- Revisar tab "Alertas" para ver problemas específicos
- Verificar primeras filas manualmente
- Probar conversión encoding previa

### Error CORS al geocodificar

**Causa**: Servicio WFS no permite acceso desde navegador.

**Solución automática**: El sistema usa fallback a APIs con CORS habilitado.

**Solución manual**: Algunos servicios legacy de diputaciones pueden requerir proxy.

---

## 🔧 Troubleshooting Avanzado

### Verificar coordenadas manualmente

```javascript
// En consola del navegador
import proj4 from 'proj4'

// Definir sistemas
proj4.defs('EPSG:25830', '+proj=utm +zone=30 +ellps=GRS80 +units=m')
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84')

// Convertir WGS84 → UTM30
const [x, y] = proj4('EPSG:4326', 'EPSG:25830', [-3.7, 37.18])
console.log(`UTM30: ${x}, ${y}`)
```

### Depurar scoring bajo

```typescript
// Obtener detalles de validación
const result = normalizeCoordinate(input)
console.log('Score:', result.score)
console.log('Confidence:', result.confidence)
console.log('Corrections:', result.corrections)
console.log('Alerts:', result.alerts)
```

---

**¿No encuentras tu pregunta?** Contacta al equipo técnico o consulta la documentación completa en `/docs/`.
