# Guía de planificación

Una aplicación web profesional que detecta, analiza, normaliza y convierte automáticamente coordenadas geográficas desde varios formatos de archivo al formato UTM Zona 30, optimizada para QGIS y aplicaciones SIG similares.

**Cualidades de la experiencia**: 
1. **Precisa** - La aplicación debe manejar transformaciones de coordenadas con precisión de grado profesional para flujos de trabajo SIG
2. **Eficiente** - Procesamiento rápido de archivos con indicadores de progreso claros y retroalimentación inmediata sobre la detección de coordenadas
3. **Confiable** - Información transparente sobre los sistemas de coordenadas detectados y validación antes de la conversión

**Nivel de complejidad**: Aplicación ligera (múltiples funciones con estado básico)
  - Maneja carga de archivos, detección de coordenadas, transformación y descarga, pero enfocado en un único flujo de trabajo principal sin cuentas de usuario complejas o gestión de estado avanzada

## Funciones esenciales

### Carga y detección de archivos (compatibilidad con múltiples archivos)
- **Funcionalidad**: Acepta múltiples archivos simultáneamente en varios formatos (CSV, Excel XLS/XLSX/XLSM/XLSB, OpenDocument ODS/FODS, Word DOC/DOCX, OpenDocument Text ODT, RTF, TXT) y detecta automáticamente las columnas de coordenadas en cada archivo
- **Propósito**: Elimina la configuración manual y admite el procesamiento por lotes de diversos flujos de trabajo profesionales en todos los formatos de documentos principales, lo que permite una conversión masiva eficiente de coordenadas
- **Activador**: El usuario arrastra uno o varios archivos o hace clic en el botón de carga para seleccionar múltiples archivos
- **Progresión**: Selección de múltiples archivos → Carga y procesamiento secuencial → Análisis automático de cada uno → Detección de columnas de coordenadas por archivo → Visualización de todos los archivos procesados con gestión individual
- **Criterios de éxito**: Analiza exitosamente todos los formatos admitidos, identifica pares de coordenadas con una precisión del 95 % o más, procesa múltiples archivos secuencialmente sin pérdida de datos y mantiene el estado individual de cada archivo para revisión y descarga

### Análisis y normalización de coordenadas
- **Funcionalidad**: Identifica el sistema de coordenadas de más de 15 formatos admitidos (WGS84, ETRS89, ED50, Web Mercator, Lambert 93, etc.), detecta y corrige errores de formato de coordenadas, normaliza separadores decimales inconsistentes (comas frente a puntos), elimina caracteres no válidos, convierte el formato DMS (grados/minutos/segundos) a decimal y valida la calidad de los datos
- **Propósito**: Garantiza la integridad de los datos antes de la transformación, maneja automáticamente datos del mundo real desordenados y proporciona transparencia sobre las correcciones realizadas
- **Activador**: Automático después de la carga y detección del archivo
- **Progresión**: Coordenadas sin procesar → Limpieza de caracteres → Normalización decimal → Conversión DMS → Detección del sistema → Validación de formato → Visualización de estadísticas con recuento de normalización
- **Criterios de éxito**: Identifica correctamente más de 15 sistemas de coordenadas en diferentes zonas y datums, normaliza exitosamente coordenadas con errores de formato (decimales incorrectos, caracteres especiales, notación DMS), informa problemas de validación con mensajes de error detallados

### Normalización de texto UTF-8 para GIS
- **Funcionalidad**: Normaliza todas las columnas de texto del documento para compatibilidad total con GIS/QGIS: conversión de caracteres Unicode a ASCII (elimina tildes y diacríticos), unificación de comillas tipográficas y guiones a formatos estándar, eliminación de caracteres de control y no imprimibles, normalización de espacios múltiples, escape correcto de comillas en CSV, y codificación UTF-8 con BOM para visualización correcta en QGIS
- **Propósito**: Asegura que todos los datos de texto se importen y visualicen correctamente en aplicaciones GIS sin errores de codificación, caracteres corruptos o problemas de formato, manteniendo la compatibilidad regional española
- **Activador**: Automático durante la generación del archivo de salida CSV
- **Progresión**: Datos de texto originales → Normalización NFD (descomposición de diacríticos) → Eliminación de diacríticos → Unificación de caracteres tipográficos → Eliminación de caracteres de control → Normalización de espacios → Escape de comillas → Adición de BOM UTF-8 → CSV listo para QGIS
- **Criterios de éxito**: Todos los campos de texto se visualizan correctamente en QGIS sin errores de codificación, nombres de columnas normalizadas sin caracteres especiales, datos de texto sin corrupción, compatibilidad con software GIS en español (ES)

### Conversión a UTM30
- **Funcionalidad**: Transforma las coordenadas detectadas al formato UTM Zona 30N con estructura compatible con QGIS
- **Propósito**: Estandariza las coordenadas para aplicaciones SIG profesionales
- **Activador**: Automático después del análisis, con confirmación del usuario
- **Progresión**: Coordenadas normalizadas → Transformación UTM30 → Control de calidad → Generación de CSV
- **Criterios de éxito**: Transformaciones precisas con una precisión de 1 m, formato CSV adecuado para importación en QGIS

### Visualización de información
- **Funcionalidad**: Muestra el sistema de coordenadas detectado (de más de 15 sistemas admitidos, incluidas múltiples zonas UTM, datums y proyecciones), datos de muestra, recuentos de filas, columnas detectadas, estadísticas de normalización y resumen de conversión
- **Propósito**: Proporciona transparencia sobre las correcciones automáticas y permite la validación del usuario antes de la descarga
- **Activador**: Se actualiza en cada etapa de procesamiento
- **Progresión**: Información del archivo → Sistema detectado (con información de zona) → Informe de normalización → Vista previa de muestra → Estadísticas de conversión → Listo para descargar
- **Criterios de éxito**: Presentación clara de todos los metadatos relevantes, detalles de transformación y recuento de coordenadas normalizadas con indicadores visuales

### Descarga con nomenclatura inteligente y exportación por lotes
- **Funcionalidad**: Genera un archivo CSV con el nombre de archivo original + sufijo "_UTM30", activa la descarga del navegador. Admite la descarga de archivos individuales o la descarga por lotes de todos los archivos procesados a la vez
- **Propósito**: Mantiene la organización de archivos e indica el estado de transformación. Permite la exportación masiva eficiente de múltiples archivos de coordenadas convertidas
- **Activador**: El usuario hace clic en el botón de descarga para un archivo individual o en el botón "Descargar todos" para exportación por lotes después de una conversión exitosa
- **Progresión**: Clic en descargar → Diálogo de guardar del navegador → El usuario selecciona la ubicación → Archivo(s) guardado(s)
- **Criterios de éxito**: Formato de nombre de archivo correcto, estructura CSV válida, descarga del navegador iniciada para uno o varios archivos

## Manejo de casos extremos
- **Formatos de coordenadas mixtos**: Detecta y advierte si existen múltiples sistemas de coordenadas en un solo archivo
- **Coordenadas no válidas**: Marca valores fuera de rango y proporciona informes de errores a nivel de fila con descripciones de errores específicas
- **Coordenadas mal formadas**: Normaliza automáticamente coordenadas con separadores decimales incorrectos, espacios adicionales, caracteres especiales o codificación no estándar
- **Coordenadas en formato DMS**: Convierte automáticamente la notación de grados/minutos/segundos (por ejemplo, «40° 25' 30" N») a formato decimal
- **Datos faltantes**: Maneja celdas nulas o vacías de manera elegante con informes claros
- **Archivos grandes**: Muestra un indicador de progreso para archivos con más de 10 000 filas
- **Formatos no admitidos**: Mensaje de error claro con lista de formatos admitidos (CSV, XLS/XLSX/XLSM/XLSB, ODS/FODS, DOC/DOCX, ODT, RTF, TXT)
- **Nombres de columnas ambiguos**: Permite la selección manual de columnas si la detección automática es incierta
- **Tablas de documentos**: Extrae datos tabulares de formatos de documentos, recurre al análisis de texto cuando falla la extracción de tablas nativa
- **Múltiples delimitadores**: Detecta automáticamente el tipo de delimitador en archivos de texto (tabuladores, comas, puntos y comas, barras verticales, espacios)
- **Detección de zona**: Detecta automáticamente la zona UTM correcta (29, 30, 31) según los rangos de coordenadas para conversiones precisas
- **Problemas de codificación de caracteres**: Elimina caracteres no numéricos mientras conserva indicadores de formato de coordenadas
- **Procesamiento de múltiples archivos**: Maneja el procesamiento secuencial de múltiples archivos sin conflictos de estado ni pérdida de datos
- **Gestión de archivos**: Permite la eliminación individual de archivos del lote sin afectar otros archivos procesados
- **Gestión de memoria**: Procesa archivos secuencialmente para evitar problemas de memoria del navegador con cargas masivas grandes
- **Archivos duplicados**: Acepta y procesa archivos con nombres idénticos asignando identificadores únicos
- **Normalización de texto**: Maneja correctamente caracteres especiales en todo tipo de texto (acentos, tildes, ñ, comillas tipográficas) convirtiéndolos a ASCII estándar
- **Codificación UTF-8 con BOM**: Añade BOM (Byte Order Mark) al CSV de salida para garantizar la correcta visualización de caracteres en QGIS y otras herramientas GIS
- **Caracteres de control**: Elimina caracteres de control y no imprimibles que pueden causar problemas en la importación GIS
- **Escape de CSV**: Maneja correctamente comillas y comas en los datos de texto con escape adecuado según el estándar RFC 4180

## Dirección de diseño
El diseño debe sentirse profesional, preciso y eficiente, como una herramienta técnica construida para profesionales de SIG. Interfaz limpia y enfocada con énfasis en la claridad de datos y transparencia del procesamiento. Distracciones mínimas con uso intencional del espacio para mostrar información técnica de manera clara.

**Modo claro/oscuro**: La aplicación incluye un switch animado en la esquina superior derecha que permite alternar entre modo claro y oscuro. El modo se guarda en localStorage para persistir entre sesiones. El switch tiene una animación suave tipo spring con iconos de Sol/Luna que se deslizan horizontalmente.

**Flujo de 3 pasos visuales**: La aplicación guía al usuario a través de un proceso claro y lineal:
1. **Paso 1 - Subir**: Zona de carga de archivos prominente con información sobre formatos compatibles
2. **Paso 2 - Analizar**: Vista detallada de los resultados de conversión con comparación lado a lado del archivo original y convertido
3. **Paso 3 - Descargar**: Selección de formato de salida y opciones de descarga individual o por lotes

Cada paso se muestra con indicadores numéricos visuales grandes en la parte superior, con el paso actual destacado en color primario y los pasos completados/futuros en gris. La navegación entre pasos es intuitiva con botones de acción claros.

## Selección de color
Complementarios (colores opuestos) - Azul profesional combinado con naranja cálido para acciones, creando sofisticación técnica con interactividad accesible. La aplicación soporta modo claro y oscuro con paletas adaptadas.

**Modo claro:**
- **Color primario**: Azul profesional profundo (oklch(0.45 0.15 250)) - Comunica precisión, competencia técnica y asociaciones geográficas/de mapeo
- **Colores secundarios**: Gris neutro claro (oklch(0.92 0.02 250)) para acciones secundarias y fondos sutiles, manteniendo la estética profesional y limpia
- **Color de acento**: Naranja cálido (oklch(0.68 0.18 45)) - Resalta las acciones de conversión e información de estado importante con energía y claridad
- **Emparejamientos de primer plano/fondo**:
  - Fondo (Blanco frío oklch(0.98 0.01 250)): Texto oscuro mejorado (oklch(0.15 0.02 250)) - Relación 16.2:1 ✓ (excelente contraste)
  - Tarjeta (Blanco oklch(1 0 0)): Texto oscuro mejorado (oklch(0.15 0.02 250)) - Relación 17.8:1 ✓ (contraste superior)
  - Primario (Azul profundo oklch(0.45 0.15 250)): Texto blanco (oklch(1 0 0)) - Relación 7.8:1 ✓
  - Secundario (Gris claro oklch(0.92 0.02 250)): Texto oscuro (oklch(0.15 0.02 250)) - Relación 13.2:1 ✓
  - Acento (Naranja cálido oklch(0.68 0.18 45)): Texto oscuro (oklch(0.15 0.02 250)) - Relación 6.8:1 ✓
  - Apagado (Gris muy claro oklch(0.95 0.01 250)): Texto medio mejorado (oklch(0.45 0.02 250)) - Relación 7.1:1 ✓

**Modo oscuro:**
- **Fondo**: Gris azulado oscuro (oklch(0.15 0.01 286)) - Reduce la fatiga ocular manteniendo profesionalismo
- **Tarjetas**: Gris azulado medio (oklch(0.18 0.012 286)) - Separación sutil del fondo
- **Primario**: Azul brillante (oklch(0.55 0.15 250)) - Más luminoso para visibilidad en fondo oscuro
- **Texto**: Blanco cálido (oklch(0.98 0.002 286)) - Alto contraste con legibilidad óptima
- **Bordes**: Gris medio (oklch(0.30 0.015 286)) - Definición sutil sin dureza

## Selección de fuente
Claridad técnica con pulido profesional: uso de Inter por su excelente legibilidad en todos los tamaños y carácter técnico/moderno, perfecto para mostrar datos de coordenadas e información técnica.

- **Jerarquía tipográfica**: 
  - H1 (Título de la aplicación): Inter SemiBold/32 px/espaciado ajustado/-0.02 em
  - H2 (Encabezados de sección): Inter SemiBold/24 px/normal/-0.01 em
  - H3 (Subsecciones): Inter Medium/18 px/normal/0 em
  - Cuerpo (Texto general): Inter Regular/15 px/relajado/0 em
  - Pie de ilustración (Metadatos): Inter Regular/13 px/normal/0 em
  - Código (Coordenadas): JetBrains Mono Regular/14 px/normal/0 em - para mostrar valores de coordenadas con claridad de monoespaciado

## Animaciones
Sutiles y funcionales: las animaciones deben reforzar la sensación de eficiencia de herramientas profesionales, no de entretenimiento. Los estados de procesamiento y las transiciones de flujo de datos se animan para comunicar el estado del sistema y mantener la confianza del usuario durante las transformaciones de coordenadas.

- **Significado intencional**: Las animaciones del flujo paso a paso (Subir → Analizar → Descargar) refuerzan la progresión lineal del proceso de conversión
- **Jerarquía del movimiento**: 
  1. Transiciones entre pasos con fade y deslizamiento lateral suave (300ms)
  2. Indicadores de paso actuales con peso de fuente fill y color primario
  3. Pulso de zona de colocación de carga de archivos al arrastrar sobre ella (retroalimentación inmediata)
  4. Indicador de progreso durante la detección/conversión (comunicación del estado)
  5. Estados hover en elementos interactivos con escala sutil (hover:scale-105)
  6. Animaciones de marca de verificación de éxito en estadísticas (confirmación visual)
  7. Switch de tema animado con spring physics (stiffness: 500, damping: 30) y transición de iconos Sol/Luna

## Componentes Selection
- **Componentes**: 
  - Card: Contenedor principal para cada paso del proceso (Paso 1: Subir, Paso 2: Analizar, Paso 3: Descargar) con bordes destacados
  - Button: Primario para acciones principales (Seleccionar archivos, Continuar, Descargar), secundario outline para acciones alternativas
  - Badge: Muestra el tipo de sistema de coordenadas detectado, formato de archivo, y estados
  - Progress: Indicador visual para el procesamiento de archivos
  - Alert: Muestra mensajes de error si ocurren
  - Separator: Divide secciones y pasos visualmente
  - Tabs: Cambia entre las vistas «Resumen», «Originales» y «Convertidas» en el paso de análisis
  - Select: Selección de formato de salida (CSV, XLSX, GeoJSON, KML)
  - Iconos numéricos: NumberCircleOne, NumberCircleTwo, NumberCircleThree para indicadores de paso
  
- **Personalizaciones**: 
  - Zona de carga personalizada de arrastrar y soltar con iconos grandes y texto claro
  - Indicadores de paso con iconos numéricos grandes (size={36}) con peso fill para paso activo
  - Componente de visualización de coordenadas con fuente monoespaciada para alineación precisa
  - Tarjetas de comparación lado a lado (azul para original, verde para convertido)
  - Componente de lista de archivos con elementos seleccionables y acciones de eliminar
  - Estadísticas con iconos duotone grandes y números prominentes
  
- **Estados**: 
  - Indicadores de paso: Activo (fill, primary), Completado (regular, muted), Futuro (regular, muted opaco)
  - Botón de carga: Estados hover con transiciones suaves, scale en hover
  - Zona de colocación: Neutral → Resaltado con bg-primary/10 al arrastrar → Scale animation
  - Cards de archivos: Default → Selected (border-primary, bg-primary/5) → Hover
  - Filas de tabla: Hover con bg-muted/30 para inspección de datos
  - Botones de paso: Cursor pointer y scale-105 en hover cuando son clickeables
  
- **Selección de iconos**: 
  - NumberCircleOne, NumberCircleTwo, NumberCircleThree: Indicadores de paso (size 36, weight variable)
  - UploadSimple: Acción de carga y añadir archivos
  - FileCsv, FileXls, File: Indicadores de tipo de archivo
  - MagnifyingGlass: Análisis de datos
  - MapPin, Globe: Sistema de coordenadas y formatos geo
  - CheckCircle: Conversión exitosa y estadísticas válidas (duotone en stats)
  - Warning: Problemas de validación (duotone en stats)
  - DownloadSimple: Acción de descarga
  - Package: Descarga por lotes
  - ArrowsClockwise: Reinicio y normalizadas (duotone en stats)
  - Stack: Múltiples archivos
  - Trash: Eliminar archivo individual
  - Sun: Modo claro en switch de tema (weight fill, size 16)
  - Moon: Modo oscuro en switch de tema (weight fill, size 16)
  
- **Espaciado**: 
  - Espaciado global entre secciones: space-y-6
  - Padding de Card: p-4 a p-6 según importancia
  - Espaciado en CardContent: space-y-4 a space-y-6
  - Gaps en flex/grid: gap-3 a gap-6
  - Padding en zona de carga: p-12 (generoso para destaque)
  - Padding en tablas: px-4 py-2
  
- **Móvil**: 
  - Diseño responsive con flex-wrap en indicadores de paso
  - Columnas de grid adaptativas: grid-cols-1 por defecto, md:grid-cols-2 en tablets
  - Botones apilados verticalmente en móvil con w-full
  - Text sizes responsive: text-sm md:text-base para labels
  - Iconos size responsive: 28-32 en móvil, 36-40 en desktop
  - Zona de carga mantiene padding generoso pero se adapta al ancho
