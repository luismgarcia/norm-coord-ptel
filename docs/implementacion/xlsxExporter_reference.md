# Referencia: xlsxExporter.ts

Módulo de exportación Excel para el proyecto PTEL.

## Ubicación

**Project Knowledge:** `/mnt/project/xlsxExporter.ts`  
**Tamaño:** 18 KB (541 líneas)

## Descripción

Exportación Excel multi-pestaña organizada por tipología de infraestructura.

## Dependencias

```typescript
import ExcelJS from 'exceljs';
import type { CoordinateData } from '@/types';
import type { ClassificationResult } from '@/types/infrastructure';
```

## Estructura de Columnas

| Columna | Header | Ancho |
|---------|--------|-------|
| id | ID | 8 |
| nombre | NOMBRE | 35 |
| tipologia | TIPOLOGIA | 15 |
| tipoOriginal | TIPO_ORIGINAL | 20 |
| direccion | DIRECCION | 40 |
| municipio | MUNICIPIO | 20 |
| provincia | PROVINCIA | 15 |
| telefono | TELEFONO | 15 |
| email | EMAIL | 30 |
| observaciones | OBSERVACIONES | 40 |
| xInicial | X_INICIAL | 15 |
| yInicial | Y_INICIAL | 15 |
| sistemaInicial | SISTEMA_INICIAL | 15 |
| xUtm30 | X_UTM30 | 15 |
| yUtm30 | Y_UTM30 | 15 |
| lonWgs84 | LON_WGS84 | 12 |
| latWgs84 | LAT_WGS84 | 12 |
| score | SCORE | 10 |
| confianza | CONFIANZA | 12 |
| fuentes | FUENTES | 40 |
| numFuentes | NUM_FUENTES | 12 |
| geocodificado | GEOCODIFICADO | 15 |
| alertas | ALERTAS | 50 |

## Pestañas por Tipología

| Nombre | Filtro | Color |
|--------|--------|-------|
| General | null | E3F2FD |
| Sanitario | ['SANITARIO'] | FFEBEE |
| Educativo | ['EDUCATIVO'] | E3F2FD |
| Cultural | ['CULTURAL'] | F3E5F5 |
| Industrial | ['INDUSTRIAL'] | FFF3E0 |
| Seguridad | ['SEGURIDAD'] | E8F5E9 |
| Transporte | ['TRANSPORTE'] | F3E5F5 |
| Municipal | ['MUNICIPAL'] | FFF8E1 |
| Otros | ['OTROS'] | ECEFF1 |

## Interfaces

### ExportRecord

```typescript
interface ExportRecord {
  id: number;
  nombre: string;
  tipologia: string;
  tipoOriginal: string;
  direccion: string;
  municipio: string;
  provincia: string;
  telefono: string;
  email: string;
  observaciones: string;
  xInicial: number | null;
  yInicial: number | null;
  sistemaInicial: string;
  xUtm30: number | null;
  yUtm30: number | null;
  lonWgs84: number | null;
  latWgs84: number | null;
  score: number;
  confianza: string;
  fuentes: string;
  numFuentes: number;
  geocodificado: string;
  alertas: string;
}
```

### ExportStats

```typescript
interface ExportStats {
  total: number;
  byTipologia: Record<string, number>;
  byConfianza: Record<string, number>;
  byFuentes: Record<string, number>;
  geolocalizados: number;
  sinGeolocalizar: number;
  scorePromedio: number;
  alertasTotales: number;
  limites: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}
```

## Características

- Múltiples pestañas organizadas por tipología
- Códigos de colores por categoría
- Estadísticas automáticas
- Formato condicional para alertas
- Cabeceras fijas para navegación

---

*Referencia generada: 29 Noviembre 2025*