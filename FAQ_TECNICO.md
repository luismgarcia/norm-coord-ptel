# FAQ Técnico
## Sistema PTEL Coordinate Normalizer

> Preguntas frecuentes técnicas sobre normalización, validación y geocodificación de coordenadas.

**Última actualización**: 24 noviembre 2025  
**Versión**: 1.1.0

---

## 📋 Índice

1. [Normalización UTF-8](#normalización-utf-8)
2. [Coordenadas y Validación](#coordenadas-y-validación)
3. [Geocodificación](#geocodificación)
4. [Rendimiento y Límites](#rendimiento-y-límites)
5. [Integración y APIs](#integración-y-apis)
6. [Troubleshooting](#troubleshooting)

---

## 🔤 Normalización UTF-8

### ¿Qué es el "mojibake" y cómo lo detecta el sistema?

**Mojibake** es la corrupción de caracteres cuando texto UTF-8 se interpreta incorrectamente como Latin-1 (ISO-8859-1).

**Ejemplo**:
```
Corrupto: "CÃ³rdoba" 
Correcto: "Córdoba"
```

**Detección**: El sistema tiene 27 patrones de sustitución que cubren caracteres españoles comunes:
- Vocales acentuadas: á, é, í, ó, ú
- Ñ/ñ
- Diéresis: ü
- Signos: ¿, ¡, €

### ¿Por qué mis coordenadas tienen caracteres extraños como "´´"?

Esto ocurre cuando el separador decimal (coma o punto) se corrompe durante exportaciones. 

**Ejemplo real de Berja (Almería)**:
```
Original corrupto: "504 750´´92"
Interpretación: 504750.92
Patrón: espacio + doble tilde como separador decimal
```

### ¿Cuántos patrones de corrección UTF-8 soporta el sistema?

**Versión 2.0**: 52 patrones organizados en 4 prioridades:

| Prioridad | Tipo | Cantidad | Ejemplo |
|-----------|------|----------|---------|
| P0 | Errores coordenadas | 4 | Y truncada, X↔Y swap |
| P1 | Separadores numéricos | 12 | Doble tilde, espacio+decimal |
| P2 | Mojibake UTF-8 | 27 | Ã³→ó, Ã±→ñ |
| P3 | Placeholders | 9 | "N/D", "Indicar" |

---

## 📍 Coordenadas y Validación

### ¿Qué sistema de coordenadas usa el sistema?

**Estándar**: EPSG:25830 (UTM Zona 30N, ETRS89)

**Rangos válidos para Andalucía**:
- X (Este): 100.000 - 800.000
- Y (Norte): 4.000.000 - 4.300.000

### ¿Cómo detecta el sistema coordenadas truncadas?

**Análisis de dígitos**:
- Coordenada Y completa: 7 dígitos (ej: 4111234)
- Coordenada Y truncada: 5-6 dígitos (ej: 111234 o 11234)

**Proceso de corrección**:
1. Detectar número de dígitos insuficiente
2. Inferir prefijo basado en provincia (Granada → 40x, 41x)
3. Validar coherencia espacial con municipio
4. Aplicar corrección con nivel de confianza

### ¿Qué pasa si X e Y están intercambiadas?

**Detección automática**:
```
Si X > 1.000.000 Y Y < 1.000.000 → Probable intercambio
```

**Ejemplo**:
```
Entrada: X=4111234, Y=447850
Diagnóstico: X en rango de Y, Y en rango de X
Corrección: X=447850, Y=4111234
```

### ¿Cómo funciona el sistema de scoring 0-100?

**8 estrategias con pesos**:

| Estrategia | Peso | Qué evalúa |
|------------|------|------------|
| FORMAT | 15% | ¿Son números válidos? |
| RANGE | 20% | ¿Dentro de Andalucía? |
| SPECIAL_CHARS | 10% | ¿Caracteres no numéricos? |
| DECIMALS | 10% | ¿Tiene precisión decimal? |
| DIGIT_LENGTH | 10% | X: 6-7 dígitos, Y: 7 dígitos |
| SPATIAL_COHERENCE | 15% | ¿Cerca del centroide municipal? |
| NEIGHBORHOOD | 10% | ¿Coherente con vecinos? |
| CRS_DETECTION | 10% | ¿CRS identificable? |

**Niveles de confianza**:
- CRITICAL: 0-25
- LOW: 26-50
- MEDIUM: 51-75
- HIGH: 76-100

---

## 🌍 Geocodificación

### ¿Qué servicios de geocodificación usa el sistema?

**Cascada de 6 niveles** (en orden de prioridad):

1. **WFS Especializados** (gratuitos, oficiales)
   - SICESS: Centros sanitarios SAS
   - Educación: Centros educativos Junta
   - IAPH: Patrimonio cultural

2. **CartoCiudad IGN** (gratuito)
   - Direcciones postales España

3. **CDAU** (gratuito)
   - Callejero Digital Andalucía

4. **Nominatim/OSM** (gratuito)
   - OpenStreetMap

5. **APIs Premium** (opcional)
   - HERE Maps, LocationIQ

6. **Manual**
   - Corrección asistida por mapa

### ¿Por qué usar WFS especializados en lugar de Google Maps?

**Ventajas de WFS oficiales**:

| Aspecto | WFS Oficiales | Google Maps |
|---------|---------------|-------------|
| Coste | Gratuito | $5-7 por 1000 consultas |
| Precisión sanitarios | ±5m (datos SAS) | ±50-100m |
| Nombres oficiales | Exactos | Aproximados |
| Límite consultas | Sin límite* | 25.000/mes gratuitos |
| Privacidad datos | En España | Servidores USA |

*Uso razonable

### ¿Qué cobertura tienen los geocodificadores WFS?

**Por tipología PTEL**:

| Tipo | Servicio WFS | Cobertura | Precisión |
|------|--------------|-----------|-----------|
| Sanitario | SICESS SAS | 1.500 centros | ±5m |
| Educativo | Junta Andalucía | 3.800 centros | ±10m |
| Cultural | IAPH | 7.000+ bienes | ±5m |
| Seguridad | IDE Andalucía | 550 instalaciones | ±20m |
| **Total** | - | **~72% cobertura PTEL** | - |

---

## ⚡ Rendimiento y Límites

### ¿Cuántos registros puede procesar el sistema?

**Límites recomendados**:
- Archivo único: hasta 10.000 registros
- Sesión: hasta 50.000 registros
- Batch multi-archivo: sin límite práctico

**Tiempos típicos**:
- 100 registros: 15-30 segundos
- 1.000 registros: 2-3 minutos
- 10.000 registros: 15-20 minutos

### ¿Funciona offline?

**Parcialmente**:
- ✅ Normalización UTF-8: Totalmente offline
- ✅ Validación básica: Offline
- ⚠️ Validación espacial: Requiere datos municipio (cacheables)
- ❌ Geocodificación: Requiere conexión

### ¿Cómo funciona el caché?

**Sistema multinivel**:
```
Nivel 1: Memoria (sesión actual)
├── Municipios consultados
├── Resultados geocodificación
└── TTL: Sesión

Nivel 2: LocalStorage (persistente)
├── Centroides municipales
├── Rangos provinciales
└── TTL: 7 días

Nivel 3: IndexedDB (datos masivos)
├── Histórico geocodificaciones
├── Cache WFS responses
└── TTL: 30 días
```

---

## 🔌 Integración y APIs

### ¿Puedo usar el normalizador en mi aplicación?

**Sí**, el módulo es standalone:

```typescript
import { 
  normalizeCoordinate, 
  validateCoordinate,
  NormalizerConfig 
} from 'ptel-normalizer';

const result = normalizeCoordinate({
  x: "447.850,23",
  y: "77905",
  municipality: "Colomera"
});

// result.normalized = { x: 447850.23, y: 4077905 }
// result.corrections = [...]
// result.score = 92
```

### ¿Qué formatos de archivo soporta?

**Entrada**:
- CSV (separadores: `,`, `;`, `\t`)
- Excel (.xlsx, .xls)
- DBF (Shapefile)
- JSON/GeoJSON
- ODT/DOCX (extracción tablas)

**Salida**:
- CSV normalizado
- GeoJSON
- Excel con metadata
- Shapefile

### ¿Hay API REST disponible?

**No actualmente**. El sistema es browser-first (JavaScript puro).

**Alternativas**:
- Usar como librería npm
- Desplegar en AWS Lambda (documentado)
- Fork para backend Node.js

---

## 🔧 Troubleshooting

### Error: "Coordenada fuera de rango Andalucía"

**Causas posibles**:
1. Coordenadas en sistema diferente (WGS84, ED50)
2. Valores intercambiados X↔Y
3. Error de transcripción

**Solución**:
```typescript
// Forzar detección de CRS
const result = normalizeCoordinate(coord, { 
  detectCRS: true,
  allowTransform: true 
});
```

### Error: "No se pudo geocodificar"

**Causas posibles**:
1. Nombre no existe en bases oficiales
2. Infraestructura muy nueva/antigua
3. Tipo incorrecto seleccionado

**Solución**:
- Verificar nombre oficial en fuente original
- Probar con dirección en lugar de nombre
- Usar corrección manual con mapa

### Los caracteres siguen corruptos después de normalizar

**Causa**: Archivo origen tiene encoding diferente a UTF-8

**Solución**:
```bash
# Convertir archivo a UTF-8 antes de procesar
iconv -f ISO-8859-1 -t UTF-8 archivo_original.csv > archivo_utf8.csv
```

### El score es bajo pero la coordenada parece correcta

**Posibles razones**:
- Falta de decimales (penaliza 10%)
- Municipio no especificado (penaliza coherencia espacial)
- Coordenada aislada (no hay vecinos para validar)

**Solución**:
- Añadir información de municipio
- Verificar manualmente y marcar como CONFIRMED

---

## ❓ Preguntas Adicionales Validación Colomera

### ¿Por qué el sistema detectó 8 truncaciones en Colomera?

Los documentos ODT del PTEL de Colomera contenían coordenadas Y con solo 5 dígitos (ej: 77905) cuando deberían tener 7 (ej: 4077905).

**Análisis**:
- Origen probable: Copy-paste que eliminó prefijo "40"
- Afectación: 19% de registros (8 de 42)
- Corrección: Automática con confianza HIGH

### ¿Cómo validó el sistema las correcciones de Colomera?

**Triple validación**:
1. **Rango provincial**: Granada → Y debe empezar con 40-41
2. **Centroide municipal**: Distancia <10km al centro de Colomera
3. **Coherencia vecinal**: Registros cercanos tienen Y similar

---

**FAQ Técnico** | **v1.1.0**  
**Sistema PTEL Coordinate Normalizer** ❓
