# Índice de Documentación de Geocodificación PTEL

> **Fecha**: 3 Diciembre 2025
> **Propósito**: Consolidar todos los análisis y recursos de geocodificación del proyecto

---

## Documentos de Diagnóstico y Análisis

### 1. DIAGNOSTICO_GEOCODIFICACION_2025-12-03.md
**Ubicación**: `.ptel/`
**Contenido**: 
- Análisis de tasa de éxito actual (~48-61% vs 90% esperado)
- Identificación de causa raíz: estrategia de búsqueda subóptima
- 38 infraestructuras fallidas analizadas
- Hallazgo clave: 65% de municipios tienen UN SOLO centro de salud

### 2. ANALISIS_MEJORAS_GEOCODIFICACION_2025-12-03.md (NUEVO)
**Ubicación**: `.ptel/`
**Contenido**:
- Plan de implementación 3 niveles
- Código propuesto para `geocodeByTypeAndMunicipio()`
- Estimación de impacto: +40-50% mejora total

---

## Documentación Técnica de Geocodificadores

### 3. GEOCODIFICADORES_ESPECIALIZADOS.md
**Ubicación**: `docs/`
**Contenido**:
- Arquitectura de cascada L0-L5 completa
- 10 geocodificadores especializados documentados
- Sistema de scoring 0-100 puntos
- Sistema de caché multinivel

### 4. PLAN_IMPLEMENTACION_GEOCODIFICADORES.md
**Ubicación**: `docs/` y raíz
**Contenido**:
- 12 recursos pendientes de implementación
- Priorización por ROI
- Código de ejemplo para CartoCiudad, CDAU, REDIAM, AAE
- Estimación de horas: 31-43h total

### 5. GUIA_GEOCODIFICACION_SIN_DIRECCION_POSTAL.md
**Ubicación**: `docs/`
**Contenido**:
- Cascada de 10 niveles (L0-L9) para infraestructuras rurales
- Recursos específicos: NGA, IAID, OpenRTA, Catastro INSPIRE
- Ejemplos de queries Overpass
- Matriz recursos por tipología

### 6. RECURSOS_API_GEOCODIFICACION.md
**Ubicación**: `docs/`
**Contenido**:
- 50+ APIs y servicios WFS documentados
- Mapeo tipología PTEL → servicio
- Endpoints específicos por cada fuente
- Licencias y consideraciones CORS

---

## Documentación de Soluciones a Problemas

### 7. SOLUCION_CODIGOS_INE.md
**Ubicación**: `.ptel/`
**Contenido**:
- Solución a problema de códigos INE incorrectos
- Fuente única de verdad: `codigosINEDerivados.ts`
- Tests de integridad referencial

### 8. LECCIONES_APRENDIDAS.md
**Ubicación**: `.ptel/`
**Contenido**:
- L1: Validación contra fuente autoritativa
- L2: Preservar estructura semántica al normalizar
- L5: Tests de integridad referencial
- Checklist para nuevos municipios

---

## Relación Entre Documentos

```
┌─────────────────────────────────────────────────────────────────┐
│                    DIAGNÓSTICO (Problema)                       │
│              DIAGNOSTICO_GEOCODIFICACION_2025-12-03             │
│                                                                 │
│   "La tasa es ~50% porque no aprovechamos que 65% de           │
│    municipios tienen 1 solo centro de salud"                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ANÁLISIS (Solución Propuesta)                │
│              ANALISIS_MEJORAS_GEOCODIFICACION_2025-12-03        │
│                                                                 │
│   NIVEL 1: geocodeByTypeAndMunicipio() (+25-30%)               │
│   NIVEL 2: AddressCleaner (+10-15%)                            │
│   NIVEL 3: Clasificador robusto (+5%)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTACIÓN (Referencia)                  │
│               PLAN_IMPLEMENTACION_GEOCODIFICADORES              │
│               GEOCODIFICADORES_ESPECIALIZADOS                   │
│               RECURSOS_API_GEOCODIFICACION                      │
│               GUIA_GEOCODIFICACION_SIN_DIRECCION                │
│                                                                 │
│   Endpoints, código de ejemplo, arquitectura detallada         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LECCIONES (Prevención)                       │
│               LECCIONES_APRENDIDAS                              │
│               SOLUCION_CODIGOS_INE                              │
│                                                                 │
│   Errores comunes, validación, tests integridad                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hallazgo Clave Confirmado

El análisis de hoy confirma un patrón documentado previamente:

| Documento | Hallazgo | Implicación |
|-----------|----------|-------------|
| `DIAGNOSTICO_GEOCODIFICACION` | 65% municipios = 1 centro salud | Match directo sin fuzzy |
| `GEOCODIFICADORES_ESPECIALIZADOS` | Cascada L0-L5 ya diseñada | Solo falta implementar "UNIQUE_IN_MUNICIPIO" |
| `GUIA_SIN_DIRECCION_POSTAL` | NGA tiene 232,000 topónimos | Fallback para rural |
| `PLAN_IMPLEMENTACION` | CartoCiudad + CDAU prioritarios | Ya documentados con código |

---

## Próxima Acción Recomendada

Implementar la función `geocodeByTypeAndMunicipio()` en `LocalDataService.ts`:

```typescript
// Pseudocódigo ya documentado
if (counts[tipo] === 1) {
  return features[0]; // Sin matching - único en municipio
}
```

Esta mejora está soportada por:
1. ✅ Datos DERA ya descargados (F021 completada)
2. ✅ `getFeatureCountByMunicipio()` ya implementado
3. ✅ Arquitectura LocalDataService ya funcional
4. ✅ Tests unitarios existentes (22 tests)

**Tiempo estimado**: 2-3 horas
**Impacto esperado**: +25-30% tasa geocodificación

---

*Índice generado: 2025-12-03*
*Sesión: Investigación geocodificación*
