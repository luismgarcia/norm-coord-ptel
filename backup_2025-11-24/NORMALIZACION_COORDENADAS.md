# 📍 Normalización Automática de Coordenadas

## ¿Qué es la normalización automática?

La **normalización automática de coordenadas** es un sistema inteligente que detecta y corrige automáticamente errores de formato en los valores de coordenadas antes de realizar la conversión a UTM30. Este proceso actúa **únicamente sobre las columnas identificadas como coordenadas**, dejando intactos todos los demás campos de texto del documento.

---

## 🎯 Objetivo principal

Permitir que archivos con coordenadas en formatos "sucios" o inconsistentes puedan ser procesados correctamente sin requerir limpieza manual previa.

---

## 🔍 ¿Cómo funciona el proceso completo?

### Paso 1: Detección de columnas de coordenadas
El sistema primero identifica qué columnas contienen coordenadas buscando nombres comunes:
- **Coordenadas X**: `x`, `lon`, `longitude`, `longitud`, `este`, `easting`, `coord_x`, `east`
- **Coordenadas Y**: `y`, `lat`, `latitude`, `latitud`, `norte`, `northing`, `coord_y`, `north`

### Paso 2: Normalización de valores
Una vez identificadas las columnas, cada valor de coordenada pasa por la función `normalizeCoordinateValue()` que realiza las siguientes transformaciones:

---

## 🛠️ Transformaciones que realiza la normalización

### 1️⃣ **Eliminación de caracteres extraños**
Remueve caracteres que no son parte de un número válido, excepto los símbolos necesarios para coordenadas.

```javascript
// Mantiene: dígitos, puntos, comas, signos +/-, notación científica (e, E), símbolos de grados
strValue = strValue.replace(/[^\d.,\-+eE°′″'"\s]/g, '')
```

**Ejemplo:**
- ❌ Entrada: `"42.3456abc"`
- ✅ Salida: `42.3456`

---

### 2️⃣ **Conversión de formato DMS (Grados, Minutos, Segundos)**
Detecta y convierte coordenadas en formato geográfico DMS a decimal.

**Formato detectado:** `DD° MM' SS.SS" [N/S/E/W]`

```javascript
const dmsPattern = /^([+-]?\d+)[°\s]+(\d+)[′'\s]+(\d+(?:\.\d+)?)[″"]?\s*([NSEW]?)$/i
```

**Fórmula de conversión:**
```
Decimal = Grados + (Minutos / 60) + (Segundos / 3600)
```

**Ejemplos:**
- ❌ Entrada: `40° 25' 30" N`
- ✅ Salida: `40.425` (40 + 25/60 + 30/3600)

- ❌ Entrada: `3° 42' 15" W`
- ✅ Salida: `-3.704167` (el W convierte a negativo)

---

### 3️⃣ **Conversión de formato DM (Grados, Minutos)**
Detecta y convierte formato de grados y minutos decimales.

**Formato detectado:** `DD° MM.MMMM' [N/S/E/W]`

```javascript
const dmPattern = /^([+-]?\d+)[°\s]+(\d+(?:\.\d+)?)[′']?\s*([NSEW]?)$/i
```

**Fórmula de conversión:**
```
Decimal = Grados + (Minutos / 60)
```

**Ejemplos:**
- ❌ Entrada: `40° 30.5' N`
- ✅ Salida: `40.508333` (40 + 30.5/60)

---

### 4️⃣ **Corrección de separadores decimales**
Detecta y corrige el uso incorrecto de comas y puntos como separadores decimales.

#### Caso A: Solo coma (formato europeo)
```javascript
// Si hay coma pero NO hay punto
"1234,56" → "1234.56"
```

#### Caso B: Coma Y punto presentes
Identifica cuál es el separador decimal según su posición:

```javascript
// Si la COMA está después del punto → coma es decimal
"1.234,56"  → "1234.56"  // Formato europeo de miles
"123.456,78" → "123456.78"

// Si el PUNTO está después de la coma → punto es decimal
"1,234.56"  → "1234.56"  // Formato anglosajón de miles
"123,456.78" → "123456.78"
```

**Ejemplos:**
- ❌ Entrada: `"529.876,45"` (formato europeo)
- ✅ Salida: `529876.45`

- ❌ Entrada: `"529,876.45"` (formato US)
- ✅ Salida: `529876.45`

---

### 5️⃣ **Validación final**
Después de todas las transformaciones, verifica que el resultado es un número válido:

```javascript
const parsed = parseFloat(strValue)

if (isNaN(parsed) || !isFinite(parsed)) {
  return null  // Marca como inválida
}

return parsed  // Coordenada normalizada correctamente
```

---

## 📊 Seguimiento de normalizaciones

El sistema **registra cada normalización** realizada:

### Durante la detección
```typescript
if (rawX !== x || rawY !== y) {
  normalizedCount++  // Cuenta cuántas coordenadas fueron normalizadas
}
```

### Durante la conversión
```typescript
normalizedFrom: (rawX !== x || rawY !== y) 
  ? `X: "${rawX}" → ${x}, Y: "${rawY}" → ${y}` 
  : undefined
```

Esta información se muestra en:
- ✅ Badge de "Coordenadas normalizadas" en las estadísticas
- ✅ Símbolo `✓` en la tabla de coordenadas originales
- ✅ Tooltip con el valor original al pasar el mouse

---

## 🎬 Flujo completo de normalización

```
1. Usuario carga archivo
   ↓
2. Sistema detecta columnas de coordenadas
   ↓
3. Para cada fila:
   ├─ Lee valor original (rawX, rawY)
   ├─ Aplica normalizeCoordinateValue()
   │  ├─ Limpia caracteres extraños
   │  ├─ Detecta formato DMS/DM
   │  ├─ Corrige separadores decimales
   │  └─ Convierte a número
   ├─ Compara valor normalizado con original
   ├─ Si son diferentes: incrementa contador y registra
   └─ Usa valor normalizado para conversión a UTM30
   ↓
4. Muestra estadísticas:
   - Total de coordenadas normalizadas
   - Valores originales vs normalizados
```

---

## 📋 Ejemplos prácticos completos

### Ejemplo 1: Coordenadas con caracteres extraños
```
Archivo original:
| Longitud        | Latitud         |
|-----------------|-----------------|
| -3.7038°abc     | 40.4168°xyz     |

Después de normalización:
| Longitud | Latitud |
|----------|---------|
| -3.7038  | 40.4168 |

Registro: "X: '-3.7038°abc' → -3.7038, Y: '40.4168°xyz' → 40.4168"
```

### Ejemplo 2: Formato DMS a decimal
```
Archivo original:
| Este              | Norte             |
|-------------------|-------------------|
| 3° 42' 13.68" W   | 40° 25' 0.48" N   |

Después de normalización:
| Este      | Norte    |
|-----------|----------|
| -3.703800 | 40.41680 |

Registro: "X: '3° 42' 13.68\" W' → -3.7038, Y: '40° 25' 0.48\" N' → 40.4168"
```

### Ejemplo 3: Separadores decimales mixtos
```
Archivo original (formato europeo):
| X          | Y            |
|------------|--------------|
| 440.256,78 | 4.472.345,23 |

Después de normalización:
| X        | Y          |
|----------|------------|
| 440256.78| 4472345.23 |

Registro: "X: '440.256,78' → 440256.78, Y: '4.472.345,23' → 4472345.23"
```

---

## ⚠️ Casos que NO se normalizan

La normalización **falla y marca como inválida** cuando:

1. **Valor vacío o nulo**
   ```javascript
   "" → null
   null → null
   undefined → null
   ```

2. **Texto sin números**
   ```javascript
   "sin coordenada" → null
   "N/A" → null
   ```

3. **Resultado no finito después de parsing**
   ```javascript
   "Infinity" → null
   "NaN" → null
   ```

Estas coordenadas aparecen en rojo en las estadísticas como "Inválidas" y **no se incluyen en el archivo de salida**.

---

## 🎯 Ventajas clave

✅ **No requiere limpieza manual** de datos antes de importar
✅ **Procesa múltiples formatos** de coordenadas automáticamente
✅ **Transparencia total**: muestra qué valores fueron normalizados
✅ **Solo afecta columnas de coordenadas**: otros campos permanecen intactos
✅ **Validación robusta**: descarta valores que no pueden convertirse
✅ **Compatible con formatos internacionales**: europeo, anglosajón, DMS, DM

---

## 🧪 Código fuente

La función principal se encuentra en `/src/lib/coordinateUtils.ts`:

```typescript
export function normalizeCoordinateValue(value: any): number | null {
  // Ver líneas 62-132 de coordinateUtils.ts
}
```

Esta función es llamada en dos momentos:
1. **Durante la detección** del sistema de coordenadas (línea 150)
2. **Durante la conversión** a UTM30 (línea 270)

---

## 📈 Monitoreo y feedback

El usuario puede ver la normalización en acción a través de:

1. **Badge "Normalizadas"** con contador en la sección de estadísticas
2. **Símbolo ✓** junto a coordenadas normalizadas en la tabla
3. **Tooltip** mostrando el valor original al pasar el mouse
4. **Mensaje descriptivo** en el panel de información del archivo

---

## 🔧 Mantenimiento y extensión

Para agregar soporte a nuevos formatos de coordenadas, modifica la función `normalizeCoordinateValue()` agregando:

1. Nuevo patrón regex para detección
2. Lógica de conversión específica
3. Validación del resultado

El sistema es **modular y extensible** sin afectar otras funcionalidades.
