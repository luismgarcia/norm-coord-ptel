# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Sin lanzar]

### Fase 8 (v0.8.0) - Testing & Deploy Producción ⏳
> **Estado**: Planificado | **ETA**: Semana 8 | **Prioridad**: 🟢 MEDIA

---

## [0.4.0] - 2025-11-20 (ACTUAL)

### ✨ Added

#### Soporte Multi-formato Avanzado
- **feat**: Soporte archivos OpenDocument (`.odt`) con mammoth.js
- **feat**: Soporte GeoJSON con validación schema RFC 7946
- **feat**: Soporte KML/KMZ con descompresión automática JSZip
- **feat**: Parser DBF mejorado con encoding UTF-8 correcto
- **feat**: Detección automática delimitador CSV (`,`, `;`, `\t`)
- **feat**: Drag & Drop multi-archivo simultáneo (hasta 10 archivos)

#### Sistema de Validación Defensiva
- **feat**: Validación 8 estrategias con scoring 0-100 puntos
- **feat**: Detector automático sistema coordenadas (WGS84/ETRS89/ED50)
- **feat**: Validación rangos UTM30 específicos Andalucía
- **feat**: Validación coherencia espacial (distancia municipio <20km)
- **feat**: Clustering vecindad para detectar outliers geográficos
- **feat**: Niveles confianza: CRÍTICA/BAJA/MEDIA/ALTA/CONFIRMADO

#### Normalización UTF-8 Avanzada
- **feat**: 27 patrones corrección caracteres corrompidos
- **feat**: Mapeo Ã± → ñ, Ã© → é, Ã¡ → á (y 24 patrones más)
- **feat**: Detección y corrección coordenadas truncadas (Y sin "4" inicial)
- **feat**: Auto-recuperación ~10-15% registros truncados

#### UI/UX Mejoras
- **feat**: Wizard 3 pasos con navegación mejorada
- **feat**: Progress bar con etapas claras (Upload → Process → View)
- **feat**: Cards scoring con visualización colores por confianza
- **feat**: Tabla resultados con filtros dinámicos
- **feat**: Badges tipología infraestructura (🏥 🎓 🚓 🏛️ ⛪)
- **feat**: Toast notifications sistema feedback usuario

### 🔧 Changed

- **refactor**: Arquitectura state management migrada a Zustand
- **refactor**: Pipeline normalización optimizado (30% más rápido)
- **perf**: Procesamiento batch asíncrono con Web Workers
- **style**: Actualizado a Tailwind CSS v3.4.0

### 🐛 Fixed

- **fix**: Corrección parsing decimales europeos (`,` vs `.`)
- **fix**: Manejo correcto archivos Excel con celdas vacías
- **fix**: Validación robusta campos X/Y ausentes o null
- **fix**: Memory leak en procesamiento archivos >5MB

### 📚 Documentation

- **docs**: README completo con instalación, uso y arquitectura
- **docs**: JSDoc completo en todos los servicios TypeScript
- **docs**: Ejemplos código para cada formato soportado

### 🧪 Testing

- **test**: Suite tests unitarios con Vitest (cobertura 75%)
- **test**: Tests integración para parsers multi-formato
- **test**: Tests validación con datasets reales municipales

---

## [0.3.0] - 2025-11-15

### ✨ Added

#### Normalización Inteligente
- **feat**: Sistema normalización UTF-8 con 27 patrones base
- **feat**: Corrección automática encoding corrupto
- **feat**: Detector truncación coordenadas Y
- **feat**: Auto-corrección añade dígito "4" inicial

#### Transformaciones CRS
- **feat**: Integración proj4.js para transformaciones
- **feat**: Soporte EPSG:25830 (UTM30 ETRS89) como estándar
- **feat**: Conversión automática desde WGS84 (EPSG:4326)
- **feat**: Conversión automática desde ED50 (EPSG:23030)

### 🔧 Changed

- **refactor**: Parser coordenadas modularizado y tipado
- **perf**: Cache localStorage para transformaciones frecuentes

### 🐛 Fixed

- **fix**: Manejo correcto coordenadas negativas
- **fix**: Validación decimal point vs comma

---

## [0.2.0] - 2025-11-10

### ✨ Added

#### Sistema Scoring
- **feat**: Motor scoring 0-100 puntos multi-dimensional
- **feat**: Agregación ponderada 8 componentes validación
- **feat**: Clasificación confianza: CRÍTICA/BAJA/MEDIA/ALTA
- **feat**: Recomendaciones automáticas: ACCEPT/FLAG/REVIEW/REJECT

#### Validación Multi-estrategia
- **feat**: 8 estrategias de validación independientes
- **feat**: Validación formato, rangos, caracteres, decimales
- **feat**: Coherencia espacial y vecindad clustering

### 🔧 Changed

- **refactor**: Arquitectura validación en capas independientes
- **perf**: Validación paralela con Promise.all para >100 registros

---

## [0.1.0] - 2025-11-05

### ✨ Added - MVP Inicial

#### Arquitectura Base
- **feat**: Setup proyecto React 18 + TypeScript + Vite
- **feat**: Configuración Tailwind CSS + shadcn/ui
- **feat**: Sistema routing wizard 3 pasos
- **feat**: State management con React Context

#### Paso 1: Upload
- **feat**: Componente drag-and-drop archivos
- **feat**: Soporte inicial CSV y Excel
- **feat**: Preview primeras 5 filas datos

#### Paso 2: Processing
- **feat**: Parser CSV con Papa Parse
- **feat**: Parser Excel con SheetJS
- **feat**: Detección automática columnas X/Y

#### Paso 3: Results
- **feat**: Tabla resultados básica
- **feat**: Exportación CSV simple

---

## [Roadmap] - Fases Futuras

### Fase 1 (v0.5.0) - Geocodificación por Tipología 🔴
> **ETA**: Semanas 1-2 | **Prioridad**: CRÍTICA

- WFSHealthGeocoder para SICESS/SAS
- WFSEducationGeocoder
- IAPHCulturalGeocoder
- ISEPoliceGeocoder
- OSMReligiousGeocoder

### Fase 2 (v0.6.0) - Cache y Cascada 🟡
> **ETA**: Semanas 3-4 | **Prioridad**: ALTA

- GeoCache localStorage (5-10MB, TTL 90 días)
- IndexedDBCache para datasets grandes
- CascadeOrchestrator con 5 niveles fallback

### Fase 3 (v0.7.0) - Visor Leaflet 🟡
> **ETA**: Semanas 5-6 | **Prioridad**: ALTA

- Integración react-leaflet
- WMS Ortofoto Andalucía 2022
- Corrección manual click-to-set
- Drag-and-drop marcadores

### Fase 4 (v0.7.5) - Exportación Avanzada
> **ETA**: Semana 7

- GeoJSON con metadata extendida
- Shapefile (EPSG:25830)
- KML con iconos por tipología
- Report PDF con estadísticas

### Fase 5 (v0.8.0) - Testing & Deploy
> **ETA**: Semana 8

- Tests E2E con Playwright
- Cobertura ≥80%
- GitHub Pages deploy
- Documentación usuario final

---

## Convenciones

### Tipos de Cambios

- **feat**: Nueva funcionalidad
- **fix**: Corrección bug
- **docs**: Cambios documentación
- **style**: Formato código
- **refactor**: Refactorización
- **perf**: Mejoras performance
- **test**: Tests
- **chore**: Tareas mantenimiento

### Niveles de Prioridad

- 🔴 **CRÍTICA**: Bloqueante
- 🟡 **ALTA**: Importante
- 🟢 **MEDIA**: Mejora incremental
- ⚪ **BAJA**: Nice to have

---

**Última actualización**: 20 noviembre 2025  
**Versión actual**: v0.4.0