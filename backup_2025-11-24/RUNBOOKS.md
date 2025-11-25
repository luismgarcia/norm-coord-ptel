# 🚨 RUNBOOKS - Procedimientos de Resolución de Incidentes
## Sistema PTEL Coordinate Normalizer

> Guías operacionales para respuesta rápida a incidentes comunes del Sistema PTEL Coordinate Normalizer. Cada runbook incluye síntomas, diagnóstico, solución paso a paso, prevención y escalation.

**Última actualización**: 21 noviembre 2025  
**Versión**: 1.0.0  
**Audiencia**: Equipo técnico, soporte técnico, administradores de sistemas

---

## 📋 Tabla de Contenidos

### Incidentes Críticos (P1) - Respuesta inmediata
1. [API CartoCiudad No Responde](#runbook-1-api-cartociudad-no-responde)
2. [GitHub Pages Caído Completamente](#runbook-2-github-pages-caído-completamente)
3. [Performance Degradada Severa (>10s carga)](#runbook-3-performance-degradada-severa-10s-carga)
4. [Memory Leak / Browser Crash](#runbook-4-memory-leak--browser-crash)

### Incidentes Alta Prioridad (P2) - Respuesta <2h
5. [Coordenadas Desplazadas en Mapa](#runbook-5-coordenadas-desplazadas-en-mapa)
6. [Exportación GeoJSON Corrupta](#runbook-6-exportación-geojson-corrupta)
7. [Encoding UTF-8 No Corrige Correctamente](#runbook-7-encoding-utf-8-no-corrige-correctamente)
8. [Geocodificación Fallando Masivamente](#runbook-8-geocodificación-fallando-masivamente)

### Incidentes Media Prioridad (P3) - Respuesta <24h
9. [Scoring Sistema Dando Resultados Incorrectos](#runbook-9-scoring-sistema-dando-resultados-incorrectos)
10. [WMS Layers No Cargan](#runbook-10-wms-layers-no-cargan)
11. [Archivos DBF No Parseados Correctamente](#runbook-11-archivos-dbf-no-parseados-correctamente)
12. [Cache IndexedDB Creciendo Sin Control](#runbook-12-cache-indexeddb-creciendo-sin-control)

---

## 🔴 INCIDENTES CRÍTICOS (P1)

---

## RUNBOOK #1: API CartoCiudad No Responde

**Prioridad**: 🔴 CRÍTICA (P1)  
**SLA Respuesta**: Inmediata  
**SLA Resolución**: <30 minutos  
**Impacto**: Alto - Geocodificación completamente bloqueada

### Síntomas

**Usuarios reportan**:
- "No puedo geocodificar direcciones"
- "Aparece error de timeout al procesar"
- "La barra de progreso se queda congelada"

**Signos técnicos**:
- Console navegador muestra: `CartoCiudad API unreachable`
- Network tab: Request a `cartociudad.es` con status **Failed** o **Timeout**
- Error: `ERR_CONNECTION_TIMED_OUT` o `ERR_NAME_NOT_RESOLVED`
- Latencia API >30 segundos (normal: <500ms)

**Verificación rápida**:
```bash
# Test conectividad CartoCiudad desde terminal
curl -I https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp

# Respuesta esperada:
# HTTP/2 200
# content-type: application/javascript

# Si falla:
# curl: (6) Could not resolve host: www.cartociudad.es
# curl: (28) Connection timed out
```

---

### Diagnóstico

**Paso 1: Identificar alcance del problema**

```bash
# A. Verificar si es problema local o global

# Test desde otra red (datos móviles, VPN)
curl -I https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp

# Test desde servicio externo
curl -I https://downdetector.com/es/status/cartociudad/
# O usar: https://isitdownrightnow.com/cartociudad.es.html
```

**Paso 2: Verificar logs sistema**

```javascript
// En Console navegador (F12)
// Buscar errores específicos:
localStorage.getItem('cartociudad_error_log')

// Verificar últimas peticiones:
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('cartociudad'))
  .map(r => ({ url: r.name, duration: r.duration, status: r.responseStatus }))
```

**Paso 3: Determinar causa raíz**

| Síntoma | Causa Probable | Severidad |
|---------|---------------|-----------|
| DNS resolution failed | Problema DNS CNIG o ISP | Alta |
| Connection timeout | Mantenimiento CNIG | Alta |
| HTTP 503 Service Unavailable | Sobrecarga servidor CNIG | Media |
| HTTP 429 Too Many Requests | Rate limit (improbable, no documentado) | Baja |
| Certificate error | Certificado SSL expirado | Media |

---

### Solución

#### Solución 1: Activar Fallback Automático a CDAU

**Aplicable si**: CartoCiudad caído pero CDAU operativo

```typescript
// src/services/geocoding/GeocodingOrchestrator.ts

export class GeocodingOrchestrator {
  async geocode(address: string, municipality: string) {
    try {
      // Intentar CartoCiudad primero (3 reintentos)
      return await this.cartoCiudadService.geocode(address, municipality);
      
    } catch (error) {
      console.warn('CartoCiudad fallido, activando fallback CDAU', error);
      
      // Verificar si estamos en Andalucía
      if (this.isAndalusia(municipality)) {
        // Fallback automático a CDAU
        return await this.cdauService.geocode(address, municipality);
      }
      
      // Si no es Andalucía, intentar Nominatim OSM
      return await this.nominatimService.geocode(address, municipality);
    }
  }
}
```

**Verificación**:
```bash
# Logs deben mostrar:
# "CartoCiudad fallido, activando fallback CDAU"
# "CDAU geocodificación exitosa"
```

---

#### Solución 2: Aumentar Timeout y Reintentos

**Aplicable si**: CartoCiudad lento pero operativo

```typescript
// src/services/geocoding/CartoCiudadService.ts

export class CartoCiudadService {
  private readonly DEFAULT_TIMEOUT = 5000; // 5s normal
  private readonly FALLBACK_TIMEOUT = 30000; // 30s en problemas
  private readonly MAX_RETRIES = 3;
  
  async geocode(address: string, municipality: string) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const timeout = attempt === 1 
          ? this.DEFAULT_TIMEOUT 
          : this.FALLBACK_TIMEOUT;
        
        const response = await fetch(url, { 
          signal: AbortSignal.timeout(timeout) 
        });
        
        if (response.ok) {
          return await response.json();
        }
        
      } catch (error) {
        lastError = error;
        console.warn(`CartoCiudad intento ${attempt}/${this.MAX_RETRIES} fallido`);
        
        // Exponential backoff: 1s, 2s, 4s
        await this.sleep(Math.pow(2, attempt - 1) * 1000);
      }
    }
    
    throw new Error(`CartoCiudad no disponible después de ${this.MAX_RETRIES} intentos`);
  }
}
```

---

#### Solución 3: Modo Offline / Cache-Only

**Aplicable si**: Caída prolongada >1h

```typescript
// Activar modo degradado usando solo cache
const fallbackMode = {
  useCache: true,
  allowPartialResults: true,
  skipGeocodingForUnknown: true
};

// Notificar usuario
toast.warning(
  'Servicio de geocodificación temporalmente no disponible. ' +
  'Trabajando en modo offline con datos en caché.',
  { duration: 10000 }
);
```

---

### Prevención

**1. Monitorización Proactiva**

```typescript
// Implementar health check cada 15 minutos
setInterval(async () => {
  try {
    const response = await fetch(
      'https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp',
      { method: 'HEAD', timeout: 5000 }
    );
    
    if (!response.ok) {
      // Alertar equipo técnico
      await sendAlert({
        service: 'CartoCiudad',
        status: 'degraded',
        responseTime: response.timing.duration
      });
    }
    
  } catch (error) {
    // Alertar equipo técnico
    await sendAlert({
      service: 'CartoCiudad',
      status: 'down',
      error: error.message
    });
  }
}, 15 * 60 * 1000); // Cada 15 min
```

**2. Cache Agresivo**

```typescript
// Cachear todos los resultados exitosos 90 días
const CACHE_TTL_DAYS = 90;

// Usar cache como primera línea de defensa
async geocode(address: string) {
  // 1. Intentar cache primero
  const cached = await this.cache.get(address);
  if (cached) return cached;
  
  // 2. Solo si no está en cache, llamar API
  const result = await this.callCartoCiudad(address);
  
  // 3. Guardar en cache
  await this.cache.set(address, result, CACHE_TTL_DAYS);
  
  return result;
}
```

**3. Circuit Breaker Pattern**

```typescript
// Si error rate >10% en últimos 5 min, abrir circuit
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  
  async execute(fn: Function) {
    if (this.state === 'OPEN') {
      // Circuit abierto, no intentar llamada
      throw new Error('Circuit breaker OPEN');
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
      
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    
    if (this.failures >= 5) {
      this.state = 'OPEN';
      console.error('Circuit breaker OPEN - demasiados fallos CartoCiudad');
      
      // Auto-reset después de 5 minutos
      setTimeout(() => {
        this.state = 'HALF_OPEN';
        this.failures = 0;
      }, 5 * 60 * 1000);
    }
  }
}
```

---

### Escalation

**Nivel 1 (Inmediato)**: Activar fallbacks automáticos  
**Nivel 2 (<1h)**: Contactar CNIG vía email: `consulta.cartografia@cnig.es`  
**Nivel 3 (<2h)**: Implementar proxy AWS Lambda si caída prolongada  
**Nivel 4 (<4h)**: Comunicado a usuarios municipales sobre modo degradado

**Template email CNIG**:
```
Asunto: [URGENTE] Servicio CartoCiudad no responde - PTEL Andalucía

Estimado equipo CNIG,

Les informamos que desde las [HORA] del [FECHA] estamos experimentando 
problemas de conectividad con el servicio de geocodificación de CartoCiudad:

URL afectada: https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp
Error: [DESCRIPCIÓN]
Impacto: Sistema PTEL Andalucía (786 municipios) sin capacidad de geocodificación

¿Hay mantenimiento programado o incidencia conocida?

Saludos,
Equipo Técnico PTEL Andalucía
```

---

### Log de Incidentes

```markdown
| Fecha | Duración | Causa Raíz | Solución Aplicada | Lecciones Aprendidas |
|-------|----------|-----------|-------------------|---------------------|
| 2025-01-15 | 2h | Mantenimiento CNIG no notificado | Fallback CDAU | Implementar monitorización proactiva |
| 2025-02-03 | 30min | Certificado SSL expirado | Espera resolución CNIG | Alertas automáticas certificados |
```

---

## RUNBOOK #2: GitHub Pages Caído Completamente

**Prioridad**: 🔴 CRÍTICA (P1)  
**SLA Respuesta**: Inmediata  
**SLA Resolución**: <15 minutos (si es nuestro problema) o N/A (si es GitHub)  
**Impacto**: Total - Aplicación inaccesible

### Síntomas

- URL `https://[usuario].github.io/ptel-coordinate-normalizer/` muestra:
  - **404 Not Found**
  - **502 Bad Gateway**
  - **503 Service Unavailable**
  - Página en blanco sin errores
- Múltiples usuarios reportan no poder acceder
- Health check automático fallando

---

### Diagnóstico

**Paso 1: Verificar estado GitHub**

```bash
# Verificar GitHub Status Page
open https://www.githubstatus.com/

# O con curl
curl https://www.githubstatus.com/api/v2/status.json | jq '.status.description'

# Buscar incidentes activos relacionados con Pages
curl https://www.githubstatus.com/api/v2/incidents/unresolved.json | jq '.'
```

**Paso 2: Verificar deployment exitoso**

```bash
# Ver últimos deployments en GitHub Actions
gh run list --repo [usuario]/ptel-coordinate-normalizer --limit 5

# Ver detalles último deployment
gh run view [run-id] --log

# Verificar branch gh-pages existe y actualizado
git ls-remote --heads origin | grep gh-pages
```

**Paso 3: Verificar configuración GitHub Pages**

```bash
# Via GitHub CLI
gh api repos/[usuario]/ptel-coordinate-normalizer/pages

# Debe retornar:
# {
#   "url": "https://[usuario].github.io/ptel-coordinate-normalizer/",
#   "status": "built",
#   "source": {
#     "branch": "gh-pages",
#     "path": "/"
#   }
# }
```

---

### Solución

#### Caso 1: GitHub Pages está operativo, problema es nuestro

**Subsolución 1A: Branch gh-pages corrupto**

```bash
# 1. Backup branch actual (por si acaso)
git checkout gh-pages
git branch gh-pages-backup

# 2. Eliminar y recrear branch
git checkout main
git branch -D gh-pages

# 3. Hacer deployment limpio
npm run build
npm run deploy

# 4. Verificar en 2-3 minutos
curl -I "https://[usuario].github.io/ptel-coordinate-normalizer/"
```

**Subsolución 1B: Archivo .nojekyll faltante**

```bash
# GitHub Pages usa Jekyll por defecto, que ignora archivos con _
# Verificar .nojekyll existe en branch gh-pages
git checkout gh-pages
ls -la | grep .nojekyll

# Si no existe, crear
touch .nojekyll
git add .nojekyll
git commit -m "fix: Add .nojekyll for GitHub Pages"
git push origin gh-pages

# Alternativamente, en package.json scripts:
# "deploy": "gh-pages -d dist -t true"  # -t true copia dotfiles
```

**Subsolución 1C: Base path incorrecto**

```typescript
// Verificar vite.config.ts
export default defineConfig({
  base: process.env.NODE_ENV === 'production'
    ? '/ptel-coordinate-normalizer/'  // ✅ Debe coincidir con nombre repo
    : '/',
})

// Si está mal, corregir y re-deployar
npm run build
npm run deploy
```

---

#### Caso 2: GitHub Pages caído (problema GitHub)

**Si `githubstatus.com` muestra incidente activo en GitHub Pages**:

1. **Comunicar a usuarios**:
```markdown
🔴 ALERTA: GitHub Pages experimentando problemas técnicos
Impacto: Aplicación PTEL temporalmente inaccesible
Estado: Monitorizando situación activa
ETA Resolución: Según GitHub Status (https://www.githubstatus.com/)
Alternativa: [Si existe backup] Usar versión local o mirror
```

2. **Activar mirror alternativo** (si existe):
```bash
# Deployment rápido a Netlify (alternativa)
npm install -g netlify-cli
netlify deploy --prod --dir=dist

# URL temporal: https://app.netlify.app/...
```

3. **Monitorizar GitHub Status**:
```bash
# Script monitoreo automático
while true; do
  status=$(curl -s https://www.githubstatus.com/api/v2/status.json | jq -r '.status.indicator')
  
  if [ "$status" = "none" ]; then
    echo "✅ GitHub Pages operativo de nuevo"
    break
  fi
  
  echo "⏳ GitHub Pages aún con problemas: $status"
  sleep 60  # Check cada minuto
done
```

---

### Prevención

**1. Monitorización Uptime**

```typescript
// Implementar health check cada 5 minutos
setInterval(async () => {
  try {
    const response = await fetch(
      'https://[usuario].github.io/ptel-coordinate-normalizer/',
      { method: 'HEAD', timeout: 10000 }
    );
    
    if (!response.ok) {
      await sendAlert({
        service: 'GitHub Pages',
        status: response.status,
        message: 'Aplicación no responde'
      });
    }
    
  } catch (error) {
    await sendAlert({
      service: 'GitHub Pages',
      status: 'down',
      error: error.message
    });
  }
}, 5 * 60 * 1000);
```

**2. Mirror de Respaldo**

Considerar deployment redundante en:
- **Netlify** (alternativa 1)
- **Vercel** (alternativa 2)
- **AWS S3 + CloudFront** (para Phase 2)

**3. Documentar Configuración**

Mantener backup de configuración GitHub Pages:
```bash
# Exportar configuración actual
gh api repos/[usuario]/ptel-coordinate-normalizer/pages > github-pages-config.json

# En caso de necesitar recrear
gh api -X PUT repos/[usuario]/ptel-coordinate-normalizer/pages \
  --input github-pages-config.json
```

---

### Escalation

**Nivel 1 (Inmediato)**: Verificar si es problema GitHub o nuestro  
**Nivel 2 (<15min)**: Si es nuestro, hacer deployment limpio  
**Nivel 3 (<30min)**: Si es GitHub, comunicar a usuarios y activar mirror  
**Nivel 4 (<1h)**: Considerar migration temporal a Netlify/Vercel

---

## RUNBOOK #3: Performance Degradada Severa (>10s carga)

**Prioridad**: 🔴 CRÍTICA (P1)  
**SLA Respuesta**: <15 minutos  
**SLA Resolución**: <2 horas  
**Impacto**: Alto - Sistema técnicamente funcional pero inutilizable

### Síntomas

**Usuarios reportan**:
- "La aplicación tarda mucho en cargar"
- "Al procesar archivos se queda colgada"
- "El navegador se pone muy lento"

**Métricas técnicas**:
- **Time to Interactive** >10s (objetivo: <3s)
- **Largest Contentful Paint** >5s (objetivo: <2.5s)
- **Total Blocking Time** >1000ms (objetivo: <300ms)
- Bundle size >2MB (objetivo: <500KB gzipped)

---

### Diagnóstico

**Paso 1: Lighthouse Audit**

```bash
# Ejecutar Lighthouse
lighthouse "https://[usuario].github.io/ptel-coordinate-normalizer/" \
  --output html \
  --output-path ./lighthouse-report.html \
  --view

# Buscar métricas:
# - Performance Score <50 = CRÍTICO
# - TBT >1000ms = Problema JavaScript
# - LCP >5s = Problema recursos grandes
```

**Paso 2: Análisis Bundle Size**

```bash
# Analizar bundle
npm run build
npm run analyze

# Buscar:
# - ¿Algún chunk >500KB?
# - ¿Librerías duplicadas?
# - ¿Source maps en producción?
# - ¿Assets sin comprimir?
```

**Paso 3: Network Waterfall**

```
F12 → Network tab → Reload
Buscar:
- ¿Requests >5MB?
- ¿Muchos requests pequeños (>100)?
- ¿Latencia alta en APIs españolas?
- ¿Recursos bloqueantes render?
```

---

### Solución

#### Solución 1: Code Splitting Agresivo

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';

// ❌ ANTES: Import estático (todo en bundle inicial)
import { Step1Upload } from './components/wizard/Step1Upload';
import { Step2Process } from './components/wizard/Step2Process';
import { Step3Visualize } from './components/wizard/Step3Visualize';

// ✅ DESPUÉS: Lazy loading por step
const Step1Upload = lazy(() => import('./components/wizard/Step1Upload'));
const Step2Process = lazy(() => import('./components/wizard/Step2Process'));
const Step3Visualize = lazy(() => import('./components/wizard/Step3Visualize'));

export function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {currentStep === 1 && <Step1Upload />}
      {currentStep === 2 && <Step2Process />}
      {currentStep === 3 && <Step3Visualize />}
    </Suspense>
  );
}
```

**Resultado esperado**: Bundle inicial <200KB, resto bajo demanda

---

#### Solución 2: Optimizar Leaflet

```typescript
// ❌ ANTES: Import completo Leaflet
import L from 'leaflet';

// ✅ DESPUÉS: Import selectivo
import { Map, TileLayer, Marker } from 'leaflet/dist/leaflet-src.esm';

// Cargar estilos solo cuando necesario
const loadLeafletCSS = () => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
};

// Solo cargar cuando Step3 se monta
useEffect(() => {
  if (currentStep === 3) {
    loadLeafletCSS();
  }
}, [currentStep]);
```

---

#### Solución 3: Virtualización Tabla

```typescript
// Para datasets >100 registros
import { useVirtualizer } from '@tanstack/react-virtual';

export function DataTable({ data }: { data: Record[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Altura fila
    overscan: 10 // Renderizar 10 filas extra fuera de viewport
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <TableRow data={data[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

#### Solución 4: Web Workers para Procesamiento

```typescript
// src/workers/normalization.worker.ts
self.addEventListener('message', async (e) => {
  const { records, type } = e.data;
  
  // Procesamiento pesado en worker thread
  const normalized = records.map(record => ({
    ...record,
    normalized: normalizeEncoding(record.text),
    validated: validateCoordinates(record.x, record.y)
  }));
  
  self.postMessage({ type: 'progress', progress: 100 });
  self.postMessage({ type: 'complete', data: normalized });
});

// Uso en componente
const worker = new Worker(
  new URL('./workers/normalization.worker.ts', import.meta.url),
  { type: 'module' }
);

worker.postMessage({ records: data, type: 'normalize' });
worker.onmessage = (e) => {
  if (e.data.type === 'complete') {
    setNormalizedData(e.data.data);
  }
};
```

---

### Prevención

**1. Budget de Performance**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
          'vendor-utils': ['proj4', 'papaparse']
        }
      }
    },
    
    // Alertar si bundle >500KB
    chunkSizeWarningLimit: 500
  }
});
```

**2. Lighthouse CI**

```yaml
# .github/workflows/lighthouse.yml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v9
  with:
    urls: https://[usuario].github.io/ptel-coordinate-normalizer/
    uploadArtifacts: true
    temporaryPublicStorage: true
    
    # Fallar si performance <90
    budgetPath: ./lighthouse-budget.json
```

```json
// lighthouse-budget.json
{
  "performance": 90,
  "accessibility": 90,
  "best-practices": 90,
  "seo": 90
}
```

---

### Escalation

**Nivel 1 (<30min)**: Análisis Lighthouse + bundle  
**Nivel 2 (<1h)**: Implementar code splitting + virtualización  
**Nivel 3 (<2h)**: Web Workers si necesario  
**Nivel 4 (<4h)**: Refactor arquitectural si persiste

---

## 🟠 INCIDENTES ALTA PRIORIDAD (P2)

---

## RUNBOOK #5: Coordenadas Desplazadas en Mapa

**Prioridad**: 🟠 ALTA (P2)  
**SLA**: <2 horas  
**Impacto**: Medio - Datos correctos pero visualización incorrecta

### Síntomas

- Marcadores aparecen ~500m-5km desplazados de ubicación real
- Marcadores en océano o fuera de Andalucía
- Coordenadas numéricas correctas en tabla pero mal en mapa

---

### Diagnóstico

**Verificar CRS (Sistema de Referencia de Coordenadas)**:

```javascript
// En Console navegador:
// 1. Verificar coordenadas raw
console.log(coordenadas); // { x: 447850, y: 4111234 }

// 2. Verificar CRS configurado en Leaflet
map.options.crs.code; // Debe ser 'EPSG:25830'

// 3. Verificar proj4 definitions
proj4.defs('EPSG:25830');
// Debe retornar definición válida, no undefined
```

**Causas comunes**:

| Síntoma | Causa | CRS Incorrecto |
|---------|-------|---------------|
| Desplazamiento ~1km | ED50 vs ETRS89 | EPSG:23030 (ED50) usado como EPSG:25830 |
| Marcador en océano | Lat/Lon invertido | WGS84 con coordenadas X/Y intercambiadas |
| España aparece en África | CRS completamente mal | EPSG:3857 (Web Mercator) sin transformar |
| Coordenadas "aplastadas" | Proyección incorrecta | EPSG:4326 (WGS84 latlon) sin proyectar |

---

### Solución

**Solución 1: Verificar definición EPSG:25830**

```typescript
// src/utils/crs.ts
import proj4 from 'proj4';

// Definición oficial EPSG:25830 (UTM30N ETRS89)
proj4.defs('EPSG:25830', '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');

// Verificar transformación
const [lon, lat] = proj4('EPSG:25830', 'EPSG:4326', [447850, 4111234]);
console.log({ lon, lat }); // Debe ser ~[-3.605, 37.177] (Granada centro)

// Si resultado es incorrecto, definición está mal
```

**Solución 2: Verificar orden coordenadas**

```typescript
// ❌ INCORRECTO: Lat/Lon invertido
L.marker([lat, lon]).addTo(map); // Aparecerá en océano

// ✅ CORRECTO: Lon/Lat (X/Y)
L.marker([lon, lat]).addTo(map); // Aparecerá en ubicación correcta

// Verificación rápida:
// Granada: lon=-3.605 (X), lat=37.177 (Y)
// Sevilla: lon=-5.994 (X), lat=37.389 (Y)
// Málaga: lon=-4.420 (X), lat=36.721 (Y)

// Regla: lon (X) siempre negativo en España, lat (Y) entre 36-43
```

**Solución 3: Configurar Leaflet con CRS custom**

```typescript
// src/utils/leafletCRS.ts
import L from 'leaflet';
import proj4 from 'proj4';
import 'proj4leaflet';

// Definir EPSG:25830
proj4.defs('EPSG:25830', '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// Crear CRS custom para Leaflet
export const EPSG25830 = new L.Proj.CRS('EPSG:25830', 
  proj4.defs('EPSG:25830'), 
  {
    resolutions: [
      2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1, 0.5
    ],
    origin: [0, 0],
    bounds: L.bounds([120000, 4000000], [850000, 4800000]) // Bounds Andalucía
  }
);

// Uso en mapa:
const map = L.map('map', {
  crs: EPSG25830,
  center: [447850, 4111234], // UTM30 Granada
  zoom: 13
});
```

---

### Prevención

**1. Testing con Coordenadas Conocidas**

```typescript
// tests/utils/crs.test.ts
describe('CRS Transformations', () => {
  test('Granada centro en EPSG:25830 se transforma correctamente a WGS84', () => {
    const [lon, lat] = proj4('EPSG:25830', 'EPSG:4326', [447850, 4111234]);
    
    // Tolerancia ±0.001° (~100m)
    expect(lon).toBeCloseTo(-3.605, 3);
    expect(lat).toBeCloseTo(37.177, 3);
  });
  
  test('Sevilla Giralda se transforma correctamente', () => {
    const [lon, lat] = proj4('EPSG:25830', 'EPSG:4326', [233300, 4142600]);
    
    expect(lon).toBeCloseTo(-5.993, 3);
    expect(lat).toBeCloseTo(37.386, 3);
  });
});
```

**2. Validación Visual Automática**

```typescript
// Verificar que marcador está dentro de bounds Andalucía
const ANDALUSIA_BOUNDS = {
  minLon: -7.5,
  maxLon: -1.5,
  minLat: 36.0,
  maxLat: 38.8
};

function isInAndalusia(lon: number, lat: number): boolean {
  return (
    lon >= ANDALUSIA_BOUNDS.minLon &&
    lon <= ANDALUSIA_BOUNDS.maxLon &&
    lat >= ANDALUSIA_BOUNDS.minLat &&
    lat <= ANDALUSIA_BOUNDS.maxLat
  );
}

// Alertar si coordenada fuera de Andalucía
if (!isInAndalusia(lon, lat)) {
  console.error('⚠️ Coordenada fuera de Andalucía:', { lon, lat });
}
```

---

## RUNBOOK #8: Geocodificación Fallando Masivamente

**Prioridad**: 🟠 ALTA (P2)  
**SLA**: <2 horas  
**Impacto**: Alto - >50% direcciones sin geocodificar

### Síntomas

- Tasa de éxito geocodificación <50% (objetivo: >85%)
- Errores masivos: "No se pudo geocodificar dirección"
- Logs llenos de: "CartoCiudad returned 0 results"

---

### Diagnóstico

**Paso 1: Identificar patrón de fallos**

```typescript
// Analizar qué tipo de direcciones fallan más
const failedAddresses = results.filter(r => !r.geocoded);

const failurePatterns = {
  missingNumber: failedAddresses.filter(a => !/\d/.test(a.address)).length,
  missingStreetType: failedAddresses.filter(a => !/(calle|avenida|plaza)/i.test(a.address)).length,
  abbreviations: failedAddresses.filter(a => /\bc\b|\bav\b|\bpl\b/i.test(a.address)).length,
  specialChars: failedAddresses.filter(a => /[áéíóú]/i.test(a.address)).length
};

console.table(failurePatterns);
```

**Paso 2: Test manual CartoCiudad**

```bash
# Test dirección que falla
curl "https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp?q=Calle+Mayor+15+Granada&limit=1&countrycodes=es"

# Si retorna 0 resultados, problema es formato dirección
# Si retorna error, problema es API
```

---

### Solución

**Solución 1: Normalización Avanzada Direcciones**

```typescript
// src/services/geocoding/AddressNormalizer.ts

export class AddressNormalizer {
  normalize(address: string): string {
    let normalized = address;
    
    // 1. Expandir abreviaturas comunes
    const abbreviations = {
      'c/': 'calle ',
      'c ': 'calle ',
      'av ': 'avenida ',
      'av.': 'avenida ',
      'avda': 'avenida ',
      'pl ': 'plaza ',
      'pl.': 'plaza ',
      'pza': 'plaza ',
      'pº': 'paseo ',
      'ctra': 'carretera ',
      'pje': 'pasaje '
    };
    
    Object.entries(abbreviations).forEach(([abbr, full]) => {
      normalized = normalized.replace(new RegExp(abbr, 'gi'), full);
    });
    
    // 2. Normalizar tildes
    normalized = this.normalizeAccents(normalized);
    
    // 3. Remover caracteres especiales
    normalized = normalized.replace(/[^\w\s]/g, ' ');
    
    // 4. Normalizar espacios
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }
  
  normalizeAccents(text: string): string {
    const accents = {
      'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
      'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
      'ñ': 'n', 'Ñ': 'N'
    };
    
    return text.replace(/[áéíóúÁÉÍÓÚñÑ]/g, char => accents[char] || char);
  }
}
```

**Solución 2: Geocodificación Fuzzy con Variaciones**

```typescript
async geocodeWithVariations(address: string, municipality: string) {
  const variations = [
    address, // Original
    this.normalizer.normalize(address), // Normalizado
    `${address}, ${municipality}`, // Con municipio
    address.replace(/\d+/, ''), // Sin número portal
    address.split(',')[0] // Solo calle
  ];
  
  for (const variation of variations) {
    try {
      const result = await this.cartoCiudad.geocode(variation, municipality);
      
      if (result && result.confidence > 0.7) {
        return result;
      }
    } catch (error) {
      // Continuar con siguiente variación
      continue;
    }
  }
  
  // Si todas las variaciones fallan
  throw new Error(`No se pudo geocodificar: ${address}`);
}
```

---

### Prevención

**1. Pre-validación Direcciones**

```typescript
function validateAddress(address: string): ValidationResult {
  const issues = [];
  
  // Debe tener tipo de vía
  if (!/calle|avenida|plaza|paseo|carretera/i.test(address)) {
    issues.push('Falta tipo de vía (calle, avenida, plaza...)');
  }
  
  // Debe tener nombre vía
  if (address.trim().split(' ').length < 2) {
    issues.push('Dirección incompleta');
  }
  
  // Número portal recomendado
  if (!/\d+/.test(address)) {
    issues.push('Falta número de portal (recomendado)');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    confidence: 1 - (issues.length * 0.2)
  };
}
```

---

## 📊 Resumen Métricas Incidentes

| Runbook | Frecuencia Esperada | Tiempo Resolución Promedio | Automatizable |
|---------|-------------------|---------------------------|---------------|
| #1 CartoCiudad Caído | 2-3 veces/año | 30min (fallback) - 4h (caída completa) | ✅ Parcial |
| #2 GitHub Pages Caído | <1 vez/año | 15min (si es nuestro) - Variable (GitHub) | ✅ Parcial |
| #3 Performance Degradada | 1 vez/trimestre | 2-4h | ⚠️ Requiere análisis |
| #5 Coordenadas Desplazadas | 1 vez/release | 1-2h | ❌ Requiere validación manual |
| #8 Geocodificación Fallando | 1 vez/mes | 1-3h | ✅ Sí (normalización) |

---

## 📞 Contactos de Escalation

| Nivel | Rol | Contacto | Disponibilidad |
|-------|-----|----------|---------------|
| L1 | Equipo Técnico PTEL | github-issues@proyecto | 24/7 |
| L2 | CNIG CartoCiudad | consulta.cartografia@cnig.es | L-V 9-18h |
| L3 | IECA Andalucía | ise.produccion.ieca@juntadeandalucia.es | L-V 9-15h |
| L4 | GitHub Support | https://support.github.com | 24/7 (inglés) |

---

**Última actualización**: 21 noviembre 2025  
**Próxima revisión**: Trimestral o post-incidente mayor  
**Maintainer**: Equipo PTEL Andalucía
