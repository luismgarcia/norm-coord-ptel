# Plan de Trabajo PTEL - Diciembre 2025

## Sistema PTEL Coordinate Normalizer v0.4.x

> Plan de desarrollo incluyendo integración de servicios adicionales (CDAU, Catastro, DERA) mediante llamadas directas sin proxy.

**Fecha:** 5 de diciembre de 2025  
**Versión actual:** 0.4.0  
**Estado:** F023 Fase 2 pendiente, F025 Step 7 completado

---

## Resumen ejecutivo

### Contexto

Tras la verificación CORS del 5/12/2025, se confirmó que **todos los servicios españoles de geocodificación son accesibles directamente** desde el navegador. Esto simplifica significativamente la integración de servicios adicionales.

### Objetivos del plan

1. Completar desarrollo pendiente (F023)
2. Integrar servicios adicionales para mejorar geocodificación
3. Mantener arquitectura browser-only sin backend

### Mejora total esperada

| Fase | Mejora acumulada | Esfuerzo |
|------|:----------------:|:--------:|
| Actual (CartoCiudad + IDEE) | Baseline | — |
| + F023 completado | +10-15% | 8-12 h |
| + CDAU integrado | +25-35% | 3-4 h |
| + Catastro integrado | +35-45% | 2-3 h |
| + DERA completo | +50-65% | 4-6 h |

---

## Estado actual del proyecto

### Features completadas ✅

| Feature | Descripción | Estado |
|---------|-------------|:------:|
| F001-F022 | Core normalización y validación | ✅ |
| F025 Step 7 | Normalización puntuación | ✅ |
| Parsers ODT/CSV/XLSX | Importación documentos | ✅ |
| CartoCiudad | Geocodificación principal | ✅ |
| Geolocalizador IDEE | Geocodificación backup | ✅ |
| WFS DERA parcial | Geocodificadores especializados | ✅ Parcial |
| Validación 8 estrategias | Sistema scoring 0-100 | ✅ |
| Detección municipio | TopoJSON + spatial indexing | ✅ |

### Features en progreso 🔄

| Feature | Descripción | Estado |
|---------|-------------|:------:|
| F023 Fase 2 | Validación cruzada multi-fuente | 🔄 Pendiente |

### Features pendientes ⏳

| Feature | Descripción | Prioridad |
|---------|-------------|:---------:|
| Integración CDAU | Geocodificación precisión ±5m | 🔴 Alta |
| Integración Catastro | Referencias catastrales | 🟡 Media |
| Integración DERA completa | WFS especializados | 🟡 Media |
| Visor cartográfico | Mapa Leaflet corrección manual | 🟡 Media |

---

## Plan de trabajo por fases

### Visión general

```
DICIEMBRE 2025                         ENERO 2026
─────────────────────────────────────────────────────────────►

Semana 1     Semana 2     Semana 3     Semana 4     Semana 5+
─────────    ─────────    ─────────    ─────────    ─────────
F023         CDAU         Catastro     DERA         Visor
Fase 2       Integración  Integración  Completo     Cartográfico

+10-15%      +15-20%      +10-15%      +15-20%      UX mejora
```

---

## Fase 1: Completar F023 (Semana 1)

> **Objetivo:** Finalizar validación cruzada multi-fuente

### Contexto

F023 implementa validación cruzada usando múltiples geocodificadores simultáneamente para detectar discrepancias y aumentar confianza.

### Tareas

| Tarea | Descripción | Esfuerzo | Prioridad |
|-------|-------------|:--------:|:---------:|
| F023.1 | Sistema errores tipados (GeocodingErrors.ts) | 2 h | 🔴 |
| F023.2 | Clustering algoritmo discrepancias | 3 h | 🔴 |
| F023.3 | Lógica recomendación consenso | 2 h | 🔴 |
| F023.4 | Tests unitarios validación cruzada | 2 h | 🔴 |
| F023.5 | Integración en pipeline | 1 h | 🔴 |

### Entregables

- [ ] `GeocodingErrors.ts` con tipos de error
- [ ] `CrossValidator.ts` con lógica de clustering
- [ ] Tests con cobertura >90%
- [ ] Documentación actualizada

### Criterios de éxito

- Detecta discrepancias >50m entre fuentes
- Genera recomendación con nivel de confianza
- Tests pasando

---

## Fase 2: Integración CDAU (Semana 2)

> **Objetivo:** Añadir geocodificación de alta precisión para Andalucía

### Valor añadido

| Aspecto | Sin CDAU | Con CDAU | Mejora |
|---------|----------|----------|:------:|
| Precisión | ±15-25 m | ±1-5 m | **+80%** |
| Polígonos industriales | Parcial | Completo | **+30%** |
| Diseminados rurales | Baja | Alta | **+50%** |

### Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                  GeocodingOrchestrator                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. CartoCiudad (existente)                            │
│     └─ Geocodificación general España                  │
│                                                         │
│  2. CDAU (NUEVO)  ←────────────────────────────────    │
│     └─ Precisión ±5m para Andalucía                    │
│     └─ Endpoint: callejerodeandalucia.es/servicios/    │
│     └─ Sin proxy, fetch directo                        │
│                                                         │
│  3. Geolocalizador IDEE (existente)                    │
│     └─ Backup con CORS nativo                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Tareas

| Tarea | Descripción | Esfuerzo | Prioridad |
|-------|-------------|:--------:|:---------:|
| CDAU.1 | Crear `CDAUGeocoderService.ts` | 2 h | 🔴 |
| CDAU.2 | Implementar normalización direcciones CDAU | 1 h | 🔴 |
| CDAU.3 | Parsear respuesta WFS/JSON | 1 h | 🔴 |
| CDAU.4 | Integrar en cascada geocodificación | 0.5 h | 🔴 |
| CDAU.5 | Tests con direcciones reales Andalucía | 1 h | 🟡 |

### Entregables

- [ ] `CDAUGeocoderService.ts`
- [ ] Integración en `GeocodingOrchestrator.ts`
- [ ] Tests con 20+ direcciones reales
- [ ] Documentación API CDAU

### Criterios de éxito

- Precisión ±5m en direcciones urbanas Andalucía
- Latencia <200ms (verificado en test CORS: 97ms)
- Fallback a CartoCiudad si CDAU no encuentra

---

## Fase 3: Integración Catastro (Semana 3)

> **Objetivo:** Habilitar geocodificación por referencia catastral

### Valor añadido

| Funcionalidad | Sin Catastro | Con Catastro |
|---------------|:------------:|:------------:|
| Geocodificar ref. catastral | ❌ | ✅ |
| Obtener ref. desde coordenadas | ❌ | ✅ |
| Validar parcela | ❌ | ✅ |

### Casos de uso PTEL

```
Documento PTEL menciona:
"Depósito de agua en Parcela 45, Polígono 3, Colomera"

Sin Catastro: ❌ No se puede geolocalizar automáticamente
Con Catastro: ✅ API devuelve coordenadas exactas del centroide
```

### Tareas

| Tarea | Descripción | Esfuerzo | Prioridad |
|-------|-------------|:--------:|:---------:|
| CAT.1 | Crear `CatastroService.ts` | 1.5 h | 🟡 |
| CAT.2 | Implementar ref. catastral → coordenadas | 1 h | 🟡 |
| CAT.3 | Implementar coordenadas → ref. catastral | 0.5 h | 🟡 |
| CAT.4 | Detectar refs. catastrales en texto | 1 h | 🟡 |
| CAT.5 | Tests con parcelas reales | 0.5 h | 🟡 |

### Entregables

- [ ] `CatastroService.ts`
- [ ] Detector de refs. catastrales en texto
- [ ] Integración en pipeline normalización
- [ ] Tests con refs. reales

### Criterios de éxito

- Geocodifica refs. catastrales con precisión centroide parcela
- Latencia <250ms (verificado: 60-213ms)
- Detecta refs. en texto narrativo de documentos

---

## Fase 4: Integración DERA completa (Semana 4)

> **Objetivo:** Completar geocodificadores especializados por tipología

### Servicios DERA a integrar

| Servicio | Tipología | Estado | Latencia verificada |
|----------|-----------|:------:|:-------------------:|
| DERA G12 Salud | Centros sanitarios | ⚠️ Parcial | 88 ms |
| DERA G12 Educación | Centros educativos | ⚠️ Parcial | 29 ms |
| DERA G11 Patrimonio | BICs, yacimientos | ❌ Pendiente | 35 ms |
| DERA G13 Límites | Polígonos municipales | ✅ Hecho | 104 ms |

### Valor añadido por tipología

| Tipología | Sin DERA especializado | Con DERA especializado |
|-----------|:----------------------:|:----------------------:|
| Hospitales | ~90% éxito | ~99% éxito |
| Consultorios rurales | ~50% éxito | **~95% éxito** |
| Colegios rurales | ~60% éxito | **~97% éxito** |
| Patrimonio histórico | ~50% éxito | **~90% éxito** |

### Tareas

| Tarea | Descripción | Esfuerzo | Prioridad |
|-------|-------------|:--------:|:---------:|
| DERA.1 | Completar `WFSHealthGeocoder.ts` | 1.5 h | 🟡 |
| DERA.2 | Completar `WFSEducationGeocoder.ts` | 1.5 h | 🟡 |
| DERA.3 | Crear `WFSHeritageGeocoder.ts` | 1.5 h | 🟢 |
| DERA.4 | Mejorar fuzzy matching por tipología | 1 h | 🟡 |
| DERA.5 | Tests integración por tipología | 1.5 h | 🟡 |

### Entregables

- [ ] Geocodificadores tipológicos completos
- [ ] Router por tipología
- [ ] Tests por categoría
- [ ] Métricas comparativas

### Criterios de éxito

- >95% éxito en centros sanitarios
- >95% éxito en centros educativos
- >85% éxito en patrimonio

---

## Fase 5: Visor cartográfico (Semana 5+)

> **Objetivo:** Interfaz de mapa para corrección manual

### Alcance

| Funcionalidad | Prioridad |
|---------------|:---------:|
| Mapa Leaflet con EPSG:25830 | 🔴 Alta |
| Capa ortofoto PNOA | 🔴 Alta |
| Marcadores por nivel confianza | 🔴 Alta |
| Click para corregir coordenada | 🔴 Alta |
| Clustering para >100 puntos | 🟡 Media |
| Geocodificación inversa al click | 🟡 Media |

### Tareas (estimación)

| Tarea | Esfuerzo |
|-------|:--------:|
| Setup Leaflet + Proj4Leaflet | 2 h |
| Componentes React mapa | 4 h |
| Integración con estado Zustand | 2 h |
| Workflow corrección manual | 3 h |
| Tests y refinamiento | 2 h |
| **Total** | **~13 h** |

---

## Resumen de esfuerzo total

| Fase | Descripción | Esfuerzo | Mejora |
|:----:|-------------|:--------:|:------:|
| 1 | F023 Validación cruzada | 10 h | +10-15% |
| 2 | Integración CDAU | 5.5 h | +15-20% |
| 3 | Integración Catastro | 4.5 h | +10-15% |
| 4 | DERA completo | 7 h | +15-20% |
| 5 | Visor cartográfico | 13 h | UX |
| **Total** | | **40 h** | **+50-70%** |

---

## Calendario propuesto

```
DICIEMBRE 2025
─────────────────────────────────────────────────────────────

Sem 1 (9-13 dic)     Sem 2 (16-20 dic)    Sem 3 (23-27 dic)
────────────────     ────────────────     ────────────────
F023 Fase 2          CDAU                 Catastro
• GeocodingErrors    • CDAUService        • CatastroService
• CrossValidator     • Integración        • Detector refs
• Tests              • Tests              • Tests

ENERO 2026
─────────────────────────────────────────────────────────────

Sem 4 (6-10 ene)     Sem 5 (13-17 ene)    Sem 6+ (20+ ene)
────────────────     ────────────────     ────────────────
DERA Completo        Visor Carto (1/2)    Visor Carto (2/2)
• WFS Health         • Leaflet setup      • Corrección manual
• WFS Education      • Componentes        • Refinamiento
• WFS Heritage       • Ortofoto PNOA      • Documentación
```

---

## Principios de implementación

### Una tarea pequeña por chat

```
✅ CORRECTO:
"Hoy implementamos CDAUGeocoderService.ts"

❌ INCORRECTO:
"Hoy implementamos CDAU, Catastro y DERA completo"
```

### Orden de prioridad

1. **Primero:** Lo que ya está empezado (F023)
2. **Segundo:** Lo de mayor impacto (CDAU +15-20%)
3. **Tercero:** Funcionalidad nueva (Catastro)
4. **Cuarto:** Completar lo parcial (DERA)
5. **Quinto:** UX/UI (Visor)

### Validación empírica

Cada integración se valida con:
- Datos reales de municipios (Colomera, Berja, etc.)
- Métricas antes/después
- Tests automatizados

---

## Checklist de arranque

### Antes de empezar Fase 1

- [ ] Revisar estado actual de F023
- [ ] Leer `.ptel/PTEL_FEATURES.json`
- [ ] Verificar tests actuales pasando
- [ ] Confirmar prioridad con Luis

### Inicio de cada sesión

- [ ] Leer `.ptel/PTEL_ESTADO_SESION.json`
- [ ] Activar rol apropiado (DataMaster/MapWizard)
- [ ] Confirmar tarea específica del día
- [ ] Al terminar: actualizar estado y commit

---

## Notas finales

### Resultado verificación CORS (5/12/2025)

Todos los servicios accesibles sin proxy:

| Servicio | Latencia | Estado |
|----------|:--------:|:------:|
| CartoCiudad | 225 ms | ✅ |
| CDAU | 97 ms | ✅ |
| Catastro | 60-213 ms | ✅ |
| DERA G12 | 29-88 ms | ✅ |
| DERA G11 | 35 ms | ✅ |
| WMS PNOA | 47 ms | ✅ |

### Plan proxy archivado

El plan de Cloudflare Workers queda archivado como contingencia. No es necesario implementarlo dado que todos los servicios funcionan directamente.

---

**Documento creado:** 5 de diciembre de 2025  
**Próxima revisión:** Al completar Fase 1
