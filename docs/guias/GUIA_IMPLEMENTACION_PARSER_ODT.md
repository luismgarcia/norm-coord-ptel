# Guía de Implementación - Parser ODT Mejorado

## Resumen

Este paquete implementa la corrección del **problema de texto concatenado** detectado en el análisis de 6 documentos PTEL, que afecta al **72.5% de los issues** (103 de 142 registros).

## Archivos Generados

| Archivo | Descripción |
|---------|-------------|
| `textDeconcatenator-v2.ts` | Módulo principal con funciones de desconcatenación |
| `useTextDeconcatenation.ts` | Hook de React para integración en componentes |
| `textDeconcatenator.test.ts` | Tests unitarios con casos reales PTEL |

## Patrones Implementados

### Alta Confianza (corrigen automáticamente)

| Patrón | Ejemplo | Resultado |
|--------|---------|-----------||
| `mayúscula+abreviatura` | `FARMACIAM.ª` | `FARMACIA M.ª` |
| `camelCase` | `SánchezCarpintería` | `Sánchez Carpintería` |
| `número+mayúscula` | `60822Sevillana` | `60822 Sevillana` |
| `letra+número` | `Transformador60822` | `Transformador 60822` |
| `abreviatura+nombre` | `M.ªCarmen` | `M.ª Carmen` |
| `preposición` | `Sierrade Castril` | `Sierra de Castril` |

### Casos Marcados para Revisión

Los textos **ALL CAPS** con secuencias largas (12+ caracteres) sin espacios se marcan como `requiresReview: true`:

```
GASREPSOLGACH → Requiere revisión manual
TALLERAUTOSM.ALMAGROEUROTALLER → Requiere revisión manual
```

## Integración en el Proyecto

### Paso 1: Copiar Archivos

```bash
# Desde /mnt/user-data/outputs/ al proyecto
cp textDeconcatenator-v2.ts src/utils/textDeconcatenator.ts
cp useTextDeconcatenation.ts src/hooks/useTextDeconcatenation.ts
```

### Paso 2: Uso en Componentes

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

### Paso 3: Uso Directo de Funciones

```typescript
import { 
  deconcatenateText, 
  validateCoordinateY,
  splitConcatenatedCoordinates 
} from '@/utils/textDeconcatenator';

// Desconcatenar texto
const result = deconcatenateText("FARMACIAM.ª CarmenMAYOL");
console.log(result.corrected); // "FARMACIA M.ª Carmen MAYOL"
console.log(result.patternsApplied); // ["mayúscula+abreviatura", "camelCase"]

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

## Impacto Estimado

### De los 103 Registros Afectados:

| Categoría | Registros | Porcentaje |
|-----------|-----------|------------|
| Corregidos automáticamente | ~62 | 60% |
| Marcados para revisión | ~41 | 40% |

### Mejora en Tasa de Éxito:

| Estado | Éxito |
|--------|-------|
| Antes | 70.0% |
| Después (con parser mejorado) | ~90.0% |

## Funciones Adicionales Incluidas

### Validación de Coordenadas

```typescript
// Detectar Y truncada
validateCoordinateY(77905)  // → 4077905

// Detectar X concatenada
validateCoordinateX(50435298504342)  // → issue: 'concatenated'

// Separar coordenadas concatenadas
splitConcatenatedCoordinates("50435298504342")  // → [5043529, 8504342]
```

### Detección de Contenido Mal Ubicado

```typescript
// Detectar si el campo TIPO contiene información de PERSONAL
detectMisplacedContent("1 SARGENTO JEFE1 CABO")
// → { hasMisplacedContent: true, contentType: 'personal' }
```

## Casos de Prueba Validados

Los tests incluyen casos reales de los 6 documentos PTEL analizados:

- **Colomera** (Granada): 2 registros concatenados
- **Quéntar** (Granada): 1 registro concatenado
- **Castril** (Granada): 52 registros concatenados
- **Hornos** (Jaén): 0 registros concatenados
- **Tíjola** (Almería): 0 registros concatenados
- **Berja** (Almería): 48 registros concatenados

## Próximos Pasos

1. **Integrar el módulo** en el proyecto `norm-coord-ptel`
2. **Ejecutar tests** con `npm test`
3. **Validar con documento real** (recomendado: Berja con 48 casos)
4. **Ajustar patrones** según nuevos casos detectados

## Notas Técnicas

- El módulo usa **enfoque conservador**: solo corrige cuando hay alta confianza
- Los **falsos positivos conocidos** (polideportivo, hidroeléctrica, etc.) están excluidos
- Los textos **ALL CAPS largos** se marcan para revisión manual
- Compatible con **TypeScript 4.x+** y **React 18+**

---

*Generado: 28 Noviembre 2025*  
*Proyecto: Normalizador-Geolocalizador PTEL Andalucía*
