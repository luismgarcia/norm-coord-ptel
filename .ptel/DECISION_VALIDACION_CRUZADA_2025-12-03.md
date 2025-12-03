# Decisión: Validación Cruzada Completa Multi-Fuente
## Fecha: 2025-12-03
## Estado: APROBADO por Luis Muñoz

---

## Decisión

**Estrategia elegida**: Validación cruzada COMPLETA (siempre consultar segunda fuente)

## Justificación

Para un sistema de **emergencias** donde un error de ubicación puede costar vidas, 
se prioriza **fiabilidad máxima** sobre velocidad.

## Comparativa de estrategias evaluadas

| Estrategia | Tiempo (42 reg) | Score Confianza | Detección Errores |
|------------|-----------------|-----------------|-------------------|
| Sin validación | 6 min | 70-85% | ~0% |
| Validación si <90% | 7-8 min | 80-90% | ~60% |
| Validación tipologías críticas | 6.5 min | 85-92% | ~40% |
| **Validación completa** ✓ | 12-15 min | **92-98%** | **~95%** |

## Trade-off aceptado

- **Coste**: +6-9 minutos por PTEL típico (42 registros)
- **Beneficio**: Score 92-98% vs 70-85%
- **Comparativa**: Aún 90%+ más rápido que proceso manual (4+ horas)

## Arquitectura aprobada

### Flujo de validación

```
L0: LOCAL_DERA (offline) → Resultado A
         ↓ (SIEMPRE)
L1: WFS DERA (online)    → Resultado B
         ↓
VALIDACIÓN CRUZADA:
  - Calcular distancia A↔B
  - Comparar con umbral por tipología
  - Calcular score compuesto (α=0.40, β=0.35, γ=0.25)
         ↓
SALIDA:
  - Si concordante (<umbral): CONFIRMED + score alto
  - Si discrepante (>umbral): DISCREPANCY_DETECTED + flag revisión manual
```

### Umbrales por tipología

| Tipología | Umbral concordancia | Umbral revisión |
|-----------|---------------------|-----------------|
| Emergencias | ≤25m | >100m |
| Sanitario | ≤25m | >100m |
| Seguridad | ≤25m | >150m |
| Educativo | ≤50m | >200m |
| Administrativo | ≤100m | >300m |

### Fórmula scoring compuesto

```typescript
const α = 0.40;  // Peso mejor score individual
const β = 0.35;  // Peso concordancia entre fuentes
const γ = 0.25;  // Peso autoridad de fuentes

const C_match = Math.max(scoreA, scoreB) / 100;
const C_concordance = distancia < umbralEstricto ? 1.0 : 
                      distancia < umbralAceptable ? 0.7 : 0.3;
const C_source = (pesoA * scoreA + pesoB * scoreB) / 100;

const scoreCompuesto = (α * C_match + β * C_concordance + γ * C_source) * 100;

// Bonus concordancia perfecta (<25m): +5-10%
```

### Manejo de discrepancias

Cuando distancia A↔B > umbral:
1. NO devolver coordenada (evitar propagar error)
2. Status: `DISCREPANCY_DETECTED`
3. Incluir ambos resultados en respuesta
4. Recommendation: `MANUAL_REVIEW_REQUIRED`
5. Score penalizado: 35-45%

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/services/geocoding/GeocodingOrchestrator.ts` | Integrar validación cruzada |
| `src/types/infrastructure.ts` | Nuevo tipo `CrossValidationResult` |
| `src/lib/crossValidation.ts` | NUEVO: funciones validación cruzada |

## Métricas objetivo post-implementación

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Score medio confianza | 75-82% | 92-98% |
| Detección errores | ~0% | ~95% |
| Discrepancias ocultas | 100% | <5% |
| Precisión geográfica | ±8-50m | ±2-10m |

## Próximos pasos

1. [ ] Investigación profunda de técnicas adicionales
2. [ ] Implementar `crossValidation.ts`
3. [ ] Integrar en `GeocodingOrchestrator.ts`
4. [ ] Tests unitarios validación cruzada
5. [ ] Validación empírica con datos Colomera

---

*Documento generado en sesión de diseño arquitectónico*
*Aprobado: Luis Muñoz, Agente GREA*
