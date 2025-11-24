# Arquitectura de Componentes y Organización del Código
## Sistema PTEL Coordinate Normalizer

> Guía completa de la estructura del proyecto, organización de componentes React/TypeScript, patrones de diseño y convenciones de código.

**Última actualización**: 24 noviembre 2025  
**Versión**: 1.1.0

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Estructura de Carpetas](#estructura-de-carpetas)
3. [Arquitectura por Capas](#arquitectura-por-capas)
4. [Componentes React](#componentes-react)
5. [Servicios y Lógica de Negocio](#servicios-y-lógica-de-negocio)
6. [State Management](#state-management)
7. [Patrones de Diseño](#patrones-de-diseño)
8. [Convenciones de Código](#convenciones-de-código)

---

## 🏗️ Visión General

### Principios Arquitectónicos

**1. Separación de Responsabilidades**
- Components: UI pura, sin lógica de negocio
- Services: Lógica de negocio, API calls, procesamiento
- Utils: Funciones helpers puras, sin estado
- Hooks: Lógica reutilizable con estado React
- Types: Definiciones TypeScript compartidas

**2. Unidireccionalidad del Flujo de Datos**
```
User Action → Component → Hook → Service → Processing
                ↓
            State Update
                ↓
          Component Re-render
```

**3. Composición sobre Herencia**
- Componentes pequeños y reutilizables
- Composición mediante props y children
- Hooks personalizados para compartir lógica

**4. Type Safety First**
- TypeScript strict mode
- Interfaces explícitas
- Validación en tiempo de compilación

---

## 📁 Estructura de Carpetas

```
ptel-coordinate-normalizer/
│
├── src/
│   ├── components/          # Componentes React
│   │   ├── wizard/          # Wizard 3 pasos
│   │   │   ├── Step1Upload.tsx
│   │   │   ├── Step2Process.tsx
│   │   │   └── Step3Visualize.tsx
│   │   ├── map/             # Componentes mapa
│   │   │   ├── LeafletMap.tsx
│   │   │   ├── MapControls.tsx
│   │   │   └── MarkerCluster.tsx
│   │   ├── table/           # Tabla resultados
│   │   │   ├── DataTable.tsx
│   │   │   └── TableFilters.tsx
│   │   └── ui/              # Componentes UI shadcn
│   │
│   ├── services/            # Lógica de negocio
│   │   ├── normalization/   # Normalización
│   │   │   ├── EncodingNormalizer.ts
│   │   │   ├── CoordinateNormalizer.ts
│   │   │   └── TruncationDetector.ts
│   │   ├── validation/      # Validación
│   │   │   ├── ValidationEngine.ts
│   │   │   └── strategies/
│   │   ├── geocoding/       # Geocodificación
│   │   │   ├── GeocodingOrchestrator.ts
│   │   │   └── specialized/
│   │   │       ├── WFSHealthGeocoder.ts
│   │   │       ├── WFSEducationGeocoder.ts
│   │   │       └── WFSCulturalGeocoder.ts
│   │   └── parsers/         # Parsers archivos
│   │
│   ├── hooks/               # React Hooks personalizados
│   │   ├── useFileUpload.ts
│   │   ├── useNormalization.ts
│   │   └── useValidation.ts
│   │
│   ├── store/               # Zustand state management
│   │   └── useCoordinateStore.ts
│   │
│   ├── lib/                 # Utilidades y configuración
│   │   ├── coordinateUtils.ts
│   │   ├── coordinateNormalizer.ts  # Normalizador v2.0
│   │   └── utils.ts
│   │
│   ├── types/               # TypeScript types
│   │   ├── coordinates.ts
│   │   └── infrastructure.ts
│   │
│   └── App.tsx              # Componente raíz
│
├── docs/                    # Documentación
└── package.json
```

---

## 🏛️ Arquitectura por Capas

### Capa 1 - Presentación (UI)

**Responsabilidad**: Renderizar UI, capturar eventos usuario

```typescript
// Ejemplo: Componente presentacional puro
interface CoordinateCardProps {
  coordinate: CoordinateRecord;
  onEdit: (id: string) => void;
}

export function CoordinateCard({ coordinate, onEdit }: CoordinateCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{coordinate.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>X: {coordinate.x}</p>
        <p>Y: {coordinate.y}</p>
        <Badge variant={getConfidenceBadge(coordinate.score)}>
          {coordinate.confidence}
        </Badge>
      </CardContent>
    </Card>
  );
}
```

### Capa 2 - Hooks (Estado + Lógica)

**Responsabilidad**: Gestionar estado, orquestar servicios

```typescript
export function useNormalization() {
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<NormalizedRecord[]>([]);
  
  const normalize = async (records: RawRecord[]) => {
    setIsNormalizing(true);
    // ... procesamiento
    setIsNormalizing(false);
    return normalized;
  };
  
  return { normalize, isNormalizing, progress, results };
}
```

### Capa 3 - Servicios (Lógica de Negocio)

**Responsabilidad**: Implementar algoritmos, llamar APIs

```typescript
export class EncodingNormalizer {
  private readonly replacementMap: Map<string, string>;
  
  async normalize(text: string): Promise<NormalizationResult> {
    // Aplicar patrones de corrección UTF-8
  }
}
```

### Capa 4 - Utilidades (Funciones Puras)

**Responsabilidad**: Helpers sin estado, transformaciones

```typescript
export const coordinateUtils = {
  isTruncated(y: number, province: Province): boolean,
  fixTruncation(y: number, province: Province): number,
  distance(p1: Point, p2: Point): number,
};
```

---

## ⚛️ Componentes React

### Jerarquía de Componentes

```
App
├── Header
├── WizardContainer
│   ├── ProgressBar
│   ├── Step1Upload
│   │   ├── FileDropzone
│   │   ├── FilePreview
│   │   └── ColumnMapper
│   ├── Step2Process
│   │   ├── ProcessingStatus
│   │   └── ResultsSummary
│   └── Step3Visualize
│       ├── MapView
│       │   └── LeafletMap
│       ├── DataTable
│       └── ExportPanel
└── Footer
```

---

## 🛠️ Servicios Especializados

### Geocodificadores WFS

```typescript
// Base común
abstract class WFSBaseGeocoder {
  protected abstract getWFSUrl(): string;
  protected abstract getTypeName(): string;
  protected abstract buildFilter(name: string, municipality: string): string;
  
  async geocode(name: string, municipality: string): Promise<GeocodingResult>;
}

// Implementación sanitaria
class WFSHealthGeocoder extends WFSBaseGeocoder {
  protected getWFSUrl() {
    return 'https://www.juntadeandalucia.es/servicios/gis/wfs';
  }
  protected getTypeName() {
    return 'g12_01_CentroSalud';
  }
}
```

---

## 🎨 State Management (Zustand)

```typescript
interface CoordinateState {
  // Estado
  raw: CoordinateRecord[];
  normalized: NormalizedRecord[];
  selected: string | null;
  filters: FilterState;
  
  // Acciones
  setRaw: (records: CoordinateRecord[]) => void;
  setNormalized: (records: NormalizedRecord[]) => void;
  updateCoordinate: (id: string, updates: Partial<NormalizedRecord>) => void;
  clearAll: () => void;
}

export const useCoordinateStore = create<CoordinateState>()(
  persist(
    (set) => ({
      // Implementación...
    }),
    { name: 'ptel-coordinates-storage' }
  )
);
```

---

## 🔧 Patrones de Diseño

### Strategy Pattern (Validación)

```typescript
interface ValidationStrategy {
  name: string;
  weight: number;
  validate(coordinate: CoordinateRecord): ValidationResult;
}

class FormatValidationStrategy implements ValidationStrategy {
  name = 'FORMAT';
  weight = 0.15;
  validate(coord) { /* ... */ }
}

class RangeValidationStrategy implements ValidationStrategy {
  name = 'RANGE';
  weight = 0.20;
  validate(coord) { /* ... */ }
}
```

### Factory Pattern (Parsers)

```typescript
function getParser(format: FileFormat): IParser {
  switch (format) {
    case 'csv': return new CSVParser();
    case 'xlsx': return new ExcelParser();
    case 'dbf': return new DBFParser();
    default: throw new Error(`Formato no soportado: ${format}`);
  }
}
```

### Chain of Responsibility (Geocodificación)

```typescript
class GeocodingOrchestrator {
  private chain: Geocoder[] = [
    new WFSHealthGeocoder(),
    new WFSEducationGeocoder(),
    new CartoCiudadGeocoder(),
    new NominatimGeocoder(),
  ];
  
  async geocode(address: string): Promise<GeocodingResult> {
    for (const geocoder of this.chain) {
      const result = await geocoder.geocode(address);
      if (result.success) return result;
    }
    return { success: false, method: 'NONE' };
  }
}
```

---

## 📝 Convenciones de Código

### Nomenclatura

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Componentes | PascalCase | `DataTable.tsx` |
| Funciones | camelCase | `normalizeCoordinate()` |
| Constantes | UPPER_SNAKE | `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `CoordinateRecord` |
| Archivos componentes | PascalCase | `MapView.tsx` |
| Archivos utilidades | camelCase | `coordinateUtils.ts` |

### Estructura de Componente

```typescript
// 1. Imports
import { useState } from 'react';
import { Card } from '@/components/ui/card';

// 2. Types
interface ComponentProps {
  data: DataType;
  onAction: () => void;
}

// 3. Component
export function ComponentName({ data, onAction }: ComponentProps) {
  // 3a. Hooks
  const [state, setState] = useState();
  
  // 3b. Handlers
  const handleClick = () => { /* ... */ };
  
  // 3c. Render
  return (
    <Card>
      {/* JSX */}
    </Card>
  );
}
```

---

## 📊 Casos Edge Documentados

### Validación Empírica (Colomera)

Basado en validación con datos reales:

| Caso Edge | Detección | Corrección | Confianza |
|-----------|-----------|------------|-----------|
| Y truncada (5 dígitos) | digitCount < 7 | Añadir prefijo "40" | HIGH |
| X↔Y intercambiados | X > 1M, Y < 1M | Swap valores | HIGH |
| Placeholder "N/D" | Regex match | → null | HIGH |
| Mojibake "´´" | Pattern match | → decimal point | MEDIUM |

---

**Arquitectura de Componentes** | **v1.1.0**  
**Sistema PTEL Coordinate Normalizer** 🏗️
