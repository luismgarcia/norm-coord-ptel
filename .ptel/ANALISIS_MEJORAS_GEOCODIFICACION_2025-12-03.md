# Análisis de Mejoras Geocodificación - 3 Diciembre 2025

## Contexto

Continuación del diagnóstico `DIAGNOSTICO_GEOCODIFICACION_2025-12-03.md`.
Análisis técnico de los componentes existentes y propuesta de implementación.

## Componentes Analizados

| Componente | Archivo | Estado | Problema Identificado |
|------------|---------|--------|----------------------|
| `InfrastructureClassifier` | `src/services/classification/InfrastructureClassifier.ts` | ✅ Funciona | No detecta "CENTRO SANITARIODE" (sin espacio) |
| `LocalDataService` | `src/lib/LocalDataService.ts` | ⚠️ Parcial | No implementa "1 centro = match directo" |
| `Fuse.js` matching | Integrado en LocalDataService | ⚠️ Subóptimo | Threshold demasiado permisivo para nombres corruptos |

## Hallazgo Clave

El código actual **siempre** hace fuzzy matching:

```typescript
// LocalDataService.ts línea ~320
const fuseResults = tempFuse.search(nombre, { limit: maxResults });
```

Pero el diagnóstico indica que **65% de municipios tienen 1 solo centro de salud**.
Esto significa que podemos retornar directamente sin matching en la mayoría de casos.

## Plan de Implementación - 3 Niveles

### NIVEL 1: Búsqueda Directa por Tipo + Municipio
**Impacto estimado: +25-30% tasa geocodificación**
**Esfuerzo: 2-3h**

```typescript
// Nueva función en LocalDataService.ts
export async function geocodeByTypeAndMunicipio(
  tipo: InfrastructureCategory,
  codMun: string,
  nombreOpcional?: string
): Promise<LocalSearchResult> {
  const counts = await getFeatureCountByMunicipio(codMun);
  
  // ✅ Si hay 1 solo centro → retornar sin matching
  if (counts[tipo] === 1) {
    const features = await getFeaturesByMunicipio(codMun, [tipo]);
    return {
      success: true,
      bestMatch: features[0],
      matchScore: 95, // Alta confianza - único en municipio
      strategy: 'UNIQUE_IN_MUNICIPIO'
    };
  }
  
  // Si hay múltiples → fuzzy matching con nombre
  if (counts[tipo] > 1 && nombreOpcional) {
    return searchLocal({ nombre: nombreOpcional, codMun, categorias: [tipo] });
  }
  
  return { success: false };
}
```

**Justificación**: Ya existe `getFeatureCountByMunicipio()` implementado.

### NIVEL 2: Limpiador de Direcciones
**Impacto estimado: +10-15%**
**Esfuerzo: 2h**

```typescript
// Nuevo archivo: src/lib/AddressCleaner.ts
export function cleanAddress(raw: string): string {
  return raw
    .replace(/\b(disponible\s+\d+h?|24\s*h(?:oras)?)\b/gi, '')  // Horarios
    .replace(/\b(\d{9}|\d{3}[.\s]\d{3}[.\s]\d{3})\b/g, '')      // Teléfonos
    .replace(/\b(n\/|nº|num\.?)\s*/gi, '')                      // "n/" → nada
    .replace(/\b(s\/n)\b/gi, '')                                // "s/n" → nada
    .replace(/\bC\//gi, 'Calle ')                               // "C/" → "Calle"
    .replace(/\bAvda\.?\b/gi, 'Avenida ')                       // "Avda" → "Avenida"
    .replace(/\bPza\.?\b/gi, 'Plaza ')                          // "Pza" → "Plaza"
    .replace(/\s+,\s+/g, ', ')                                  // Espacios extra
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Ejemplos de transformación:
// "C/Garci laso de la Vega, n/ 5, bajo, Tíjola, disponible 24h" 
//   → "Calle Garcilaso de la Vega, 5, bajo, Tíjola"
```

### NIVEL 3: Clasificador Robusto para Nombres Corruptos
**Impacto: +5%**
**Esfuerzo: 1h**

```typescript
// Mejora en InfrastructureClassifier.ts - patrón HEALTH
primary: /\b(centro\s*de\s*salud|centro\s*sanitario|centrosalud|centrosanit|hospital|cl[íi]nica)\b/i,
//           ^^^^^^^^^^^^^^     ^^^^^^^^^^^^^^^^   ^^^^^^^^^^ sin espacio
// Antes solo detectaba "centro de salud" (con espacio)
// Ahora detecta también "centrodesalud", "centro sanitariode", etc.
```

## Impacto Estimado Total

| Nivel | Impacto | Esfuerzo | Prioridad |
|-------|---------|----------|-----------|
| NIVEL 1 | +25-30% | 2-3h | 🔴 CRÍTICO |
| NIVEL 2 | +10-15% | 2h | 🟡 ALTO |
| NIVEL 3 | +5% | 1h | 🟢 MEDIO |
| **TOTAL** | **+40-50%** | **5-6h** | - |

Con estas mejoras, la tasa de geocodificación podría pasar de ~50% actual a ~90-95%.

## Estadísticas DERA Relevantes

Datos de `health.geojson` (1,700 centros):
- Municipios con 1 centro: 511 (65%)
- Municipios con 2+ centros: 273 (35%)

Esto confirma que NIVEL 1 tiene el mayor ROI.

## Archivos a Modificar

1. `src/lib/LocalDataService.ts` - Nueva función `geocodeByTypeAndMunicipio()`
2. `src/lib/AddressCleaner.ts` - Nuevo archivo
3. `src/services/classification/InfrastructureClassifier.ts` - Mejorar regex
4. `src/services/geocoding/GeocodingOrchestrator.ts` - Integrar nueva estrategia

## Próximos Pasos Recomendados

1. ✅ Análisis completado
2. ⏳ Implementar NIVEL 1 (mayor impacto)
3. ⏳ Implementar NIVEL 2 (limpieza direcciones)
4. ⏳ Implementar NIVEL 3 (clasificador robusto)
5. ⏳ Tests con datos reales de Colomera, Tíjola, Quéntar

## Referencias

- Diagnóstico inicial: `.ptel/DIAGNOSTICO_GEOCODIFICACION_2025-12-03.md`
- LocalDataService: `src/lib/LocalDataService.ts` (580 líneas)
- Clasificador: `src/services/classification/InfrastructureClassifier.ts`
- Tests LocalDataService: `src/lib/__tests__/LocalDataService.test.ts` (22 tests)

---
*Generado: 2025-12-03*
*Sesión: Análisis mejoras geocodificación*
*Rol: MapWizard*
