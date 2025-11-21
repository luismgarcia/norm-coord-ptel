# DEPLOYMENT_GUIDE.md
## Manual de Despliegue a Producción - PTEL Coordinate Normalizer

> Guía completa para desplegar el Sistema de Normalización de Coordenadas PTEL en producción (GitHub Pages y AWS Lambda)

---

## 📋 Índice

1. [Prerequisitos](#prerequisitos)
2. [Arquitectura de Deployment](#arquitectura-de-deployment)
3. [Deployment Fase 1: GitHub Pages (Actual)](#deployment-fase-1-github-pages)
4. [Deployment Fase 2: AWS Lambda (Planificado)](#deployment-fase-2-aws-lambda)
5. [Verificación Post-Deployment](#verificación-post-deployment)
6. [Rollback y Recuperación](#rollback-y-recuperación)
7. [Troubleshooting](#troubleshooting)

---

## ⚙️ Prerequisitos

### Herramientas Requeridas

```bash
# Node.js 18+ (recomendado 20 LTS)
node --version  # debe ser ≥18.0.0
npm --version   # debe ser ≥9.0.0

# Git configurado
git --version   # debe ser ≥2.30.0

# Opcional: AWS CLI (para Fase 2)
aws --version   # debe ser ≥2.0.0
```

### Accesos y Credenciales

- ✅ Cuenta GitHub con acceso al repositorio
- ✅ Permisos de escritura en rama `main` y `gh-pages`
- ✅ GitHub Pages habilitado en configuración del repositorio
- ✅ (Fase 2) Cuenta AWS con permisos IAM: Lambda, S3, CloudFront, DynamoDB

### Variables de Entorno

**Desarrollo (`.env.development`):**
```env
VITE_APP_NAME=PTEL Coordinate Normalizer
VITE_APP_VERSION=0.5.0
VITE_API_BASE_URL=http://localhost:5173
VITE_ENABLE_DEBUG=true

# APIs Españolas
VITE_CARTOCIUDAD_ENDPOINT=https://www.cartociudad.es/geocoder/api/geocoder
VITE_CDAU_WFS_ENDPOINT=https://www.callejerodeandalucia.es/servicios/cdau/wfs
VITE_IDEE_GEOCODER_ENDPOINT=https://geolocalizador.idee.es/v1
VITE_ENABLE_CORS_PROXY=false
```

**Producción (`.env.production`):**
```env
VITE_APP_NAME=PTEL Coordinate Normalizer
VITE_APP_VERSION=0.5.0
VITE_API_BASE_URL=https://usuario.github.io/ptel-coordinate-normalizer
VITE_ENABLE_DEBUG=false

# APIs Españolas (producción)
VITE_CARTOCIUDAD_ENDPOINT=https://www.cartociudad.es/geocoder/api/geocoder
VITE_CDAU_WFS_ENDPOINT=https://www.callejerodeandalucia.es/servicios/cdau/wfs
VITE_IDEE_GEOCODER_ENDPOINT=https://geolocalizador.idee.es/v1
VITE_ENABLE_CORS_PROXY=true

# Analytics
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 🏗️ Arquitectura de Deployment

### Fase 1: Browser-Only (GitHub Pages) ✅ Actual

```
┌─────────────────┐
│   Navegador     │
│  (JavaScript)   │
├─────────────────┤
│ React/TypeScript│
│  + Leaflet.js   │
│  + proj4.js     │
└────────┬────────┘
         │
         ├──────► GitHub Pages (CDN estático)
         │
         ├──────► CartoCiudad API (CNIG)
         ├──────► IDEE Geolocalizador (IGN)
         └──────► CDAU WFS (IECA)

Características:
- ✅ €0 coste hosting
- ✅ Deploy en ~5 minutos
- ✅ SSL/HTTPS automático
- ⚠️ Todo procesamiento en cliente
```

### Fase 2: Híbrido AWS Lambda (Q1 2025) 🚧 Planificado

```
┌─────────────────┐
│   Navegador     │
│  (JavaScript)   │
├─────────────────┤
│ React Frontend  │
│  (S3 + CloudFront)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌──────────────┐
│ APIs   │  │ AWS Lambda   │
│Externas│  │ + API Gateway│
└────────┘  └──────┬───────┘
                   │
          ┌────────┴────────┐
          │                 │
    ┌─────▼─────┐     ┌────▼─────┐
    │ DynamoDB  │     │ElastiCache│
    │  (cache)  │     │  (Redis) │
    └───────────┘     └──────────┘

Características:
- ✅ Procesamiento backend escalable
- ✅ Cache Redis 90 días
- ✅ Concurrencia 1000 Lambda
- 💰 ~€33/año operación
```

---

## 🚀 Deployment Fase 1: GitHub Pages

### Checklist Pre-Deployment

```bash
# 1. Verificar que rama está limpia
git status
# Debería mostrar: "nothing to commit, working tree clean"

# 2. Asegurar que estás en la rama correcta
git branch --show-current
# Debería mostrar: main o develop

# 3. Ejecutar tests
npm run test
# ✅ Todos los tests deben pasar

# 4. Lint sin errores
npm run lint
# ✅ No debe haber errores ESLint

# 5. Type-check exitoso
npm run type-check
# ✅ TypeScript sin errores

# 6. Build local exitoso
npm run build
# ✅ Build completo sin errores

# 7. Preview build localmente
npm run preview
# ✅ Verificar funcionamiento en http://localhost:4173
```

### Opción 1: Deployment Automático (GitHub Actions) ⭐ Recomendado

**Workflow:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Instalar dependencias
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type-check
        run: npm run type-check

      - name: Tests unitarios
        run: npm run test

      - name: Build producción
        run: npm run build
        env:
          NODE_ENV: production

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Activación del deployment automático:**

```bash
# 1. Push a main activa el workflow
git checkout main
git merge develop  # O trabajar directamente en main
git push origin main

# 2. Verificar workflow en GitHub Actions
# https://github.com/usuario/ptel-coordinate-normalizer/actions

# 3. Esperar ~3-5 minutos para deployment completo

# 4. Verificar aplicación desplegada
# https://usuario.github.io/ptel-coordinate-normalizer/
```

### Opción 2: Deployment Manual

```bash
# 1. Instalar dependencias (si no están)
npm install

# 2. Build producción
npm run build

# 3. Deployment manual usando gh-pages
npm run deploy

# O usando gh-pages package directamente:
npx gh-pages -d dist -b gh-pages

# 4. Verificar deployment exitoso
# GitHub Pages detecta automáticamente la rama gh-pages
# y despliega en pocos minutos
```

### Configuración GitHub Pages (UI)

1. Ve a **Settings** → **Pages** en tu repositorio
2. **Source:** Deploy from a branch
3. **Branch:** `gh-pages` / `root`
4. **Save**
5. Espera ~2-3 minutos
6. URL disponible: `https://usuario.github.io/ptel-coordinate-normalizer/`

### Configuración `vite.config.ts` para GitHub Pages

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
  // CRÍTICO: Base path para GitHub Pages
  base: process.env.NODE_ENV === 'production' 
    ? '/ptel-coordinate-normalizer/'  // <-- Reemplazar con nombre repo
    : '/',
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  
  build: {
    outDir: 'dist',
    sourcemap: false,  // Desactivar en producción
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'leaflet': ['leaflet', 'react-leaflet'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
})
```

---

## 🔧 Deployment Fase 2: AWS Lambda

> **Estado:** 🚧 Planificado para Q1 2025  
> **Documentación completa disponible en:** `Production-Ready_pyproj_AWS_Lambda.md`

### Prerequisitos AWS

```bash
# 1. Instalar AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 2. Configurar credenciales
aws configure
# AWS Access Key ID: AKIAXXXXXXXXXXXXXXXX
# AWS Secret Access Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Default region: eu-west-1
# Default output format: json

# 3. Verificar acceso
aws sts get-caller-identity
```

### Lambda Container Build

**Dockerfile para geocodificación:**

```dockerfile
# ARG para plataforma
ARG PLATFORM=linux/arm64

FROM --platform=$PLATFORM public.ecr.aws/lambda/python:3.12-arm64

# Instalar dependencias sistema
RUN dnf install -y \
    gcc \
    g++ \
    cmake \
    sqlite-devel \
    proj-devel \
    && dnf clean all

# Copiar requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copiar grid PENR2009.gsb (precisión centimétrica España)
COPY grids/PENR2009.gsb ${LAMBDA_TASK_ROOT}/grids/

# Copiar código Lambda
COPY handler.py ${LAMBDA_TASK_ROOT}
COPY services/ ${LAMBDA_TASK_ROOT}/services/

# Variables entorno PROJ
ENV PROJ_LIB=${LAMBDA_TASK_ROOT}/grids \
    PROJ_DATA=${LAMBDA_TASK_ROOT}/grids \
    PROJ_NETWORK=OFF

CMD ["handler.lambda_handler"]
```

**requirements.txt:**

```txt
pyproj==3.7.2
boto3==1.34.0
redis==5.0.0
psycopg2-binary==2.9.9
requests==2.31.0
```

### Build y Push a ECR

```bash
# 1. Crear repositorio ECR
aws ecr create-repository \
  --repository-name ptel-geocoding \
  --region eu-west-1

# 2. Login a ECR
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.eu-west-1.amazonaws.com

# 3. Build imagen ARM64 (20% más barato)
docker buildx build \
  --platform linux/arm64 \
  -t ptel-geocoding:latest \
  -f Dockerfile.lambda .

# 4. Tag imagen
docker tag ptel-geocoding:latest \
  123456789012.dkr.ecr.eu-west-1.amazonaws.com/ptel-geocoding:latest

# 5. Push a ECR
docker push \
  123456789012.dkr.ecr.eu-west-1.amazonaws.com/ptel-geocoding:latest
```

### Deploy Lambda con SAM

**template.yaml (AWS SAM):**

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Timeout: 900
    MemorySize: 1024
    Architectures:
      - arm64
    Environment:
      Variables:
        CARTOCIUDAD_ENDPOINT: https://www.cartociudad.es/geocoder/api/geocoder
        CDAU_WFS_ENDPOINT: https://www.callejerodeandalucia.es/servicios/cdau/wfs
        REDIS_ENDPOINT: !GetAtt ElastiCacheCluster.RedisEndpoint.Address
        DYNAMODB_TABLE: !Ref CacheTable

Resources:
  GeocodingFunction:
    Type: AWS::Serverless::Function
    Properties:
      PackageType: Image
      ImageUri: 123456789012.dkr.ecr.eu-west-1.amazonaws.com/ptel-geocoding:latest
      Events:
        ApiEvent:
          Type: Api
          Properties:
            Path: /geocode
            Method: post
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref CacheTable
        - VPCAccessPolicy: {}

  CacheTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: ptel-geocoding-cache
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: address_hash
          AttributeType: S
      KeySchema:
        - AttributeName: address_hash
          KeyType: HASH
      TimeToLiveSpecification:
        Enabled: true
        AttributeName: ttl

  ElastiCacheCluster:
    Type: AWS::ElastiCache::CacheCluster
    Properties:
      CacheNodeType: cache.t4g.micro
      Engine: redis
      NumCacheNodes: 1

Outputs:
  ApiEndpoint:
    Description: "API Gateway endpoint"
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/geocode"
```

**Deploy:**

```bash
# 1. Build y deploy con SAM
sam build
sam deploy \
  --stack-name ptel-geocoding-prod \
  --capabilities CAPABILITY_IAM \
  --region eu-west-1 \
  --no-fail-on-empty-changeset

# 2. Obtener API endpoint
aws cloudformation describe-stacks \
  --stack-name ptel-geocoding-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text

# 3. Test endpoint
curl -X POST https://xxxxx.execute-api.eu-west-1.amazonaws.com/Prod/geocode \
  -H "Content-Type: application/json" \
  -d '{"address": "Plaza del Carmen 1", "municipality": "Granada"}'
```

---

## ✅ Verificación Post-Deployment

### Checklist Funcional

```bash
# 1. Aplicación carga sin errores
curl -I https://usuario.github.io/ptel-coordinate-normalizer/
# HTTP/2 200 OK

# 2. Assets cargan correctamente
# Verificar en DevTools → Network:
# - index.html (200)
# - main-*.js (200)
# - vendor-*.js (200)
# - styles-*.css (200)

# 3. JavaScript sin errores
# Abrir DevTools → Console
# No debe haber errores rojos

# 4. Leaflet mapa renderiza
# Verificar tiles PNOA cargan:
# Network → Filter "wms" → Status 200

# 5. APIs externas funcionan
# Test manual: Upload CSV → Verificar geocodificación

# 6. Transformaciones CRS correctas
# Test: coordenada conocida (447850, 4111234) → lat/lon correcto
```

### Tests Automatizados Post-Deploy

```typescript
// tests/e2e/deployment.spec.ts
import { test, expect } from '@playwright/test';

test('deployment smoke tests', async ({ page }) => {
  // 1. Aplicación carga
  await page.goto('https://usuario.github.io/ptel-coordinate-normalizer/');
  await expect(page).toHaveTitle(/PTEL Coordinate Normalizer/);
  
  // 2. No errores JavaScript
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.waitForTimeout(3000);
  expect(errors).toHaveLength(0);
  
  // 3. Leaflet mapa carga
  await page.waitForSelector('.leaflet-container');
  const mapExists = await page.$('.leaflet-container');
  expect(mapExists).toBeTruthy();
  
  // 4. Upload funciona
  const fileInput = await page.$('input[type="file"]');
  expect(fileInput).toBeTruthy();
});
```

### Métricas a Monitorizar (Primera Semana)

```bash
# Google Analytics 4
# - Sesiones únicas
# - Tasa de rebote
# - Tiempo promedio sesión
# - Errores JavaScript (via eventos custom)

# Performance
# - Lighthouse Score: >90
# - First Contentful Paint: <1.5s
# - Largest Contentful Paint: <2.5s
# - Cumulative Layout Shift: <0.1
```

---

## 🔄 Rollback y Recuperación

### Rollback GitHub Pages (Opción 1: Revert Commit)

```bash
# 1. Identificar último commit bueno
git log --oneline -10

# 2. Revertir commit problemático
git revert <commit-hash>

# 3. Push revert
git push origin main

# 4. GitHub Actions re-despliega automáticamente
# Esperar ~3-5 minutos
```

### Rollback GitHub Pages (Opción 2: Forzar versión anterior)

```bash
# 1. Checkout a versión anterior
git checkout v0.4.0  # O tag/commit específico

# 2. Forzar push a main (CUIDADO)
git push -f origin HEAD:main

# 3. GitHub Actions despliega versión anterior
```

### Rollback AWS Lambda

```bash
# 1. Listar versiones Lambda
aws lambda list-versions-by-function \
  --function-name ptel-geocoding

# 2. Rollback a versión anterior
aws lambda update-alias \
  --function-name ptel-geocoding \
  --name prod \
  --function-version 3  # Versión anterior

# 3. Verificar rollback exitoso
aws lambda get-alias \
  --function-name ptel-geocoding \
  --name prod
```

### Plan de Disaster Recovery

```yaml
# Tiempos objetivo
RTO (Recovery Time Objective): < 15 minutos
RPO (Recovery Point Objective): < 5 minutos

# Procedimiento emergencia
1. Identificar incidente (5 min)
   - Alertas CloudWatch
   - Reportes usuarios
   
2. Decisión rollback (3 min)
   - Si: error crítico, datos corruptos, seguridad
   - No: error menor, degradación <20%
   
3. Ejecutar rollback (5 min)
   - GitHub Pages: revert commit
   - AWS Lambda: update alias
   
4. Verificación (2 min)
   - Smoke tests automatizados
   - Verificación manual crítica

5. Comunicación (continuo)
   - Notificar usuarios afectados
   - Documentar incident report
```

---

## 🔧 Troubleshooting

### Problema 1: Build Falla con Error TypeScript

**Síntomas:**
```bash
npm run build
# ERROR: Type 'string | undefined' is not assignable to type 'string'
```

**Solución:**
```bash
# 1. Limpiar cache TypeScript
rm -rf node_modules/.cache
rm -rf dist

# 2. Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# 3. Verificar tsconfig.json
cat tsconfig.json
# "strict": true debe estar habilitado

# 4. Fix errores tipo
# Usar guards: if (value !== undefined) { ... }
# O aserciones: value!
```

### Problema 2: GitHub Pages Muestra 404

**Síntomas:**
- URL carga pero muestra 404 Not Found
- GitHub Actions workflow exitoso

**Solución:**
```bash
# 1. Verificar base path en vite.config.ts
# base: '/nombre-repositorio/'  # <-- Debe coincidir exactamente

# 2. Verificar rama gh-pages existe
git branch -r | grep gh-pages
# Debe mostrar: origin/gh-pages

# 3. Verificar contenido rama gh-pages
git checkout gh-pages
ls -la
# Debe contener index.html, assets/, etc.

# 4. Forzar rebuild GitHub Pages
# Settings → Pages → Cambiar branch a "None" → Save
# Esperar 1 min → Cambiar a "gh-pages" → Save
```

### Problema 3: CORS Errors con APIs Españolas

**Síntomas:**
```
Access to fetch at 'https://www.cartociudad.es/...' from origin 
'https://usuario.github.io' has been blocked by CORS policy
```

**Solución:**
```typescript
// src/services/geocoding/CartoCiudadService.ts

// Opción 1: Usar JSONP para CartoCiudad (soportado oficialmente)
const url = `${CARTOCIUDAD_ENDPOINT}/candidatesJsonp?q=${address}&callback=processResults`;
const script = document.createElement('script');
script.src = url;

// Opción 2: Usar IDEE Geolocalizador (CORS habilitado)
const url = `https://geolocalizador.idee.es/v1/search?text=${address}`;
const response = await fetch(url); // ✅ CORS OK

// Opción 3: Proxy server-side (Fase 2 AWS Lambda)
const url = `/api/proxy/cartociudad?address=${address}`;
// Lambda proxy maneja CORS internamente
```

### Problema 4: Leaflet Mapa No Renderiza

**Síntomas:**
- Espacio en blanco donde debería estar mapa
- Console error: "Map container not found"

**Solución:**
```typescript
// 1. Verificar CSS Leaflet importado
// src/main.tsx o src/App.tsx
import 'leaflet/dist/leaflet.css';

// 2. Verificar altura contenedor
// src/components/Map.tsx
<div className="h-[600px] w-full">  {/* <-- altura explícita */}
  <MapContainer center={[37.18, -3.60]} zoom={8}>
    ...
  </MapContainer>
</div>

// 3. Fix iconos Leaflet rotos
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow
});
L.Marker.prototype.options.icon = DefaultIcon;
```

### Problema 5: Lambda Timeout (>15 min)

**Síntomas:**
```json
{
  "errorType": "Task timed out after 900.00 seconds"
}
```

**Solución:**
```python
# handler.py

# Opción 1: Procesar en batches más pequeños
BATCH_SIZE = 50  # Reducir de 100 a 50

# Opción 2: Usar Step Functions para orchestration
# Dividir workload en múltiples Lambda invocations

# Opción 3: Aumentar timeout (máx 15 min)
# template.yaml
Globals:
  Function:
    Timeout: 900  # Ya en máximo

# Opción 4: Optimizar queries
# - Usar DynamoDB cache primero
# - Paralelizar con asyncio.gather()
# - Implementar circuit breaker para APIs lentas
```

### Problema 6: Costes AWS Exceden Presupuesto

**Síntomas:**
- AWS Bill >€50/mes
- CloudWatch alertas billing

**Solución:**
```bash
# 1. Identificar costes principales
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=SERVICE

# 2. Optimizaciones comunes:
# - Reducir Lambda memory a 512 MB
# - Usar Provisioned Concurrency solo en picos
# - Aumentar cache TTL Redis 90→180 días
# - Activar S3 Intelligent-Tiering
# - Eliminar logs CloudWatch >30 días

# 3. Activar alarmas billing
aws cloudwatch put-metric-alarm \
  --alarm-name billing-alert-50eur \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --period 21600 \
  --threshold 50 \
  --statistic Maximum
```

---

## 📞 Soporte y Escalación

### Contactos Técnicos

| Componente | Contacto | Tiempo Respuesta |
|------------|----------|------------------|
| **GitHub Pages** | github-support@github.com | 24-48h |
| **CartoCiudad API** | consulta.cartografia@cnig.es | 2-5 días |
| **CDAU/IECA** | ise.produccion.ieca@juntadeandalucia.es | 3-7 días |
| **AWS Support** | aws-support@amazon.com | Según plan |

### Escalación de Incidentes

```yaml
Severidad 1 (Crítica): Sistema completamente caído
  - Tiempo respuesta: Inmediato
  - Acción: Rollback automático
  - Notificación: Email + SMS equipo

Severidad 2 (Alta): Funcionalidad crítica afectada >20% usuarios
  - Tiempo respuesta: <1h
  - Acción: Investigación + hotfix
  - Notificación: Email equipo

Severidad 3 (Media): Degradación no crítica
  - Tiempo respuesta: <4h
  - Acción: Fix en próximo sprint
  - Notificación: Issue GitHub

Severidad 4 (Baja): Mejora o optimización
  - Tiempo respuesta: <1 semana
  - Acción: Backlog
  - Notificación: Issue GitHub (low priority)
```

---

## 📚 Referencias

- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)
- [AWS Lambda Container Images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [CartoCiudad API Docs](https://www.idee.es/resources/documentos/Cartociudad/CartoCiudad_ServiciosWeb.pdf)
- [CDAU Servicios](https://www.callejerodeandalucia.es/portal/formacion-tecnica)

---

**Última actualización:** 22 noviembre 2025  
**Versión:** 1.0.0  
**Autor:** Equipo PTEL Andalucía
