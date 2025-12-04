# F025 Address Extractor - Handoff para Implementación

> **Fecha**: 2025-12-04  
> **Commit**: `23c43d5`  
> **Estado**: Análisis completado ✅ → Implementación pendiente ⏳

---

## 1. CONTEXTO RÁPIDO

### 1.1 Problema Identificado
El módulo `addressCleaner.ts` existe (879 líneas) pero **NO se usa** en el flujo principal de geocodificación. Las direcciones con formato problemático (teléfonos, horarios, nombres de infraestructura) fallan silenciosamente.

**Ubicación del problema**: `src/lib/GeocodingOrchestrator.ts` línea ~720

### 1.2 Solución Propuesta
Crear `addressExtractor.ts` nuevo (NO modificar addressCleaner) e integrarlo antes de geocodificar.

---

## 2. ARCHIVOS DE REFERENCIA (YA EN REPO)

| Archivo | Contenido |
|---------|-----------|
| `docs/analisis/F025_ADDRESS_EXTRACTOR_SPEC.md` | Especificación completa (algoritmo 8 pasos, patrones, reglas) |
| `docs/analisis/addressExtractor.testCases.ts` | 63 casos de test listos para copiar |
| `.ptel/PTEL_ESTADO_SESION.json` | Estado actual del proyecto |
| `.ptel/PTEL_FEATURES.json` | Lista de features (F025 incluida) |

---

## 3. TAREAS A EJECUTAR (EN ORDEN)

### TAREA 1: Crear estructura de archivos
```bash
# Verificar que no existen
ls -la src/utils/addressExtractor*

# Crear archivos vacíos
touch src/utils/addressExtractor.ts
touch src/utils/addressExtractor.patterns.ts
touch src/utils/__tests__/addressExtractor.test.ts
```

### TAREA 2: Implementar addressExtractor.patterns.ts
Constantes a definir:
- `STREET_TYPE_EXPANSIONS`: 47 abreviaturas → expansiones
- `INFRASTRUCTURE_PREFIXES`: 51 prefijos ordenados por longitud
- `NON_GEOCODABLE_PATTERNS`: 10 regex para detectar texto no geocodificable
- `OCR_UTF8_CORRECTIONS`: 16 correcciones (NÂº → Nº, etc.)
- `SUFFIX_PATTERNS`: Regex para horarios, teléfonos, pisos, CP

### TAREA 3: Implementar addressExtractor.ts
Interfaz de salida:
```typescript
interface AddressExtractionResult {
  address: string | null;
  confidence: number;  // 0-100
  reason?: 'not_geocodable' | 'multiple_addresses' | 'cadastral' | 'description_only';
  transformations?: string[];
}

function extractStreetAddress(
  rawText: string, 
  municipality?: string
): AddressExtractionResult
```

Flujo de 8 pasos (ver especificación completa en F025_ADDRESS_EXTRACTOR_SPEC.md):
1. Detectar NO geocodificable
2. Corregir OCR/UTF-8
3. Eliminar prefijos infraestructura
4. Eliminar sufijos (horarios, teléfonos, pisos)
5. Expandir abreviaturas de vía
6. Normalizar formato de número
7. Normalizar puntuación
8. Capitalización inteligente

### TAREA 4: Copiar y ejecutar tests
```bash
# Copiar contenido de docs/analisis/addressExtractor.testCases.ts
# a src/utils/__tests__/addressExtractor.test.ts

# Ejecutar tests
npm test -- --run addressExtractor
```

**Objetivo**: 63/63 tests verdes antes de integrar.

### TAREA 5: Integrar en GeocodingOrchestrator
Modificar `src/lib/GeocodingOrchestrator.ts` línea ~720:

```typescript
// ANTES
const address = options.address 
  ? `${options.address}, ${options.municipality}`
  : `${options.name}, ${options.municipality}`;

// DESPUÉS
import { extractStreetAddress } from '../utils/addressExtractor';

const rawText = options.address || options.name;
const extraction = extractStreetAddress(rawText, options.municipality);

if (extraction.confidence === 0) {
  this.logSkipped(options, extraction.reason);
  return null;  // No intentar geocodificar basura
}

const address = extraction.address 
  ? `${extraction.address}, ${options.municipality}`
  : `${options.name}, ${options.municipality}`;
```

### TAREA 6: Validar con documentos reales
Probar con los documentos PTEL subidos:
- Tíjola (228 candidatos, 53 problemas)
- Colomera (236 candidatos, 39 problemas)
- Berja (180+ candidatos)

**Métrica objetivo**: ≥85% de direcciones geocodificadas correctamente (vs ~35% actual).

---

## 4. CRITERIOS DE ÉXITO

- [ ] 63 casos de test pasan
- [ ] `npm test` pasa sin regresiones
- [ ] Integración en GeocodingOrchestrator sin romper flujo
- [ ] Mejora medible en tasa de geocodificación

---

## 5. COMANDOS ÚTILES

```bash
# Ir al repo
cd /Users/lm/Documents/GitHub/norm-coord-ptel

# Ver estado
git status

# Ejecutar tests específicos
npm test -- --run addressExtractor

# Ejecutar todos los tests
npm test

# Ver archivo de especificación
cat docs/analisis/F025_ADDRESS_EXTRACTOR_SPEC.md

# Ver casos de test
cat docs/analisis/addressExtractor.testCases.ts
```

---

## 6. NOTAS IMPORTANTES

1. **NO modificar addressCleaner.ts** - Sigue usándose en multiFieldStrategy.ts
2. **Implementar por pasos** - Un paso del algoritmo, luego tests, siguiente paso
3. **Logging** - Registrar casos con confidence < 70 para revisión manual
4. **Fallback seguro** - Si extraction falla, usar texto original

---

*Documento generado: 2025-12-04 20:30 UTC*  
*Próxima sesión: Implementación F025 Fases 3-5*
