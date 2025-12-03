# Diagnóstico Completo de Geocodificación - 3 Diciembre 2025

## Resumen Ejecutivo

**Problema:** La tasa de geocodificación es mucho menor de lo esperado (~48% vs ~90% estimado).

**Causa raíz:** No es un problema del geocodificador ni de las direcciones. Es un **problema de estrategia de búsqueda**.

## Datos Analizados

| Municipio | Total | Éxito | Fallidos | Tasa |
|-----------|-------|-------|----------|------|
| Colomera | 31 | 15 | 16 | 48% |
| Tíjola | 33 | 20 | 13 | 61% |
| Quéntar | 12 | 7 | 5 | 58% |
| Castril | 198 | 178 | 20 | 90% |

## Hallazgos Clave

### 1. CartoCiudad SÍ funciona con direcciones limpias
```
"Plaza de España, 1, Tíjola" → ✅ ENCONTRADO
"C/Garci laso de la Vega, n/ 5, bajo, Tíjola, disponible 24h" → ❌ FALLA
```

### 2. Los datos offline DERA EXISTEN y son completos
- health.geojson: 1,700 centros
- security.geojson: 1,259 (policía, bomberos, GC)
- education.geojson: 6,725 centros
- municipal.geojson: 1,414 ayuntamientos

### 3. WFS online de la Junta están caídos (404/401/SSL errors)
Por eso la cascada especializada no funciona online.

### 4. El matching por nombre es demasiado estricto
```
DOCUMENTO: "CENTRO SANITARIODE QUENTAR"
DERA:      "Quéntar" (nombre oficial del centro)
Fuse.js:   Score bajo → NO MATCH
```

### 5. 65% de municipios tienen UN SOLO centro de salud
511 de 784 municipios → Geocodificación directa sin matching posible.

## Infraestructuras Fallidas Analizadas (38 total)

### Clasificación por tipo de problema:

| Categoría | Cantidad | % | Ejemplo |
|-----------|----------|---|---------|
| Tiene tipo geocodificable | 12 | 32% | "Centro de Salud", "Policía Local" |
| Dirección válida sucia | 7 | 18% | "C/Garci laso de la Vega, n/ 5..." |
| Dirección sin número | 7 | 18% | "Avda. Benalúa" |
| No es dirección | 11 | 29% | "1 mesa, 2 sillas, ordenador..." |
| Sin datos | 1 | 3% | Campo vacío |

## Ejemplos de Fallidos Recuperables

### Tíjola #16: Centro de Salud
- NOMBRE: "Centro de Salud"
- TIPO: "Los disponibles en el Centro de Salud"
- DIRECCIÓN: "Centro de Salud Tíjola, Plaza Luis Gonzaga, n/ 1..."
- **SOLUCIÓN:** Buscar tipo=HEALTH en municipio=Tíjola en DERA

### Quéntar #9: Centro Sanitario
- NOMBRE: "CENTRO SANITARIODE QUENTAR"
- TIPO: "Indicar"
- **SOLUCIÓN:** Buscar tipo=HEALTH en municipio=Quéntar en DERA
- **DERA tiene:** 2 centros ("Quéntar" y "Tocón")

### Tíjola #14: Policía Local
- NOMBRE: "Policía Local"
- DIRECCIÓN: "C/Garci laso de la Vega, n/ 5..."
- **SOLUCIÓN 1:** Buscar tipo=SECURITY en DERA
- **SOLUCIÓN 2:** Limpiar dirección → "Calle Garcilaso de la Vega, 5"

## Mejoras Propuestas

### NIVEL 1: Búsqueda por municipio + tipo (ALTO IMPACTO)
```
Si tipo=HEALTH y municipio tiene 1 solo centro → retornar sin matching
Si tipo=HEALTH y municipio tiene N centros → matching por nombre/localidad
```

### NIVEL 2: Limpieza de direcciones (MEDIO IMPACTO)
```javascript
function cleanAddress(raw) {
  // Eliminar basura: teléfonos, horarios, equipamiento
  // Normalizar: "C/" → "Calle", "n/" → "", "s/n" → ""
  // Corregir: "Garci laso" → "Garcilaso"
}
```

### NIVEL 3: Clasificador más robusto (MEDIO IMPACTO)
- "CENTRO SANITARIODE" (sin espacio) → HEALTH
- "Policía Local" → SECURITY
- "Pabellón Municipal" → SPORTS

### NIVEL 4: Fallback a centroide municipal (BAJO IMPACTO)
- Si todo falla y hay municipio → retornar centroide con confianza baja

## Archivos Relevantes

- `/src/lib/LocalDataService.ts` - Búsqueda en datos offline
- `/src/lib/AutoGeocodingService.ts` - Servicio de geocodificación
- `/src/services/geocoding/GeocodingOrchestrator.ts` - Orquestador cascada
- `/src/services/geocoding/generic/CartoCiudadGeocoder.ts` - Geocodificador genérico
- `/public/data/dera/*.geojson` - Datos offline DERA

## Estadísticas DERA

### health.geojson (1,700 centros)
- Municipios con 1 centro: 511 (65%)
- Municipios con 2+ centros: 273 (35%)

### Cobertura por municipio
- Quéntar: 2 centros
- Colomera: 2 centros
- Tíjola: 0 centros (no está en DERA)
- Castril: ? centros

## Conclusión

El sistema tiene los datos necesarios pero la estrategia de búsqueda es subóptima:

1. **Priorizar TIPO + MUNICIPIO** sobre matching de nombre
2. **Usar datos offline DERA** como fuente principal
3. **Limpiar direcciones** antes de enviar a CartoCiudad
4. **Clasificar mejor** con nombres mal escritos/concatenados

Potencial de mejora: Del ~50% actual al ~75-85% con estas mejoras.
