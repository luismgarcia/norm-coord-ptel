# Sistema de Mocks para Tests PTEL

## Propósito

Este sistema permite ejecutar tests sin dependencia de servicios externos (WFS, Overpass, etc.), reduciendo el tiempo de ejecución de ~187s a ~1.7s (mejora del 99%).

## Archivos

- `setup.ts`: Configuración global de Vitest con mocks
- `__mocks__/wfsResponses.ts`: Respuestas mock para servicios WFS/Overpass

## Mock de localStorage

Node.js no tiene `localStorage` nativo. El mock en `setup.ts` proporciona una implementación mínima:

```typescript
global.localStorage = {
  store: {} as Record<string, string>,
  getItem(key) { return this.store[key] ?? null; },
  setItem(key, value) { this.store[key] = String(value); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; },
  get length() { return Object.keys(this.store).length; },
  key(index) { return Object.keys(this.store)[index] ?? null; }
};
```

**Nota**: Si ves warnings de localStorage en logs, son informativos y no afectan los tests.

## Mock de fetch

Intercepta llamadas HTTP a:
- WFS ISE (salud, seguridad, educación, deportes)
- WFS IAPH (patrimonio)
- WFS NGA (topónimos)
- WFS Energía
- Overpass API (OSM)

Respuestas predefinidas en `wfsResponses.ts` simulan datos reales de municipios como Colomera, Berja, Granada.

## Uso

### Tests normales (con mocks)
```bash
npm test
# o
npx vitest run
```

### Tests con red real (opcional)
```bash
PTEL_REAL_NETWORK=true npm test
```

### Utilidades disponibles en tests
```typescript
import { 
  enableRealNetwork, 
  disableRealNetwork, 
  getFetchCallCount,
  getFetchedUrls 
} from './setup';

// Habilitar red real para un test específico
enableRealNetwork();
// ... test con llamadas reales ...
disableRealNetwork();

// Debug: ver qué URLs se llamaron
console.log(getFetchedUrls());
```

## Añadir nuevas respuestas mock

1. Añadir constante en `__mocks__/wfsResponses.ts`:
```typescript
export const WFS_NUEVO_SERVICIO = `<?xml version="1.0"?>
<wfs:FeatureCollection>...</wfs:FeatureCollection>`;
```

2. Registrar en `getMockResponseForUrl()`:
```typescript
if (url.includes('nuevo_servicio')) {
  return WFS_NUEVO_SERVICIO;
}
```

## Cobertura actual

| Servicio | Municipios mockeados |
|----------|---------------------|
| ISE Health | Colomera, Berja |
| ISE Security | Colomera, Granada |
| Education | Colomera |
| Energy | Málaga |
| NGA | Colomera |
| IAID Deportivo | Colomera |
| Heritage | Colomera |
| Overpass | Colomera, Granada |
