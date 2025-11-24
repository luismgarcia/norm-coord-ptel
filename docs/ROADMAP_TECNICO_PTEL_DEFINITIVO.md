# ROADMAP TÉCNICO DEFINITIVO: SISTEMA PTEL ANDALUCÍA
## Normalización, Geocodificación y Validación de Infraestructuras Críticas

**Versión**: 2.0 CONSOLIDADA  
**Fecha**: 20 noviembre 2025  
**Autor**: Luis - Técnico Municipal Granada  
**Ámbito**: 786 municipios andaluces  
**Objetivo**: 95-100% precisión geográfica, coste operacional €0-50/año

---

## RESUMEN EJECUTIVO

### Decisión Estratégica Fundamental

Tras análisis exhaustivo de tres arquitecturas posibles, se ha seleccionado la **Arquitectura Browser-First + APIs Gratuitas en Cascada** como solución óptima:

**Justificación económica**:
- Coste año 1: €0-144 vs €1,800-3,600 (otras arquitecturas)
- Coste 5 años: €0-720 vs €9,000-36,000
- Margen escalabilidad: 360x crecimiento sin coste adicional

**Justificación técnica**:
- Tiempo setup: 2-4 semanas vs 6-8 semanas
- Complejidad: Media vs Alta
- Mantenimiento: Mínimo vs Alto
- Precisión: Excelente (±5m) vs Excelente (±2m)

### Situación Actual (Noviembre 2025)

**Logros conseguidos**:
- ✅ Aplicación React/TypeScript en GitHub Pages
- ✅ Sistema validación 8 estrategias operativo
- ✅ Scoring 0-100 puntos funcional
- ✅ Normalización UTF-8 con 52 patrones (v2.0)
- ✅ AWS Lambda + Docker validado (pyproj)
- ✅ Soporte múltiples formatos (CSV, XLSX, ODT, GeoJSON, KML)
- ✅ Geocodificadores WFS especializados (4 tipologías)

**Métricas actuales**:
| Métrica | Valor |
|---------|-------|
| Completitud coordenadas | 26.9% |
| Éxito geocodificación | 72% |
| Precisión scoring | 80-85% |
| Consultas/mes estimadas | 2,500-5,000 |

### Objetivos 8 Semanas

| Métrica | Actual | Objetivo | Mejora |
|---------|--------|----------|--------|
| Completitud | 26.9% | 72-75% | +168-179% |
| Éxito geocodif. | 72% | 95%+ | +30%+ |
| Precisión | 80% | 95% | +15-31% |
| Auto-corrección | 30% | 50%+ | +66% |
| Coste mensual | €0 | €0-12 | Control |

---

## ARQUITECTURA DEFINITIVA

### Diagrama Arquitectónico

```
┌─────────────────────────────────────────────────────────────────┐
│              CAPA PRESENTACIÓN (€0/año)                         │
│  React/TypeScript + GitHub Pages                                │
│  - Wizard 3 pasos + UI shadcn/ui                               │
│  - Validación local (8 estrategias)                            │
│  - Caché localStorage/IndexedDB                                │
│  - Transformaciones proj4js                                    │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│         CAPA GEOCODIFICACIÓN CASCADA (€0-12/año)               │
│                                                                 │
│  1️⃣ TIPOLOGÍA ESPECIALIZADA (implementado)                     │
│     ├─ SANITARIO → WFS SICESS/SAS (1,500 centros)             │
│     ├─ EDUCATIVO → Min. Educación (3,800 centros)             │
│     ├─ POLICIAL → ISE + Interior (800 unidades)               │
│     ├─ CULTURAL → IAPH (7,000+ patrimonio)                    │
│     └─ RELIGIOSO → Pluralismo (1,298 centros)                 │
│     ✅ Éxito actual: 72%                                       │
│                                                                 │
│  2️⃣ CARTOCIUDAD (IGN) - Primario                              │
│     Límite: ILIMITADO | Precisión: ±5-10m                     │
│                                                                 │
│  3️⃣ CDAU (Andalucía) - Regional                               │
│     Límite: ILIMITADO | Precisión: ±2-5m                      │
│                                                                 │
│  4️⃣ NOMINATIM (OSM) - Backup                                  │
│     Límite: 1 req/seg | Community service                     │
│                                                                 │
│  5️⃣ VISOR MANUAL (Leaflet)                                    │
│     Para score <60 (estimado 5-10%)                           │
└─────────────────────────────────────────────────────────────────┘
```

### Stack Tecnológico

**Frontend**:
```json
{
  "react": "^18.3.1",
  "typescript": "^5.6",
  "vite": "^5.4",
  "proj4": "^2.11.0",
  "leaflet": "^1.9.4 (pendiente)",
  "fuse.js": "^7.0.0",
  "zustand": "^4.4.7"
}
```

**UI/UX**:
```json
{
  "shadcn/ui": "components",
  "tailwindcss": "^3.4",
  "framer-motion": "animations",
  "@phosphor-icons/react": "icons",
  "sonner": "toasts"
}
```

---

## PLAN DE IMPLEMENTACIÓN

### Cronograma Visual

```
┌────────┬───────────────────────┬───────────────────────────┐
│ Semana │ Fase                  │ Entregables Clave         │
├────────┼───────────────────────┼───────────────────────────┤
│   1    │ ✅ Tipología Sanit.   │ Clasificador + WFS Salud  │
│   2    │ ✅ Tipología Resto    │ 4 geocodificadores WFS    │
│   3    │ 🔄 Caché              │ LocalStorage + IndexedDB  │
│   4    │ ⏳ Cascada Fallbacks  │ 5 APIs + Orchestrador     │
│   5    │ ⏳ Visor Mapas        │ Leaflet + capas españolas │
│   6    │ ⏳ Geocodif. Manual   │ Flujo completo manual     │
│   7    │ ⏳ Monitoreo          │ Tracking + Alertas        │
│   8    │ ⏳ Testing & Deploy   │ Producción GitHub Pages   │
└────────┴───────────────────────┴───────────────────────────┘

🔴 Fase 1-2: COMPLETADA (mayor impacto +35-45%)
🟡 Fase 3-6: EN PROGRESO (completitud 95%+)
🟢 Fase 7-8: PENDIENTE (operacional)
```

---

## FASE 1-2: GEOCODIFICACIÓN TIPOLÓGICA ✅ COMPLETADA

### Clasificador de Infraestructuras

```typescript
// src/services/classification/InfrastructureClassifier.ts
export enum InfrastructureType {
  SANITARIO = 'SANITARIO',     // 🏥
  EDUCATIVO = 'EDUCATIVO',     // 🎓
  CULTURAL = 'CULTURAL',       // 🏛️
  POLICIAL = 'POLICIAL',       // 🚔
  BOMBEROS = 'BOMBEROS',       // 🚒
  EMERGENCIAS = 'EMERGENCIAS', // 🚑
  RELIGIOSO = 'RELIGIOSO',     // ⛪
  DEPORTIVO = 'DEPORTIVO',     // 🏟️
  MUNICIPAL = 'MUNICIPAL',     // 🏛️
  SOCIAL = 'SOCIAL',           // 🤝
  COMBUSTIBLE = 'COMBUSTIBLE', // ⛽
  GENERICO = 'GENERICO'        // 📍
}
```

### Geocodificadores WFS Implementados

| Geocodificador | Fuente | Cobertura | Precisión |
|----------------|--------|-----------|-----------|
| WFSHealthGeocoder | SICESS/SAS | 1,500 centros | ±2-5m |
| WFSEducationGeocoder | Consejería Educación | 3,800 centros | ±5-10m |
| WFSCulturalGeocoder | IAPH | 7,000+ sitios | ±5-15m |
| WFSSecurityGeocoder | ISE | 800 instalaciones | ±5-10m |

### Orquestador de Geocodificación

```typescript
// src/services/geocoding/GeocodingOrchestrator.ts
export class GeocodingOrchestrator {
  async geocode(request: GeocodingRequest): Promise<GeocodingResponse> {
    // 1. Clasificar infraestructura
    const classification = this.classifier.classify(request.name);
    
    // 2. Seleccionar geocodificador especializado
    const geocoder = this.getGeocoder(classification.type);
    
    // 3. Intentar geocodificación tipológica
    const result = await geocoder.geocode(request);
    
    // 4. Fallback a CartoCiudad/CDAU si necesario
    if (!result.success) {
      return this.fallbackGeocode(request);
    }
    
    return result;
  }
}
```

---

## FASE 3-4: CACHÉ Y CASCADA (En Progreso)

### Sistema de Caché Multinivel

```typescript
// Arquitectura de caché propuesta
interface CacheConfig {
  localStorage: {
    maxSize: '10MB',
    ttl: '7 días',
    scope: 'session'
  },
  indexedDB: {
    maxSize: '100MB',
    ttl: '90 días',
    scope: 'persistent'
  }
}
```

### Cascada de Fallbacks

```
1. Caché local (hit rate esperado: 70-85%)
   ↓ miss
2. Geocodificador tipológico (éxito: 72%)
   ↓ fallo
3. CartoCiudad (éxito: 55-65%)
   ↓ fallo
4. CDAU (éxito: 45-55%)
   ↓ fallo
5. Nominatim (éxito: 30-40%)
   ↓ fallo
6. Visor manual (100% con intervención)
```

---

## FASE 5-6: VISOR CARTOGRÁFICO (Pendiente)

### Capas Base Propuestas

| Capa | Proveedor | Uso |
|------|-----------|-----|
| OSM | OpenStreetMap | Base general |
| PNOA | IGN España | Ortofoto |
| Catastro | Catastro | Parcelas |
| CartoCiudad | IGN | Direcciones |

### Flujo Corrección Manual

```
1. Usuario selecciona coordenada con score <60
2. Mapa centrado en municipio
3. Búsqueda CartoCiudad integrada
4. Drag-and-drop del marker
5. Snapping a edificios cercanos
6. Guardar corrección
7. Actualizar score a 100 (CONFIRMED)
```

---

## MÉTRICAS Y MONITORIZACIÓN

### KPIs Principales

| Métrica | Fórmula | Objetivo |
|---------|---------|----------|
| Tasa éxito | coords_válidas / total | ≥95% |
| Score promedio | Σscores / n | ≥80 |
| Cache hit rate | hits / (hits + misses) | ≥70% |
| Latencia P95 | percentil_95(tiempos) | <2s |

### Alertas Propuestas

- ⚠️ Score promedio <70 en batch
- ⚠️ Cache hit rate <50%
- ⚠️ API timeout >5s
- 🔴 Error rate >10%

---

## ANÁLISIS DE COSTES

### Proyección 12 Meses

| Componente | Coste Mensual | Coste Anual |
|------------|---------------|-------------|
| GitHub Pages | €0 | €0 |
| APIs gratuitas | €0 | €0 |
| Dominio (opcional) | €1 | €12 |
| **TOTAL** | €0-1 | €0-12 |

### Comparativa vs Alternativas

| Arquitectura | Coste Año 1 | Coste 5 Años |
|--------------|-------------|--------------|
| Browser-First (elegida) | €0-144 | €0-720 |
| AWS Serverless | €1,800-3,600 | €9,000-18,000 |
| Backend dedicado | €3,600-7,200 | €18,000-36,000 |

---

## RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| API rate limits | Media | Alto | Caché agresivo + backoffs |
| Cambio APIs oficiales | Baja | Alto | Abstracción + múltiples fuentes |
| Datos corruptos entrada | Alta | Medio | Validación 8 estrategias |
| Browser compatibility | Baja | Medio | Polyfills + testing |

---

## CONCLUSIÓN

La arquitectura Browser-First + APIs Gratuitas en Cascada ofrece:

1. **Coste óptimo**: €0-12/año vs €1,800+/año alternativas
2. **Simplicidad**: Mantenible por 1 técnico
3. **Escalabilidad**: 360x margen sin coste adicional
4. **Precisión**: ±5-10m con geocodificación tipológica
5. **Resiliencia**: 6 niveles de fallback

**Estado actual**: Fase 1-2 completadas con 72% éxito geocodificación.  
**Próximo hito**: Fase 3-4 (caché + cascada) para alcanzar 95%+.

---

**Última actualización**: 24 Noviembre 2025  
**Versión**: 2.1  
**Estado**: EN EJECUCIÓN
