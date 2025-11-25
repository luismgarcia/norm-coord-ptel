# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Sin lanzar]

### Fase 8 (v0.8.0) - Testing & Deploy Producción ⏳
> **Estado**: Planificado | **ETA**: Semana 8 | **Prioridad**: 🟢 MEDIA

**Objetivos**:
- Sistema production-ready en GitHub Pages
- Testing exhaustivo 786 municipios
- Documentación usuario final completa
- Monitoreo y analytics implementado

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
- **feat**: Badges tipología infraestructura (🏥 🎓 🚔 🏛️ ⛪)
- **feat**: Toast notifications sistema feedback usuario

### 🔧 Changed

- **refactor**: Arquitectura state management migrada a Zustand
- **refactor**: Pipeline normalización optimizado (30% más rápido)
- **perf**: Procesamiento batch asíncrono con Web Workers
- **refactor**: Componentes wizard modularizados (DRY principle)
- **style**: Actualizado a Tailwind CSS v3.4.0 con nuevas utilidades

### 🐛 Fixed

- **fix**: Corrección parsing decimales europeos (`,` vs `.`)
- **fix**: Manejo correcto archivos Excel con celdas vacías
- **fix**: Validación robusta campos X/Y ausentes o null
- **fix**: Escape correcto caracteres especiales en nombres
- **fix**: Memory leak en procesamiento archivos >5MB

### 📚 Documentation

- **docs**: README completo con instalación, uso y arquitectura
- **docs**: JSDoc completo en todos los servicios TypeScript
- **docs**: Ejemplos código para cada formato soportado
- **docs**: Guía troubleshooting errores comunes

### 🧪 Testing

- **test**: Suite tests unitarios con Vitest (cobertura 75%)
- **test**: Tests integración para parsers multi-formato
- **test**: Tests validación con datasets reales municipales
- **test**: Mocking APIs externas (CartoCiudad, CDAU)

---

## [0.3.0] - 2025-11-15

### ✨ Added

#### Normalización Inteligente
- **feat**: Sistema normalización UTF-8 con 27 patrones base
- **feat**: Corrección automática encoding corrupto
- **feat**: Detector truncación coordenadas Y (provincias andaluzas)
- **feat**: Auto-corrección añade dígito "4" inicial cuando falta

#### Transformaciones CRS
- **feat**: Integración proj4.js para transformaciones coordenadas
- **feat**: Soporte EPSG:25830 (UTM30 ETRS89) como estándar
- **feat**: Conversión automática desde WGS84 (EPSG:4326)
- **feat**: Conversión automática desde ED50 (EPSG:23030)
- **feat**: Definiciones custom proyecciones españolas
