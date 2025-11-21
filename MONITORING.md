# 📊 Plan de Monitorización y Métricas
## Sistema PTEL Coordinate Normalizer

> Estrategia completa de monitorización, métricas clave, dashboards, alertas y análisis de performance para el Sistema PTEL Coordinate Normalizer. Orientado a garantizar disponibilidad >99%, detectar degradación proactivamente y optimizar continuamente.

**Última actualización**: 21 noviembre 2025  
**Versión**: 1.0.0  
**Audiencia**: Equipo técnico, DevOps, Product Owners

---

## 📋 Tabla de Contenidos

1. [Filosofía de Monitorización](#filosofía-de-monitorización)
2. [Métricas Clave (KPIs)](#métricas-clave-kpis)
3. [Arquitectura de Monitorización](#arquitectura-de-monitorización)
4. [Dashboards](#dashboards)
5. [Sistema de Alertas](#sistema-de-alertas)
6. [Herramientas por Fase](#herramientas-por-fase)
7. [Métricas de Negocio](#métricas-de-negocio)
8. [Performance Budgets](#performance-budgets)
9. [Logs y Auditoría](#logs-y-auditoría)
10. [Análisis y Reporting](#análisis-y-reporting)

---

## 🎯 Filosofía de Monitorización

### Principios Fundamentales

**1. Observabilidad sobre Monitorización**
- No solo detectar **qué** falla, sino **por qué** falla
- Correlación entre métricas (ej: latencia API ↑ → score validación ↓)
- Trazabilidad end-to-end de cada procesamiento

**2. Proactividad sobre Reactividad**
- Detectar degradación **antes** de que usuarios se quejen
- Alertas predictivas (ej: cache hit rate bajando → pronto saturación)
- Capacity planning basado en tendencias

**3. Accionabilidad**
- Cada métrica debe tener **dueño** y **threshold** claro
- Alertas con **contexto** suficiente para actuar inmediatamente
- Runbooks vinculados a cada tipo de alerta

**4. Coste-Beneficio**
- Priorizar métricas que importan para negocio (no vanity metrics)
- Herramientas gratuitas/low-cost para MVP (Google Analytics, Sentry free tier)
- Inversión progresiva según escalado (AWS CloudWatch en Phase 2)

---

## 📈 Métricas Clave (KPIs)

### Nivel 1: Métricas de Disponibilidad (SLIs)

**Objetivo**: Garantizar sistema accesible y funcional 24/7

| Métrica | Objetivo | Crítico Si | Medición | Responsable |
|---------|----------|-----------|----------|-------------|
| **Uptime Aplicación** | >99.5% | <98% | Pingdom / UptimeRobot | DevOps |
| **Uptime CartoCiudad** | >95% | <90% | Custom health check | DevOps |
| **Uptime CDAU** | >95% | <90% | Custom health check | DevOps |
| **Error Rate Global** | <1% | >5% | Sentry | Dev Team |
| **Error Rate APIs** | <5% | >15% | API monitoring | Dev Team |

**Cálculo SLA Mensual**:
```
Uptime % = (Total Minutes - Downtime Minutes) / Total Minutes × 100

Ejemplo:
- Mes: 43,200 minutos (30 días)
- Downtime: 216 minutos (3.6h)
- Uptime: 99.5% ✅
```

---

### Nivel 2: Métricas de Performance

**Objetivo**: Experiencia usuario rápida y fluida

| Métrica | Objetivo | Alertar Si | Herramienta | Frecuencia |
|---------|----------|-----------|-------------|-----------|
| **Time to Interactive (TTI)** | <3s | >5s | Lighthouse CI | Por deploy |
| **Largest Contentful Paint (LCP)** | <2.5s | >4s | Web Vitals | Continua |
| **First Input Delay (FID)** | <100ms | >300ms | Web Vitals | Continua |
| **Cumulative Layout Shift (CLS)** | <0.1 | >0.25 | Web Vitals | Continua |
| **Latencia CartoCiudad (p95)** | <500ms | >1000ms | Custom | Continua |
| **Latencia CDAU (p95)** | <500ms | >1000ms | Custom | Continua |
| **Bundle Size (gzipped)** | <500KB | >800KB | Bundlephobia | Por deploy |
| **Tiempo Procesamiento** | <2s/100 registros | >5s | Custom | Continua |

**Web Vitals Thresholds (Google)**:

```
Good: 75% de usuarios en threshold verde
Needs Improvement: 75% en amarillo
Poor: 75% en rojo

LCP: Good <2.5s, Poor >4s
FID: Good <100ms, Poor >300ms  
CLS: Good <0.1, Poor >0.25
```

---

### Nivel 3: Métricas de Negocio

**Objetivo**: Medir impacto y valor entregado a municipios

| Métrica | Objetivo | Tendencia Deseada | Frecuencia |
|---------|----------|------------------|-----------|
| **% Completitud Coordenadas** | >90% | ↑ | Por procesamiento |
| **% Éxito Geocodificación** | >85% | ↑ | Por procesamiento |
| **Score Promedio Validación** | >80 | ↑ | Por procesamiento |
| **Archivos Procesados/Mes** | +20% MoM | ↑ | Mensual |
| **Municipios Activos** | 50+ en 6 meses | ↑ | Semanal |
| **Tiempo Promedio Sesión** | 10-15 min | → | Semanal |
| **Tasa Retorno (7 días)** | >40% | ↑ | Semanal |
| **Exportaciones Generadas/Mes** | +15% MoM | ↑ | Mensual |

**Benchmark Mejora Objetivo**:
```
Estado Inicial (Nov 2025):
- Completitud coordenadas: 26.9%
- Éxito geocodificación: 55-70%

Estado Objetivo (Dic 2025 - Phase 2):
- Completitud coordenadas: 90-95%
- Éxito geocodificación: 85-92%

Mejora: +238% completitud, +48% geocodificación
```

---

### Nivel 4: Métricas de Calidad Datos

**Objetivo**: Asegurar precisión geográfica

| Métrica | Objetivo | Medición | Impacto |
|---------|----------|----------|---------|
| **% Registros ALTA confianza** | >70% | Score 76-100 | Datos directamente usables |
| **% Registros MEDIA confianza** | <20% | Score 51-75 | Revisión recomendada |
| **% Registros BAJA confianza** | <10% | Score 26-50 | Requiere validación manual |
| **% Registros CRÍTICA** | <5% | Score 0-25 | Inválidos, re-geocodificar |
| **Precisión Geográfica (p95)** | ±25m | Comparación ground truth | Calidad georeferenciación |
| **% Outliers Espaciales** | <5% | >20km del centroide municipal | Errores groseros |

---

## 🏗️ Arquitectura de Monitorización

### Fase 1: Browser-Only (Actual - v0.4.0)

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO                              │
│                  ↓ interacción                              │
│              ┌──────────────┐                               │
│              │ React App    │ → localStorage metrics        │
│              │ (GitHub Pages│ → console.log events          │
│              └──────────────┘ → Custom Events API           │
│                  ↓                                           │
│         ┌───────────────────┐                               │
│         │ Google Analytics  │ → Pageviews, events          │
│         │ (GA4)             │ → User demographics          │
│         └───────────────────┘                               │
│                                                              │
│         ┌───────────────────┐                               │
│         │ Sentry (free)     │ → JavaScript errors          │
│         │                   │ → Performance traces         │
│         └───────────────────┘                               │
│                                                              │
│         ┌───────────────────┐                               │
│         │ Web Vitals        │ → LCP, FID, CLS             │
│         │ (RUM - Real User) │ → Custom metrics            │
│         └───────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

**Herramientas Fase 1** (Coste: €0/mes):
- ✅ Google Analytics 4 (GA4) - Gratuito
- ✅ Sentry Free Tier - 5K eventos/mes
- ✅ Web Vitals Library - Open source
- ✅ UptimeRobot Free - 50 monitores
- ✅ Custom health checks - En app

---

### Fase 2: AWS Lambda + RDS (Futuro - v1.0.0)

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO                              │
│                  ↓ API requests                             │
│              ┌──────────────┐                               │
│              │ API Gateway  │ → CloudWatch Logs            │
│              └──────┬───────┘                               │
│                     ↓                                        │
│              ┌──────────────┐                               │
│              │ Lambda       │ → CloudWatch Metrics          │
│              │              │ → X-Ray Traces                │
│              └──────┬───────┘                               │
│                     ↓                                        │
│         ┌──────────────────┐                                │
│         │ RDS PostgreSQL   │ → Performance Insights        │
│         │                  │ → Slow Query Log              │
│         └──────────────────┘                                │
│                     ↓                                        │
│         ┌──────────────────┐                                │
│         │ ElastiCache Redis│ → CloudWatch Metrics          │
│         │                  │ → Hit/Miss Rate               │
│         └──────────────────┘                                │
│                                                              │
│         ┌──────────────────┐                                │
│         │ CloudWatch       │ → Dashboards                  │
│         │                  │ → Alarms → SNS → Email/Slack  │
│         └──────────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

**Herramientas Fase 2** (Coste estimado: €12-30/mes):
- ✅ AWS CloudWatch - Incluido con Lambda/RDS
- ✅ AWS X-Ray - Tracing distribuido
- ✅ AWS SNS - Notificaciones
- ⚠️ DataDog / New Relic (opcional) - €50-200/mes

---

## 📊 Dashboards

### Dashboard 1: Salud del Sistema (System Health)

**Audiencia**: DevOps, Soporte Técnico  
**Actualización**: Tiempo real (1 min)  
**Herramienta**: Grafana / CloudWatch / Custom

**Métricas Principales**:

```
┌─────────────────────────────────────────────────────┐
│ UPTIME ÚLTIMAS 24H                                  │
│                                                     │
│ Aplicación:    ████████████████████ 99.8%         │
│ CartoCiudad:   ███████████████▒▒▒▒▒ 95.2%         │
│ CDAU:          ██████████████████▒▒ 98.1%         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ LATENCIA PROMEDIO (p95) - ÚLTIMA HORA              │
│                                                     │
│ CartoCiudad:   423ms   [━━━━━━━━▒▒] (objetivo <500)│
│ CDAU:          312ms   [━━━━━▒▒▒▒▒] (objetivo <500)│
│ WFS IECA:      876ms   [━━━━━━━━━━] (objetivo <1000│
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ERRORES POR TIPO - ÚLTIMAS 24H                      │
│                                                     │
│ JavaScript Errors:     3    🟢                      │
│ API Timeout:           12   🟡                      │
│ Validation Errors:     5    🟢                      │
│ Geocoding Failures:    47   🟡                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TASA DE ÉXITO - ÚLTIMA SEMANA                       │
│                                                     │
│ Geocodificación:     87.3%  ▲ +2.1%               │
│ Validación (>75):    72.8%  ▲ +5.3%               │
│ Exportaciones:       99.1%  → 0%                   │
└─────────────────────────────────────────────────────┘
```

**Implementación GA4**:

```typescript
// src/utils/analytics.ts
export function trackSystemHealth() {
  // Enviar métricas custom a GA4
  gtag('event', 'system_health', {
    uptime_app: calculateUptime(),
    uptime_cartociudad: checkCartoCiudadHealth(),
    latency_p95: getLatencyP95(),
    error_rate: getErrorRate()
  });
}

// Ejecutar cada 5 minutos
setInterval(trackSystemHealth, 5 * 60 * 1000);
```

---

### Dashboard 2: Uso de Usuario (User Activity)

**Audiencia**: Product Owner, Management  
**Actualización**: Diaria  
**Herramienta**: Google Analytics 4

**Métricas Principales**:

```
┌─────────────────────────────────────────────────────┐
│ SESIONES ACTIVAS - HOY                              │
│                                                     │
│ Total Sesiones:        127                          │
│ Usuarios Únicos:       89                           │
│ Duración Promedio:     12m 34s                      │
│ Bounce Rate:           18.3%                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ARCHIVOS PROCESADOS - ÚLTIMA SEMANA                 │
│                                                     │
│ Total:                 342 archivos                 │
│ Promedio/día:          49 archivos                  │
│ Tendencia:             ▲ +15.2% vs semana anterior │
│                                                     │
│ Por Formato:                                        │
│   CSV:        45%  ████████████                     │
│   XLSX:       30%  ████████                         │
│   DBF:        20%  ██████                           │
│   GeoJSON:    5%   ██                               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ DISTRIBUCIÓN POR PROVINCIA - NOVIEMBRE             │
│                                                     │
│ Granada:      32%  ███████████████                  │
│ Sevilla:      18%  ████████                         │
│ Málaga:       15%  ███████                          │
│ Almería:      12%  █████                            │
│ Córdoba:      10%  ████                             │
│ Otras:        13%  █████                            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ FORMATOS EXPORTACIÓN MÁS USADOS                    │
│                                                     │
│ GeoJSON (QGIS):    58%  ██████████████             │
│ CSV (Excel):       28%  ████████                    │
│ KML (Google):      14%  ████                        │
└─────────────────────────────────────────────────────┘
```

**Tracking GA4**:

```typescript
// Tracking eventos usuario
gtag('event', 'file_uploaded', {
  file_type: 'csv',
  file_size_kb: 125,
  num_records: 234
});

gtag('event', 'processing_complete', {
  num_records: 234,
  success_rate: 87.3,
  avg_score: 82.1,
  duration_seconds: 12.4
});

gtag('event', 'export_generated', {
  export_format: 'geojson',
  num_records: 234,
  file_size_kb: 89
});
```

---

### Dashboard 3: Performance (Rendimiento)

**Audiencia**: Dev Team  
**Actualización**: Por deployment + continua  
**Herramienta**: Lighthouse CI + Web Vitals

**Métricas Principales**:

```
┌─────────────────────────────────────────────────────┐
│ LIGHTHOUSE SCORES - ÚLTIMO DEPLOY (v0.4.0)        │
│                                                     │
│ Performance:         92 🟢  [━━━━━━━━━▒]           │
│ Accessibility:       95 🟢  [━━━━━━━━━▒]           │
│ Best Practices:      88 🟡  [━━━━━━━━▒▒]           │
│ SEO:                 100 🟢 [━━━━━━━━━━]           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ CORE WEB VITALS - P75 ÚLTIMOS 28 DÍAS             │
│                                                     │
│ LCP (Load):     2.1s    🟢  (objetivo <2.5s)       │
│ FID (Interact): 87ms    🟢  (objetivo <100ms)      │
│ CLS (Shift):    0.08    🟢  (objetivo <0.1)        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ BUNDLE SIZE - POR DEPLOYMENT                       │
│                                                     │
│ Fecha       │ Total    │ Main    │ Vendor  │ Otros│
│ 2025-11-21  │ 447 KB   │ 198 KB  │ 189 KB  │ 60 KB│
│ 2025-11-14  │ 523 KB   │ 234 KB  │ 212 KB  │ 77 KB│
│ 2025-11-07  │ 489 KB   │ 201 KB  │ 205 KB  │ 83 KB│
│                                                     │
│ Tendencia: ▼ -14.5% vs 2 semanas atrás            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ MEMORY USAGE - BROWSER                              │
│                                                     │
│ Idle (Step 1):           45 MB                      │
│ Processing (Step 2):     312 MB                     │
│ Map View (Step 3):       487 MB                     │
│                                                     │
│ ⚠️ Alert si >800 MB (leak potencial)               │
└─────────────────────────────────────────────────────┘
```

---

## 🔔 Sistema de Alertas

### Niveles de Severidad

**P1 - CRÍTICA** (Respuesta inmediata, <15min)
- Aplicación completamente caída
- Error rate >20%
- Uptime <95%

**P2 - ALTA** (Respuesta <2h)
- Performance degradada >50%
- Geocodificación fallando >50%
- APIs españolas caídas

**P3 - MEDIA** (Respuesta <24h)
- Degradación moderada performance
- Tasa geocodificación <70%
- Errores específicos incrementando

**P4 - BAJA** (Revisar en sprint review)
- Métricas tendencia negativa
- Warnings específicos acumulándose

---

### Configuración Alertas

**Ejemplo: Alerta P1 - Aplicación Caída**

```yaml
# alerts/critical/app-down.yml
name: "P1 - Aplicación PTEL Caída"
severity: CRITICAL
condition:
  metric: uptime_percentage
  operator: "<"
  threshold: 95
  window: 5 minutes
  
actions:
  - type: email
    recipients: ["devops@proyecto-ptel.es"]
    
  - type: slack
    channel: "#ptel-alerts-critical"
    message: |
      🚨 ALERTA P1 - Aplicación PTEL Caída
      Uptime: {current_value}%
      Threshold: 95%
      Runbook: https://github.com/ptel/docs/RUNBOOKS.md#runbook-2
      
  - type: sms  # Solo P1
    phone: "+34 XXX XXX XXX"
```

**Ejemplo: Alerta P2 - CartoCiudad Lento**

```yaml
# alerts/high/cartociudad-slow.yml
name: "P2 - CartoCiudad Latencia Alta"
severity: HIGH
condition:
  metric: cartociudad_latency_p95
  operator: ">"
  threshold: 1000  # 1 segundo
  window: 15 minutes
  
actions:
  - type: slack
    channel: "#ptel-alerts"
    message: |
      ⚠️ ALERTA P2 - CartoCiudad Latencia Alta
      P95 Latency: {current_value}ms
      Threshold: 1000ms
      Acción: Activar fallback CDAU automáticamente
      Runbook: https://github.com/ptel/docs/RUNBOOKS.md#runbook-1
```

---

### Implementación Alertas Custom

```typescript
// src/utils/monitoring/alerting.ts

interface AlertConfig {
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  metric: string;
  threshold: number;
  window: number; // minutos
  cooldown: number; // minutos entre alertas
}

class AlertManager {
  private lastAlertTime: Map<string, number> = new Map();
  
  async check(config: AlertConfig, currentValue: number) {
    if (this.shouldAlert(config, currentValue)) {
      await this.sendAlert(config, currentValue);
    }
  }
  
  private shouldAlert(config: AlertConfig, value: number): boolean {
    // Verificar threshold
    const thresholdExceeded = value > config.threshold;
    
    // Verificar cooldown
    const lastAlert = this.lastAlertTime.get(config.name) || 0;
    const cooldownExpired = Date.now() - lastAlert > config.cooldown * 60 * 1000;
    
    return thresholdExceeded && cooldownExpired;
  }
  
  private async sendAlert(config: AlertConfig, value: number) {
    // Enviar a Slack
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({
        text: `🚨 ${config.severity} - ${config.name}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${config.name}*\nValor actual: ${value}\nThreshold: ${config.threshold}`
            }
          }
        ]
      })
    });
    
    // Guardar timestamp
    this.lastAlertTime.set(config.name, Date.now());
  }
}

// Uso
const alertManager = new AlertManager();

setInterval(() => {
  const latency = getCartoCiudadLatency();
  
  alertManager.check({
    name: 'CartoCiudad Latencia Alta',
    severity: 'HIGH',
    metric: 'cartociudad_latency_p95',
    threshold: 1000,
    window: 15,
    cooldown: 60
  }, latency);
}, 60 * 1000); // Check cada minuto
```

---

## 🛠️ Herramientas por Fase

### Fase 1: MVP Browser-Only (Actual)

**Coste Total: €0/mes**

| Herramienta | Propósito | Límite Gratuito | Coste Exceso |
|-------------|-----------|----------------|--------------|
| **Google Analytics 4** | User analytics, eventos | Ilimitado | €0 |
| **Sentry Free** | Error tracking | 5K eventos/mes | $26/mes (10K) |
| **UptimeRobot Free** | Uptime monitoring | 50 monitores, 5min check | $7/mes (1min) |
| **Web Vitals** | Performance RUM | Ilimitado | €0 |
| **Lighthouse CI** | Performance audit | Ilimitado (self-hosted) | €0 |

**Setup Fase 1**:

```bash
# 1. Google Analytics 4
# Crear cuenta en: https://analytics.google.com
# Añadir GA4 tracking code en index.html

# 2. Sentry
npm install @sentry/react @sentry/tracing
# Crear cuenta: https://sentry.io/signup/

# 3. UptimeRobot
# Crear cuenta: https://uptimerobot.com/signUp
# Añadir monitor para GitHub Pages URL

# 4. Web Vitals
npm install web-vitals

# 5. Lighthouse CI
npm install -g @lhci/cli
# Configurar en .github/workflows/lighthouse.yml
```

---

### Fase 2: AWS Lambda + RDS (Futuro)

**Coste Estimado: €12-30/mes**

| Herramienta | Propósito | Coste Estimado |
|-------------|-----------|----------------|
| **AWS CloudWatch** | Logs, métricas, dashboards | €3-8/mes |
| **AWS X-Ray** | Distributed tracing | €2-5/mes |
| **AWS SNS** | Alertas email/SMS | €1/mes |
| **Sentry Team** | Error tracking avanzado | $26/mes |
| **GA4** | User analytics | €0 |

**Setup Fase 2**:

```typescript
// Lambda con CloudWatch
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({ region: 'eu-west-1' });

// Enviar métrica custom
await cloudwatch.putMetricData({
  Namespace: 'PTEL/Geocoding',
  MetricData: [{
    MetricName: 'GeocodingSuccessRate',
    Value: 87.3,
    Unit: 'Percent',
    Timestamp: new Date()
  }]
});

// X-Ray tracing
import AWSXRay from 'aws-xray-sdk-core';
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

// Envuelve Lambda handler
export const handler = AWSXRay.captureAsyncFunc('handler', async (event) => {
  // Tu código aquí
});
```

---

## 💰 Performance Budgets

**Definir límites estrictos para prevenir degradación**

| Recurso | Budget | Actual | Status |
|---------|--------|--------|--------|
| **Total Bundle (gzipped)** | <500 KB | 447 KB | 🟢 -11% |
| **Main Chunk** | <200 KB | 198 KB | 🟢 -1% |
| **Vendor Chunk** | <200 KB | 189 KB | 🟢 -5% |
| **Time to Interactive** | <3s | 2.1s | 🟢 -30% |
| **Largest Contentful Paint** | <2.5s | 2.1s | 🟢 -16% |
| **Total Requests** | <50 | 32 | 🟢 -36% |
| **IndexedDB Size** | <50 MB | 23 MB | 🟢 -54% |

**Enforcement**:

```json
// lighthouse-budget.json
{
  "resourceSizes": [
    {
      "resourceType": "script",
      "budget": 500
    },
    {
      "resourceType": "stylesheet",
      "budget": 100
    },
    {
      "resourceType": "total",
      "budget": 800
    }
  ],
  "timings": [
    {
      "metric": "interactive",
      "budget": 3000
    },
    {
      "metric": "first-contentful-paint",
      "budget": 1500
    }
  ]
}
```

**CI/CD Integration**:

```yaml
# .github/workflows/performance-budget.yml
- name: Check Performance Budget
  run: |
    npm run build
    lhci autorun --budget-path=lighthouse-budget.json
    
    # Fallar CI si excede budgets
    if [ $? -ne 0 ]; then
      echo "❌ Performance budget exceeded!"
      exit 1
    fi
```

---

## 📝 Logs y Auditoría

### Structured Logging

```typescript
// src/utils/logger.ts
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

class Logger {
  log(entry: LogEntry) {
    const structured = {
      '@timestamp': new Date().toISOString(),
      level: entry.level,
      category: entry.category,
      message: entry.message,
      metadata: entry.metadata,
      user_id: entry.userId,
      session_id: entry.sessionId,
      environment: import.meta.env.MODE,
      version: import.meta.env.VITE_VERSION
    };
    
    // En producción: Enviar a servicio de logs
    if (import.meta.env.PROD) {
      this.sendToLogService(structured);
    }
    
    // En desarrollo: Console
    console[entry.level](structured);
  }
}

// Uso
logger.log({
  level: 'info',
  category: 'geocoding',
  message: 'Geocodificación completada',
  metadata: {
    address: 'Calle Mayor 15',
    municipality: 'Granada',
    result: { x: 447850, y: 4111234 },
    confidence: 0.92,
    method: 'CartoCiudad'
  }
});
```

---

## 📈 Análisis y Reporting

### Report Semanal Automático

```typescript
// scripts/generate-weekly-report.ts
interface WeeklyReport {
  period: { start: Date; end: Date };
  metrics: {
    totalSessions: number;
    totalFiles: number;
    avgProcessingTime: number;
    successRate: number;
    topMunicipalities: Array<{ name: string; count: number }>;
  };
  performance: {
    avgTTI: number;
    avgLCP: number;
    p95Latency: number;
  };
  incidents: Array<{
    date: Date;
    severity: string;
    description: string;
    resolution: string;
  }>;
}

async function generateWeeklyReport(): Promise<WeeklyReport> {
  // Fetch datos de GA4, CloudWatch, Sentry
  const data = await fetchMetrics();
  
  // Generar report
  const report = analyzeData(data);
  
  // Enviar por email
  await sendEmail({
    to: 'team@proyecto-ptel.es',
    subject: `PTEL Weekly Report - ${formatDate(report.period.start)}`,
    body: renderReportHTML(report)
  });
  
  return report;
}

// Ejecutar cada lunes 9am
cron.schedule('0 9 * * 1', generateWeeklyReport);
```

---

## 📞 Contactos Monitoring

| Rol | Responsable | Email | Alertas |
|-----|-------------|-------|---------|
| System Owner | DevOps Lead | devops@ptel.es | P1, P2 |
| On-Call Engineer | Rotativo | oncall@ptel.es | P1 |
| Product Owner | PM | product@ptel.es | Reports semanales |
| Management | Director | director@ptel.es | Reports mensuales |

---

## 📋 Resumen Ejecutivo

**Implementación Prioritaria Fase 1**:

1. ✅ **Google Analytics 4** (Week 1)
2. ✅ **Sentry Error Tracking** (Week 1)
3. ✅ **UptimeRobot Monitoring** (Week 1)
4. ✅ **Web Vitals RUM** (Week 2)
5. ✅ **Lighthouse CI** (Week 2)
6. ⏳ **Custom Alerting** (Week 3)
7. ⏳ **Weekly Reports** (Week 4)

**KPIs Críticos a Monitorizar Desde Día 1**:
- Uptime Aplicación >99%
- Performance Score >90
- Tasa Geocodificación >85%
- Error Rate <1%

**Inversión Requerida Fase 1**: €0/mes  
**Inversión Estimada Fase 2**: €12-30/mes

---

**Última actualización**: 21 noviembre 2025  
**Próxima revisión**: Mensual  
**Maintainer**: Equipo DevOps PTEL Andalucía
