# ÍNDICE DE DOCUMENTACIÓN - Geocodificación PTEL
## Actualizado: 3 Diciembre 2025

---

## 📋 DOCUMENTOS PRINCIPALES

### Plan de Implementación (LEER PRIMERO)
| Documento | Descripción | Estado |
|-----------|-------------|--------|
| **[PLAN_IMPLEMENTACION_GEOCODIFICACION_v2.md](PLAN_IMPLEMENTACION_GEOCODIFICACION_v2.md)** | Plan maestro consolidado con fases, checklist y métricas | ✅ ACTUAL |

### Documentación por Fase
| Documento | Descripción | Estado |
|-----------|-------------|--------|
| **[DOCUMENTACION_FASE1_COMPLETA.md](DOCUMENTACION_FASE1_COMPLETA.md)** | Guía técnica completa Fase 1: arquitectura, ejemplos, casos validados, debugging, FAQ | ✅ NUEVO |
| [FASE1_RESUMEN_IMPLEMENTACION.md](FASE1_RESUMEN_IMPLEMENTACION.md) | Resumen ejecutivo de Fase 1 | ✅ ACTUAL |
| [CHECKLIST_IMPLEMENTACION_MULTICAMPO.md](CHECKLIST_IMPLEMENTACION_MULTICAMPO.md) | Progreso detallado por tarea | ✅ ACTUAL |

### Estrategia Técnica
| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [ESTRATEGIA_MULTICAMPO_MULTIFUENTE_2025-12-03.md](ESTRATEGIA_MULTICAMPO_MULTIFUENTE_2025-12-03.md) | Flujo detallado de cómo cada campo se usa en cada nivel de la cascada | ✅ ACTUAL |
| [DECISION_VALIDACION_CRUZADA_2025-12-03.md](DECISION_VALIDACION_CRUZADA_2025-12-03.md) | Decisión arquitectónica de validación cruzada completa | ✅ ACTUAL |

### Análisis y Diagnóstico
| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [DIAGNOSTICO_GEOCODIFICACION_2025-12-03.md](DIAGNOSTICO_GEOCODIFICACION_2025-12-03.md) | Análisis de por qué el score es bajo (~65%) | ✅ ACTUAL |
| [ANALISIS_MEJORAS_GEOCODIFICACION_2025-12-03.md](ANALISIS_MEJORAS_GEOCODIFICACION_2025-12-03.md) | Evaluación de técnicas y algoritmos | ✅ ACTUAL |

### Soluciones Específicas
| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [SOLUCION_CODIGOS_INE.md](SOLUCION_CODIGOS_INE.md) | Desambiguación de municipios homónimos | ✅ Vigente |

---

## 🗺️ MAPA DE DOCUMENTOS

```
                    ┌─────────────────────────────────────┐
                    │  PLAN_IMPLEMENTACION_v2.md          │
                    │  (Plan maestro - LEER PRIMERO)      │
                    └─────────────────┬───────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
            ▼                         ▼                         ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│ ESTRATEGIA_           │ │ DECISION_             │ │ ANALISIS_             │
│ MULTICAMPO_           │ │ VALIDACION_           │ │ MEJORAS_              │
│ MULTIFUENTE           │ │ CRUZADA               │ │ GEOCODIFICACION       │
│                       │ │                       │ │                       │
│ Flujo técnico         │ │ Arquitectura          │ │ Técnicas evaluadas    │
│ detallado             │ │ aprobada              │ │ y comparadas          │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
            │                         │
            └────────────┬────────────┘
                         ▼
            ┌───────────────────────┐
            │ DIAGNOSTICO_          │
            │ GEOCODIFICACION       │
            │                       │
            │ Problema raíz         │
            │ identificado          │
            └───────────────────────┘
```

---

## 📊 RESUMEN EJECUTIVO

### El Problema
- Score actual: ~65%
- Sin detección de errores
- Solo se usa campo NOMBRE para buscar

### La Solución
1. **Multi-Campo:** Explotar TIPO + MUNICIPIO + NOMBRE + DIRECCIÓN
2. **Singletons:** 65% de casos se resuelven con match directo
3. **Validación Cruzada:** Siempre consultar 2+ fuentes
4. **No Propagar Errores:** Si hay discrepancia → revisión manual

### El Objetivo
- Score: 92-98%
- Detección errores: 95%
- Coste: €0

---

## 🔢 ORDEN DE LECTURA RECOMENDADO

1. **PLAN_IMPLEMENTACION_GEOCODIFICACION_v2.md** - Visión general y checklist
2. **DIAGNOSTICO_GEOCODIFICACION_2025-12-03.md** - Entender el problema
3. **ESTRATEGIA_MULTICAMPO_MULTIFUENTE_2025-12-03.md** - Flujo técnico
4. **DECISION_VALIDACION_CRUZADA_2025-12-03.md** - Justificación arquitectónica
5. **ANALISIS_MEJORAS_GEOCODIFICACION_2025-12-03.md** - Técnicas disponibles

---

## 📁 ARCHIVOS DE SESIÓN

| Archivo | Propósito |
|---------|-----------|
| `PTEL_ESTADO_SESION.json` | Estado actual del proyecto |
| `PTEL_FEATURES.json` | Features y su estado |
| `handoff.json` | Contexto para próxima sesión |
| `claude-progress.txt` | Log de progreso |

---

## 🗄️ ARCHIVO HISTÓRICO

Documentos obsoletos o superados están en `archive/`.

---

**Última actualización:** 2025-12-03 por Claude (DataMaster)
