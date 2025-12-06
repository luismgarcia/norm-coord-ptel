# Parser ODT Mejorado - Guía de Implementación

## Resumen

Este módulo implementa la corrección del **problema de texto concatenado** detectado en el análisis de 6 documentos PTEL, que afecta al **72.5% de los issues** (103 de 142 registros).

## Archivos Añadidos

| Archivo | Descripción |
|---------|-------------|
| `src/lib/textDeconcatenator.ts` | Módulo principal con funciones de desconcatenación |
| `src/hooks/useTextDeconcatenation.ts` | Hook de React para integración en componentes |
| `src/lib/__tests__/textDeconcatenator.test.ts` | Tests unitarios con casos reales PTEL |

## Patrones Implementados

### Alta Confianza (corrigen automáticamente)

| Patrón | Ejemplo | Resultado |
|--------|---------|----------|
| `mayúscula+abreviatura` | `FARMACIAM.ª` | `FARMACIA M.ª` |
| `camelCase` | `SánchezCarpintería` | `Sánchez Carpintería` |
| `número+mayúscula` | `60822Sevillana` | `60822 Sevillana` |
| `letra+número` | `Transformador60822` | `Transformador 60822` |
| `abreviatura+nombre` | `M.ªCarmen` | `M.ª Carmen` |
| `preposición` | `Sierrade Castril` | `Sierra de Castril` |

### Casos Marcados para Revisión

Textos **ALL CAPS** con secuencias largas (12+ caracteres) se marcan como `requiresReview: true`.

## Uso en Componentes

```tsx
import { useTextDeconcatenation } from '@/hooks/useTextDeconcatenation';

function PTELProcessor() {
  const { processBatch, stats, deconcatenateText } = useTextDeconcatenation();

  const handleProcess = (records: PTELRecord[]) => {
    const processed = processBatch(records);
    console.log(`Corregidos: ${stats.modifiedNames} nombres, ${stats.modifiedTypes} tipos`);
    return processed;
  };

  return (
    // ...
  );
}
```

## Uso Directo de Funciones

```typescript
import { 
  deconcatenateText, 
  validateCoordinateY,
  splitConcatenatedCoordinates 
} from '@/lib/textDeconcatenator';

// Desconcatenar texto
const result = deconcatenateText("FARMACIAM.ª CarmenMAYOL");
console.log(result.corrected); // "FARMACIA M.ª Carmen MAYOL"

// Validar coordenada Y
const yResult = validateCoordinateY(77905);
if (yResult.wasCorrected) {
  console.log(yResult.warning); // "Y truncada: 77905 → 4077905"
}

// Detectar coordenadas concatenadas
const coordResult = splitConcatenatedCoordinates("50435298504342");
if (coordResult.wasConcatenated) {
  console.log(coordResult.values); // [5043529, 8504342]
}
```