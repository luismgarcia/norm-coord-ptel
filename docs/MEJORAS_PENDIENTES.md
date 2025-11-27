# MEJORAS PENDIENTES - Sistema de Aprendizaje Adaptativo PTEL

> Documento generado: 2024-11-27
> Versión actual: v3.1.0
> Estado: PENDIENTE DE IMPLEMENTACIÓN

## 1. UI DE CONFIRMACIÓN DE SUGERENCIAS HEURÍSTICAS

### Descripción
Modal interactivo que aparece cuando el sistema detecta un patrón desconocido y sugiere una corrección.

### Componente propuesto: `PatternSuggestionModal.tsx`
```tsx
interface PatternSuggestionModalProps {
  heuristic: HeuristicResult;
  onAccept: () => void;
  onReject: () => void;
  onManualCorrect: (value: number) => void;
}

function PatternSuggestionModal({ heuristic, onAccept, onReject, onManualCorrect }) {
  return (
    <Modal>
      <h3>⚠️ Patrón nuevo detectado</h3>
      <p>{heuristic.hypothesis}</p>
      <code>{heuristic.originalValue} → {heuristic.correctedValue}</code>
      <p>Confianza: {heuristic.confidence}%</p>
      <div className="actions">
        <Button onClick={onAccept}>✅ Aplicar a todo el documento</Button>
        <Button onClick={onManualCorrect}>✏️ Corregir manualmente</Button>
        <Button onClick={onReject}>❌ Ignorar</Button>
      </div>
    </Modal>
  );
}
```

### Flujo de usuario
1. Sistema detecta patrón desconocido
2. Modal aparece con sugerencia
3. Usuario acepta/rechaza/corrige
4. Si acepta → patrón se guarda en localStorage
5. Próxima vez → aplicación automática

---

## 2. DETECCIÓN DE ERRORES TIPOGRÁFICOS

### Problema detectado
En PATRIMONIO_Berja: `4 078 3789´´07` (dígito "3" duplicado)

### Solución propuesta
Añadir fase de detección de anomalías en número de dígitos:
- Y normal: 7 dígitos (4XXXXXX)
- Y con 8 dígitos: probablemente error de tipeo

```typescript
function detectTypoInY(y: number): { hasTypo: boolean; suggestion: number } {
  const yStr = Math.floor(y).toString();
  
  // Y con 8 dígitos → probablemente sobra uno
  if (yStr.length === 8 && yStr.startsWith('4')) {
    // Intentar detectar dígito duplicado
    for (let i = 0; i < yStr.length - 1; i++) {
      if (yStr[i] === yStr[i + 1]) {
        // Quitar dígito duplicado
        const fixed = yStr.slice(0, i) + yStr.slice(i + 1);
        const fixedNum = parseFloat(fixed);
        if (isInRange(fixedNum, 'y')) {
          return { hasTypo: true, suggestion: fixedNum };
        }
      }
    }
  }
  
  return { hasTypo: false, suggestion: y };
}
```

---

## 3. GEOCODIFICACIÓN PARA REGISTROS SIN COORDENADAS

### Registros pendientes (7 total)
| Archivo | Registros | Tipo |
|---------|-----------|------|
| VULNERABLES_Berja | 3 | PLACEHOLDER |
| ELEMENTOS_VUL_Garrucha | 2 | Sin datos |
| INDUSTRIAL_PTEL2025 | 1 | Solo X |
| PATRIMONIO_Berja | 1 | Error tipográfico |

### APIs de geocodificación priorizadas
1. **CartoCiudad** (IGN): `https://www.cartociudad.es/geocoder/api/geocoder/find`
2. **CDAU**: WFS Andalucía
3. **Nominatim OSM**: Fallback

---

## 4. EXPORTACIÓN DE PATRONES ESTABLES

### Funcionalidad
Botón en UI para exportar patrones que cumplan:
- `uses >= 10`
- `successRate >= 95%`

### Formato de exportación
JSON compatible con `patterns.json` para contribuir al repositorio comunitario.

---

## 5. ESTADÍSTICAS EN DASHBOARD

### Métricas a mostrar
- Total patrones locales vs comunitarios
- Top 5 patrones más usados
- Tasa de éxito por tipo de archivo
- Historial de correcciones aplicadas

---

## 6. INTEGRACIÓN CON SISTEMA DE APRENDIZAJE

### Estado actual
- ✅ `learnedPatterns.ts` creado
- ✅ `patterns.json` con 10 patrones comunitarios
- ❌ UI de gestión de patrones
- ❌ Sincronización con localStorage
- ❌ Promoción automática de patrones estables

### Prioridad
ALTA - Es el core del sistema adaptativo

---

## PRIORIZACIÓN

| # | Mejora | Esfuerzo | Impacto | Prioridad |
|---|--------|----------|---------|-----------|
| 1 | UI sugerencias heurísticas | Medio | Alto | 🔴 ALTA |
| 2 | Integración localStorage | Bajo | Alto | 🔴 ALTA |
| 3 | Detección errores tipográficos | Medio | Medio | 🟡 MEDIA |
| 4 | Estadísticas dashboard | Medio | Medio | 🟡 MEDIA |
| 5 | Geocodificación | Alto | Alto | 🟡 MEDIA |
| 6 | Exportación patrones | Bajo | Bajo | 🟢 BAJA |

---

## NOTAS ADICIONALES

### Patrones por provincia (para referencia)
- **Almería**: DOUBLE_TILDE_DECIMAL (97.8% prevalencia)
- **Granada**: SPACE_THOUSANDS (95.7% prevalencia)
- **Jaén**: KM_DECIMAL_X (93.3% prevalencia)

### Casos edge detectados
1. Coordenadas intercambiadas (X↔Y)
2. Y con punto decimal mal posicionado (×10)
3. X en kilómetros (×1000)
4. Formato español inverso (punto miles, coma decimal)
5. Doble punto tipográfico (..)
