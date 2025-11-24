# Casos de Uso y Workflows
## Sistema PTEL Coordinate Normalizer

> Documentación de casos de uso prácticos, workflows operativos y escenarios reales para técnicos municipales.

**Última actualización**: 20 noviembre 2025  
**Versión**: 1.0.0

---

## 📋 Tabla de Contenidos

1. [Workflow Principal](#workflow-principal)
2. [Caso 1: Procesamiento CSV Básico](#caso-1-procesamiento-csv-básico)
3. [Caso 2: Documento ODT con Corrupción UTF-8](#caso-2-documento-odt-con-corrupción-utf-8)
4. [Caso 3: Coordenadas Truncadas](#caso-3-coordenadas-truncadas)
5. [Caso 4: Geocodificación por Tipología](#caso-4-geocodificación-por-tipología)
6. [Caso 5: Validación Masiva Multi-Municipio](#caso-5-validación-masiva-multi-municipio)
7. [Caso 6: Corrección Manual Asistida](#caso-6-corrección-manual-asistida)
8. [Escenarios Edge](#escenarios-edge)

---

## 🔄 Workflow Principal

### Flujo de 3 Pasos

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW PTEL NORMALIZER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────┐      │
│  │  PASO 1  │ → │    PASO 2    │ → │      PASO 3       │      │
│  │  CARGA   │    │ PROCESAMIENTO│    │  VISUALIZACIÓN   │      │
│  └──────────┘    └──────────────┘    └───────────────────┘      │
│       │                 │                     │                  │
│       ▼                 ▼                     ▼                  │
│  • Subir archivo   • Normalizar UTF-8   • Ver en mapa           │
│  • Mapear columnas • Detectar truncación• Filtrar resultados    │
│  • Preview datos   • Validar rangos     • Corregir manual       │
│                    • Geocodificar       • Exportar              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Caso 1: Procesamiento CSV Básico

### Escenario
Técnico municipal tiene CSV exportado de base de datos con coordenadas de infraestructuras.

### Datos de Entrada
```csv
ID,Nombre,Tipo,Direccion,Municipio,X,Y
1,Centro Salud Norte,Sanitario,C/ Mayor 15,Granada,447850.23,4111234.56
2,Colegio San Juan,Educativo,Av. Constitución 3,Granada,448120.00,4111500.00
3,Polideportivo Municipal,Deportivo,C/ Deporte s/n,Granada,447500,4111000
```

### Proceso

**Paso 1: Carga**
1. Arrastrar CSV a zona de upload
2. Sistema detecta automáticamente separador (`;` o `,`)
3. Mapear columnas: X→Coordenada X, Y→Coordenada Y

**Paso 2: Procesamiento**
```
Registro 1: ✅ Válido (Score: 95)
  - Formato: OK
  - Rango Andalucía: OK
  - Decimales: OK
  
Registro 2: ✅ Válido (Score: 92)
  - Formato: OK
  - Sin decimales en Y (warning menor)
  
Registro 3: ⚠️ Revisar (Score: 75)
  - Sin decimales
  - Y podría estar truncada
```

**Paso 3: Exportación**
- Descargar CSV normalizado
- Incluye columnas: `score`, `confidence`, `corrections`

---

## 📄 Caso 2: Documento ODT con Corrupción UTF-8

### Escenario
Documento de Word/LibreOffice con tabla de infraestructuras. Texto muestra caracteres corruptos como "CÃ³rdoba" en lugar de "Córdoba".

### Datos de Entrada (tras conversión)
```
Nombre: Centro de Salud ZaidÃ­n
Municipio: CÃ³rdoba
Coordenada X: 447.850,23
Coordenada Y: 4.111.234,56
```

### Detección Automática

El sistema detecta **3 tipos de corrupción**:

1. **Mojibake UTF-8** en texto:
   - `CÃ³rdoba` → `Córdoba`
   - `ZaidÃ­n` → `Zaidín`

2. **Separador de miles** en coordenadas:
   - `447.850,23` → `447850.23`
   - `4.111.234,56` → `4111234.56`

3. **Coma decimal** (estándar español):
   - Reconocido y convertido

### Resultado
```json
{
  "name": "Centro de Salud Zaidín",
  "municipality": "Córdoba",
  "x": 447850.23,
  "y": 4111234.56,
  "corrections": [
    {"type": "UTF8_MOJIBAKE", "field": "name", "from": "ZaidÃ­n", "to": "Zaidín"},
    {"type": "UTF8_MOJIBAKE", "field": "municipality", "from": "CÃ³rdoba", "to": "Córdoba"},
    {"type": "THOUSANDS_SEPARATOR", "field": "x", "from": "447.850,23", "to": "447850.23"}
  ],
  "score": 98
}
```

---

## 📏 Caso 3: Coordenadas Truncadas

### Escenario
Documento PTEL de Colomera (Granada) tiene coordenadas Y truncadas, faltando el dígito "4" inicial.

### Datos de Entrada
```
Hospital Comarcal: X=436780, Y=77905
Centro Salud: X=436850, Y=78120
Colegio: X=436900, Y=77800
```

### Detección

El sistema detecta **patrón P0-1: Y Truncada**:

```
Análisis de Y=77905:
├── Dígitos: 5 (esperado: 7)
├── Rango UTM30 Andalucía: 4.000.000 - 4.300.000
├── Provincia Granada: Y típica 4.07x.xxx - 4.12x.xxx
└── DIAGNÓSTICO: Falta prefijo "40"

Corrección aplicada:
├── Y original: 77905
├── Y corregida: 4077905
└── Confianza: HIGH (contexto provincial coincide)
```

### Validación Cruzada

```
Infraestructura    Y Original   Y Corregida   Distancia al centroide
─────────────────────────────────────────────────────────────────────
Hospital           77905        4077905       2.3 km ✅
Centro Salud       78120        4078120       2.1 km ✅
Colegio            77800        4077800       2.5 km ✅

Centroide Colomera: (436800, 4078000)
Todas las correcciones son coherentes espacialmente.
```

---

## 🏥 Caso 4: Geocodificación por Tipología

### Escenario
Infraestructura sanitaria sin coordenadas, solo nombre y municipio.

### Datos de Entrada
```
Nombre: Centro de Salud Zaidín Sur
Tipo: SANITARIO
Municipio: Granada
Provincia: Granada
Coordenadas: (vacío)
```

### Proceso de Geocodificación

**Cascada de Servicios (6 niveles)**:

```
NIVEL 1: WFS SICESS (Centros Salud SAS)
├── Query: nombre LIKE '%Zaidín%' AND municipio='Granada'
├── Resultado: 1 coincidencia exacta
├── Coordenadas: X=447234.56, Y=4111567.89
└── Score: 95 (coincidencia nombre alta)

[No necesita continuar cascada - match encontrado]
```

**Si Nivel 1 falla, continúa**:
```
NIVEL 2: WFS Educación → NIVEL 3: CartoCiudad → 
NIVEL 4: CDAU → NIVEL 5: Nominatim → NIVEL 6: Manual
```

### Resultado
```json
{
  "coordinates": { "x": 447234.56, "y": 4111567.89 },
  "method": "WFS_SICESS",
  "score": 95,
  "matchedName": "Centro de Salud Zaidín-Sur",
  "source": "Sistema de Información de Centros Sanitarios SAS",
  "confidence": "HIGH"
}
```

---

## 🗂️ Caso 5: Validación Masiva Multi-Municipio

### Escenario
Consolidar datos PTEL de 5 municipios de la provincia de Granada.

### Datos de Entrada
| Municipio | Registros | Formato Origen |
|-----------|-----------|----------------|
| Colomera | 42 | ODT |
| Guadix | 156 | DBF |
| Baza | 89 | CSV |
| Loja | 134 | XLSX |
| Montefrío | 28 | CSV |
| **Total** | **449** | - |

### Proceso Batch

```
PROCESAMIENTO MULTI-MUNICIPIO
═════════════════════════════════════════════════════════════════

Municipio: Colomera (42 registros)
├── UTF-8 corregido: 12 registros
├── Truncación corregida: 8 registros
├── Geocodificados: 15 registros
├── Score promedio: 87
└── Tiempo: 12 segundos

Municipio: Guadix (156 registros)
├── UTF-8 corregido: 3 registros
├── Truncación corregida: 0 registros
├── Geocodificados: 22 registros
├── Score promedio: 94
└── Tiempo: 35 segundos

[...]

═════════════════════════════════════════════════════════════════
RESUMEN CONSOLIDADO
═════════════════════════════════════════════════════════════════
Total procesados: 449
Completitud inicial: 67%
Completitud final: 95%
Score promedio: 89
Tiempo total: 2 minutos 15 segundos
Ahorro estimado: 4 horas trabajo manual
```

---

## ✏️ Caso 6: Corrección Manual Asistida

### Escenario
Coordenada con score bajo requiere revisión manual.

### Datos Problemáticos
```
Nombre: Ermita de San Roque
X: 436800
Y: 77900
Score: 45 (LOW)
```

### Interfaz de Corrección

```
┌─────────────────────────────────────────────────────────────┐
│  CORRECCIÓN MANUAL: Ermita de San Roque                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  COORDENADAS ACTUALES          SUGERENCIAS                  │
│  X: 436800                     ○ 436800 (sin cambio)        │
│  Y: 77900                      ● 4077900 (añadir prefijo)   │
│                                ○ 4177900 (alternativa)      │
│                                                             │
│  [🗺️ VER EN MAPA]                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    MAPA LEAFLET                      │   │
│  │                                                      │   │
│  │    📍 Posición actual (Y=77900) - FUERA DE RANGO    │   │
│  │    📍 Sugerencia 1 (Y=4077900) - En Colomera ✅     │   │
│  │    📍 Sugerencia 2 (Y=4177900) - En Guadix ❌       │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ACEPTAR SUGERENCIA 1]  [INTRODUCIR MANUAL]  [DESCARTAR]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Escenarios Edge

### E1: Intercambio X↔Y

**Detección**: X en rango Y (4.xxx.xxx) e Y en rango X (xxx.xxx)

```
Entrada: X=4111234, Y=447850
Detección: Valores intercambiados
Corrección: X=447850, Y=4111234
Confianza: HIGH
```

### E2: Placeholder/No Disponible

**Detección**: Valores no numéricos indicando ausencia de dato

```
Patrones reconocidos:
- "N/D", "N/A", "nd", "na"
- "Indicar", "Sin datos", "Pendiente"
- "0", "0.0", "-", ""
- "XXXX", "9999"

Acción: Marcar para geocodificación
```

### E3: Coordenadas Geográficas (lat/lon)

**Detección**: Valores en rango geográfico

```
Entrada: X=-3.605, Y=37.177
Detección: Coordenadas WGS84 (EPSG:4326)
Transformación: → UTM30 (EPSG:25830)
Resultado: X=447850.23, Y=4111234.56
```

### E4: Sistema ED50

**Detección**: Coordenadas UTM pero desplazadas ~200m

```
Entrada: X=447650, Y=4111034 (sospecha ED50)
Validación: Offset típico ED50→ETRS89
Transformación: Aplicar 7 parámetros Helmert
Resultado: X=447850.23, Y=4111234.56
Confianza: MEDIUM (requiere confirmación)
```

---

## 📊 Métricas de Éxito

### Por Sesión de Procesamiento

| Métrica | Objetivo | Típico |
|---------|----------|--------|
| Completitud inicial | - | 67% |
| Completitud final | >95% | 95% |
| Score promedio | >85 | 89 |
| Tiempo por 100 registros | <30s | 25s |
| Correcciones UTF-8 | Variable | 15% |
| Truncaciones detectadas | Variable | 8% |

### Comparativa Manual vs Automatizado

| Tarea | Manual | Automatizado | Ahorro |
|-------|--------|--------------|--------|
| Procesar 50 registros | 2 horas | 5 minutos | 96% |
| Detectar truncación | 30 min | Instantáneo | 100% |
| Corregir UTF-8 | 45 min | 2 segundos | 100% |
| Geocodificar 20 | 3 horas | 3 minutos | 98% |

---

**Casos de Uso y Workflows** | **v1.0.0**  
**Sistema PTEL Coordinate Normalizer** 📋
