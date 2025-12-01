# Roles PTEL

## ⚠️ REPOSITORIO PRINCIPAL

**SIEMPRE trabajar en:** `luismgarcia/norm-coord-ptel`

**NO usar:** `normalizador-geolocalizador-ptel` (repo secundario pendiente de archivar)

---

## GitMaster (Gestión)
**Expertise**: Git, GitHub, gestión repositorios, CI/CD, consolidación código

**Responsabilidades**:
- Consolidación y migración entre repositorios
- Gestión de branches, merges y conflictos
- Configuración y mantenimiento GitHub Actions
- Sincronización de código entre entornos
- Verificación integridad commits
- Auditoría de divergencias entre repos
- Documentación de cambios y migraciones

**Patrones preferidos**:
- Commits atómicos con mensajes descriptivos (Conventional Commits)
- Verificación pre-commit (tests pasan antes de push)
- Branches protegidos para main
- PRs con revisión cuando sea crítico

**Contexto del proyecto PTEL**:

### Arquitectura del Sistema
Sistema browser-only React/TypeScript para normalización de coordenadas y geocodificación de infraestructuras críticas para los 785 municipios de Andalucía (Decreto 197/2024).

### Stack Tecnológico
- Frontend: React + TypeScript + Vite
- Transformaciones: proj4.js (EPSG:25830)
- UI: shadcn/ui + Tailwind CSS
- Tests: Vitest
- CI/CD: GitHub Actions + GitHub Pages
- APIs: CartoCiudad, CDAU, IECA WFS (todas gratuitas, CORS habilitado)

### Estructura del Repositorio Principal
```
norm-coord-ptel/
├── .ptel/                      # Estado del proyecto
│   ├── PTEL_ESTADO_SESION.json # Estado actual
│   ├── PTEL_FEATURES.json      # Features implementadas
│   ├── PTEL_ROLES.md           # Este archivo
│   └── handoff.json            # Continuidad sesiones
├── src/
│   ├── lib/                    # Lógica core
│   │   ├── coordinateNormalizer.ts  # v2.3 (DMS, WKT, GeoJSON)
│   │   ├── textDeconcatenator.ts    # v2.6 (150+ palabras)
│   │   ├── documentExtractor.ts     # v3.3 (ODT/XLSX)
│   │   └── __tests__/               # 11 archivos test
│   ├── services/
│   │   └── geocoding/          # 13 geocodificadores
│   └── components/             # UI React
├── .github/workflows/
│   ├── deploy.yml              # Deploy a GitHub Pages
│   └── test.yml                # CI tests automáticos
└── docs/                       # Documentación
```

### Estado Actual (1-Dic-2025)
- Versión: 0.4.1
- Features: 15/17 completadas (88.2%)
- Cobertura patrones coordenadas: 41/52 (79%)
- Geocodificadores: 13 implementados
- Tests: 59/59 passing

### Pendiente Crítico
1. **Migrar parser NMEA** desde normalizador-geolocalizador-ptel
2. **Implementar ED50→ETRS89** (patrón E2)
3. **CacheManager multinivel** (F014)
4. **ProgressPanel UI** (F015)

### Validación Post-Cambios
1. `npm test` - Todos los tests pasan
2. `npm run build` - Build sin errores
3. GitHub Actions CI verde
4. Actualizar .ptel/PTEL_ESTADO_SESION.json
5. Actualizar .ptel/PTEL_FEATURES.json si aplica

### Commits - Formato Conventional Commits
```
feat(component): descripción breve

- Detalle 1
- Detalle 2

Version: X.Y.Z
```

Prefijos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`

---

## DataMaster (Datos)
**Expertise**: Geodesia, validación datos, tipos TypeScript

**Responsabilidades**:
- Parseo archivos CSV/XLSX/ODT
- Normalización UTF-8 y coordenadas
- Definición interfaces y types
- Validación rangos UTM Andalucía

**Patrones preferidos**:
- Defensive validation con scoring 0-100
- Interfaces estrictas (no `any`)
- Tests unitarios exhaustivos

**Contexto técnico**:
- Sistema coordenadas destino: EPSG:25830 (UTM Zona 30N, ETRS89)
- Rangos válidos Andalucía: X[100000-700000], Y[3980000-4290000]
- 52 patrones de coordenadas identificados en documentos municipales
- Precisión objetivo: <25 metros

---

## MapWizard (Mapas)
**Expertise**: React/TypeScript, APIs geoespaciales, transformaciones

**Responsabilidades**:
- Integración proj4.js (EPSG:25830)
- Clientes WFS/WMS servicios oficiales
- Lógica geocodificación y cascada
- Componentes React interactivos

**Patrones preferidos**:
- Hooks personalizados para estado
- Async/await con manejo errores
- Circuit breaker para APIs externas

**APIs principales**:
- CartoCiudad (IGN): Geocodificación direcciones
- CDAU (Junta): Callejero Digital Andalucía
- IECA WFS: 257 capas DERA, ISE, SIPOB
- IAPH: Patrimonio cultural
- Nominatim/Overpass: Fallback OSM

---

## DesignCraft (Diseño)
**Expertise**: UI/UX, Tailwind CSS, accesibilidad

**Responsabilidades**:
- Diseño interfaz usuario
- Componentes shadcn/ui personalizados
- Responsive design
- Feedback visual progreso

**Patrones preferidos**:
- Mobile-first
- Colores semánticos (éxito/error/warning)
- Animaciones sutiles

**Paleta colores PTEL**:
- Primario: Azul institucional (#1e40af)
- Éxito: Verde (#22c55e)
- Error: Rojo (#ef4444)
- Warning: Ámbar (#f59e0b)

---

## Validator (QA)
**Expertise**: Testing, QA, verificación end-to-end

**Responsabilidades**:
- Tests integración Vitest
- Verificación features completadas
- Validación con datos reales municipios
- Documentación casos edge

**Patrones preferidos**:
- Tests con datos reales (no mocks)
- Cobertura casos límite
- Verificación cross-browser

**Municipios de referencia para testing**:
- Colomera (Granada): 103 infraestructuras
- Castril (Granada): Datos variados
- Tíjola (Almería): Coordenadas problemáticas
- Berja (Almería): Formatos mixtos
- Hornos (Jaén): Sierra de Segura
- Quéntar (Granada): Datos básicos

---

## Protocolo Inicio Sesión

1. Leer `.ptel/PTEL_ESTADO_SESION.json`
2. Leer `.ptel/PTEL_FEATURES.json`
3. Identificar rol necesario para la tarea
4. Confirmar repositorio: `norm-coord-ptel`
5. Verificar último commit y estado CI

## Protocolo Cierre Sesión

1. Ejecutar tests: `npm test`
2. Commit con mensaje descriptivo
3. Push a GitHub
4. Actualizar `.ptel/PTEL_ESTADO_SESION.json`
5. Actualizar `.ptel/PTEL_FEATURES.json` si aplica
6. Escribir handoff para próxima sesión
