# 🚀 PROMPT DE INICIO: Mejoras Pipeline Normalización PTEL

**Fecha**: 2025-12-02
**Proyecto**: norm-coord-ptel (Normalizador de Coordenadas PTEL Andalucía)
**Repositorio**: https://github.com/luismgarcia/norm-coord-ptel
**App desplegada**: https://luismgarcia.github.io/norm-coord-ptel/
**Versión actual**: 0.4.7

---

## 🎭 ROL DE SESIÓN

**Activar rol**: **MapWizard** (React/TypeScript/APIs)

Este rol es el adecuado porque las tareas implican:
- Refactorizar `coordinateNormalizer.ts`
- Crear nuevo módulo `documentProfiler.ts`
- Integrar transformaciones proj4.js (ED50 → ETRS89)
- Modificar pipeline de procesamiento
- Tests unitarios con Vitest

**Cambios de rol durante sesión**:
- Si deriva hacia UI/UX → cambiar a **DesignCraft**
- Si deriva hacia validación geodésica/rangos → cambiar a **DataMaster**

---

## 📋 CONTEXTO DEL PROYECTO

Sistema de normalización de coordenadas para Planes Territoriales de Emergencias Locales (PTEL) de los 786 municipios de Andalucía, cumpliendo el Decreto 197/2024.

**Problema que resuelve**: Los documentos municipales contienen coordenadas en formatos caóticos (coma decimal europea, punto como separador de miles, doble tilde `´´`, espacios, mojibake UTF-8, etc.) que deben normalizarse a EPSG:25830 (UTM 30N ETRS89) para QGIS.

**Stack técnico**: React + TypeScript + Vite, browser-only, GitHub Pages, proj4.js para transformaciones.

---

## ✅ ESTADO ACTUAL VALIDADO

| Métrica | Valor |
|---------|-------|
| Normalizador | v2.4 con 26 patrones |
| Tests unitarios | 59 pasados |
| Tests validación real | 24 pasados (6 municipios) |
| **Total tests** | **83/83 (100%)** |
| Cobertura formatos reales | 100% de documentos probados |

### Municipios validados con datos reales:
- **Berja** (DOCX): Patrón espacio + doble tilde (`506 982´´47`)
- **Hornos** (ODT): Patrón punto miles (`4.230.105`)
- **Colomera** (ODT): Patrón coma decimal (`437686,3`)
- **Castril** (ODT): Patrón limpio (`523732.11`)
- **Quéntar** (ODT): Formato mixto coma + punto
- **Tíjola** (ODT): Formato mixto punto + coma

---

## 🎯 TRES ÁREAS DE MEJORA IDENTIFICADAS

### 1️⃣ PATRONES ADICIONALES (4-6 nuevos)

La documentación identifica 52 patrones teóricos vs 26 implementados. Análisis de GAP:

| # | Patrón | Ejemplo | Prioridad | Tiempo | Impacto si falta |
|---|--------|---------|-----------|--------|------------------|
| 1 | **Y truncada** | `077905` → `4077905` | 🔴 P0 | 1h | Error 4.000 km |
| 2 | **Coordenadas pegadas** | `4077905504750` | 🔴 P0 | 1-2h | Fallo total parsing |
| 3 | **ED50 → ETRS89** | Transformación datum | 🔴 P0 | 2-3h | Error ~230m (docs pre-2007) |
| 4 | **Referencia catastral** | `1234567VK1234N` | 🟠 P1 | 3-4h | No geocodifica sin coords |
| 5 | **X↔Y intercambiados** | Detectar swap columnas | 🟡 P2 | 1-2h | Ubicación incorrecta |
| 6 | **Placeholders** | `99999`, `0`, `"Pendiente"` | 🟡 P2 | 1h | Procesa basura |

**Opciones**:
- **Mínimo**: Solo #1, #2, #3 (4-6h) → 97% cobertura
- **Recomendado**: #1 a #5 (8-12h) → 99% cobertura  
- **Completo**: Todos (10-14h) → 99.5% cobertura

---

### 2️⃣ LECTURA DE VARIAS VUELTAS (Multi-Pasada)

**Problema actual**: Procesamiento lineal causa "sorpresas" (mojibake, ambigüedades no resueltas).

**Solución propuesta**: Sistema de múltiples pasadas.

| Pasada | Propósito | Qué detecta/hace |
|--------|-----------|------------------|
| **1ª Reconocimiento** | Entender documento | Encoding, estructura, patrones, formato predominante |
| **2ª Normalización** | Procesar con contexto | Aplica reglas según perfil, resuelve ambigüedades |
| **3ª Validación** | Verificar coherencia | Outliers, clustering geográfico, cross-check APIs |

**Opciones**:
- **Actual**: 1 pasada (0h adicionales) → Rápido pero con sorpresas
- **Básico**: 2 pasadas (6-8h) → Elimina sorpresas encoding/ambigüedades
- **Completo**: 3 pasadas (10-14h) → Máxima confianza, detecta outliers

---

### 3️⃣ ARQUITECTURA DEL PIPELINE

| Opción | Descripción | Qué incluye | Tiempo |
|--------|-------------|-------------|--------|
| **A: Parche** | Añadir patrones al código actual | Solo patrones nuevos | 2-4h |
| **B: Inteligente** | Refactorizar con sistema 2 pasadas | Patrones + Perfilado + Contexto | 8-12h |
| **C: Adaptativo** | Sistema completo con aprendizaje | Todo B + IndexedDB + UI feedback + Reportes | 20-30h |

---

## 📊 MATRIZ DE COMBINACIONES

| Combinación | Patrones | Pasadas | Arquitectura | Tiempo | Resultado |
|-------------|----------|---------|--------------|--------|-----------|
| **Mínima** | 3 críticos | 1 | A (Parche) | 4-6h | Funciona, con riesgos |
| **Equilibrada** | 5 patrones | 2 | B (Inteligente) | 12-16h | Robusta, sin sorpresas |
| **Completa** | 6 patrones | 3 | C (Adaptativo) | 25-35h | Óptima para 786 municipios |

---

## 🔧 RECOMENDACIÓN TÉCNICA

**Combinación Equilibrada en 2 fases**:

```
FASE 1 - INMEDIATA (12-16h):
├── Patrones: #1 Y truncada, #2 Pegadas, #3 ED50, #5 Swap X↔Y
├── Pasadas: 2 (Reconocimiento + Normalización)
├── Arquitectura: B (Pipeline Inteligente)
└── Entregable: documentProfiler.ts + normalizer refactorizado

FASE 2 - ESCALADO (cuando >50 municipios):
├── Patrones: #4 Catastral, #6 Placeholders
├── Pasadas: 3 (+ Validación cruzada)
├── Arquitectura: C (+ Aprendizaje IndexedDB)
└── Entregable: Sistema adaptativo completo
```

---

## ❓ DECISIONES PENDIENTES

Por favor, indica tu elección para cada área:

### 1. Patrones adicionales:
- [ ] Mínimo (3 patrones críticos)
- [ ] Recomendado (5 patrones)
- [ ] Completo (6 patrones)

### 2. Sistema de pasadas:
- [ ] Mantener actual (1 pasada)
- [ ] Básico (2 pasadas)
- [ ] Completo (3 pasadas)

### 3. Arquitectura:
- [ ] A: Parche rápido
- [ ] B: Pipeline inteligente
- [ ] C: Sistema adaptativo

### O confirmar combinación:
- [ ] **Combinación Equilibrada** (5 patrones + 2 pasadas + Arquitectura B)

---

## 📁 ARCHIVOS CLAVE DEL PROYECTO

```
norm-coord-ptel/
├── src/lib/
│   ├── coordinateNormalizer.ts    # Normalizador v2.4 (26 patrones)
│   ├── coordinateValidator.ts     # Validación 8 estrategias
│   └── proj4Config.ts             # Transformaciones CRS
├── src/components/
│   └── CoordinateNormalizer.tsx   # Componente principal UI
├── .ptel/
│   ├── PTEL_ESTADO_SESION.json    # Estado actual proyecto
│   └── PTEL_FEATURES.json         # Features implementadas
└── tests/
    └── coordinateNormalizer.test.ts # 59 tests unitarios
```

---

## 🏁 INICIO DE SESIÓN

**Primera acción**: 
1. Leer `.ptel/PTEL_ESTADO_SESION.json` y `.ptel/PTEL_FEATURES.json`
2. Confirmar rol **MapWizard** activado
3. Esperar decisión del usuario sobre las 3 áreas

---

*Generado: 2025-12-02 | Sesión anterior: Validación exhaustiva 6 municipios PTEL*
