# F025: Address Extractor - HANDOFF para Implementación

> **Fecha**: 2025-12-04  
> **Commit análisis**: `b76ba88`  
> **Estado**: Análisis completado ✅ → Implementación pendiente ⏳

---

## 🎯 OBJETIVO DE LA PRÓXIMA SESIÓN

Implementar `addressExtractor.ts` para extraer direcciones geocodificables de texto libre de documentos PTEL.

---

## 📋 TAREAS (en orden estricto)

### TAREA 1: Crear addressExtractor.ts

**Archivo**: `src/utils/addressExtractor.ts`

**Interfaz requerida**:
```typescript
export interface AddressExtractionResult {
  address: string | null;
  confidence: number;  // 0-100
  extractedParts: {
    streetType?: string;
    streetName?: string;
    number?: string;
    municipality?: string;
  };
  warnings: string[];
}

export function extractStreetAddress(
  rawText: string,
  municipality?: string
): AddressExtractionResult;
```

**Algoritmo de 8 pasos** (ver especificación completa):
1. Detectar no geocodificable → return null
2. Corregir UTF-8
3. Eliminar prefijos infraestructura
4. Eliminar sufijos (teléfonos, horarios, pisos)
5. Expandir abreviaturas (C/ → Calle)
6. Normalizar número (n/ 1 → 1)
7. Normalizar puntuación
8. Capitalización inteligente

### TAREA 2: Crear addressExtractor.test.ts

**Archivo**: `src/utils/__tests__/addressExtractor.test.ts`

**Usar los 63 casos de test ya creados**:
```typescript
import { allTestCases, nullExpectedCases } from './addressExtractor.testCases';
import { extractStreetAddress } from '../addressExtractor';

describe('extractStreetAddress', () => {
  describe.each(allTestCases)('$id: $problemType', (testCase) => {
    it(`should transform "${testCase.input.substring(0, 40)}..."`, () => {
      const result = extractStreetAddress(testCase.input, testCase.municipality);
      expect(result.address).toBe(testCase.expected);
    });
  });
});
```

**Objetivo**: ≥85% de los 63 casos pasando (≥54 tests)

### TAREA 3: Ejecutar tests y ajustar

```bash
cd /Users/lm/Documents/GitHub/norm-coord-ptel
npm test src/utils/__tests__/addressExtractor.test.ts
```

Iterar hasta alcanzar ≥85% acierto.

### TAREA 4: Integrar en GeocodingOrchestrator

**Archivo**: `src/lib/GeocodingOrchestrator.ts` (línea ~710)

**Cambio**:
```typescript
// IMPORTAR
import { extractStreetAddress } from '../../utils/addressExtractor';

// USAR (reemplazar línea ~720)
const rawText = options.address || options.name;
const extracted = extractStreetAddress(rawText, options.municipality);

if (extracted.confidence < 70) {
  console.warn(`[AddressExtractor] Low confidence:`, extracted);
}

const address = extracted.address 
  ? `${extracted.address}, ${options.municipality}`
  : `${options.name}, ${options.municipality}`;  // Fallback
```

### TAREA 5: Test de integración

Probar con documentos PTEL reales subidos:
- `250609_Ficha_Plantilla_PTEL_Ayto_Tijola.odt`
- `250702_Ficha_Plantilla_PTEL_Ayto_Colomera.odt`

Verificar que direcciones que antes fallaban ahora geocodifican.

---

## 📁 ARCHIVOS DE REFERENCIA

| Archivo | Descripción |
|---------|-------------|
| `docs/analisis/F025_ADDRESS_EXTRACTOR_SPEC.md` | Especificación técnica completa |
| `src/utils/__tests__/addressExtractor.testCases.ts` | 63 casos de test listos |
| `src/utils/addressCleaner.ts` | Módulo existente (NO modificar) |
| `src/lib/GeocodingOrchestrator.ts` | Punto de integración (línea ~710) |

---

## ⚠️ REGLAS CRÍTICAS

1. **NO modificar** `addressCleaner.ts` - crear módulo nuevo
2. **TDD**: Tests primero, código después
3. **Commits pequeños**: Un commit por tarea completada
4. **Rollback seguro**: Mantener fallback al comportamiento actual

---

## 🧪 CRITERIOS DE ÉXITO

| Métrica | Objetivo |
|---------|----------|
| Tests unitarios pasando | ≥54/63 (85%) |
| Detección no-geocodificables | 100% (7/7 casos null) |
| Tiempo procesamiento | <10ms/dirección |
| Tests integración | Tíjola + Colomera geocodifican |

---

## 📝 COMANDOS ÚTILES

```bash
# Ver estado del repo
cd /Users/lm/Documents/GitHub/norm-coord-ptel
git log --oneline -5

# Ejecutar tests específicos
npm test src/utils/__tests__/addressExtractor.test.ts

# Ejecutar todos los tests
npm test

# Ver archivos de referencia
cat docs/analisis/F025_ADDRESS_EXTRACTOR_SPEC.md
cat src/utils/__tests__/addressExtractor.testCases.ts
```

---

**Próxima sesión**: Implementación F025 - Tareas 1-5
