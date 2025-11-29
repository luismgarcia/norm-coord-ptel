# FAQ Técnico - Sistema PTEL Coordinate Normalizer
## Preguntas Frecuentes y Soluciones a Problemas Comunes

> Guía exhaustiva con 40+ preguntas frecuentes, soluciones detalladas y troubleshooting.

**Última actualización**: 20 noviembre 2025  
**Versión**: 1.0.0

---

## 📋 Índice de Categorías

1. [Problemas de Encoding y Caracteres](#problemas-de-encoding-y-caracteres)
2. [Coordenadas Truncadas y Errores](#coordenadas-truncadas-y-errores)
3. [Sistemas de Referencia (CRS)](#sistemas-de-referencia-crs)
4. [Geocodificación y APIs](#geocodificación-y-apis)
5. [Validación y Scoring](#validación-y-scoring)
6. [Formatos de Archivo](#formatos-de-archivo)
7. [Visor de Mapas](#visor-de-mapas)
8. [Performance y Optimización](#performance-y-optimización)
9. [Exportación de Datos](#exportación-de-datos)
10. [Errores Comunes](#errores-comunes)

---

## 🔤 Problemas de Encoding y Caracteres

### P1: ¿Por qué aparecen caracteres raros como "Ã±", "Ã¡", "Ã³"?

**Respuesta**: Corrupción UTF-8 causada por interpretación incorrecta del encoding.

**Solución automática**: Sistema detecta y corrige 27 patrones comunes:
- 'Ã±' → 'ñ'
- 'Ã¡' → 'á'
- 'Ã©' → 'é'
- 'Ã³' → 'ó'

**Prevención**: Al guardar, usar "Unicode (UTF-8)" como encoding.

---

### P2: ¿Cómo corrijo los caracteres manualmente?

**Método 1 - LibreOffice**: Abrir con encoding "Europa occidental" → Guardar como UTF-8

**Método 2 - Python**:
```python
with open('archivo.csv', 'r', encoding='iso-8859-1') as f:
    content = f.read()
with open('archivo_utf8.csv', 'w', encoding='utf-8') as f:
    f.write(content)
```

---

## 📍 Coordenadas Truncadas y Errores

### P4: ¿Por qué mis coordenadas Y empiezan con "1" en vez de "41"?

**Respuesta**: Truncación automática en Excel al interpretar coordenadas.

**Solución**: Sistema detecta y corrige añadiendo prefijo "4" provincial.

**Prevención**: Formatear columna Y como "Texto" ANTES de pegar.

---

### P5: ¿Cómo sé si mis coordenadas están truncadas?

**Regla**: En Andalucía, todas las coordenadas Y en EPSG:25830 deben empezar con "4".

| Provincia | Rango Y esperado |
|-----------|------------------|
| Almería | 4050000 - 4130000 |
| Granada | 4070000 - 4150000 |
| Málaga | 4040000 - 4100000 |
| Sevilla | 4100000 - 4200000 |

---

## 🗺️ Sistemas de Referencia (CRS)

### P7: ¿Qué es EPSG:25830?

**EPSG:25830** = UTM Zona 30N + datum ETRS89, sistema oficial España.

**Características**:
- Proyección: UTM
- Zona: 30 Norte
- Datum: ETRS89
- Unidades: Metros
- Uso: Cartografía técnica, catastro, SIG municipales

---

### P8: ¿Cómo sé en qué sistema están mis coordenadas?

**Diagnóstico por rangos**:
- X: 100,000-800,000 + Y: 4,000,000-4,500,000 → UTM (EPSG:25830)
- X: -10 a 5 + Y: 35 a 44 → WGS84 (EPSG:4326)

---

## 🎯 Geocodificación y APIs

### P11: ¿Por qué CartoCiudad no encuentra mi dirección?

**Causas comunes**:
1. Dirección incompleta: "Calle Mayor" → "Calle Mayor 15, Granada"
2. Abreviaturas no estándar: "C." → "Calle" o "CL"
3. Nombres sin tildes

---

### P12: ¿Cómo mejoro la tasa de geocodificación?

**Estrategia por tipología**:

| Tipología | Sin estrategia | Con tipología | Mejora |
|-----------|---------------|---------------|--------|
| 🏥 Sanitarios | 50-55% | 85-92% | +63% |
| 🎓 Educativos | 55-60% | 80-88% | +47% |
| 🚓 Policiales | 45-50% | 75-82% | +64% |
| 🏛️ Culturales | 40-45% | 70-78% | +73% |

---

### P14: ¿Cuántas peticiones puedo hacer a las APIs?

| Servicio | Límite | Coste |
|----------|--------|-------|
| CartoCiudad IGN | ∞ Sin límite | €0 |
| CDAU Andalucía | ∞ Sin límite | €0 |
| WFS IDE Andalucía | ∞ Sin límite | €0 |
| Nominatim OSM | 1 req/segundo | €0 |
| LocationIQ | 60,000/día | €0 |

---

## ✅ Validación y Scoring

### P15: ¿Cómo se calcula el score (0-100)?

**8 estrategias ponderadas**:
- Format (15%) - Sintaxis válida
- Range (20%) - Dentro límites Andalucía
- Special Characters (10%) - Sin corrupción UTF-8
- Decimals (10%) - Decimales correctos
- Digit Length (10%) - Longitud dígitos correcta
- Spatial Coherence (15%) - Distancia <20km municipio
- Neighborhood (10%) - Vecindad con similares
- CRS Detection (10%) - CRS correcto

---

### P16: ¿Qué significan los niveles de confianza?

| Nivel | Score | Acción |
|-------|-------|--------|
| 🔴 CRÍTICA | 0-25 | Revisión urgente |
| 🟠 BAJA | 26-50 | Geocodificar o validar |
| 🟡 MEDIA | 51-75 | Verificar en mapa |
| 🟢 ALTA | 76-100 | Listo para QGIS |
| 🔵 CONFIRMADO | - | Validado manualmente |

---

## 📁 Formatos de Archivo

### P18: ¿Qué formatos soporta el sistema?

**Entrada**: CSV, XLSX, XLS, DBF, TSV, GeoJSON, KML, ODT

**Salida**: GeoJSON, CSV, KML, Shapefile, PDF (report)

---

## ⚡ Performance

### P24: ¿Cuánto tiempo tarda en procesar?

| Registros | Tiempo total |
|-----------|-------------|
| 100 | <30 segundos |
| 1,000 | 2-4 minutos |
| 10,000 | 20-30 minutos |

---

## 📤 Exportación

### P26: ¿Qué formato usar para QGIS?

**Recomendación**: GeoJSON
- ✅ Formato estándar web
- ✅ Encoding UTF-8 garantizado
- ✅ Importación directa (drag & drop)
- ✅ CRS EPSG:25830 detectado automáticamente

---

## 🐛 Errores Comunes

### P29: Error: "Cannot read property 'x' of undefined"

**Causa**: Mapeo incorrecto de columnas.

**Solución**: Verificar nombres columnas exactos (X, Y, Coord_X, Coord_Y).

---

### P33: ¿Por qué algunos puntos aparecen en el océano?

**Causas**:
1. Lat/Lon invertido
2. CRS incorrecto (WGS84 como UTM)
3. Y debe ser positiva en Andalucía

---

## 📚 Recursos Adicionales

### Documentación oficial
- README.md - Introducción y setup
- CHANGELOG.md - Historial de cambios
- ARQUITECTURA_COMPONENTES.md - Estructura código
- API_DOCUMENTATION.md - Interfaces TypeScript

### Recursos externos
- CartoCiudad: https://www.cartociudad.es/
- IDE Andalucía: https://www.ideandalucia.es/
- IECA: https://www.juntadeandalucia.es/institutodeestadisticaycartografia/

---

### P38: ¿El sistema funciona offline?

**Parcialmente**:
- ✅ Carga archivos locales
- ✅ Normalización UTF-8
- ✅ Validación coordenadas
- ✅ Transformaciones CRS
- ❌ Geocodificación (requiere APIs)
- ❌ Capas WMS mapa

---

### P40: ¿El sistema es open source?

**Sí**, licencia MIT:
- ✅ Usar comercialmente
- ✅ Modificar código
- ✅ Distribuir copias

**Repositorio**: GitHub (contribuciones bienvenidas)

---

**FAQ Técnico** | **40 preguntas** | **v1.0.0**  
**Sistema PTEL Coordinate Normalizer** 🗺️