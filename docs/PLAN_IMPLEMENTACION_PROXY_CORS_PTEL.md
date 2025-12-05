# Plan de Implementación: Proxy CORS con Cloudflare Workers

## Sistema PTEL Coordinate Normalizer

> Implementación gradual, secuencial y prudente de proxy CORS para servicios de geocodificación e infraestructuras.

**Versión:** 1.0.0  
**Fecha:** Diciembre 2025  
**Autor:** Documentación técnica PTEL  
**Estado:** ⚠️ **ARCHIVADO - NO NECESARIO**

---

## ⚠️ NOTA IMPORTANTE: PLAN ARCHIVADO

**Fecha de archivo:** 5 de diciembre de 2025

**Razón:** Tras ejecutar la verificación CORS (Fase 0), se confirmó que **todos los servicios críticos y de alta prioridad funcionan correctamente sin proxy**:

| Servicios verificados | Estado |
|-----------------------|--------|
| CartoCiudad (JSONP + REST) | ✅ Sin bloqueo CORS |
| Geolocalizador IDEE | ✅ Sin bloqueo CORS |
| CDAU | ✅ Sin bloqueo CORS |
| Catastro (OVC + WFS) | ✅ Sin bloqueo CORS |
| DERA G12 (Salud + Educación) | ✅ Sin bloqueo CORS |
| DERA G13 (Límites) | ✅ Sin bloqueo CORS |
| WMS PNOA | ✅ Sin bloqueo CORS |

**Decisión:** No implementar Cloudflare Workers. Los servicios se integrarán mediante llamadas `fetch()` directas.

**Uso de este documento:** Mantener archivado como **Plan de Contingencia** por si en el futuro algún servicio cambia su configuración CORS y empieza a bloquear peticiones.

---

## Resumen ejecutivo (referencia)

### Objetivo original

Implementar un proxy CORS mediante Cloudflare Workers para habilitar el acceso desde navegador a servicios españoles de geocodificación que bloquean peticiones cross-origin, **sin afectar a los servicios que ya funcionan correctamente**.

### Mejora estimada (si hubiera sido necesario)

| Escenario | Fases | Mejora calidad geocodificación | Esfuerzo |
|-----------|:-----:|:------------------------------:|:--------:|
| Mínimo | 0-2 | +15-20% | 6-8 h |
| **Recomendado** | **0-3** | **+25-35%** | **8-11 h** |
| Completo | 0-4c | +50-65% | 14-20 h |

### Cronograma estimado (no ejecutado)

```
Fase 0 (Diagnóstico)     ████░░░░░░░░░░░░  1 día    ✅ COMPLETADA
Fase 1 (Infraestructura) ░░░░████░░░░░░░░  1 día    ❌ NO NECESARIA
Fase 2 (Piloto CDAU)     ░░░░░░░░████░░░░  3-5 días ❌ NO NECESARIA
Fase 3 (Catastro)        ░░░░░░░░░░░░████  3-5 días ❌ NO NECESARIA
```

---

## Principios rectores (referencia)

### 2.1. Prudencia máxima

```
"No arreglar lo que no está roto"
```

- Solo intervenir en servicios que **demuestren** fallo CORS
- Mantener rutas directas para servicios funcionales
- Cada cambio debe ser reversible en < 5 minutos

### 2.2. Secuencialidad estricta

```
"Un servicio cada vez, nunca en paralelo"
```

### 2.3. Valor demostrado

```
"Solo implementar si aporta beneficio real"
```

### 2.4. Rollback instantáneo

```
"Siempre poder volver al estado anterior"
```

---

## Resultado de la verificación CORS (Fase 0)

### Servicios verificados exitosamente

| Servicio | Latencia | Estado CORS | Decisión |
|----------|:--------:|:-----------:|----------|
| CartoCiudad JSONP | 225 ms | ✅ OK | Usar directo |
| Geolocalizador IDEE | 189 ms | ✅ OK | Usar directo |
| CDAU WFS | 97 ms | ✅ OK | Usar directo |
| Catastro OVC | 60-213 ms | ✅ OK | Usar directo |
| DERA G12 Salud | 88 ms | ✅ OK | Usar directo |
| DERA G12 Educación | 29 ms | ✅ OK | Usar directo |
| DERA G13 Límites | 104 ms | ✅ OK | Usar directo |
| WMS PNOA | 47 ms | ✅ OK | Usar directo |

### Conclusión

**0 servicios bloqueados por CORS** = No se necesita proxy.

---

## Uso futuro de este documento

### Cuándo reactivar este plan

Este plan debe revisarse si:

1. Un servicio cambia su configuración CORS y empieza a bloquear peticiones
2. Se necesita integrar un nuevo servicio que bloquea CORS
3. Hay cambios en políticas de seguridad de navegadores

### Pasos para reactivar

1. Identificar servicio(s) bloqueado(s)
2. Verificar que el bloqueo es real (no error de red)
3. Seguir las fases documentadas a partir de Fase 1
4. Implementar solo para servicios afectados

---

## Referencias

| Recurso | URL |
|---------|-----|
| Cloudflare Workers | https://developers.cloudflare.com/workers |
| Documentación CDAU | https://www.callejerodeandalucia.es |
| Documentación Catastro | https://www.catastro.meh.es |
| DERA Junta Andalucía | https://www.juntadeandalucia.es/institutodeestadisticaycartografia/DERA |

---

**Documento archivado:** 5 de diciembre de 2025  
**Motivo:** Verificación CORS exitosa - todos los servicios accesibles directamente

*Para el plan completo original (1279 líneas), consultar historial de versiones.*
