# Referencia: coordinateNormalizer.ts

Módulo principal de normalización de coordenadas para el proyecto PTEL.

## Ubicación

**Project Knowledge:** `/mnt/project/coordinateNormalizer.ts`  
**Tamaño:** 36 KB (808 líneas)

## Descripción

Implementa la taxonomía completa de 52 patrones de coordenadas identificados en documentos municipales andaluces.

**Sistema objetivo:** EPSG:25830 (UTM Zona 30N, ETRS89)

## Tipos Exportados

```typescript
export type TipoCoordenda = 'X' | 'Y' | 'GEOGRAFICA_LAT' | 'GEOGRAFICA_LON' | 'DESCONOCIDO';
export type NivelConfianza = 'ALTA' | 'MEDIA' | 'BAJA' | 'CRITICA';
export type PatronDetectado = 
  | 'LIMPIO'
  | 'COMA_DECIMAL'
  | 'EUROPEO_COMPLETO'
  | 'PUNTO_MILES'
  | 'ESPACIO_DOBLE_TILDE'
  | 'ESPACIO_SIN_DECIMAL'
  | 'ESPACIO_DECIMAL_IMPLICITO'
  | 'TILDE_SIMPLE'
  | 'MOJIBAKE'
  | 'COMILLAS_TIPOGRAFICAS'
  | 'PLACEHOLDER'
  | 'DESCONOCIDO';
```

## Interfaces Principales

### ResultadoNormalizacion

```typescript
export interface ResultadoNormalizacion {
  valorOriginal: string;
  valorNormalizado: number | null;
  exito: boolean;
  patronDetectado: PatronDetectado;
  fasesAplicadas: string[];
  warnings: string[];
  errores: string[];
}
```

### ParCoordenadas

```typescript
export interface ParCoordenadas {
  x: number | null;
  y: number | null;
  xOriginal: string;
  yOriginal: string;
  normalizacionX: ResultadoNormalizacion;
  normalizacionY: ResultadoNormalizacion;
  validacionX: ResultadoValidacion | null;
  validacionY: ResultadoValidacion | null;
  intercambioAplicado: boolean;
  confianzaGlobal: NivelConfianza;
  epsg: number;
}
```

## Constantes

### RANGOS_ANDALUCIA

```typescript
export const RANGOS_ANDALUCIA = {
  UTM: {
    X_MIN: 100000,
    X_MAX: 620000,
    Y_MIN: 3980000,
    Y_MAX: 4290000,
  },
  GEOGRAFICAS: {
    LAT_MIN: 36.0,
    LAT_MAX: 38.75,
    LON_MIN: -7.55,
    LON_MAX: -1.60,
  },
  Y_TRUNCADA: {
    MIN: 40000,
    MAX: 300000,
  },
};
```

## Funciones Principales

### normalizarCoordenada(input: string): ResultadoNormalizacion

Normaliza una coordenada aplicando el pipeline completo:

1. Limpieza inicial y detección placeholder
2. Corrección mojibake UTF-8/Windows-1252
3. Normalización caracteres especiales
4. Eliminación espacios entre dígitos
5. Normalización formato europeo
6. Parsing numérico

### procesarParCoordenadas(xInput, yInput, opciones?): ParCoordenadas

Procesa un par de coordenadas con validación cruzada.

**Opciones:**
- `aplicarCorreccionP0`: Corregir Y truncada (default: true)
- `detectarIntercambio`: Detectar X↔Y intercambiados (default: true)
- `epsgAsumido`: Sistema de referencia (default: 25830)

### detectarPatron(valor: string): PatronDetectado

Detecta el patrón de formato de la coordenada.

### esPlaceholder(valor: string): boolean

Detecta si el valor es un placeholder (texto o numérico).

### detectarIntercambioXY(x, y): {...}

Detecta y corrige intercambio de coordenadas X↔Y.

## Casos de Test Incluidos

El módulo incluye función `ejecutarTests()` con casos reales:

- Berja (ODS): Espacio + doble tilde
- Berja (DOCX): Decimales implícitos
- Europeo completo: Punto miles + coma decimal
- Colomera: Coma decimal simple
- Hornos: Punto miles sin decimal
- Castril: Formato limpio
- Y Truncada: Corrección P0-1
- X↔Y Invertidos: Corrección P0-2
- Placeholders: Detección valores vacíos
- Mojibake: Corrección caracteres corruptos

---

*Referencia generada: 29 Noviembre 2025*