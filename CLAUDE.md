# UTM Normalizer PTEL - Andalucia

## Proyecto
Sistema browser-only para normalizar coordenadas UTM de planes de emergencia municipal (786 municipios andaluces). Requisito: Decreto 197/2024.

## Stack
- React 18 + TypeScript 5.3 + Vite
- proj4.js (transformaciones EPSG:25830)
- Zustand (estado), shadcn/ui (componentes)
- Browser-only (sin backend)

## Comandos
```bash
npm run dev      # Servidor desarrollo
npm run build    # Build produccion
npm run test     # Tests Vitest
```

## Convenciones
- Componentes funcionales con hooks
- NO usar `any` en TypeScript
- Municipios: codigo INE + nombre + provincia
- Coordenadas: X=Easting, Y=Northing (UTM30 ETRS89)

## Estado del Proyecto
Ver `.ptel/PTEL_ESTADO_SESION.json`

## Arquitectura de Archivos
```
src/
├── components/     # UI React
├── services/       # Logica geocodificacion
├── types/          # Interfaces TypeScript
└── utils/          # Helpers (normalizacion UTF-8, coords)
```

## APIs Oficiales
- CartoCiudad IGN: Geocodificacion direcciones
- CDAU Andalucia: Callejero oficial
- SICESS: Centros sanitarios
- IAPH: Patrimonio cultural

## Metricas Objetivo
- Completitud coords: 26.9% -> 95%
- Precision: +-500m -> +-25m
- Coste: &lt;50 EUR/anio
