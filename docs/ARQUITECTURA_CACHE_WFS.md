# Arquitectura óptima para caché de datos WFS de Andalucía

> **Fecha**: 2 de diciembre de 2025  
> **Versión**: 1.0  
> **Estado**: Planificado (Fase 0-1 pendientes de implementación)

## Resumen ejecutivo

La solución recomendada para la aplicación PTEL (React/TypeScript en GitHub Pages) combina **GitHub Actions para descarga periódica de DERA** + **Service Worker con Workbox para offline** + **MSW para testing determinista**. Esta arquitectura elimina la dependencia de APIs externas en runtime, garantiza tests fiables, y funciona completamente offline—todo con coste cero.

Los servicios WFS de la Junta de Andalucía (DERA) son explícitamente inestables según su propia documentación: *"El servidor podrá ser desconectado sin previo aviso"*. Por tanto, la estrategia de pre-descarga y caché local no es solo conveniente, sino **imprescindible** para una aplicación de emergencias fiable.

---

## Contexto del problema

### Situación actual

| Aspecto | Estado | Problema |
|---------|--------|----------|
| Tests | 711/724 (98.2%) | 13 fallan por APIs no disponibles |
| Datos | APIs en vivo | Fallan si DERA/ISE no responden |
| Cobertura | ~7 municipios probados | Necesitamos 785 |
| Offline | No funciona | Crítico para emergencias |

### Requisitos para sistema de emergencias

1. **Disponibilidad 100%**: Debe funcionar aunque no haya internet
2. **Datos completos**: 785 municipios de Andalucía
3. **Actualización controlada**: Trimestral es suficiente
4. **Tests deterministas**: No depender de APIs externas

---

## DERA: Fuente principal de datos

**DERA (Datos Espaciales de Referencia de Andalucía)** contiene los datos necesarios organizados en 13 grupos temáticos.

### Endpoints WFS clave

| Dato | Endpoint WFS | Capa |
|------|--------------|------|
| **Centros educativos** | `DERA_g12_servicios/wfs` | `12_03_CentroEducativo` |
| **Centros de salud** | `DERA_g12_servicios/wfs` | `12_01_CentroSalud`, `12_02_CentroAtencionEspecializada` |
| **Seguridad** | `DERA_g12_servicios/wfs` | `12_08_Seguridad` |
| **Energía** | `DERA_g10_infra_energetica/wfs` | Líneas eléctricas, subestaciones, plantas solares |
| **785 municipios** | `DERA_g13_limites_administrativos/wfs` | `13_02_Municipio` |

**URL base**: `https://www.ideandalucia.es/services/`

**Alternativa recomendada**: Descargas bulk en GeoPackage/Shapefile desde el [portal de datos abiertos](https://www.juntadeandalucia.es/datosabiertos/portal/dataset/datos-espaciales-de-referencia-andalucia-dera) bajo licencia CC BY 4.0.

---

## Estimación de tamaño

Para ~50,000 features (puntos de infraestructuras), **GeoJSON comprimido con gzip** es óptimo:

| Formato | Sin comprimir | Con gzip | Con brotli |
|---------|---------------|----------|------------|
| **GeoJSON** | 10-15 MB | **2-4 MB** | 1.5-2.5 MB |
| TopoJSON | 8-12 MB | 1.5-2.5 MB | 1.2-2 MB |

**Límites de almacenamiento navegador**:
- IndexedDB: 1+ GB (Chrome/Firefox), 1 GB (Safari)
- Cache API: Comparte cuota con IndexedDB
- Safari iOS: ~50 MB (suficiente para nuestros datos)

**Optimización adicional**: Reducir precisión de coordenadas a 6 decimales (~10cm) puede reducir tamaño 30-40%.

---

## Arquitectura propuesta

```
┌────────────────────────────────────────────────────────────┐
│                    GitHub Actions (cron)                    │
│     Descarga WFS cada trimestre → commit → push            │
└──────────────────────────┬─────────────────────────────────┘
                           │ git push (auto-deploy)
┌──────────────────────────▼─────────────────────────────────┐
│                    GitHub Pages                             │
│         /data/features.json (gzip via CDN)                 │
└──────────────────────────┬─────────────────────────────────┘
                           │ fetch inicial
┌──────────────────────────▼─────────────────────────────────┐
│            React App + Workbox Service Worker              │
│   ├── CacheFirst para /data/*.json                         │
│   ├── Precaching del app shell                             │
│   └── IndexedDB para estado/preferencias                   │
└────────────────────────────────────────────────────────────┘
```

### Estructura de datos en repositorio

```
/public/data/
├── dera/
│   ├── centros-educativos.json    (~3,500 centros)
│   ├── centros-salud.json         (~1,500 centros)
│   ├── seguridad.json             (~800 instalaciones)
│   ├── energia.json               (~2,000 instalaciones)
│   └── municipios.json            (785 municipios + centroides)
└── metadata.json                  (fecha actualización, versión)
```

---

## GitHub Actions: Actualización automática

```yaml
# .github/workflows/update-dera.yml
name: Actualizar datos DERA
on:
  schedule:
    - cron: '0 3 1 */3 *'  # Día 1 de cada trimestre, 3 AM
  workflow_dispatch:        # Trigger manual

jobs:
  fetch-dera:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      
      - name: Instalar dependencias
        run: pip install requests geopandas

      - name: Descargar datos WFS
        run: python scripts/fetch_dera.py
      
      - name: Commit y push
        run: |
          git config user.name 'github-actions[bot]'
          git config user.email 'github-actions[bot]@users.noreply.github.com'
          git add public/data/
          git diff --staged --quiet || git commit -m "chore(data): actualizar DERA $(date +'%Y-%m-%d')"
          git push
```

El script Python debe implementar:
- **Paginación**: DERA soporta `COUNT` y `STARTINDEX` en WFS 2.0.0
- **Reintentos con backoff exponencial**
- **Validación de respuesta** antes de sobrescribir datos válidos

---

## Service Worker con Workbox

```javascript
// workbox-config.js
module.exports = {
  globDirectory: 'build/',
  globPatterns: ['**/*.{js,css,html,svg}'],
  swDest: 'build/sw.js',
  runtimeCaching: [{
    urlPattern: /\/data\/.*\.json$/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'geodata-v2024Q4',
      expiration: { maxAgeSeconds: 7776000 }  // 90 días
    }
  }]
};
```

---

## Testing con MSW

**MSW (Mock Service Worker)** intercepta peticiones a nivel de red para tests deterministas:

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import centrosEducativosFixture from '../__fixtures__/centrosEducativos.json';

export const handlers = [
  http.get('https://www.ideandalucia.es/services/DERA_g12_servicios/wfs', 
    ({ request }) => {
      const url = new URL(request.url);
      const typeName = url.searchParams.get('TYPENAME');
      
      if (typeName === '12_03_CentroEducativo') {
        return HttpResponse.json(centrosEducativosFixture);
      }
      return HttpResponse.json({ features: [] });
    }
  ),
];
```

**Estrategia de fixtures**: Almacenar snapshots reales de respuestas WFS en `__fixtures__/` con subconjuntos pequeños (50-100 features).

---

## Comparativa de alternativas

| Arquitectura | Coste | Complejidad | Offline | Esfuerzo |
|--------------|-------|-------------|---------|----------|
| **GitHub Actions + SW** | $0 | Baja | ✅ Total | 14-19h |
| Cloudflare Workers + KV | $0-5/mes | Media | ⚠️ Parcial | 6-10h |
| AWS Lambda + S3 | $1-3/mes | Alta | ⚠️ Parcial | 12-16h |
| Descarga manual | $0 | Muy baja | ✅ Total | 2-4h |

**Recomendación**: GitHub Actions + Service Worker por coste cero, simplicidad, y offline total.

---

## Plan de implementación

| Fase | Descripción | Horas | Entregable |
|------|-------------|-------|------------|
| **0** | Corregir 13 tests actuales | 2-3h | 724/724 (100%) |
| **1** | Descarga bulk DERA | 4-5h | Datos reales en `/public/data/` |
| **2** | LocalDataService | 5-6h | Geocoding local first |
| **3** | Service Worker Workbox | 3-4h | Offline total |
| **4** | GitHub Actions cron | 3-4h | Actualización automática |
| | **TOTAL** | **17-22h** | Sistema offline completo |

---

## Impacto esperado

| Métrica | Antes | Después |
|---------|-------|---------|
| Tests pasando | 98.2% | **100%** |
| Cobertura municipios | ~7 | **785** |
| Completitud coordenadas | 72% | **95-100%** |
| Fiabilidad offline | 0% | **100%** |
| Calificación app | 8.2/10 | **9.2-9.5/10** |

---

## Referencias

- [DERA - Datos Espaciales de Referencia de Andalucía](https://www.juntadeandalucia.es/institutodeestadisticaycartografia/dega/datos-espaciales-de-referencia-de-andalucia-dera)
- [Portal Datos Abiertos Junta de Andalucía](https://www.juntadeandalucia.es/datosabiertos/portal/dataset/datos-espaciales-de-referencia-andalucia-dera)
- [IDEAndalucía - Servicios WFS](https://www.ideandalucia.es/portal/servicios-ogc/)
- [Workbox - Service Worker Tools](https://developer.chrome.com/docs/workbox/)
- [MSW - Mock Service Worker](https://mswjs.io/)

---

## Historial de cambios

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2024-12-02 | 1.0 | Documento inicial |
