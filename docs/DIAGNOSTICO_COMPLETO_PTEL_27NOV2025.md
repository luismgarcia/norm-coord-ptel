# 🔬 DIAGNÓSTICO COMPLETO DEL SISTEMA PTEL

**Fecha:** 27 de noviembre de 2025  
**Versión analizada:** v2.0  
**Documentos analizados:** Hornos, Colomera, Castril, Tíjola, Quéntar, Berja

---

## 📋 RESUMEN EJECUTIVO

### Hallazgos Principales

| Componente | Estado | Problema |
|------------|--------|----------|
| **coordinateNormalizer.ts** | ✅ Funcional | v4.2 completo, 52+ patrones implementados |
| **GeocodingOrchestrator.ts** | ✅ Funcional | Cascada 7 niveles implementada |
| **documentExtractor.ts** | ⚠️ CRÍTICO | Patrones de columnas demasiado restrictivos |
| **useGeocoding.ts** | ✅ Funcional | Hook React correctamente integrado |
| **Step2.tsx** | ⚠️ MODERADO | Conexión correcta pero depende de extractor |
| **Flujo completo** | ⚠️ BRECHA | El extractor no captura todas las infraestructuras |

### Diagnóstico: Cuello de botella en la EXTRACCIÓN

El problema NO está en la normalización ni en la geocodificación, sino en la **extracción inicial de datos del documento**. El `documentExtractor.ts` está filtrando elementos que deberían pasar a la cascada de geocodificación.

---

## 🔍 ANÁLISIS DETALLADO

### 1. Análisis de Hornos (Caso Problemático)

**Por qué no se extraen:**

1. **Patrón de columna X no coincide:**
   - Columna real: `"X - Longitud"`
   - Patrón actual: `/^(x|x[-_\s]*(utm|coord)?|longitud|...)$/i`
   - El patrón usa `^...$` que requiere MATCH EXACTO → FALLA

2. **Patrón de columna Y no coincide:**
   - Columna real: `"y- Latitud"`
   - Hay un guión pegado `y-` sin espacio → FALLA

### 2. Comparativa de Documentos

| Documento | Tablas | Infraest. Detectables | Detectadas por Sistema | GAP |
|-----------|--------|----------------------|------------------------|-----|
| **Hornos** | 62 | ~25-30 | ~5 | **-80%** |
| **Colomera** | 61 | ~50 | ~42 | -16% |
| **Castril** | 65 | ~60 | ~55 | -8% |
| **Tíjola** | 67 | ~45 | ~40 | -11% |
| **Quéntar** | 62 | ~20 | ~15 | -25% |

---

## 🐛 BUGS IDENTIFICADOS

### BUG #1 (CRÍTICO): Patrones de columnas demasiado restrictivos

**Ubicación:** `documentExtractor.ts`, línea 35-40

**Corrección propuesta:**
```javascript
const COLUMN_PATTERNS = {
  coordX: /\b(x|longitud|este|easting)\b/i,  // Sin anclas
  coordY: /\b(y|latitud|norte|northing)\b/i,
  coordCombined: /coordenadas?\s*(\(?\s*utm\s*\)?)?/i,
};
```

### BUG #2 (CRÍTICO): No hay fallback por contenido

**Problema actual:**
Si los headers no coinciden con los patrones, el sistema abandona la tabla.

### BUG #3 (MODERADO): Filtrado excesivo de filas

**Problema:**
Si `nameColIdx` no se detectó bien, filtra filas válidas por error.

---

## ✅ PLAN DE CORRECCIÓN

### Prioridad 1: Arreglar patrones de columnas (30 min)
### Prioridad 2: Añadir detección por contenido (1 hora)
### Prioridad 3: Reducir umbral de confianza (15 min)
### Prioridad 4: Añadir tests automatizados (2 horas)

---

## 📈 MÉTRICAS DE ÉXITO POST-CORRECCIÓN

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Infraestructuras extraídas (Hornos) | ~5 | **≥25** |
| Tasa detección columnas coords | ~60% | **≥95%** |
| Cobertura geocodificación total | ~55% | **≥80%** |

---

**Autor:** Claude (Diagnóstico automático)  
**Revisión requerida:** Luis García (Técnico Municipal)  
**Siguiente revisión programada:** Post-corrección FIX #1