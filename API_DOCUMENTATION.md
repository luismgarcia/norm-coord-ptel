# Documentación API e Interfaces TypeScript
## Sistema PTEL Coordinate Normalizer

> Documentación completa de interfaces TypeScript, servicios, APIs públicas y contratos de datos.

**Última actualización**: 20 noviembre 2025  
**Versión**: 1.0.0

---

## 📋 Tabla de Contenidos

1. [Tipos y Interfaces Core](#tipos-y-interfaces-core)
2. [Servicios de Normalización](#servicios-de-normalización)
3. [Servicios de Validación](#servicios-de-validación)
4. [Servicios de Geocodificación](#servicios-de-geocodificación)
5. [Servicios de Transformación CRS](#servicios-de-transformación-crs)
6. [Hooks Personalizados](#hooks-personalizados)
7. [Store (Zustand)](#store-zustand)
8. [Utilidades](#utilidades)
9. [APIs Externas](#apis-externas)

---

## 🎯 Tipos y Interfaces Core

### `CoordinateRecord`

Representa una coordenada raw (entrada usuario).

```typescript
interface CoordinateRecord {
  /** ID único del registro */
  id: string;
  
  /** Nombre de la infraestructura */
  name: string;
  
  /** Tipo de infraestructura */
  type: InfrastructureType;
  
  /** Dirección postal (opcional) */
  address?: string;
  
  /** Municipio */
  municipality: string;
  
  /** Provincia de Andalucía */
  province: Province;
  
  /** Coordenada X (Este) */
  x: number;
  
  /** Coordenada Y (Norte) */
  y: number;
  
  /** Sistema de referencia (opcional, se autodetecta) */
  crs?: string;
}
```

**Ejemplo**:
```typescript
const record: CoordinateRecord = {
  id: '1',
  name: 'Centro Salud Zaidín',
  type: 'SANITARIO',
  address: 'C/ Avenida de Dílar 3',
  municipality: 'Granada',
  province: 'Granada',
  x: 447850.23,
  y: 4111234.56,
  crs: 'EPSG:25830'
};
```

---

### `NormalizedRecord`

Coordenada tras procesamiento completo.

```typescript
interface NormalizedRecord extends CoordinateRecord {
  /** Coordenadas originales (si fueron modificadas) */
  originalX?: number;
  originalY?: number;
  originalCRS?: string;
  
  /** Score de validación (0-100) */
  validationScore: number;
  
  /** Nivel de confianza */
  confidence: ConfidenceLevel;
  
  /** Resultados detallados por estrategia de validación */
  validationDetails: ValidationResult[];
  
  /** Correcciones aplicadas */
  corrections: CorrectionApplied[];
  
  /** Método de geocodificación usado (si aplica) */
  geocodingMethod?: GeocodingMethod;
  
  /** Score de geocodificación (si aplica) */
  geocodingScore?: number;
  
  /** Timestamp de procesamiento */
  processedDate: string;
  
  /** Versión del sistema que procesó */
  systemVersion: string;
}
```

---

### `ValidationResult`

Resultado de una estrategia de validación.

```typescript
interface ValidationResult {
  /** Nombre de la estrategia */
  strategy: ValidationStrategy;
  
  /** ¿Es válido según esta estrategia? */
  valid: boolean;
  
  /** Score 0-100 */
  score: number;
  
  /** Lista de problemas encontrados */
  issues: string[];
  
  /** Advertencias no críticas */
  warnings?: string[];
}
```

---

### Enums y Types

```typescript
/** Niveles de confianza */
type ConfidenceLevel = 
  | 'CRITICAL'   // 0-25
  | 'LOW'        // 26-50
  | 'MEDIUM'     // 51-75
  | 'HIGH'       // 76-100
  | 'CONFIRMED'; // Validado manualmente

/** Tipos de infraestructura PTEL */
type InfrastructureType =
  | 'SANITARIO'
  | 'EDUCATIVO'
  | 'POLICIAL'
  | 'BOMBEROS'
  | 'CULTURAL'
  | 'RELIGIOSO'
  | 'DEPORTIVO'
  | 'OTRO';

/** Provincias de Andalucía */
type Province =
  | 'Almería'
  | 'Cádiz'
  | 'Córdoba'
  | 'Granada'
  | 'Huelva'
  | 'Jaén'
  | 'Málaga'
  | 'Sevilla';

/** Estrategias de validación */
type ValidationStrategy =
  | 'FORMAT'
  | 'RANGE'
  | 'SPECIAL_CHARS'
  | 'DECIMALS'
  | 'DIGIT_LENGTH'
  | 'SPATIAL_COHERENCE'
  | 'NEIGHBORHOOD'
  | 'CRS_DETECTION';

/** Métodos de geocodificación */
type GeocodingMethod =
  | 'WFS_SICESS'       // Centros salud SICESS
  | 'WFS_EDUCATION'    // Centros educativos
  | 'WFS_IAPH'         // Patrimonio cultural
  | 'CARTOCIUDAD'      // CartoCiudad IGN
  | 'CDAU'             // Callejero Andalucía
  | 'NOMINATIM'        // OpenStreetMap
  | 'LOCATIONIQ'       // LocationIQ API
  | 'HERE'             // HERE Maps
  | 'MANUAL';          // Corrección manual
```

---

## 🔧 Servicios de Normalización

### `EncodingNormalizer`

Servicio para corregir corrupción UTF-8.

```typescript
class EncodingNormalizer {
  /**
   * Normaliza texto aplicando 27 patrones de corrección UTF-8
   */
  async normalize(text: string): Promise<NormalizationResult>;
}

interface NormalizationResult {
  original: string;
  normalized: string;
  corrections: Correction[];
  hasChanges: boolean;
}
```

---

### `TruncationDetector`

Detecta y corrige coordenadas Y truncadas.

```typescript
class TruncationDetector {
  detect(coordinate: CoordinateRecord): TruncationResult;
  isTruncated(y: number, province: Province): boolean;
  fix(y: number, province: Province): number;
}
```

---

## ✅ Servicios de Validación

### `ValidationEngine`

Motor principal de validación multi-estrategia (8 estrategias).

```typescript
class ValidationEngine {
  validate(coordinate: CoordinateRecord): ValidationReport;
  validateBatch(
    coordinates: CoordinateRecord[],
    onProgress?: (current: number, total: number) => void
  ): Promise<ValidationReport[]>;
}
```

**Estrategias disponibles**:
1. **FormatValidationStrategy** (15%) - Formato numérico válido
2. **RangeValidationStrategy** (20%) - Rangos geográficos Andalucía
3. **SpecialCharsValidationStrategy** (10%) - Caracteres no numéricos
4. **DecimalsValidationStrategy** (10%) - Presencia de decimales
5. **DigitLengthValidationStrategy** (10%) - X: 6-7 dígitos, Y: 7 dígitos
6. **SpatialCoherenceStrategy** (15%) - Distancia al centroide municipal
7. **NeighborhoodStrategy** (10%) - Clustering validation
8. **CRSDetectionStrategy** (10%) - Autodetección CRS

---

## 🌍 Servicios de Geocodificación

### `GeocodingOrchestrator`

Orquesta geocodificación usando cascada de servicios.

```typescript
class GeocodingOrchestrator {
  geocode(address: string, options?: GeocodingOptions): Promise<GeocodingResult>;
  geocodeByType(name: string, type: InfrastructureType, municipality: string): Promise<GeocodingResult>;
  reverseGeocode(x: number, y: number): Promise<ReverseGeocodingResult>;
}
```

---

## 🗺️ Servicios de Transformación CRS

### `Proj4Service`

```typescript
class Proj4Service {
  transform(x: number, y: number, fromCRS: string, toCRS: string): { x: number; y: number };
  transformBatch(coordinates: Array<{ x: number; y: number }>, fromCRS: string, toCRS: string): Array<{ x: number; y: number }>;
}
```

### `CRSDetector`

```typescript
class CRSDetector {
  detect(x: number, y: number): CRSDetectionResult;
}
```

---

## 🎣 Hooks Personalizados

### `useNormalization`

```typescript
function useNormalization() {
  return {
    normalize,      // (records: CoordinateRecord[]) => Promise<NormalizedRecord[]>
    isNormalizing,  // boolean
    progress,       // number (0-1)
    results,        // NormalizedRecord[]
    error           // Error | null
  };
}
```

### `useGeocoding`

```typescript
function useGeocoding() {
  return {
    geocode,         // (address: string, options?) => Promise<GeocodingResult>
    reverseGeocode,  // (x: number, y: number) => Promise<ReverseGeocodingResult>
    isGeocoding,     // boolean
    error            // Error | null
  };
}
```

---

## 🪝 Store (Zustand)

### `useCoordinateStore`

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
  selectCoordinate: (id: string) => void;
  updateCoordinate: (id: string, updates: Partial<NormalizedRecord>) => void;
  deleteCoordinate: (id: string) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  clearAll: () => void;
}
```

---

## 🌐 APIs Externas

### CartoCiudad IGN
- **Base URL**: `https://www.cartociudad.es/geocoder/api`
- **Endpoints**: `/geocoder/candidatesJsonp`, `/reversegeocode`

### CDAU (Callejero Andalucía)
- **Base URL**: `https://www.callejerodeandalucia.es/api`
- **Endpoints**: `/search`, `/address`

### WFS IECA
- **Servicios**: SICESS (salud), Centros educativos, IAPH (patrimonio)
- **Formato**: GeoJSON, GML3

---

**Documentación API** | **v1.0.0**  
**Sistema PTEL Coordinate Normalizer** 📡
