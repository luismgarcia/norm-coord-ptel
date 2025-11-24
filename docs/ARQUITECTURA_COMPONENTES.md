# Arquitectura de Componentes
## Sistema PTEL Coordinate Normalizer

> Guía de estructura del proyecto, organización de componentes React/TypeScript y patrones de diseño.

**Versión**: 1.0  
**Última actualización**: 24 noviembre 2025

---

## 📋 Principios Arquitectónicos

1. **Separación de Responsabilidades**
   - Components: UI pura, sin lógica de negocio
   - Services: Lógica de negocio, API calls, procesamiento
   - Utils: Funciones helpers puras, sin estado
   - Hooks: Lógica reutilizable con estado React
   - Types: Definiciones TypeScript compartidas

2. **Unidireccionalidad del Flujo de Datos**
   ```
   User Action → Component → Hook → Service → Processing
                    ↓
               State Update
                    ↓
             Component Re-render
   ```

3. **Composición sobre Herencia**
   - Componentes pequeños y reutilizables
   - Composición mediante props y children
   - Hooks personalizados para compartir lógica

4. **Type Safety First**
   - TypeScript strict mode
   - Interfaces explícitas
   - Validación en tiempo de compilación

---

## 📁 Estructura de Carpetas

```
norm-coord-ptel/
│
├── src/
│   ├── components/          # Componentes React
│   │   ├── wizard/          # Wizard 3 pasos
│   │   │   ├── Step1Upload.tsx
│   │   │   ├── Step2Process.tsx
│   │   │   └── Step3Visualize.tsx
│   │   ├── map/             # Componentes mapa (futuro)
│   │   │   ├── LeafletMap.tsx
│   │   │   ├── MapControls.tsx
│   │   │   └── MarkerCluster.tsx
│   │   ├── table/           # Tabla resultados
│   │   │   ├── DataTable.tsx
│   │   │   ├── TableFilters.tsx
│   │   │   └── TableRow.tsx
│   │   ├── ui/              # Componentes UI shadcn
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...47 componentes
│   │   ├── NormalizationPanel.tsx  # Panel scoring
│   │   └── layout/          # Layout components
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   │
│   ├── services/            # Lógica de negocio
│   │   ├── normalization/   # Normalización
│   │   │   ├── coordinateNormalizer.ts  # v2.0
│   │   │   ├── EncodingNormalizer.ts
│   │   │   └── TruncationDetector.ts
│   │   ├── validation/      # Validación
│   │   │   ├── ValidationEngine.ts
│   │   │   └── ScoringSystem.ts
│   │   ├── geocoding/       # Geocodificación WFS
│   │   │   ├── GeocodingOrchestrator.ts
│   │   │   ├── WFSHealthGeocoder.ts
│   │   │   ├── WFSEducationGeocoder.ts
│   │   │   ├── WFSCulturalGeocoder.ts
│   │   │   └── WFSSecurityGeocoder.ts
│   │   └── classification/  # Clasificación tipologías
│   │       └── InfrastructureClassifier.ts
│   │
│   ├── hooks/               # Hooks personalizados
│   │   ├── useFileUpload.ts
│   │   ├── useCoordinateProcessor.ts
│   │   └── useGeocoding.ts
│   │
│   ├── utils/               # Utilidades
│   │   ├── proj4-definitions.ts
│   │   ├── coordinate-utils.ts
│   │   └── file-parsers.ts
│   │
│   ├── types/               # Tipos TypeScript
│   │   ├── coordinate.ts
│   │   ├── geocoding.ts
│   │   └── validation.ts
│   │
│   └── App.tsx              # Componente principal (~700 líneas)
│
├── docs/                    # Documentación
│   ├── PLAN_MAESTRO_PTEL_DESARROLLO_2025.md
│   ├── ROADMAP_TECNICO_PTEL_DEFINITIVO.md
│   ├── RECURSOS_API_GEOCODIFICACION.md
│   └── ...
│
├── scripts/                 # Scripts utilidad
│   └── fix-utf8-docs.js     # Normalización UTF-8
│
└── public/                  # Assets estáticos
```

---

## 🎯 Componentes Principales

### App.tsx (Componente Raíz)

```typescript
// Estado principal
const [step, setStep] = useState(1)
const [files, setFiles] = useState<FileData[]>([])
const [processedCoordinates, setProcessedCoordinates] = useState<ProcessedCoordinate[]>([])

// Integración normalizador v2.0
const normalizationResults = normalizeCoordinateBatch(normalizationInputs)
const normalizationStats = getBatchStats(normalizationResults)
```

### NormalizationPanel.tsx

Panel de visualización de scoring con:
- BatchStatsCard: distribución HIGH/MEDIUM/LOW/CRITICAL
- ScoreDisplay: barra de progreso coloreada
- ConfidenceBadge: badge por nivel de confianza
- CorrectionsPanel: correcciones aplicadas

### Wizard Steps

```typescript
// Step1Upload - Subida de archivos
<DropZone onFilesAccepted={handleFiles} />
<FileList files={uploadedFiles} />

// Step2Process - Procesamiento
<ProcessingProgress current={processed} total={total} />
<ValidationResults results={validationResults} />

// Step3Visualize - Resultados
<DataTable data={processedData} />
<ExportOptions formats={['csv', 'xlsx', 'geojson', 'kml']} />
```

---

## 🔧 Servicios

### coordinateNormalizer.ts (v2.0)

```typescript
// 52 patrones de corrección UTF-8
const UTF8_CORRECTIONS = [
  ['Ã³', 'ó'], ['Ã¡', 'á'], ['Ã©', 'é'],
  // ...52 patrones total
]

// Sistema de scoring 0-100
interface NormalizationResult {
  score: number                    // 0-100
  confidence: ConfidenceLevel      // HIGH|MEDIUM|LOW|CRITICAL
  corrections: CorrectionRecord[]  // Correcciones aplicadas
  normalized: NormalizedCoordinate // Resultado final
}

// Niveles de confianza
type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL' | 'CONFIRMED'
```

### InfrastructureClassifier.ts

```typescript
enum InfrastructureType {
  SANITARIO = 'SANITARIO',     // 🏥
  EDUCATIVO = 'EDUCATIVO',     // 🎓
  CULTURAL = 'CULTURAL',       // 🏛️
  POLICIAL = 'POLICIAL',       // 🚔
  BOMBEROS = 'BOMBEROS',       // 🚒
  EMERGENCIAS = 'EMERGENCIAS', // 🚑
  RELIGIOSO = 'RELIGIOSO',     // ⛪
  DEPORTIVO = 'DEPORTIVO',     // 🏟️
  MUNICIPAL = 'MUNICIPAL',     // 🏛️
  SOCIAL = 'SOCIAL',           // 🤝
  COMBUSTIBLE = 'COMBUSTIBLE', // ⛽
  GENERICO = 'GENERICO'        // 📍
}
```

### GeocodingOrchestrator.ts

```typescript
class GeocodingOrchestrator {
  private geocoders = {
    SANITARIO: new WFSHealthGeocoder(),
    EDUCATIVO: new WFSEducationGeocoder(),
    CULTURAL: new WFSCulturalGeocoder(),
    POLICIAL: new WFSSecurityGeocoder()
  }
  
  async geocode(request: GeocodingRequest): Promise<GeocodingResponse> {
    // 1. Clasificar tipología
    const type = this.classifier.classify(request.name)
    
    // 2. Usar geocodificador especializado
    const geocoder = this.geocoders[type] || this.fallbackGeocoder
    
    return geocoder.geocode(request)
  }
}
```

---

## 📊 Tipos TypeScript

### coordinate.ts

```typescript
interface RawCoordinate {
  x: string | number
  y: string | number
  originalFormat?: string
}

interface NormalizedCoordinate {
  x: number           // UTM30 X en metros
  y: number           // UTM30 Y en metros
  crs: 'EPSG:25830'   // Sistema de referencia
  precision: number   // Decimales
}

interface ProcessedCoordinate {
  original: RawCoordinate
  normalized: NormalizedCoordinate
  score: number
  confidence: ConfidenceLevel
  corrections: CorrectionRecord[]
  alerts: ValidationAlert[]
  isValid: boolean
}
```

### geocoding.ts

```typescript
interface GeocodingRequest {
  name: string
  address?: string
  municipality: string
  province?: string
  type?: InfrastructureType
}

interface GeocodingResponse {
  success: boolean
  coordinates?: NormalizedCoordinate
  confidence: number
  source: string
  matchedName?: string
}
```

---

## 🪝 Hooks Personalizados

### useCoordinateProcessor

```typescript
function useCoordinateProcessor() {
  const [results, setResults] = useState<ProcessedCoordinate[]>([])
  const [stats, setStats] = useState<BatchStats | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const processCoordinates = async (inputs: CoordinateInput[]) => {
    setIsProcessing(true)
    
    const normalizationResults = normalizeCoordinateBatch(inputs)
    setResults(normalizationResults)
    setStats(getBatchStats(normalizationResults))
    
    setIsProcessing(false)
  }
  
  return { results, stats, isProcessing, processCoordinates }
}
```

### useGeocoding

```typescript
function useGeocoding() {
  const orchestrator = useMemo(() => new GeocodingOrchestrator(), [])
  
  const geocode = async (requests: GeocodingRequest[]) => {
    return Promise.all(
      requests.map(req => orchestrator.geocode(req))
    )
  }
  
  return { geocode }
}
```

---

## 🎨 Sistema de Colores

### Colores por Confianza

| Nivel | HEX | Tailwind | Uso |
|-------|-----|----------|-----|
| HIGH | #388E3C | bg-green-600 | Score 76-100 |
| MEDIUM | #FBC02D | bg-yellow-500 | Score 51-75 |
| LOW | #F57C00 | bg-orange-500 | Score 26-50 |
| CRITICAL | #D32F2F | bg-red-600 | Score 0-25 |
| CONFIRMED | #1976D2 | bg-blue-600 | Confirmado manual |

### Implementación

```typescript
const CONFIDENCE_COLORS = {
  HIGH: { bg: 'bg-green-500', text: 'text-green-700', border: 'border-green-300' },
  MEDIUM: { bg: 'bg-yellow-500', text: 'text-yellow-700', border: 'border-yellow-300' },
  LOW: { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-300' },
  CRITICAL: { bg: 'bg-red-500', text: 'text-red-700', border: 'border-red-300' },
  CONFIRMED: { bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-300' }
}
```

---

## 📦 Dependencias Clave

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "proj4": "^2.11.0",
    "@phosphor-icons/react": "^2.1.0",
    "framer-motion": "^11.0.0",
    "sonner": "^1.4.0",
    "xlsx": "^0.18.5",
    "jszip": "^3.10.1",
    "fuse.js": "^7.0.0"
  }
}
```

---

## ✅ Convenciones de Código

### Nomenclatura

- **Componentes**: PascalCase (`DataTable.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useGeocoding.ts`)
- **Servicios**: PascalCase (`GeocodingOrchestrator.ts`)
- **Utils**: camelCase (`coordinate-utils.ts`)
- **Types**: PascalCase para interfaces, UPPER_CASE para enums

### Estructura de Componentes

```typescript
// 1. Imports
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'

// 2. Types/Interfaces
interface Props {
  data: ProcessedCoordinate[]
  onSelect: (id: string) => void
}

// 3. Component
export function DataTable({ data, onSelect }: Props) {
  // 3.1 Hooks
  const [selected, setSelected] = useState<string | null>(null)
  
  // 3.2 Handlers
  const handleRowClick = (id: string) => {
    setSelected(id)
    onSelect(id)
  }
  
  // 3.3 Render
  return (
    <Card>
      {/* JSX */}
    </Card>
  )
}
```

---

**Última actualización**: 24 Noviembre 2025
