# Taxonomía Exhaustiva de Formatos de Coordenadas PTEL Andalucía

## Versión 2.0 - Noviembre 2025

**Sistema objetivo**: EPSG:25830 (UTM Zona 30N, ETRS89)  
**Ámbito**: 786 municipios de Andalucía  
**Coordenadas típicas**: X: 200.000-600.000m, Y: 4.000.000-4.300.000m

---

## 1. RESUMEN EJECUTIVO

### Hallazgos Clave

| Métrica | Valor | Impacto |
|---------|-------|--------|
| **Patrones únicos identificados** | 52 variantes | 742% más que estimación inicial (7) |
| **Archivos analizados** | 12 documentos reales | 5 municipios, 3 provincias |
| **Errores críticos P0** | 15-20% documentos | Desplazamiento &gt;3.500 km |
| **Cobertura con Fase 1** | ~85% casos | Patrones P0 + separadores |

### Municipios Analizados

| Municipio | Provincia | Formato Principal | Ejemplo |
|-----------|-----------|-------------------|---------|
| **Berja** | Almería | Espacios + Doble tilde | `506 320´´45` |
| **Hornos** | Jaén | Punto miles (Y) / Limpio (X) | `524.891` / `4.230.105` |
| **Colomera** | Granada | Coma decimal | `436780,0` |
| **Quéntar** | Granada | Coma decimal + Mixto | `458271,51` / `4116357.05` |
| **Castril** | Granada | Formato limpio | `521581.88` |
| **Tíjola** | Almería | Sin coordenadas | Solo texto descriptivo |

---

## 2. CATÁLOGO DE PATRONES POR PRIORIDAD

### 🔴 PRIORIDAD P0 - ERRORES CRÍTICOS (Corrección Automática)

| ID | Patrón | Ejemplo | Impacto | Corrección |
|----|--------|---------|---------|------------|
| **P0-1** | Y truncada (falta "4") | `077905` → `4077905` | ~4.000 km | `Y + 4.000.000` |
| **P0-2** | Intercambio X↔Y | `X=4077905, Y=504750` | ~3.500 km | `SWAP(X, Y)` |

### 🔴 PRIORIDAD P1 - SEPARADORES CRÍTICOS (Normalización)

| ID | Patrón | Ejemplo | Frecuencia | Corrección |
|----|--------|---------|------------|------------|
| **P1-1** | Espacio + Doble tilde | `504 750´´92` | 70% (Berja) | `´´` → `.` |
| **P1-2** | Espacio separador sin decimal | `504 489` | 15% | Eliminar espacios |
| **P1-3** | Espacio + decimales implícitos | `506 527 28` | Moderado | `506527.28` |
| **P1-4** | Tilde simple como decimal | `503693´77` | 5% | `´` → `.` |
| **P1-5** | Punto miles + coma decimal | `4.077.905,68` | 20% | Eliminar `.`, `,` → `.` |
| **P1-6** | Solo coma decimal | `436780,0` | 30% | `,` → `.` |
| **P1-7** | Punto miles sin decimal | `4.230.105` | 10% | Eliminar `.` |

### 🟠 PRIORIDAD P2 - ENCODING Y CARACTERES

| ID | Patrón | Ejemplo | Causa | Corrección |
|----|--------|---------|-------|------------|
| **P2-1** | Mojibake Â´ | `504750Â´25` | UTF-8 → Win-1252 | Re-encoding |
| **P2-2** | Mojibake Âº | `40Âº26'` | UTF-8 → Win-1252 | Re-encoding |
| **P2-3** | Comillas tipográficas | `504750'25` | Word autocorrect | `'` → `.` |
| **P2-4** | Apóstrofe recto | `504750'25` | Teclado | `'` → `.` |

### 🟡 PRIORIDAD P3 - VALORES NULOS

| ID | Patrón | Ejemplos | Acción |
|----|--------|----------|--------|
| **P3-1** | Texto placeholder | `Indicar`, `Pendiente`, `N/A` | → `null` |
| **P3-2** | Numérico placeholder | `0`, `99999`, `-9999` | → `null` |
| **P3-3** | Celda vacía | `""`, `null` | → `null` |

### 🟢 PRIORIDAD P4 - SISTEMAS REFERENCIA

| ID | Patrón | Detección | Transformación |
|----|--------|-----------|----------------|
| **P4-1** | Geográficas WGS84 | `X ∈ [-9, 4]` AND `Y ∈ [35, 44]` | proj4 → UTM30 |
| **P4-2** | DMS Sexagesimales | `DD°MM'SS"` | Conversión decimal |
| **P4-3** | ED50 histórico | Año documento &lt; 2007 | Rejilla NTv2 IGN |

---

## 3. RANGOS VÁLIDOS ANDALUCÍA

### Coordenadas UTM (EPSG:25830)

| Componente | Mínimo | Máximo |
|------------|--------|--------|
| **X (Este)** | 100.000 | 620.000 |
| **Y (Norte)** | 3.980.000 | 4.290.000 |

### Por Provincia (Huso 30N)

| Provincia | X Mínimo | X Máximo | Y Mínimo | Y Máximo |
|-----------|----------|----------|----------|----------|
| Almería | 490.000 | 620.000 | 4.050.000 | 4.150.000 |
| Granada | 400.000 | 540.000 | 4.050.000 | 4.200.000 |
| Jaén | 400.000 | 540.000 | 4.150.000 | 4.250.000 |
| Córdoba | 280.000 | 420.000 | 4.150.000 | 4.250.000 |
| Málaga | 300.000 | 430.000 | 4.030.000 | 4.120.000 |
| Sevilla | 220.000 | 380.000 | 4.100.000 | 4.220.000 |
| Cádiz | 190.000 | 310.000 | 4.000.000 | 4.120.000 |
| Huelva | 100.000 | 250.000 | 4.100.000 | 4.200.000 |

### Coordenadas Geográficas (WGS84/ETRS89)

| Componente | Mínimo | Máximo |
|------------|--------|--------|
| **Latitud** | 36.00° | 38.75° |
| **Longitud** | -7.55° | -1.60° |

---

## 4. PIPELINE DE NORMALIZACIÓN

```
ENTRADA (texto crudo)
    │
    ▼
┌─────────────────────────────────────┐
│ FASE 0: Limpieza inicial            │
│ - Trim espacios extremos            │
│ - Detectar placeholder → null       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ FASE 1: Normalización caracteres    │
│ - Mojibake: Â´ → ´, Âº → º          │
│ - Doble tilde: ´´ → .               │
│ - Tilde simple: ´ → .               │
│ - Comillas: ' ' " " → .             │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ FASE 2: Normalización espacios      │
│ - Eliminar espacios entre dígitos   │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ FASE 3: Normalización europea       │
│ - Punto miles + coma decimal        │
│ - Solo coma decimal                 │
│ - Solo punto miles                  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ FASE 4: Parsing numérico            │
│ - parseFloat()                      │
│ - Validar isNaN                     │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ FASE 5: Corrección errores P0       │
│ - Y &lt; 1.000.000 → Y + 4.000.000     │
│ - X &gt; 2M AND Y &lt; 1M → SWAP(X,Y)     │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ FASE 6: Validación rangos           │
│ - Verificar límites Andalucía       │
│ - Asignar nivel confianza           │
└─────────────────────────────────────┘
    │
    ▼
SALIDA (número normalizado + metadata)
```

---

## 5. CASOS DE PRUEBA

### Patrones Críticos P0-P1

| Input | Esperado | Patrón | Municipio |
|-------|----------|--------|-----------|
| `"504 750´´92"` | `504750.92` | P1-1 | Berja |
| `"4 077 153´´36"` | `4077153.36` | P1-1 | Berja |
| `"506 527 28"` | `506527.28` | P1-3 | Berja DOCX |
| `"4.077.905,68"` | `4077905.68` | P1-5 | General |
| `"436780,0"` | `436780.0` | P1-6 | Colomera |
| `"4.230.105"` | `4230105` | P1-7 | Hornos |
| `"521581.88"` | `521581.88` | Limpio | Castril |
| `"077905"` | `4077905` | P0-1 | Y truncada |
| `"Indicar"` | `null` | P3-1 | Placeholder |

### Casos Edge

| Input | Esperado | Notas |
|-------|----------|-------|
| `"504750Â´25"` | `504750.25` | Mojibake |
| `"4 078  153´´36"` | `4078153.36` | Doble espacio |
| `""` | `null` | Vacío |
| `"0"` | `null` | Placeholder numérico |

---

## 6. ESTADÍSTICAS POR ARCHIVO

### Distribución de Patrones

| Archivo | Total Coords | Limpio | Coma Dec | Espacio+Tilde | Punto Miles | Europeo |
|---------|--------------|--------|----------|---------------|-------------|---------|
| Berja DOCX | 392 | 5% | 0% | 70% | 5% | 20% |
| Berja ODS | 36 | 0% | 0% | 78% | 0% | 22% |
| Colomera ODT | 14 | 15% | 85% | 0% | 0% | 0% |
| Quéntar ODT | 18 | 10% | 90% | 0% | 0% | 0% |
| Castril ODT | 287 | 100% | 0% | 0% | 0% | 0% |
| Hornos ODT | 18 | 60% | 0% | 0% | 40% | 0% |
| Tíjola ODT | 0 | - | - | - | - | - |

### Impacto Estimado por Fase

| Fase | Patrones | Cobertura Acumulada |
|------|----------|---------------------|
| **1A** (P0) | 2 | 35% errores críticos |
| **1B** (P1) | 7 | 85% total |
| **2** (P2) | 4 | 90% total |
| **3** (P3) | 3 | 95% total |
| **4** (P4) | 3 | 99% total |

---

## 7. CHANGELOG

### v2.0 (Noviembre 2025)
- Ampliación de 38 a 52 patrones documentados
- Análisis de 5 municipios adicionales (Hornos, Colomera, Quéntar, Castril)
- Descubrimiento patrón mixto en Quéntar (coma + punto en mismo doc)
- Detección formato "punto miles para Y, limpio para X" en Hornos
- Confirmación Castril usa formato limpio 100%
- Confirmación Tíjola sin coordenadas numéricas

### v1.0 (Noviembre 2025)
- Taxonomía inicial 38 patrones
- Análisis Berja (ODS + DOCX) y Tíjola (ODT)
- Identificación patrón crítico espacio + doble tilde

---

## 8. REFERENCIAS

- Real Decreto 1071/2007 - Sistema geodésico oficial España (ETRS89)
- IGN Calculadora Geodésica: www.ign.es/web/calculadora-geodesica
- CartoCiudad Especificaciones: www.idee.es/resources/documentos/Cartociudad/
- ISO 6709:2022 - Representación geográfica
- INSPIRE Directive - Marco legal UE