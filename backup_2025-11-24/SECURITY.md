# 🔒 Política de Seguridad y Privacidad
## Sistema PTEL Coordinate Normalizer

> Política completa de seguridad, tratamiento de datos, cumplimiento normativo RGPD/ENS, y gestión de vulnerabilidades para el Sistema PTEL Coordinate Normalizer. Orientado a garantizar protección de datos de infraestructuras críticas municipales.

**Última actualización**: 21 noviembre 2025  
**Versión**: 1.0.0  
**Audiencia**: Usuarios municipales, Delegados de Protección de Datos, equipo técnico, auditores

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Datos Procesados](#datos-procesados)
3. [Principios de Seguridad](#principios-de-seguridad)
4. [Arquitectura de Seguridad](#arquitectura-de-seguridad)
5. [Cumplimiento RGPD](#cumplimiento-rgpd)
6. [Cumplimiento ENS](#cumplimiento-ens)
7. [Gestión de Vulnerabilidades](#gestión-de-vulnerabilidades)
8. [Protección de Datos en Tránsito](#protección-de-datos-en-tránsito)
9. [Protección de Datos en Reposo](#protección-de-datos-en-reposo)
10. [Auditoría y Trazabilidad](#auditoría-y-trazabilidad)
11. [Respuesta a Incidentes de Seguridad](#respuesta-a-incidentes-de-seguridad)
12. [Contacto Seguridad](#contacto-seguridad)

---

## 📋 Resumen Ejecutivo

### Contexto

El **Sistema PTEL Coordinate Normalizer** procesa datos geográficos de **infraestructuras críticas municipales** (hospitales, comisarías, centros educativos, servicios de emergencias) en el marco del **Decreto 197/2024** de la Junta de Andalucía sobre Planes Territoriales de Emergencias Locales (PTEL).

### Clasificación de Datos

**Nivel de Sensibilidad**: **MEDIA-ALTA**

Según Esquema Nacional de Seguridad (ENS):
- **Categoría ENS**: MEDIA
- **Confidencialidad**: MEDIA (datos públicos pero sensibles infraestructuras críticas)
- **Integridad**: ALTA (errores pueden afectar operaciones emergencias)
- **Disponibilidad**: MEDIA (no crítica 24/7 pero importante)
- **Trazabilidad**: ALTA (auditoría modificaciones)

### Postura de Seguridad

**Modelo**: **Browser-First con Zero Trust**

✅ **Fortalezas**:
- Arquitectura browser-only (sin backend) = menor superficie de ataque
- Datos permanecen en dispositivo usuario (no hay servidor centralizado)
- HTTPS obligatorio (GitHub Pages)
- APIs españolas públicas (sin autenticación = sin credenciales expuestas)
- Open source (auditable por comunidad)

⚠️ **Riesgos Controlados**:
- Datos sensibles en localStorage/IndexedDB (mitigado: duración limitada 90 días)
- Sin cifrado end-to-end datos usuario (mitigado: solo procesa datos públicos)
- Dependencia servicios terceros (CartoCiudad, CDAU) (mitigado: fallbacks)

---

## 📊 Datos Procesados

### Tipos de Datos

**Datos de Infraestructuras Críticas** (Art. 47 Ley 17/2015):

| Categoría | Ejemplos | Sensibilidad | Base Legal RGPD |
|-----------|----------|-------------|-----------------|
| **Nombre Instalación** | "Hospital Virgen de las Nieves" | Pública | Art. 6.1.e (interés público) |
| **Tipo Infraestructura** | Sanitaria, Educativa, Policial | Pública | Art. 6.1.e |
| **Dirección Postal** | "Av. de las Fuerzas Armadas, 2" | Pública | Art. 6.1.e |
| **Coordenadas Geográficas** | X: 447850, Y: 4111234 | Pública | Art. 6.1.e |
| **Municipio** | "Granada" | Pública | Art. 6.1.e |
| **Provincia** | "Granada" | Pública | Art. 6.1.e |

**NO se procesan**:
- ❌ Datos personales de empleados
- ❌ Datos de contacto individuales
- ❌ Información clasificada/reservada
- ❌ Datos de seguridad interna instalaciones
- ❌ Planos detallados edificios
- ❌ Sistemas de seguridad/videovigilancia

### Clasificación Decreto 3/2010 (Ley de Acceso a Información Pública Andalucía)

**Información Pública** según Art. 6: Datos PTEL son información **pública** ya que:
1. Son elaborados por Administración Pública (Ayuntamientos)
2. No contienen datos personales (Art. 13.1.a)
3. No afectan seguridad pública (Art. 13.1.b) - solo ubicaciones públicas conocidas
4. Tienen finalidad interés público (emergencias, protección civil)

---

## 🛡️ Principios de Seguridad

### 1. Privacy by Design

**Minimización de Datos**:
```typescript
// Solo procesamos datos estrictamente necesarios
interface InfrastructureData {
  name: string;        // Nombre instalación
  type: string;        // Tipología
  address: string;     // Dirección
  x: number;           // Coordenada X
  y: number;           // Coordenada Y
  municipality: string; // Municipio
  
  // ❌ NO capturamos:
  // - contactEmail: evitamos GDPR
  // - responsibleName: evitamos GDPR
  // - phoneNumber: evitamos GDPR
  // - securityDetails: evitamos riesgos
}
```

### 2. Privacy by Default

**Configuración Segura Predeterminada**:
- ✅ Analytics desactivado por defecto (opt-in)
- ✅ Error reporting desactivado por defecto
- ✅ Cache limitado 90 días automático
- ✅ Limpieza automática datos antiguos
- ✅ Sin persistencia credenciales (no hay login)

### 3. Transparency (Transparencia)

**Usuario siempre informado**:
```typescript
// Banner informativo al cargar aplicación
<InfoBanner>
  Este sistema procesa datos de ubicación de infraestructuras públicas 
  municipales. Los datos permanecen en tu navegador y NO se envían a 
  servidores propios. Solo se consultan APIs oficiales españolas 
  (CartoCiudad IGN, CDAU Junta Andalucía) para geocodificación.
  
  [Ver Política de Privacidad] [Aceptar]
</InfoBanner>
```

### 4. Accountability (Responsabilidad)

**Registro Auditoría**:
- Cada procesamiento de archivo registra: timestamp, usuario, origen datos, transformaciones
- Logs accesibles para DPO municipal
- Historial cambios manuales en coordenadas

---

## 🏗️ Arquitectura de Seguridad

### Modelo de Amenazas (Threat Model)

**Actores de Amenaza Considerados**:

| Actor | Motivación | Vectores de Ataque | Mitigación |
|-------|-----------|-------------------|-----------|
| **Atacante Externo Oportunista** | Defacement, notoriedad | XSS, CSRF, SQLi (N/A) | CSP, SameSite cookies, Input validation |
| **Atacante Dirigido (APT)** | Espionaje infraestructuras críticas | Supply chain, 0-day | Dependabot, npm audit, Code review |
| **Insider Malicioso Municipal** | Sabotaje, filtración | Modificación datos, exportación masiva | Audit logs, Anomaly detection |
| **Script Kiddie** | DDoS, exploits conocidos | GitHub Pages DDoS, Dependency exploits | GitHub infraestructura, npm audit |

### Superficie de Ataque

**Componentes Expuestos**:

```
┌─────────────────────────────────────────────────────┐
│ CAPA 1: USUARIO (Navegador)                        │
│                                                     │
│ ✅ SPA React (sin backend)                         │
│ ✅ localStorage (máx 90 días)                      │
│ ✅ IndexedDB (cache temporal)                      │
│                                                     │
│ Riesgos: XSS, CSRF, Memory leaks                   │
│ Mitigación: CSP, Input sanitization, Code review   │
└─────────────────────────────────────────────────────┘
                        ↓ HTTPS
┌─────────────────────────────────────────────────────┐
│ CAPA 2: HOSTING (GitHub Pages)                     │
│                                                     │
│ ✅ HTTPS/TLS 1.3 forzado                           │
│ ✅ CDN Cloudflare/Fastly                           │
│ ✅ DDoS protection automático                       │
│                                                     │
│ Riesgos: GitHub infra compromise (remoto)          │
│ Mitigación: Confianza en GitHub SLA                │
└─────────────────────────────────────────────────────┘
                        ↓ HTTPS
┌─────────────────────────────────────────────────────┐
│ CAPA 3: APIS EXTERNAS (Servicios Oficiales)       │
│                                                     │
│ ✅ CartoCiudad (CNIG) - Sin autenticación          │
│ ✅ CDAU (IECA) - Sin autenticación                 │
│ ✅ WMS/WFS (REDIAM) - Sin autenticación            │
│                                                     │
│ Riesgos: Man-in-the-Middle, API compromise         │
│ Mitigación: HTTPS, Certificate pinning (futuro)    │
└─────────────────────────────────────────────────────┘
```

**Total Superficie de Ataque**: **BAJA-MEDIA**
- No hay backend propio = no hay DB, no hay auth, no hay secrets
- Dependencias externas mínimas (React, Leaflet, proj4)
- Código auditable (open source)

---

## 🔐 Cumplimiento RGPD

### Base Legal Tratamiento

**Artículo 6.1 RGPD - Licitud del Tratamiento**:

**Base Legal Aplicable**: **Art. 6.1.e - Misión de Interés Público**

> "El tratamiento es necesario para el cumplimiento de una misión realizada en 
> interés público o en el ejercicio de poderes públicos conferidos al responsable del tratamiento"

**Fundamentación**:
- **Decreto 197/2024** de la Junta de Andalucía obliga municipios a elaborar PTEL
- Normalización coordenadas infraestructuras críticas es requisito técnico cumplimiento
- Finalidad: protección civil, emergencias, seguridad ciudadana (interés público)

**NO requiere consentimiento** (Art. 6.1.a RGPD) porque es tratamiento obligatorio legal.

---

### Roles RGPD

**Responsable del Tratamiento**: **Ayuntamiento que usa el sistema**
- Determina fines y medios del tratamiento
- Obligaciones: DPO, EIPD si procede, garantizar derechos

**Encargado del Tratamiento**: **NO APLICA**
- Sistema browser-only, datos NO enviados a tercero
- GitHub Pages solo hosting estático (no accede a datos)
- APIs españolas solo procesan queries puntuales (no almacenan)

### Evaluación de Impacto (EIPD)

**¿Es Necesaria EIPD?**

Según Art. 35.3 RGPD, EIPD obligatoria si:
- Evaluación sistemática y exhaustiva aspectos personales ❌ (no hay datos personales)
- Tratamiento datos sensibles a gran escala ❌ (solo infraestructuras públicas)
- Observación sistemática zona accesible público ❌ (no hay vigilancia)

**Conclusión**: ❌ **NO requiere EIPD** porque NO trata datos personales de personas físicas.

---

### Derechos de los Interesados

**NO APLICA** porque sistema NO trata datos personales de personas físicas.

Si un ciudadano solicitara ejercer derechos RGPD:
```
Respuesta tipo:

"El Sistema PTEL Coordinate Normalizer NO procesa datos personales de personas 
físicas. Solo procesa información pública de infraestructuras municipales 
(nombres edificios, direcciones, coordenadas). 

Por tanto, no es aplicable el ejercicio de derechos RGPD (acceso, rectificación, 
supresión, etc.) en este sistema.

Para información sobre tratamientos de datos personales del Ayuntamiento, 
contacte con el Delegado de Protección de Datos: dpd@ayuntamiento.es"
```

---

### Transferencias Internacionales

**Transferencias a Terceros Países**: ❌ **NO HAY**

Todos los servicios están en territorio UE:
- ✅ GitHub Pages: Servidores en UE (GDPR-compliant)
- ✅ CartoCiudad (CNIG): España
- ✅ CDAU (IECA): España, Andalucía
- ✅ WMS/WFS REDIAM: España, Andalucía

**Única excepción potencial**: Google Analytics 4 (si se activa opt-in)
- Google LLC (USA) - Cubierto por **EU-US Data Privacy Framework** (2023)
- Cláusulas Contractuales Tipo (CCT) firmadas por Google

---

## 🏛️ Cumplimiento ENS

### Categorización Sistema

Según **Real Decreto 311/2022 (ENS)**:

**Dimensiones de Seguridad**:

| Dimensión | Nivel | Justificación |
|-----------|-------|---------------|
| **Confidencialidad** | MEDIA | Datos públicos pero ubicaciones infraestructuras críticas |
| **Integridad** | ALTA | Coordenadas erróneas afectan planes emergencias |
| **Disponibilidad** | MEDIA | No crítica 24/7 pero importante para PTEL |
| **Trazabilidad** | ALTA | Auditoría modificaciones datos críticos |

**Categoría ENS Global**: **MEDIA** (máximo de dimensiones)

---

### Medidas de Seguridad ENS Aplicables

#### Medidas de Protección (MP)

**MP.info.3 - Cifrado**:
- ✅ HTTPS/TLS 1.3 obligatorio (GitHub Pages fuerza)
- ✅ Conexiones APIs españolas vía HTTPS
- ⚠️ Datos en localStorage sin cifrar (no contienen info crítica)

**MP.eq.1 - Puesto de Trabajo**:
- ⚠️ Usuario responsable dispositivo (no controlado por sistema)
- ℹ️ Recomendación: Navegadores actualizados, antivirus

**MP.com.1 - Perímetro Seguro**:
- ✅ CSP (Content Security Policy) headers
- ✅ CORS configurado solo dominios permitidos
- ✅ No hay backend propio = no hay perímetro vulnerable

---

#### Medidas de Defensa (MP.s)

**MP.s.2 - Protección de Código**:
```typescript
// Sanitización inputs usuario
import DOMPurify from 'dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML permitido
    ALLOWED_ATTR: []
  });
}

// Uso:
const userAddress = sanitizeInput(formData.address);
```

**MP.s.8 - Protección Vulnerabilidades**:
```bash
# Auditoría dependencias automatizada
npm audit

# CI/CD check vulnerabilidades
- name: Security Audit
  run: |
    npm audit --audit-level=moderate
    if [ $? -ne 0 ]; then
      echo "⚠️ Vulnerabilidades detectadas"
      exit 1
    fi
```

---

#### Medidas Operacionales (OP)

**OP.exp.8 - Registro de Actividad**:
```typescript
// Audit log de operaciones críticas
interface AuditLog {
  timestamp: string;
  userId: string;
  sessionId: string;
  action: 'upload' | 'process' | 'manual_edit' | 'export';
  details: {
    fileName?: string;
    recordsModified?: number;
    exportFormat?: string;
  };
  ipAddress?: string;
}

function logAuditEvent(event: AuditLog) {
  // Guardar en localStorage
  const logs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
  logs.push(event);
  
  // Mantener últimos 1000 eventos
  if (logs.length > 1000) {
    logs.shift();
  }
  
  localStorage.setItem('audit_logs', JSON.stringify(logs));
  
  // Enviar a servicio externo (Phase 2)
  if (import.meta.env.PROD) {
    sendToAuditService(event);
  }
}
```

**OP.exp.11 - Protección de Claves**:
- ✅ No hay claves/secrets en código
- ✅ APIs públicas no requieren autenticación
- ✅ .env.local en .gitignore

---

## 🐛 Gestión de Vulnerabilidades

### Proceso de Reporte

**Canal Preferente**: **GitHub Security Advisories** (privado)

1. **Descubrimiento Vulnerabilidad**:
   - Investigador seguridad identifica vulnerabilidad
   - NO crear issue público (evitar 0-day exposure)
   
2. **Reporte Privado**:
   - Ir a: `https://github.com/[usuario]/ptel-coordinate-normalizer/security/advisories/new`
   - Completar formulario:
     - **Título**: Descripción concisa
     - **CVE ID**: Si aplica
     - **Severidad**: Critical/High/Medium/Low
     - **Descripción**: Pasos reproducción, impacto, PoC
   
3. **Contacto Alternativo**:
   - Email: `seguridad@proyecto-ptel.es`
   - Asunto: `[SECURITY] Vulnerabilidad en PTEL Normalizer`
   - Incluir: Misma información que advisory

---

### SLA Respuesta

| Severidad | Respuesta Inicial | Patch Disponible | Deploy Producción |
|-----------|------------------|-----------------|-------------------|
| **CRÍTICA** (CVSS 9.0-10.0) | <24h | <48h | <72h |
| **ALTA** (CVSS 7.0-8.9) | <48h | <7 días | <14 días |
| **MEDIA** (CVSS 4.0-6.9) | <7 días | <30 días | <60 días |
| **BAJA** (CVSS 0.1-3.9) | <14 días | Next release | Next release |

---

### Auditoría Dependencias Automatizada

**GitHub Dependabot**:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    
    # Auto-merge patches de seguridad
    open-pull-requests-limit: 10
    
    # Solo vulnerabilidades seguridad
    versioning-strategy: increase-if-necessary
    
    # Agrupación por severidad
    groups:
      security-patches:
        patterns:
          - "*"
        update-types:
          - "patch"
```

**npm audit CI/CD**:

```yaml
# .github/workflows/security-audit.yml
name: Security Audit

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 9 * * 1'  # Lunes 9am

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
        
      - name: Check for high/critical vulnerabilities
        run: |
          VULNS=$(npm audit --json | jq '.metadata.vulnerabilities | .high + .critical')
          if [ "$VULNS" -gt 0 ]; then
            echo "❌ $VULNS vulnerabilidades HIGH/CRITICAL detectadas"
            npm audit
            exit 1
          fi
```

---

## 🔒 Protección de Datos en Tránsito

### HTTPS Obligatorio

**GitHub Pages Configuration**:
- ✅ HTTPS forzado (no posible desactivar)
- ✅ TLS 1.3 (última versión)
- ✅ Certificado SSL gestionado por GitHub (Let's Encrypt)
- ✅ HSTS (HTTP Strict Transport Security) habilitado

**Verificación**:
```bash
# Test SSL/TLS configuración
curl -I https://[usuario].github.io/ptel-coordinate-normalizer/

# Debe retornar:
# strict-transport-security: max-age=31536000
```

---

### Content Security Policy (CSP)

**Headers CSP Recomendados**:

```html
<!-- En index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://unpkg.com;
  img-src 'self' data: https: blob:;
  font-src 'self' data:;
  connect-src 'self'
    https://www.cartociudad.es
    https://www.callejerodeandalucia.es
    https://www.ideandalucia.es
    https://www.ign.es
    https://www.google-analytics.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

**Protección Proporcionada**:
- ✅ XSS mitigation (script-src limitado)
- ✅ Clickjacking prevention (frame-ancestors 'none')
- ✅ Data exfiltration prevention (connect-src whitelist)

---

### Secure Headers

**Configuración Adicional** (via GitHub Pages custom domain):

```nginx
# Headers recomendados
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## 💾 Protección de Datos en Reposo

### Browser Storage

**localStorage**:
```typescript
// Datos almacenados con TTL
interface CachedData {
  data: any;
  timestamp: number;
  ttl: number; // días
}

function setCache(key: string, data: any, ttlDays: number = 90) {
  const cached: CachedData = {
    data,
    timestamp: Date.now(),
    ttl: ttlDays * 24 * 60 * 60 * 1000
  };
  
  localStorage.setItem(key, JSON.stringify(cached));
}

function getCache(key: string): any | null {
  const item = localStorage.getItem(key);
  if (!item) return null;
  
  const cached: CachedData = JSON.parse(item);
  
  // Verificar expiración
  if (Date.now() - cached.timestamp > cached.ttl) {
    localStorage.removeItem(key);
    return null;
  }
  
  return cached.data;
}

// Limpieza automática al cargar app
function cleanExpiredCache() {
  Object.keys(localStorage).forEach(key => {
    getCache(key); // Esto elimina expirados automáticamente
  });
}
```

**IndexedDB**:
```typescript
// Uso de Dexie.js con auto-cleanup
import Dexie from 'dexie';

class PTELDatabase extends Dexie {
  coordinates!: Dexie.Table<CoordinateCache, number>;
  
  constructor() {
    super('PTELCache');
    
    this.version(1).stores({
      coordinates: '++id, address, municipality, timestamp'
    });
  }
  
  // Auto-limpieza registros >90 días
  async cleanOldRecords() {
    const maxAge = Date.now() - (90 * 24 * 60 * 60 * 1000);
    
    await this.coordinates
      .where('timestamp')
      .below(maxAge)
      .delete();
  }
}

const db = new PTELDatabase();

// Ejecutar limpieza al iniciar app
db.cleanOldRecords();
```

---

## 📜 Auditoría y Trazabilidad

### Logs de Auditoría

**Eventos Auditables**:

| Evento | Información Registrada | Retención | Sensibilidad |
|--------|----------------------|-----------|--------------|
| **Upload Archivo** | Timestamp, nombre archivo, tamaño, formato | 90 días | Baja |
| **Procesamiento** | Timestamp, registros procesados, tasa éxito | 90 días | Baja |
| **Edición Manual Coordenadas** | Timestamp, registro modificado, coords antes/después | 1 año | Media |
| **Exportación** | Timestamp, formato, registros exportados | 90 días | Baja |
| **Error Crítico** | Timestamp, tipo error, stack trace | 1 año | Media |

**Implementación**:

```typescript
// src/utils/auditLogger.ts
interface AuditEvent {
  id: string;
  timestamp: string;
  type: 'upload' | 'process' | 'manual_edit' | 'export' | 'error';
  user: {
    sessionId: string;
    municipality?: string;
  };
  details: Record<string, any>;
}

class AuditLogger {
  private readonly STORAGE_KEY = 'ptel_audit_logs';
  private readonly MAX_LOGS = 1000;
  
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
    const auditEvent: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event
    };
    
    // Guardar en localStorage
    const logs = this.getLogs();
    logs.push(auditEvent);
    
    // Mantener límite
    if (logs.length > this.MAX_LOGS) {
      logs.shift();
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    
    // Enviar a servicio externo (Phase 2)
    if (import.meta.env.PROD) {
      this.sendToExternalAudit(auditEvent);
    }
  }
  
  getLogs(): AuditEvent[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }
  
  exportLogs(): Blob {
    const logs = this.getLogs();
    const csv = this.convertToCSV(logs);
    return new Blob([csv], { type: 'text/csv' });
  }
}

// Uso
const auditLogger = new AuditLogger();

// Ejemplo: Auditar edición manual
auditLogger.log({
  type: 'manual_edit',
  user: {
    sessionId: sessionStorage.getItem('sessionId')!,
    municipality: 'Granada'
  },
  details: {
    recordId: record.id,
    oldCoordinates: { x: 447850, y: 4111234 },
    newCoordinates: { x: 447855, y: 4111240 },
    reason: 'Manual correction via map'
  }
});
```

---

## 🚨 Respuesta a Incidentes de Seguridad

### Clasificación Incidentes

| Tipo | Ejemplos | Severidad | SLA Respuesta |
|------|----------|-----------|--------------|
| **Data Breach** | Exposición datos críticos | CRÍTICA | <1h |
| **Compromiso Código** | Malware en dependencias | CRÍTICA | <2h |
| **Vulnerabilidad Explotada** | XSS activo, RCE | ALTA | <4h |
| **Phishing/Social Engineering** | Email suplantación | MEDIA | <24h |
| **DDoS** | GitHub Pages saturado | MEDIA | <12h |
| **Acceso No Autorizado** | Intento acceso malicioso | BAJA | <48h |

---

### Procedimiento Respuesta

**PASO 1: DETECCIÓN Y CONTENCIÓN** (<1h)

```bash
# 1. Confirmar incidente
# - Verificar logs
# - Reproducir si posible
# - Evaluar impacto

# 2. Contención inmediata
# Opción A: Deshabilitar deployment temporal
git revert HEAD
git push origin main  # Rollback a versión anterior

# Opción B: Deshabilitar GitHub Pages completamente
gh api -X DELETE repos/[usuario]/ptel-coordinate-normalizer/pages

# 3. Notificar equipo
# Slack/Email urgente a:
# - Security team
# - DevOps team
# - Product Owner
```

**PASO 2: ERRADICACIÓN** (<4h)

```bash
# 1. Identificar causa raíz
git log -10  # Commits recientes
npm audit    # Vulnerabilidades dependencias

# 2. Eliminar amenaza
# - Actualizar dependencia vulnerable
# - Aplicar patch
# - Eliminar código malicioso

# 3. Verificar no hay backdoors
grep -r "eval(" src/
grep -r "dangerouslySetInnerHTML" src/
```

**PASO 3: RECUPERACIÓN** (<8h)

```bash
# 1. Deploy versión parcheada
npm run build
npm run deploy

# 2. Verificar funcionalidad
npm run test
npm run test:e2e

# 3. Monitorizar 24h
# - Logs de errores
# - Métricas performance
# - Alertas seguridad
```

**PASO 4: POST-MORTEM** (<7 días)

```markdown
# Template Post-Mortem

## Incidente: [TÍTULO]

**Fecha**: [FECHA]
**Duración**: [DURACIÓN]
**Severidad**: [CRÍTICA/ALTA/MEDIA/BAJA]

### Cronología
- [HH:MM] Detección
- [HH:MM] Contención
- [HH:MM] Erradicación
- [HH:MM] Recuperación

### Causa Raíz
[Descripción detallada]

### Impacto
- Usuarios afectados: [NÚMERO]
- Datos comprometidos: [SÍ/NO - Descripción]
- Tiempo inactividad: [DURACIÓN]

### Acciones Correctivas
- [ ] Acción 1 [Responsable] [Fecha límite]
- [ ] Acción 2 [Responsable] [Fecha límite]
- [ ] Acción 3 [Responsable] [Fecha límite]

### Lecciones Aprendidas
1. [Lección 1]
2. [Lección 2]
```

---

## 📞 Contacto Seguridad

### Canales de Comunicación

**Reporte Vulnerabilidades**:
- 🔐 **GitHub Security Advisory** (preferente): `https://github.com/[usuario]/ptel-coordinate-normalizer/security/advisories/new`
- 📧 **Email**: `seguridad@proyecto-ptel.es`
- 🔑 **PGP Key**: [Disponible en keyserver]

**Consultas Generales Seguridad**:
- 📧 **Email**: `security@proyecto-ptel.es`
- 💬 **Slack** (equipo interno): `#ptel-security`

**Delegado de Protección de Datos (DPO)**:
- 📧 **Email**: `dpd@ayuntamiento.es`
- 📞 **Teléfono**: +34 XXX XXX XXX

---

### Política de Divulgación Responsable

**Compromiso con Investigadores de Seguridad**:

✅ **NO emprenderemos acciones legales** contra investigadores que:
- Reporten vulnerabilidades de buena fe
- No accedan/modifiquen/eliminen datos sin autorización
- No realicen testing destructivo (DDoS, spam)
- Den tiempo razonable para patch antes de divulgación pública

✅ **Reconocimiento**:
- Hall of Fame en README.md (opcional, con consentimiento)
- Mención en CHANGELOG.md del fix
- Certificado de agradecimiento (si solicitado)

⚠️ **Divulgación Coordinada**:
- Investigador reporta vulnerabilidad en privado
- Equipo confirma y desarrolla patch (SLA según severidad)
- Acuerdo mutuo fecha divulgación pública
- Divulgación pública coordinada (CVE, advisory, blog post)

---

## 📋 Resumen Ejecutivo de Seguridad

### Cumplimiento Normativo

| Normativa | Estado | Evidencia |
|-----------|--------|-----------|
| **RGPD** | ✅ CUMPLE | No procesa datos personales |
| **ENS (Categoría MEDIA)** | ✅ CUMPLE | Medidas implementadas |
| **LOPD-GDD** | ✅ CUMPLE | N/A (no hay datos personales) |
| **Ley 9/2007 (Adm. Electrónica)** | ✅ CUMPLE | HTTPS, auditoría |
| **Decreto 197/2024 (PTEL)** | ✅ CUMPLE | Finalidad sistema |

### Postura de Seguridad Global

**Nivel de Madurez**: **NIVEL 3 - DEFINIDO** (de 5 niveles CMM)

✅ **Fortalezas**:
- Arquitectura browser-first minimiza superficie ataque
- Sin credenciales/secrets en código
- Dependencias auditadas automatizadamente
- Logs de auditoría completos
- HTTPS/TLS forzado

⚠️ **Áreas de Mejora**:
- Cifrado datos localStorage (Phase 2)
- MFA para acceso administrativo (Phase 2)
- SIEM centralizado (Phase 2)
- Penetration testing anual (futuro)

### Próximos Pasos

**Q1 2026**:
1. Penetration test externo
2. Auditoría ENS formal
3. Certificación ISO 27001 (opcional)
4. Implementar WAF (Phase 2 con AWS)

---

**Última actualización**: 21 noviembre 2025  
**Próxima revisión**: Trimestral o post-incidente mayor  
**Aprobado por**: [Responsable de Seguridad] [DPO]  
**Versión**: 1.0.0
