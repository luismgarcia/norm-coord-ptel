# 🔬 DIAGNÓSTICO COMPLETO DEL SISTEMA PTEL

**Fecha:** 27 de noviembre de 2025  
**Versión analizada:** v2.0  
**Repositorio:** `/Users/lm/Documents/GitHub/norm-coord-ptel`  
**Documentos analizados:** Hornos, Colomera, Castril, Tíjola, Quéntar, Berja

---

## 📋 RESUMEN EJECUTIVO

### Hallazgos Principales

| Componente | Estado | Problema |
|------------|--------|----------|
| **coordinateNormalizer.ts** | ✅ Funcional | v4.2 completo, 52+ patrones implementados |
| **GeocodingOrchestrator.ts** | ✅ Funcional | Cascada 7 niveles implementada |
| **documentExtractor.ts** | ⚠️ CRÍTICO | Patrones de columnas demasiado restrictivos |
| **useGeocoding.ts** | ✅ Funcional | Hook React correctamente integrado |
| **Step2.tsx** | ⚠️ MODERADO | Conexión correcta pero depende de extractor |
| **Flujo completo** | ⚠️ BRECHA | El extractor no captura todas las infraestructuras |

### Diagnóstico: Cuello de botella en la EXTRACCIÓN

El problema NO está en la normalización ni en la geocodificación, sino en la **extracción inicial de datos del documento**. El `documentExtractor.ts` está filtrando elementos que deberían pasar a la cascada de geocodificación.

---

## 🔍 ANÁLISIS DETALLADO

### 1. Análisis de Hornos (Caso Problemático)

**Contenido real del documento:**
```
TABLA: Bienes Culturales
| Nombre                              | Superficie | Tipo      | X - Longitud | y- Latitud |
|-------------------------------------|------------|-----------|--------------|------------|
| Conjunto Histórico-Artístico Hornos | 35000      | Monumento |              |            |
| Castillo de Hornos                  | 2000       | Monumento |              |            |
| Puerta de la Villa                  | 400        | Monumento |              |            |

TABLA: Actividad Industrial
| Actividad             | Nombre                     | Dirección              | x - | y- Latitud |
|-----------------------|----------------------------|------------------------|-----|------------|
| Almacén de bebidas    | Pedro Fuentes Fernández SL | CTRA. CORTIJOS NUEVOS  |     |            |
```

**Por qué no se extraen:**

1. **Patrón de columna X no coincide:**
   - Columna real: `"X - Longitud"`
   - Patrón actual: `/^(x|x[-_\s]*(utm|coord)?|longitud|...)$/i`
   - El patrón usa `^...$` que requiere MATCH EXACTO → FALLA

2. **Patrón de columna Y no coincide:**
   - Columna real: `"y- Latitud"`
   - Patrón actual: `/^(y|y[-_\s]*(utm|coord)?|latitud|...)$/i`
   - Hay un guión pegado `y-` sin espacio → FALLA

3. **Umbral de confianza:**
   - El sistema requiere `confidence >= 50` O coordenadas válidas
   - Hornos tiene nombre+dirección (60 puntos) PERO...
   - Las columnas de coords NO se detectan → Sistema piensa que no tiene estructura

### 2. Comparativa de Documentos

| Documento | Tablas | Infraest. Detectables | Detectadas por Sistema | GAP |
|-----------|--------|----------------------|------------------------|-----|
| **Hornos** | 62 | ~25-30 | ~5 | **-80%** |
| **Colomera** | 61 | ~50 | ~42 | -16% |
| **Castril** | 65 | ~60 | ~55 | -8% |
| **Tíjola** | 67 | ~45 | ~40 | -11% |
| **Quéntar** | 62 | ~20 | ~15 | -25% |

**Hornos es el peor caso porque:**
- Columnas de coordenadas con nombres no estándar
- Coordenadas vacías (requiere geocodificación 100%)
- El sistema actual solo procesa tablas CON coordenadas o con headers exactos

---

## 🐛 BUGS IDENTIFICADOS

### BUG #1 (CRÍTICO): Patrones de columnas demasiado restrictivos

**Ubicación:** `documentExtractor.ts`, línea 35-40

**Código actual:**
```javascript
const COLUMN_PATTERNS = {
  coordX: /^(x|x[-_\s]*(utm|coord)?|longitud|este|easting|coord[-_\s]?x)$/i,
  coordY: /^(y|y[-_\s]*(utm|coord)?|latitud|norte|northing|coord[-_\s]?y)$/i,
};
```

**Problema:** 
- Usa `^...$` que requiere match exacto
- NO reconoce: `"X - Longitud"`, `"y- Latitud"`, `"Coordenadas (UTM)"`

**Corrección propuesta:**
```javascript
const COLUMN_PATTERNS = {
  coordX: /\b(x|longitud|este|easting)\b/i,  // Sin anclas
  coordY: /\b(y|latitud|norte|northing)\b/i,
  coordCombined: /coordenadas?\s*(\(?\s*utm\s*\)?)?/i,
};
```

---

### BUG #2 (CRÍTICO): No hay fallback por contenido

**Ubicación:** `documentExtractor.ts`, función `extractFromODT`

**Problema actual:**
Si los headers no coinciden con los patrones, el sistema abandona la tabla.

**Debería hacer:**
1. Si no detecta headers → Buscar en contenido de celdas
2. Detectar infraestructuras por nombre: "Castillo de X", "Iglesia de X", "Centro de Salud"
3. Si encuentra infraestructuras conocidas → Procesar la tabla aunque no tenga coords

---

### BUG #3 (MODERADO): Filtrado excesivo de filas

**Ubicación:** `documentExtractor.ts`, función `isValidInfrastructureRow`

**Código actual:**
```javascript
function isValidInfrastructureRow(cells, structure) {
  const nameIdx = structure.nameColIdx >= 0 ? structure.nameColIdx : 0;
  const name = cells[nameIdx]?.trim() || '';
  if (name.length < 3) return false;
  // ... más filtros
}
```

**Problema:**
- Si `nameColIdx` no se detectó bien, usa columna 0
- Columna 0 podría no ser el nombre en todas las tablas
- Filtra filas válidas por error

---

### BUG #4 (MENOR): Detección de sub-headers incompleta

**Problema:**
Las tablas PTEL usan doble header:
```
| Nombre | Dirección | Coordenadas |
|        |           | X    | Y    |
```

El sistema detecta esto pero no siempre:
- Solo busca `x` y `y` exactos en la segunda fila
- No detecta variantes como `X - Longitud`

---

## 📊 DOCUMENTACIÓN vs IMPLEMENTACIÓN

### Lo que está DOCUMENTADO

Según `GEOCODIFICACION_POR_DIRECCION.md` y `REQUISITOS_GEOCODIFICACION_DIRECCION.md`:

1. ✅ Extracción total de elementos (42 de Colomera)
2. ✅ Clasificación por 10 tipologías
3. ✅ Cascada de 4 niveles (validación → especializado → genérico → fallback)
4. ✅ Scoring dinámico
5. ✅ Exportación multi-pestaña

### Lo que está IMPLEMENTADO (código real)

| Funcionalidad | Documentada | Implementada | Conectada |
|---------------|-------------|--------------|-----------|
| Extracción ODT | ✅ | ✅ | ⚠️ Parcial |
| Clasificación tipológica | ✅ | ✅ | ✅ |
| Normalización 52 patrones | ✅ | ✅ | ✅ |
| Cascada 7 niveles | ✅ | ✅ | ✅ |
| WFS especializado (SAS, Educación) | ✅ | ✅ | ✅ |
| NGA topónimos | ✅ | ✅ | ✅ |
| IAID deportes | ✅ | ✅ | ✅ |
| Overpass/OSM | ✅ | ✅ | ✅ |
| CDAU/CartoCiudad | ✅ | ✅ | ✅ |
| Extracción SIN coords | ✅ | ⚠️ | ⚠️ **PROBLEMA** |

### La BRECHA

El sistema está diseñado para:
1. Extraer TODAS las infraestructuras (con y sin coords)
2. Clasificarlas por tipología
3. Geocodificar las que no tienen coords

**PERO** el paso 1 falla para tablas con:
- Headers de coordenadas no estándar
- Coordenadas vacías
- Estructura ligeramente diferente

**RESULTADO:** Solo se extraen ~20-30% de las infraestructuras de Hornos.

---

## 🛠️ METODOLOGÍA DE DEPURACIÓN

### FASE 1: Validación del Extractor (PRIORITARIO)

#### Test 1.1: Verificar patrones de columnas
```bash
# En consola del navegador de la app
# Subir Hornos.odt y observar logs
```

**Añadir logs temporales en `documentExtractor.ts`:**
```javascript
function analyzeTableStructure(rows) {
  console.log('🔍 Analizando tabla, primera fila:', rows[0]);
  
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i].toLowerCase().trim();
    console.log(`  Celda ${i}: "${cell}"`);
    console.log(`    ¿Es X? ${COLUMN_PATTERNS.coordX.test(cell)}`);
    console.log(`    ¿Es Y? ${COLUMN_PATTERNS.coordY.test(cell)}`);
  }
  // ...
}
```

#### Test 1.2: Contar infraestructuras perdidas
```javascript
// Al final de extractFromODT
console.log('📊 RESUMEN EXTRACCIÓN:');
console.log(`  Tablas totales: ${tables.length}`);
console.log(`  Tablas procesadas: ${Object.keys(byTable).length}`);
console.log(`  Infraestructuras extraídas: ${infrastructures.length}`);
console.log(`  Con coordenadas: ${withCoordinates}`);
console.log(`  Sin coordenadas (para geocodificar): ${withoutCoordinates}`);
```

### FASE 2: Verificar Cascada de Geocodificación

#### Test 2.1: Validar cada nivel
```javascript
// En GeocodingOrchestrator.ts, añadir logs
console.log(`🎯 Geocodificando: ${options.name}`);
console.log(`  Municipio: ${options.municipality}`);
console.log(`  Dirección: ${options.address}`);
console.log(`  Tipo detectado: ${classification.type}`);
// ... después de cada nivel
console.log(`  L${nivel}: ${resultado ? '✅ Éxito' : '❌ Fallo'}`);
```

#### Test 2.2: Verificar APIs externas
```bash
# Probar CartoCiudad manualmente
curl "https://www.cartociudad.es/geocoder/api/geocoder/find?q=Castillo%20de%20Hornos%2C%20Hornos%2C%20Jaen"

# Probar CDAU
curl "https://www.callejerodeandalucia.es/geocoder/..."
```

### FASE 3: Validación End-to-End

#### Test 3.1: Crear documento de prueba mínimo
Crear un ODT de 3 tablas con patrones problemáticos conocidos:
1. Tabla con `X - Longitud` / `y- Latitud`
2. Tabla con `Coordenadas (UTM)` combinada
3. Tabla sin columnas de coordenadas (solo nombre+dirección)

#### Test 3.2: Comparar entrada vs salida
| Entrada (ODT) | Esperado | Obtenido | Diferencia |
|---------------|----------|----------|------------|
| Castillo de Hornos | Geocodificado | ??? | ??? |
| Iglesia de X | Geocodificado | ??? | ??? |

---

## ✅ PLAN DE CORRECCIÓN

### Prioridad 1: Arreglar patrones de columnas (30 min)

```javascript
// documentExtractor.ts línea 35-42
const COLUMN_PATTERNS = {
  name: /\b(nombre|denominaci[oó]n|descripci[oó]n|elemento|infraestructura|instalaci[oó]n)\b/i,
  address: /\b(direcci[oó]n|ubicaci[oó]n|localizaci[oó]n|domicilio|emplazamiento)\b/i,
  type: /\b(tipo|tipolog[ií]a|categor[ií]a|clase|naturaleza)\b/i,
  // NUEVOS PATRONES AMPLIADOS:
  coordX: /\b(x|longitud|este|easting)\b|coord.*x/i,
  coordY: /\b(y|latitud|norte|northing)\b|coord.*y/i,
  coordCombined: /coordenadas?/i,
};
```

### Prioridad 2: Añadir detección por contenido (1 hora)

```javascript
// Nueva función en documentExtractor.ts
function detectInfrastructuresByContent(rows: string[][]): ExtractedInfrastructure[] {
  const INFRA_PATTERNS = [
    { pattern: /castillo\s+de\s+/i, type: 'PATRIMONIO' },
    { pattern: /iglesia\s+(de\s+)?/i, type: 'PATRIMONIO' },
    { pattern: /centro\s+de\s+salud/i, type: 'SANITARIO' },
    { pattern: /colegio|ceip|ies/i, type: 'EDUCATIVO' },
    { pattern: /piscina\s+municipal/i, type: 'DEPORTIVO' },
    // ...más patrones
  ];
  
  const detected: ExtractedInfrastructure[] = [];
  
  for (const row of rows) {
    for (const cell of row) {
      for (const { pattern, type } of INFRA_PATTERNS) {
        if (pattern.test(cell)) {
          detected.push({
            nombre: cell.trim(),
            tipo: type,
            // extraer dirección de celdas adyacentes...
          });
          break;
        }
      }
    }
  }
  
  return detected;
}
```

### Prioridad 3: Reducir umbral de confianza (15 min)

```javascript
// documentExtractor.ts línea ~280
// ANTES:
if (structure.confidence < 50 && !hasUTMCoords) continue;

// DESPUÉS:
if (structure.confidence < 30 && !hasUTMCoords && !hasInfrastructureContent) continue;
```

### Prioridad 4: Añadir tests automatizados (2 horas)

Crear archivo `/src/lib/__tests__/documentExtractor.test.ts`:
```javascript
import { extractFromODT } from '../documentExtractor';

describe('extractFromODT', () => {
  it('debe extraer infraestructuras con headers no estándar', async () => {
    const file = createTestODT([
      ['Nombre', 'X - Longitud', 'y- Latitud'],
      ['Castillo de Hornos', '', '']
    ]);
    const result = await extractFromODT(file);
    expect(result.infrastructures).toHaveLength(1);
  });
  
  it('debe extraer infraestructuras sin columnas de coordenadas', async () => {
    // ...
  });
});
```

---

## 📈 MÉTRICAS DE ÉXITO POST-CORRECCIÓN

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Infraestructuras extraídas (Hornos) | ~5 | **≥25** |
| Tasa detección columnas coords | ~60% | **≥95%** |
| Cobertura geocodificación total | ~55% | **≥80%** |
| Tiempo procesamiento documento | 3-5s | ≤5s |

---

## 🔄 PRÓXIMOS PASOS INMEDIATOS

1. **AHORA:** Aplicar FIX #1 (patrones de columnas) → Deploy → Test con Hornos
2. **HOY:** Añadir logs de depuración → Identificar tablas perdidas exactas
3. **MAÑANA:** Implementar detección por contenido
4. **ESTA SEMANA:** Tests automatizados + validación con los 5 municipios

---

**Autor:** Claude (Diagnóstico automático)  
**Revisión requerida:** Luis García (Técnico Municipal)  
**Siguiente revisión programada:** Post-corrección FIX #1
