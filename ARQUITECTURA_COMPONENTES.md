# Arquitectura de Componentes y Organización del Código
## Sistema PTEL Coordinate Normalizer

> Guía completa de la estructura del proyecto, organización de componentes React/TypeScript, patrones de diseño y convenciones de código.

**Última actualización**: 29 noviembre 2025  
**Versión**: 1.2.0

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Estructura de Carpetas](#estructura-de-carpetas)
3. [Arquitectura por Capas](#arquitectura-por-capas)
4. [Componentes React](#componentes-react)
5. [Servicios y Lógica de Negocio](#servicios-y-lógica-de-negocio)
6. [State Management](#state-management)
7. [Types y Interfaces TypeScript](#types-y-interfaces-typescript)
8. [Hooks Personalizados](#hooks-personalizados)
9. [Patrones de Diseño](#patrones-de-diseño)
10. [Convenciones de Código](#convenciones-de-código)

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
│   │   │   ├── TableFilters.tsx
│   │   │   └── TableRow.tsx
│   │   ├── ui/              # Componentes UI shadcn
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── dialog.tsx
│   │   └── layout/          # Layout components
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   │
│   ├── services/            # Lógica de negocio
│   │   ├── normalization/   # Normalización
│   │   │   ├── EncodingNormalizer.ts
│   │   │   ├── CoordinateNormalizer.ts
│   │   │   └── TruncationDetector.ts
│   │   ├── validation/      # Validación
│   │   │   ├── ValidationEngine.ts
│   │   │   ├── ScoringSystem.ts
│   │   │   └── strategies/
│   │   │       ├── FormatStrategy.ts
│   │   │       ├── RangeStrategy.ts
│   │   │       └── SpatialStrategy.ts
│   │   ├── geocoding/       # Geocodificación
│   │   │   ├── CartoCiudadService.ts
│   │   │   ├── CDAUService.ts
│   │   │   ├── WFSService.ts
│   │   │   └── GeocodingOrchestrator.ts
│   │   ├── transform/       # Transformaciones CRS
│   │   │   ├── Proj4Service.ts
│   │   │   └── CRSDetector.ts
│   │   └── parsers/         # Parsers archivos
│   │       ├── CSVParser.ts
│   │       ├── ExcelParser.ts
│   │       └── DBFParser.ts
│   │
│   ├── hooks/               # React Hooks personalizados
│   │   ├── useFileUpload.ts
│   │   ├── useNormalization.ts
│   │   ├── useGeocoding.ts
│   │   └── useValidation.ts
│   │
│   ├── store/               # Zustand state management
│   │   ├── useCoordinateStore.ts
│   │   ├── useUIStore.ts
│   │   └── useSettingsStore.ts
│   │
│   ├── utils/               # Utilidades puras
│   │   ├── coordinateUtils.ts
│   │   ├── stringUtils.ts
│   │   └── geoUtils.ts
│   │
│   ├── types/               # TypeScript types
│   │   ├── coordinates.ts
│   │   ├── validation.ts
│   │   └── geocoding.ts
│   │
│   ├── constants/           # Constantes
│   │   ├── epsgDefinitions.ts
│   │   ├── validationRanges.ts
│   │   └── apiEndpoints.ts
│   │
│   ├── lib/                 # Configuración librerías
│   │   ├── leafletConfig.ts
│   │   └── proj4Config.ts
│   │
│   ├── assets/              # Assets estáticos
│   │   └── data/
│   │       ├── municipalities.json
│   │       └── provinces.json
│   │
│   ├── App.tsx              # Componente raíz
│   └── main.tsx             # Entry point
│
├── docs/                    # Documentación
│   ├── README.md
│   ├── CHANGELOG.md
│   └── FAQ_TECNICO.md
│
├── vite.config.ts           # Config Vite
├── tsconfig.json            # Config TypeScript
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
  onDelete: (id: string) => void;
}

export function CoordinateCard({ 
  coordinate, 
  onEdit, 
  onDelete 
}: CoordinateCardProps) {
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
      <CardActions>
        <Button onClick={() => onEdit(coordinate.id)}>Editar</Button>
        <Button onClick={() => onDelete(coordinate.id)}>Eliminar</Button>
      </CardActions>
    </Card>
  );
}
```

**Características**:
- ✅ Sin lógica de negocio
- ✅ Props tipadas
- ✅ Eventos delegados a padre
- ✅ Fácil testing

---

### Capa 2 - Hooks (Estado + Lógica)

**Responsabilidad**: Gestionar estado, orquestar servicios

```typescript
// Ejemplo: Hook personalizado
export function useNormalization() {
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<NormalizedRecord[]>([]);
  
  const normalize = async (records: RawRecord[]) => {
    setIsNormalizing(true);
    setProgress(0);
    
    const normalizer = new EncodingNormalizer();
    const truncationDetector = new TruncationDetector();
    
    const normalized = [];
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // 1. Normalizar encoding
      const encodingFixed = await normalizer.normalize(record);
      
      // 2. Detectar truncación
      const truncationFixed = await truncationDetector.detect(encodingFixed);
      
      // 3. Validar coordenadas
      const validated = await validateCoordinate(truncationFixed);
      
      normalized.push(validated);
      setProgress((i + 1) / records.length);
    }
    
    setResults(normalized);
    setIsNormalizing(false);
    
    return normalized;
  };
  
  return {
    normalize,
    isNormalizing,
    progress,
    results
  };
}
```

---

### Capa 3 - Servicios (Lógica de Negocio)

**Responsabilidad**: Implementar algoritmos, llamar APIs

```typescript
// Ejemplo: Servicio normalización encoding
export class EncodingNormalizer {
  private readonly replacementMap: Map<string, string>;
  
  constructor() {
    this.replacementMap = new Map([
      ['Ã±', 'ñ'],
      ['Ã¡', 'á'],
      ['Ã©', 'é'],
      // ... 24 patrones más
    ]);
  }
  
  async normalize(text: string): Promise<NormalizationResult> {
    let normalized = text;
    const corrections: Correction[] = [];
    
    for (const [corrupt, correct] of this.replacementMap) {
      const regex = new RegExp(corrupt, 'g');
      const matches = normalized.match(regex);
      
      if (matches) {
        normalized = normalized.replace(regex, correct);
        corrections.push({
          pattern: corrupt,
          replacement: correct,
          count: matches.length
        });
      }
    }
    
    return {
      original: text,
      normalized,
      corrections,
      hasChanges: corrections.length > 0
    };
  }
}
```

---

### Capa 4 - Utilidades (Funciones Puras)

**Responsabilidad**: Helpers sin estado, transformaciones

```typescript
// Ejemplo: Utilidades coordenadas
export const coordinateUtils = {
  /**
   * Detecta si coordenada Y está truncada
   */
  isTruncated(y: number, province: Province): boolean {
    const yStr = y.toString();
    const digitCount = yStr.split('.')[0].length;
    
    // Coordenadas UTM30 Andalucía: 7 dígitos enteros
    if (digitCount < 7) return true;
    
    // Debe empezar con "4"
    if (!yStr.startsWith('4')) return true;
    
    return false;
  },
  
  /**
   * Corrige coordenada truncada añadiendo prefijo provincial
   */
  fixTruncation(y: number, province: Province): number {
    const yStr = y.toString();
    
    // Si falta el "4" inicial, añadirlo
    if (!yStr.startsWith('4')) {
      return parseFloat('4' + yStr);
    }
    
    return y;
  },
  
  /**
   * Calcula distancia entre dos coordenadas UTM
   */
  distance(
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
};
```

---

## ⚛️ Componentes React

### Estructura de Componente Típica

```typescript
// src/components/wizard/Step2Process.tsx

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNormalization } from '@/hooks/useNormalization';
import { useCoordinateStore } from '@/store/useCoordinateStore';
import type { RawRecord } from '@/types/coordinates';

interface Step2ProcessProps {
  records: RawRecord[];
  onComplete: () => void;
}

export function Step2Process({ records, onComplete }: Step2ProcessProps) {
  // 1. Hooks
  const { normalize, isNormalizing, progress } = useNormalization();
  const { setNormalized } = useCoordinateStore();
  
  // 2. Estado local
  const [status, setStatus] = useState<'idle' | 'processing' | 'complete'>('idle');
  
  // 3. Efectos
  useEffect(() => {
    if (status === 'complete') {
      onComplete();
    }
  }, [status, onComplete]);
  
  // 4. Handlers
  const handleProcess = async () => {
    setStatus('processing');
    
    try {
      const normalized = await normalize(records);
      setNormalized(normalized);
      setStatus('complete');
    } catch (error) {
      console.error('Error normalizando:', error);
      setStatus('idle');
    }
  };
  
  // 5. Renderizado
  return (
    <Card>
      <CardHeader>
        <CardTitle>Paso 2: Procesamiento</CardTitle>
      </CardHeader>
      
      <CardContent>
        {status === 'idle' && (
          <Button onClick={handleProcess}>
            Iniciar Normalización
          </Button>
        )}
        
        {status === 'processing' && (
          <div className="space-y-4">
            <Progress value={progress * 100} />
            <p className="text-sm text-muted-foreground">
              Procesando {Math.round(progress * 100)}%
            </p>
          </div>
        )}
        
        {status === 'complete' && (
          <div className="space-y-4">
            <CheckCircle className="text-green-500" />
            <p>Normalización completada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

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
│       │   ├── LeafletMap
│       │   ├── MapControls
│       │   └── MarkerCluster
│       ├── DataTable
│       │   ├── TableFilters
│       │   ├── TableHeader
│       │   └── TableRow
│       └── ExportPanel
└── Footer
```

---

## 🛠️ Servicios y Lógica de Negocio

### Patrón: Strategy Pattern para Validación

```typescript
// src/services/validation/strategies/ValidationStrategy.ts

export interface ValidationStrategy {
  name: string;
  weight: number;
  validate(coordinate: CoordinateRecord): ValidationResult;
}

// Estrategia 1: Validación de formato
export class FormatValidationStrategy implements ValidationStrategy {
  name = 'FORMAT';
  weight = 0.15;
  
  validate(coordinate: CoordinateRecord): ValidationResult {
    const { x, y } = coordinate;
    
    // Verificar que sean números válidos
    if (isNaN(x) || isNaN(y)) {
      return {
        valid: false,
        score: 0,
        issues: ['Coordenadas no son números válidos']
      };
    }
    
    // Verificar que no sean cero
    if (x === 0 || y === 0) {
      return {
        valid: false,
        score: 0,
        issues: ['Coordenadas son cero']
      };
    }
    
    return {
      valid: true,
      score: 100,
      issues: []
    };
  }
}

// Estrategia 2: Validación de rango
export class RangeValidationStrategy implements ValidationStrategy {
  name = 'RANGE';
  weight = 0.20;
  
  private readonly ANDALUSIA_BOUNDS = {
    xMin: 100000,
    xMax: 800000,
    yMin: 4000000,
    yMax: 4500000
  };
  
  validate(coordinate: CoordinateRecord): ValidationResult {
    const { x, y } = coordinate;
    const { xMin, xMax, yMin, yMax } = this.ANDALUSIA_BOUNDS;
    
    const inRangeX = x >= xMin && x <= xMax;
    const inRangeY = y >= yMin && y <= yMax;
    
    if (!inRangeX || !inRangeY) {
      return {
        valid: false,
        score: 0,
        issues: ['Coordenadas fuera de rango Andalucía']
      };
    }
    
    return {
      valid: true,
      score: 100,
      issues: []
    };
  }
}

// Motor de validación que usa todas las estrategias
export class ValidationEngine {
  private strategies: ValidationStrategy[];
  
  constructor() {
    this.strategies = [
      new FormatValidationStrategy(),
      new RangeValidationStrategy(),
      new SpatialCoherenceStrategy(),
      // ... resto estrategias
    ];
  }
  
  validate(coordinate: CoordinateRecord): ValidationReport {
    const results = this.strategies.map(strategy => ({
      strategy: strategy.name,
      weight: strategy.weight,
      result: strategy.validate(coordinate)
    }));
    
    // Calcular score total ponderado
    const totalScore = results.reduce((acc, { weight, result }) => 
      acc + (weight * result.score), 0
    );
    
    // Clasificar confianza
    const confidence = this.classifyConfidence(totalScore);
    
    return {
      score: totalScore,
      confidence,
      results,
      coordinate
    };
  }
  
  private classifyConfidence(score: number): ConfidenceLevel {
    if (score >= 76) return 'HIGH';
    if (score >= 51) return 'MEDIUM';
    if (score >= 26) return 'LOW';
    return 'CRITICAL';
  }
}
```

---

## 🎨 State Management

### Zustand Store Pattern

```typescript
// src/store/useCoordinateStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CoordinateRecord, NormalizedRecord } from '@/types/coordinates';

interface CoordinateState {
  // Estado
  raw: CoordinateRecord[];
  normalized: NormalizedRecord[];
  selected: string | null;
  filters: FilterState;
  
  // Acciones
  setRaw: (records: CoordinateRecord[]) => void;
  setNormalized: (records: NormalizedRecord[]) => void;
  selectCoordinate: (id: string) => void;
  updateCoordinate: (id: string, updates: Partial<NormalizedRecord>) => void;
  deleteCoordinate: (id: string) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  clearAll: () => void;
}

export const useCoordinateStore = create<CoordinateState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      raw: [],
      normalized: [],
      selected: null,
      filters: {
        confidence: 'ALL',
        search: '',
        municipality: 'ALL'
      },
      
      // Implementación acciones
      setRaw: (records) => set({ raw: records }),
      
      setNormalized: (records) => set({ normalized: records }),
      
      selectCoordinate: (id) => set({ selected: id }),
      
      updateCoordinate: (id, updates) => set((state) => ({
        normalized: state.normalized.map(record =>
          record.id === id ? { ...record, ...updates } : record
        )
      })),
      
      deleteCoordinate: (id) => set((state) => ({
        normalized: state.normalized.filter(r => r.id !== id)
      })),
      
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters }
      })),
      
      clearAll: () => set({
        raw: [],
        normalized: [],
        selected: null,
        filters: {
          confidence: 'ALL',
          search: '',
          municipality: 'ALL'
        }
      })
    }),
    {
      name: 'ptel-coordinates-storage',
      // Persistir solo lo necesario
      partialize: (state) => ({
        normalized: state.normalized
      })
    }
  )
);
```

---

## 🔧 Types y Interfaces TypeScript

### Tipos Principales

```typescript
// src/types/coordinates.ts

/**
 * Coordenada raw (entrada usuario)
 */
export interface CoordinateRecord {
  id: string;
  name: string;
  type: InfrastructureType;
  address?: string;
  municipality: string;
  province: Province;
  x: number;
  y: number;
  crs?: string;
}

/**
 * Coordenada normalizada (tras procesamiento)
 */
export interface NormalizedRecord extends CoordinateRecord {
  // Coordenadas originales (si diferentes)
  originalX?: number;
  originalY?: number;
  originalCRS?: string;
  
  // Validación
  validationScore: number;
  confidence: ConfidenceLevel;
  validationDetails: ValidationResult[];
  
  // Correcciones aplicadas
  corrections: CorrectionApplied[];
  
  // Geocodificación (si se usó)
  geocodingMethod?: GeocodingMethod;
  geocodingScore?: number;
  
  // Metadata
  processedDate: string;
  systemVersion: string;
}

/**
 * Resultado validación
 */
export interface ValidationResult {
  strategy: ValidationStrategy;
  valid: boolean;
  score: number;
  issues: string[];
  warnings?: string[];
}

/**
 * Niveles de confianza
 */
export type ConfidenceLevel = 
  | 'CRITICAL'   // 0-25
  | 'LOW'        // 26-50
  | 'MEDIUM'     // 51-75
  | 'HIGH'       // 76-100
  | 'CONFIRMED'; // Validado manualmente

/**
 * Tipos de infraestructura
 */
export type InfrastructureType =
  | 'SANITARIO'
  | 'EDUCATIVO'
  | 'POLICIAL'
  | 'BOMBEROS'
  | 'CULTURAL'
  | 'RELIGIOSO'
  | 'DEPORTIVO'
  | 'OTRO';

/**
 * Provincias Andalucía
 */
export type Province =
  | 'Almería'
  | 'Cádiz'
  | 'Córdoba'
  | 'Granada'
  | 'Huelva'
  | 'Jaén'
  | 'Málaga'
  | 'Sevilla';
```

---

## 🎣 Hooks Personalizados

### Hook useFileUpload

```typescript
// src/hooks/useFileUpload.ts

export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  
  const upload = async (uploadedFile: File) => {
    setIsUploading(true);
    setError(null);
    
    try {
      // Validar tamaño
      const MAX_SIZE = 50 * 1024 * 1024; // 50MB
      if (uploadedFile.size > MAX_SIZE) {
        throw new Error('Archivo demasiado grande (>50MB)');
      }
      
      // Detectar formato
      const format = detectFormat(uploadedFile);
      const parser = getParser(format);
      
      // Parsear preview (primeras 10 filas)
      const previewData = await parser.parsePreview(uploadedFile, 10);
      
      setFile(uploadedFile);
      setPreview(previewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsUploading(false);
    }
  };
  
  const clear = () => {
    setFile(null);
    setPreview(null);
    setError(null);
  };
  
  return {
    file,
    isUploading,
    error,
    preview,
    upload,
    clear
  };
}
```

---

## 📝 Convenciones de Código

### Nomenclatura

**Componentes**: PascalCase
```typescript
// ✅ Correcto
export function DataTable() { }
export function MapView() { }

// ❌ Incorrecto
export function dataTable() { }
export function map_view() { }
```

**Funciones/Variables**: camelCase
```typescript
// ✅ Correcto
const userData = {};
function getUserData() { }

// ❌ Incorrecto
const UserData = {};
function get_user_data() { }
```

**Constantes**: UPPER_SNAKE_CASE
```typescript
// ✅ Correcto
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://...';

// ❌ Incorrecto
const maxRetries = 3;
const apiBaseUrl = 'https://...';
```

**Types/Interfaces**: PascalCase
```typescript
// ✅ Correcto
interface CoordinateRecord { }
type ConfidenceLevel = '...';

// ❌ Incorrecto
interface coordinate_record { }
type confidence_level = '...';
```

---

## 🔧 Utilidades

### coordinateUtils

```typescript
const coordinateUtils = {
  /**
   * Detecta si coordenada Y está truncada
   */
  isTruncated(y: number, province: Province): boolean;
  
  /**
   * Corrige coordenada truncada
   */
  fixTruncation(y: number, province: Province): number;
  
  /**
   * Calcula distancia euclidiana entre dos puntos UTM
   */
  distance(
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ): number;
  
  /**
   * Calcula centroide de array de coordenadas
   */
  centroid(coordinates: Array<{ x: number; y: number }>): { x: number; y: number };
  
  /**
   * Formatea coordenada para visualización
   */
  format(value: number, decimals?: number): string;
};
```

---

## 📚 Recursos y Referencias

**Documentación relacionada**:
- README.md - Introducción y setup
- CASOS_DE_USO_Y_WORKFLOWS.md - Workflows prácticos
- API_DOCUMENTATION.md - Documentación APIs

**Guías de estilo**:
- Airbnb JavaScript Style Guide
- React TypeScript Cheatsheet

---

**Arquitectura de Componentes** | **v1.2.0**  
**Sistema PTEL Coordinate Normalizer** 🏗️
