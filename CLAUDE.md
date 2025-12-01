# UTM Normalizer PTEL - Andalucía

## Proyecto
Sistema browser-only para normalizar coordenadas UTM de planes de emergencia municipal (785 municipios andaluces). Requisito: Decreto 197/2024.

## Identificación del Repositorio
- **Nombre exacto:** `norm-coord-ptel`
- **Ubicación:** `Documents/GitHub/norm-coord-ptel` (detectar dinámicamente)
- **Verificación:** Debe existir carpeta `.ptel/` dentro

## PROTOCOLO OBLIGATORIO AL INICIAR SESIÓN

Claude DEBE ejecutar esta secuencia ANTES de leer archivos de estado:

1. `list_allowed_directories` → Listar directorios permitidos
2. Buscar carpeta `norm-coord-ptel` (nombre exacto)
3. **EXCLUIR** carpetas que empiecen por: `_BACKUP_`, `_OLD_`, `_TEST_`
4. Verificar que existe `.ptel/` dentro
5. Informar al usuario qué ruta encontró
6. Leer archivos `.ptel/*.json`

**Claude NO debe asumir rutas. Siempre detectar dinámicamente.**

Si hay ambigüedad (0 o más de 1 resultado), preguntar al usuario.

## Stack
- React 18 + TypeScript 5.3 + Vite
- proj4.js (transformaciones EPSG:25830)
- Zustand (estado), shadcn/ui (componentes)
- Browser-only (sin backend)

## Comandos
```bash
npm run dev      # Servidor desarrollo
npm run build    # Build producción
npm run test     # Tests Vitest
```

## Convenciones
- Componentes funcionales con hooks
- NO usar `any` en TypeScript
- Municipios: código INE + nombre + provincia
- Coordenadas: X=Easting, Y=Northing (UTM30 ETRS89)

## Estado del Proyecto
Ver `.ptel/PTEL_ESTADO_SESION.json`

## Arquitectura de Archivos
```
src/
├── components/     # UI React
├── services/       # Lógica geocodificación
├── types/          # Interfaces TypeScript
└── utils/          # Helpers (normalización UTF-8, coords)
```

## APIs Oficiales
- CartoCiudad IGN: Geocodificación direcciones
- CDAU Andalucía: Callejero oficial
- SICESS: Centros sanitarios
- IAPH: Patrimonio cultural

## Métricas Objetivo
- Completitud coords: 26.9% → 95%
- Precisión: ±500m → ±25m
- Coste: <50 EUR/año

## Documentación Completa
Ver `.ptel/GUIA_TRABAJO_CLAUDE_v4.md`