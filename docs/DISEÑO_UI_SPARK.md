# 🎯 DISEÑO UI - NORMALIZADOR COORDENADAS PTEL

**Documento de Diseño para GitHub Spark**  
**Versión**: 1.0  
**Fecha**: Noviembre 2025

---

## 📋 ESPECIFICACIONES DE INTERFAZ

### Framework y Librerías

```typescript
// Stack tecnológico
Framework: React + TypeScript
UI Library: shadcn/ui
Iconos: Phosphor Icons (@phosphor-icons/react)
Animaciones: Framer Motion
Estilo: Tailwind CSS con modo oscuro
```

### Imports Principales

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UploadSimple, FileCsv, FileXls, MapPin, CheckCircle, Warning,
  DownloadSimple, ArrowsClockwise, Globe, File, Trash, Stack,
  Package, MagnifyingGlass, NumberCircleOne, NumberCircleTwo, 
  NumberCircleThree, XCircle
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import JSZip from 'jszip'
```

---

## 🎨 ESTRUCTURA WIZARD 3 PASOS

### Header Principal

```
Título: "Normalizador de Coordenadas PTEL"
Subtítulo: "Planes Territoriales de Emergencias - Municipios Andaluces"
Descripción: "Normalizador v2.0 | 52 patrones de corrección | Conversión a UTM30 ETRS89"
```

### Indicadores de Pasos

| Paso | Icono | Texto | Estado Activo |
|------|-------|-------|---------------|
| 1 | NumberCircleOne | "Subir" | weight="fill", text-primary |
| 2 | NumberCircleTwo | "Analizar" | weight="fill", text-primary |
| 3 | NumberCircleThree | "Descargar" | weight="fill", text-primary |

- Pasos completados: clickeables para navegar atrás
- Separadores horizontales entre pasos
- Size: 48px para iconos

---

## 📤 PASO 1: SUBIR ARCHIVOS

### Layout Card

```css
border-2 border-primary/20
```

### Zona de Drop

```css
/* Normal */
border-2 border-dashed border-border
hover:border-primary/50 hover:bg-muted/50

/* Dragging */
border-primary bg-primary/10 scale-[1.02]
```

### Iconos de Formatos

| Icono | Tamaño | Weight |
|-------|--------|--------|
| FileCsv | 40 | duotone |
| FileXls | 40 | duotone |
| File | 40 | duotone |

### Información en 2 Columnas

**Columna 1 - Formatos compatibles:**
- CSV, Excel (XLSX/XLS), OpenDocument (ODS/ODT)
- Word (DOC/DOCX), TXT, DBF, GeoJSON, KML/KMZ

**Columna 2 - Sistemas detectados:**
- "20+ sistemas detectados automáticamente"
- WGS84, ETRS89, ED50, UTM zones, Lambert 93, Web Mercator

### Cuadro Informativo Azul

```css
bg-blue-100 dark:bg-blue-950/20
border border-blue-300 dark:border-blue-800
```

Contenido:
```
"Sistema Defensivo de Validación (8 Estrategias)"
"Aplica 8 estrategias de validación automática para detectar y corregir 
errores de formato, caracteres especiales, decimales incorrectos, 
transposiciones y coordenadas fuera de rango. Sistema de scoring 0-100."
```

---

## 🔍 PASO 2: VALIDAR Y ANALIZAR

### Panel Clasificación Tipologías

```css
bg-gradient-to-r from-purple-50 to-indigo-50
dark:from-purple-950/20 dark:to-indigo-950/20
border border-purple-200 dark:border-purple-800
```

### Tipologías con Emoji y Color

| Tipo | Emoji | Color Background |
|------|-------|------------------|
| SANITARIO | 🏥 | bg-red-100 text-red-800 |
| EDUCATIVO | 🎓 | bg-blue-100 text-blue-800 |
| CULTURAL | 🏛️ | bg-purple-100 text-purple-800 |
| POLICIAL | 🚔 | bg-indigo-100 text-indigo-800 |
| BOMBEROS | 🚒 | bg-orange-100 text-orange-800 |
| EMERGENCIAS | 🚑 | bg-yellow-100 text-yellow-800 |
| RELIGIOSO | ⛪ | bg-amber-100 text-amber-800 |
| DEPORTIVO | 🏟️ | bg-green-100 text-green-800 |
| MUNICIPAL | 🏛️ | bg-slate-100 text-slate-800 |
| SOCIAL | 🤝 | bg-pink-100 text-pink-800 |
| COMBUSTIBLE | ⛽ | bg-cyan-100 text-cyan-800 |
| GENERICO | 📍 | bg-gray-100 text-gray-800 |

### Panel Comparativo 2 Columnas

**Columna Izquierda - Archivo Original:**
```css
bg-blue-50 dark:bg-blue-950/20
border border-blue-200 dark:border-blue-800
```

**Columna Derecha - Archivo Convertido:**
```css
bg-green-50 dark:bg-green-950/20
border border-green-200 dark:border-green-800
```

### Sistema de Colores por Confianza

| Nivel | Score | Color HEX | Tailwind |
|-------|-------|-----------|----------|
| CRITICAL | 0-25 | #D32F2F | bg-red-500 |
| LOW | 26-50 | #F57C00 | bg-orange-500 |
| MEDIUM | 51-75 | #FBC02D | bg-yellow-500 |
| HIGH | 76-100 | #388E3C | bg-green-500 |
| CONFIRMED | Manual | #1976D2 | bg-blue-500 |

### Tabs de Datos

```typescript
<TabsList className="grid w-full grid-cols-4">
  <TabsTrigger value="stats">Resumen</TabsTrigger>
  <TabsTrigger value="scores">Scores</TabsTrigger>
  <TabsTrigger value="original">Originales</TabsTrigger>
  <TabsTrigger value="converted">Convertidas</TabsTrigger>
</TabsList>
```

### Cards Estadísticas (4 Grid)

| Card | Color | Icono | Contenido |
|------|-------|-------|-----------|
| Válidas | green | CheckCircle | N coordenadas |
| Inválidas | red | Warning | N coordenadas |
| Normalizadas | blue | ArrowsClockwise | N coordenadas |
| Score Promedio | purple | MagnifyingGlass | X/100 |

### Pestaña Scores - Tabla

```typescript
<table>
  <thead>
    <tr>
      <th>Fila</th>
      <th>Score</th>        // Barra de progreso coloreada
      <th>Confianza</th>    // Badge HIGH/MEDIUM/LOW/CRITICAL
      <th>X</th>
      <th>Y</th>
      <th>Válida</th>       // CheckCircle o Warning
      <th>Correcciones</th> // Badge con número de fixes
    </tr>
  </thead>
</table>
```

### Barra de Score Visual

```typescript
<div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
  <div 
    className={`h-full ${
      confidence === 'HIGH' ? 'bg-green-500' :
      confidence === 'MEDIUM' ? 'bg-yellow-500' :
      confidence === 'LOW' ? 'bg-orange-500' :
      'bg-red-500'
    }`}
    style={{ width: `${score}%` }}
  />
</div>
```

---

## 📥 PASO 3: DESCARGAR

### Selector de Formato

```typescript
<Select value={outputFormat} onValueChange={setOutputFormat}>
  <SelectItem value="csv">CSV</SelectItem>
  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
  <SelectItem value="geojson">GeoJSON</SelectItem>
  <SelectItem value="kml">KML</SelectItem>
</Select>
```

### Botones de Acción

```typescript
<Button size="lg">
  <DownloadSimple size={22} className="mr-2" />
  Descargar archivo
</Button>

{processedFiles.length > 1 && (
  <Button variant="outline" size="lg">
    <Package size={22} className="mr-2" />
    Descargar todos ({processedFiles.length})
  </Button>
)}
```

---

## 🎬 ANIMACIONES

### Transiciones entre Pasos

```typescript
<AnimatePresence mode="wait">
  <motion.div
    key={`step${currentStep}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {/* Contenido del paso */}
  </motion.div>
</AnimatePresence>
```

### Hover States

```css
transition-all
hover:scale-[1.02]
hover:border-primary/50
hover:bg-muted/50
```

---

## 🔔 TOASTS (Sonner)

```typescript
// Success
toast.success('Conversión completada', {
  description: `${filename}: ${validCount} coordenadas a UTM30 | Score: ${avgScore}`
})

// Info
toast.info('Generando ZIP...', {
  description: 'Preparando archivos para descarga'
})

// Error
toast.error('Procesamiento fallido', {
  description: error.message
})

// Warning
toast.warning('Coordenadas rechazadas', {
  description: `${invalidCount} coordenadas con score < 50`
})
```

---

## 📱 RESPONSIVE DESIGN

### Mobile (< md)

- Stack vertical de pasos
- Grid 2 columnas → 1 columna
- Botones width: 100%
- Tabla con scroll horizontal
- Cards en lista vertical

### Desktop (≥ md)

- Indicadores de paso horizontales
- Layout 2-3 columnas
- Tablas ancho completo
- Botones tamaño normal

---

## 🌗 MODO OSCURO

### Inversiones de Color

| Elemento | Light | Dark |
|----------|-------|------|
| bg-blue-50 | → | bg-blue-950/20 |
| bg-green-50 | → | bg-green-950/20 |
| border-blue-200 | → | border-blue-800 |
| text-blue-700 | → | text-blue-300 |

---

## ✅ CHECKLIST IMPLEMENTACIÓN

- [x] Header con título y subtítulo PTEL
- [x] Wizard 3 pasos con indicadores numerados
- [x] Zona drag-and-drop multi-archivo
- [x] Detección automática de 20+ sistemas CRS
- [x] Sistema de validación 8 estrategias
- [x] Scoring 0-100 con colores por confianza
- [x] Panel tipologías con emoji
- [x] Tabs: Resumen / Scores / Originales / Convertidas
- [x] Barra de progreso coloreada por score
- [x] Badges de confianza HIGH/MEDIUM/LOW/CRITICAL
- [x] Exportación CSV/XLSX/GeoJSON/KML
- [x] Descarga ZIP para múltiples archivos
- [x] Animaciones Framer Motion
- [x] Toasts con Sonner
- [x] Modo oscuro completo
- [x] Responsive mobile-first

---

**Documento de diseño generado para el proyecto PTEL**  
**Última actualización**: 24 Noviembre 2025
