# Normalización UTF-8 para compatibilidad GIS/QGIS

## Descripción general

El conversor de coordenadas UTM30 ahora incluye normalización completa de texto UTF-8 (ES) en **todas las columnas del documento**, no solo en las coordenadas. Esta funcionalidad garantiza la máxima compatibilidad con QGIS y otras aplicaciones GIS, evitando errores comunes de codificación y visualización.

## ¿Qué se normaliza?

### 1. Coordenadas (funcionalidad existente)
- Corrección de separadores decimales (comas vs puntos)
- Eliminación de caracteres no numéricos
- Conversión de formato DMS a decimal
- Normalización de espacios

### 2. Texto en todas las columnas (nueva funcionalidad)

#### Conversión de caracteres Unicode a ASCII
Elimina tildes y diacríticos para máxima compatibilidad:
- `á, é, í, ó, ú` → `a, e, i, o, u`
- `ñ` → `n`
- `ü` → `u`
- `Á, É, Í, Ó, Ú` → `A, E, I, O, U`

**Ejemplo:**
- Original: `"Río Miño - Estación de medición"`
- Normalizado: `"Rio Mino - Estacion de medicion"`

#### Unificación de comillas tipográficas
Convierte todas las variantes de comillas a formato estándar:
- `"texto"` (comillas tipográficas) → `"texto"` (comillas rectas)
- `'texto'` (apóstrofe tipográfico) → `'texto'` (apóstrofe recto)

**Ejemplo:**
- Original: `"Campo "especial" con comillas"`
- Normalizado: `"Campo ""especial"" con comillas"` (con escape correcto)

#### Unificación de guiones
Convierte guiones largos y medios a guiones estándar:
- `–` (guion medio/en dash) → `-`
- `—` (guion largo/em dash) → `-`

**Ejemplo:**
- Original: `"Período 2020–2024"`
- Normalizado: `"Periodo 2020-2024"`

#### Eliminación de caracteres de control
Elimina caracteres no imprimibles que pueden causar problemas:
- Tabulaciones innecesarias
- Saltos de línea dentro de campos
- Caracteres de control ASCII (0x00-0x1F, 0x7F-0x9F)

#### Normalización de espacios
- Múltiples espacios consecutivos → Un solo espacio
- Espacios al inicio y final → Eliminados
- Espacios Unicode especiales → Espacio ASCII estándar

**Ejemplo:**
- Original: `"Nombre     con   espacios  "`
- Normalizado: `"Nombre con espacios"`

#### Otros caracteres especiales
- `…` (puntos suspensivos Unicode) → `...` (tres puntos)
- `•, ‣, ⁃` (viñetas) → `*`

## Codificación de salida

### UTF-8 con BOM
El archivo CSV de salida incluye el **BOM (Byte Order Mark)** UTF-8 (`0xEF, 0xBB, 0xBF`):
- Garantiza que QGIS y Excel detecten automáticamente UTF-8
- Evita problemas de visualización de caracteres
- Compatible con el estándar español (ES)

### Formato CSV estándar (RFC 4180)
- Campos entrecomillados para seguridad
- Escape correcto de comillas internas (duplicación: `""`)
- Separador de coma (`,`)
- Compatibilidad universal con GIS

## Ventajas para usuarios GIS/QGIS

### ✅ Antes de la normalización (problemas comunes)
- ❌ Nombres con tildes aparecen corruptos: `"RÃ­o MiÃ±o"`
- ❌ Comillas causan errores de parsing en CSV
- ❌ Espacios múltiples desalinean columnas
- ❌ Caracteres de control rompen la importación

### ✅ Después de la normalización
- ✅ Texto limpio y legible en QGIS
- ✅ Sin errores de importación
- ✅ Datos consistentes y estandarizados
- ✅ Compatible con todos los software GIS

## Ejemplo completo de transformación

### Archivo de entrada (Excel/CSV original)
```csv
Nombre,Descripción,X,Y
"Río Miño","Estación de medición – Zona "especial"",42.123,8.456
"Peña de  Francia","Sitio histórico… importante",40.789,6.123
```

### Archivo de salida (CSV normalizado UTM30)
```csv
"X_UTM30","Y_UTM30","Nombre","Descripcion"
"534567.89","4234567.89","Rio Mino","Estacion de medicion - Zona ""especial"""
"456789.01","4123456.78","Pena de Francia","Sitio historico... importante"
```

### Cambios aplicados:
1. **Coordenadas**: Convertidas de WGS84 (lat/lon) a UTM30N (metros)
2. **Tildes eliminadas**: `Río` → `Rio`, `Peña` → `Pena`, `histórico` → `historico`
3. **Guiones normalizados**: `–` → `-`
4. **Comillas escapadas**: `"especial"` → `""especial""`
5. **Espacios múltiples**: `"de  Francia"` → `"de Francia"`
6. **Puntos suspensivos**: `…` → `...`
7. **BOM UTF-8**: Añadido al inicio del archivo
8. **Todas las columnas**: Incluidas en la salida (no solo coordenadas)

## Impacto en flujos de trabajo GIS

### Importación en QGIS
1. **Sin normalización**: 
   - Requiere configuración manual de codificación
   - Errores de visualización frecuentes
   - Necesidad de limpieza manual de datos

2. **Con normalización**:
   - Importación directa sin configuración
   - Visualización correcta inmediata
   - Datos listos para análisis GIS

### Compatibilidad con otros software
- ✅ ArcGIS / ArcMap
- ✅ QGIS (todas las versiones)
- ✅ PostGIS / PostgreSQL
- ✅ Excel / LibreOffice Calc
- ✅ Google Earth (importación KML/CSV)
- ✅ AutoCAD Civil 3D
- ✅ Global Mapper

## Transparencia y control

### Información en la interfaz
La aplicación muestra claramente:
- ✨ Indicador de normalización automática activa
- 📊 Columnas procesadas y normalizadas
- ✅ Confirmación de codificación UTF-8 con BOM
- 📥 Todas las columnas incluidas en la salida

### Datos preservados
- ✅ Todas las columnas originales se mantienen
- ✅ Solo se normaliza el formato, no el contenido semántico
- ✅ Coordenadas convertidas añadidas como nuevas columnas
- ✅ Estructura de datos intacta

## Casos de uso específicos

### Catastro y urbanismo
- Nombres de calles con tildes y caracteres especiales
- Descripciones de parcelas con formato inconsistente
- Referencias catastrales con espacios variables

### Medio ambiente y recursos naturales
- Nombres científicos y comunes de especies
- Descripciones de hábitats con acentos
- Referencias bibliográficas con comillas tipográficas

### Infraestructuras y servicios
- Nombres de instalaciones con ñ y tildes
- Descripciones técnicas con guiones largos
- Códigos con espacios inconsistentes

### Arqueología y patrimonio
- Nombres históricos con caracteres especiales
- Descripciones de yacimientos con tildes
- Referencias documentales con formato variable

## Notas técnicas

### Implementación
- Función `normalizeTextForGIS()` en `src/lib/fileParser.ts`
- Normalización NFD (Unicode Normalization Form D) seguida de eliminación de diacríticos
- Regex para caracteres de control: `/[\u0000-\u001F\u007F-\u009F]/g`
- BOM UTF-8: `\ufeff` al inicio del archivo CSV

### Rendimiento
- Procesamiento en memoria del navegador
- Sin impacto significativo en archivos < 10,000 filas
- Compatible con procesamiento por lotes de múltiples archivos

### Estándares seguidos
- Unicode NFD normalization (UAX #15)
- CSV RFC 4180
- UTF-8 with BOM (ISO/IEC 10646)
- GIS/QGIS best practices

## Preguntas frecuentes

### ¿Por qué eliminar las tildes?
La eliminación de tildes (conversión a ASCII) evita problemas de codificación en algunos sistemas GIS antiguos o mal configurados. Es una práctica estándar en geodatabases profesionales para máxima compatibilidad.

### ¿Se pierden los datos originales?
No. El archivo original permanece intacto. El CSV generado es un nuevo archivo con datos normalizados. Las coordenadas originales se pueden mantener como columnas adicionales si se desea.

### ¿Funciona con todos los idiomas?
La normalización está optimizada para español (ES), pero funciona con cualquier texto que contenga caracteres Unicode. Los caracteres no españoles se convierten a sus equivalentes ASCII cuando es posible.

### ¿Qué pasa si no quiero normalización?
La normalización es automática para garantizar compatibilidad GIS. Si necesita los datos originales sin cambios, conserve su archivo de entrada original. El CSV generado es específicamente para uso en aplicaciones GIS.

### ¿Es compatible con PostGIS?
Sí, completamente. PostGIS importa correctamente CSV con UTF-8 BOM y formato normalizado. Las coordenadas UTM30 (EPSG:25830) se reconocen directamente.

---

**Versión**: 2.0  
**Última actualización**: 2024  
**Contacto**: Para reportar problemas o sugerencias sobre la normalización UTF-8
