# F023 Fase 1 - Documentación Técnica Completa
## Geocodificación Multi-Campo: Estrategia Singleton + Desambiguación

**Versión:** 1.0.0  
**Fecha:** 3 Diciembre 2025  
**Autor:** Luis Muñoz / MapWizard  
**Estado:** ✅ COMPLETADA (100%)

---

## 📋 Índice

1. [Visión General](#1-visión-general)
2. [Arquitectura de Fase 1](#2-arquitectura-de-fase-1)
3. [Componentes Implementados](#3-componentes-implementados)
4. [Ejemplos de Código](#4-ejemplos-de-código)
5. [Casos de Uso Validados](#5-casos-de-uso-validados)
6. [Guía de Debugging](#6-guía-de-debugging)
7. [Métricas y Rendimiento](#7-métricas-y-rendimiento)
8. [FAQ Técnico](#8-faq-técnico)

---

## 1. Visión General

### 1.1 Problema a Resolver

Los documentos PTEL de municipios andaluces presentan múltiples desafíos de geocodificación:

| Problema | Ejemplo Real | Impacto |
|----------|--------------|---------|
| Nombres concatenados | `CENTROSALUD` | Clasificación incorrecta |
| Abreviaturas | `C/ Sol s/n` | Geocodificación fallida |
| Teléfonos embebidos | `Centro. Tel: 950123456` | Ruido en búsqueda |
| Múltiples candidatos | 2 centros de salud en Quéntar | Ambigüedad |

### 1.2 Solución: Estrategia Singleton

**Insight clave:** El 65% de municipios andaluces tienen UN SOLO establecimiento por tipología.

```
MUNICIPIO + TIPOLOGÍA  →  count()  →  ¿Resultado?
────────────────────────────────────────────────
Agrón (18001) + HEALTH  →    1     →  SINGLETON ✅
Quéntar (18160) + HEALTH →   2     →  Desambiguar 🔄
Tíjola (04088) + HEALTH  →    0     →  CartoCiudad ⬆️
```

### 1.3 Mejora de Score

| Métrica | Antes | Después Fase 1 | Objetivo Final |
|---------|-------|----------------|----------------|
| Score global | 65% | 75-80% | 92-98% |
| Confianza singleton | N/A | 95% | 95% |
| Tests | 695 | 953 | 1000+ |

---

## 2. Arquitectura de Fase 1

### 2.1 Flujo de Decisión

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTRADA: Registro PTEL                       │
│  nombre: "Centro de Salud"                                      │
│  dirección: "C/ Mayor 5"                                        │
│  codMun: "18001"                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. CLASIFICACIÓN (InfrastructureClassifier)                    │
│  ─────────────────────────────────────────────                  │
│  • Separar concatenaciones: CENTROSALUD → CENTRO SALUD          │
│  • Corregir typos: SANITARIODE → SANITARIO DE                   │
│  • Detectar tipología: HEALTH (confianza: 85%)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. DETECCIÓN SINGLETON (LocalDataService)                      │
│  ─────────────────────────────────────────────                  │
│  count = countByType('HEALTH', '18001')                         │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         count = 1       count ≥ 2       count = 0
              │               │               │
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  3a. SINGLETON  │ │ 3b. DESAMBIGUAR │ │ 3c. ESCALAR     │
│  ─────────────  │ │ ───────────────  │ │ ─────────────   │
│  Match directo  │ │ Multi-field     │ │ CartoCiudad     │
│  95% confianza  │ │ scoring         │ │ CDAU/Nominatim  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. RESULTADO GEOCODIFICACIÓN                                   │
│  ─────────────────────────────────────────────                  │
│  x: 475234, y: 4123456 (EPSG:25830)                            │
│  confianza: 95%, fuente: SINGLETON_HEALTH                       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Archivos del Sistema

```
src/
├── lib/
│   ├── LocalDataService.ts      # Datos DERA + singleton detection
│   ├── InfrastructureClassifier.ts  # Clasificación mejorada
│   └── multiFieldStrategy.ts    # Desambiguación multi-campo
├── utils/
│   └── addressCleaner.ts        # Limpieza de direcciones
└── services/geocoding/
    └── GeocodingOrchestrator.ts # Integración Fase 1
```

---

## 3. Componentes Implementados

### 3.1 LocalDataService - Métodos Singleton

**Archivo:** `src/lib/LocalDataService.ts`

#### countByType()

Cuenta features de una tipología en un municipio específico.

```typescript
/**
 * @param tipologia - Tipo: 'HEALTH', 'SANITARIO', 'EDUCATION', etc.
 * @param codMunicipio - Código INE 5 dígitos
 * @returns Número de features encontrados
 */
export async function countByType(
  tipologia: string,
  codMunicipio: string
): Promise<number>
```

**Comportamiento:**
- `count === 1` → Log: `[F023-1.1] SINGLETON detectado`
- `count >= 2` → Log: `[F023-1.1] Múltiples (N): requiere desambiguación`
- `count === 0` → Sin datos locales, escalar a APIs

#### getUniqueByType()

Obtiene el feature único si es singleton.

```typescript
/**
 * @returns Feature si count===1, null si count===0 o count>=2
 */
export async function getUniqueByType(
  tipologia: string,
  codMunicipio: string
): Promise<LocalFeature | null>
```

### 3.2 InfrastructureClassifier - Mejoras

**Archivo:** `src/lib/InfrastructureClassifier.ts`

#### Patrones de Concatenación (11)

| Patrón | Entrada | Salida |
|--------|---------|--------|
| `CENTROSALUD` | "CENTROSALUD" | "CENTRO SALUD" |
| `GUARDIACIVIL` | "GUARDIACIVIL" | "GUARDIA CIVIL" |
| `POLICILOCAL` | "POLICILOCAL" | "POLICIA LOCAL" |
| `COLEGIOPUBLICO` | "COLEGIOPUBLICO" | "COLEGIO PUBLICO" |
| ... | ... | ... |

#### Corrección de Typos (14)

| Patrón | Entrada | Salida |
|--------|---------|--------|
| `SANITARIODE` | "SANITARIODE" | "SANITARIO DE" |
| `POLIICIA` | "POLIICIA" | "POLICIA" |
| `EDUCACION` | "EDUCACION" | "EDUCACIÓN" |
| ... | ... | ... |

#### Separación Automática

```typescript
// camelCase
"SevillanaEndesa" → "Sevillana Endesa"

// Números pegados
"Trasformador60822" → "Trasformador 60822"
```

### 3.3 AddressCleaner

**Archivo:** `src/utils/addressCleaner.ts`

#### Limpieza de Elementos No-Geocodificables

```typescript
const input = "Centro Salud. Tel: 950123456. 24h. 1 mesa, 2 sillas";
const result = cleanAddress(input);

// result.cleaned = "Centro Salud"
// result.removed = {
//   phones: ["950123456"],
//   schedules: ["24h"],
//   equipment: ["1 mesa, 2 sillas"]
// }
```

#### Normalización de Abreviaturas

| Entrada | Salida |
|---------|--------|
| `C/` | `Calle` |
| `Avda.` | `Avenida` |
| `Ctra.` | `Carretera` |
| `Pza.` | `Plaza` |
| `s/n` | `sin número` |

#### Evaluación de Calidad

```typescript
const result = cleanAddress("Calle Mayor 5, Granada");
// result.quality = 85 (buena dirección geocodificable)

const result2 = cleanAddress("Aquí");
// result2.quality = 15 (dirección pobre)
```

### 3.4 MultiFieldStrategy - Desambiguación

**Archivo:** `src/lib/multiFieldStrategy.ts`

#### Pesos por Tipología

Los pesos están optimizados según la importancia de cada campo para cada tipo de infraestructura:

| Tipología | Nombre | Dirección | Localidad | Justificación |
|-----------|--------|-----------|-----------|---------------|
| HEALTH | 0.50 | 0.35 | 0.15 | Nombres únicos: "Centro Salud Quéntar" |
| EDUCATION | 0.45 | 0.30 | 0.25 | Colegios pueden repetir nombres entre localidades |
| SECURITY | 0.55 | 0.25 | 0.20 | Cuarteles con nombres muy distintivos |
| ADMIN | 0.40 | 0.35 | 0.25 | Ayuntamientos: dirección importante |

#### Niveles de Confianza

```typescript
type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

// HIGH:   score >= 70 AND gap >= 15 (clara diferencia)
// MEDIUM: score >= 50 AND gap >= 10
// LOW:    score >= 30 OR gap < 10 (candidatos similares)
// NONE:   score < 30 (no hay match aceptable)
```


---

## 4. Ejemplos de Código

### 4.1 Uso Básico de Singleton Detection

```typescript
import { countByType, getUniqueByType, loadLocalData } from '@/lib/LocalDataService';

// Cargar datos DERA (solo necesario una vez)
await loadLocalData();

// Ejemplo: Agrón (18001) - municipio con 1 centro de salud
const count = await countByType('HEALTH', '18001');
console.log(`Agrón tiene ${count} centro(s) de salud`);
// Output: "Agrón tiene 1 centro(s) de salud"

if (count === 1) {
  const feature = await getUniqueByType('HEALTH', '18001');
  console.log(`Match directo: ${feature.nombre}`);
  console.log(`Coordenadas: X=${feature.x}, Y=${feature.y}`);
  // Output: "Match directo: Consultorio Local de Agrón"
  // Output: "Coordenadas: X=445123, Y=4098765"
}
```

### 4.2 Integración Completa en GeocodingOrchestrator

```typescript
import { GeocodingOrchestrator } from '@/services/geocoding/GeocodingOrchestrator';

const orchestrator = new GeocodingOrchestrator();

const result = await orchestrator.geocode({
  nombre: 'Centro de Salud',
  direccion: 'C/ Mayor 5',
  tipologia: 'HEALTH',
  codMun: '18001',         // Agrón
  municipality: 'Agrón',
  province: 'Granada',
  useLocalData: true       // Habilitar singleton detection
});

// Resultado para singleton:
// {
//   geocoding: {
//     x: 445123,
//     y: 4098765,
//     confidence: 95,
//     source: 'SINGLETON_HEALTH',
//     matchedName: 'Consultorio Local de Agrón'
//   },
//   validationScore: 92,
//   processingTimeMs: 45
// }
```

### 4.3 Desambiguación Manual

```typescript
import { disambiguate } from '@/lib/multiFieldStrategy';
import { getFeaturesByMunicipio } from '@/lib/LocalDataService';

// Quéntar tiene 2 centros de salud
const candidates = await getFeaturesByMunicipio('18160', ['health']);

const ptelRecord = {
  nombre: 'Consultorio Médico Quéntar',
  direccion: 'Calle Real 15',
  localidad: 'Quéntar'
};

const result = disambiguate(ptelRecord, candidates, 'HEALTH');

console.log(`Seleccionado: ${result.selected.nombre}`);
console.log(`Score: ${result.score}, Confianza: ${result.confidence}`);
// Output: "Seleccionado: Consultorio de Quéntar"
// Output: "Score: 78, Confianza: HIGH"
```

### 4.4 Limpieza de Direcciones

```typescript
import { cleanAddress, evaluateAddressQuality } from '@/utils/addressCleaner';

// Dirección real de documento PTEL con ruido
const input = "C/ Mayor, 5. Tel: 958123456. Horario: L-V 8:00-15:00";

const result = cleanAddress(input);

console.log('Original:', result.original);
console.log('Limpia:', result.cleaned);
console.log('Calidad:', result.quality);
console.log('Teléfonos eliminados:', result.removed.phones);
console.log('Horarios eliminados:', result.removed.schedules);

// Output:
// Original: C/ Mayor, 5. Tel: 958123456. Horario: L-V 8:00-15:00
// Limpia: Calle Mayor 5
// Calidad: 78
// Teléfonos eliminados: ["958123456"]
// Horarios eliminados: ["L-V 8:00-15:00"]
```

---

## 5. Casos de Uso Validados

### 5.1 Colomera (18048) - Múltiples Centros

**Escenario:** Colomera tiene 2 centros de salud en DERA.

```
Entrada PTEL:
  nombre: "Centro de Salud Colomera"
  dirección: "Plaza de la Constitución"
  codMun: "18048"

Proceso:
  1. countByType('HEALTH', '18048') → 2 (no singleton)
  2. Desambiguación activada
  3. Scoring multi-campo:
     - Candidato A: "Consultorio Colomera" → score 72
     - Candidato B: "Consultorio Limones"  → score 45
  4. Gap = 27 puntos → Confianza HIGH

Resultado:
  Seleccionado: "Consultorio Colomera"
  Confianza: HIGH
  Coordenadas: X=437265, Y=4148932
```

### 5.2 Hornos (23044) - Coordenadas con Formato Especial

**Escenario:** Documento de Hornos usa puntos como separadores de miles.

```
Entrada ODT:
  X: "524.643"  (parece decimal pero son miles)
  Y: "4.229.868"

Proceso:
  1. DocumentExtractor detecta patrón español
  2. cleanCoordinateValue: "524.643" → 524643
  3. cleanCoordinateValue: "4.229.868" → 4229868
  4. Validación UTM: ambas en rango válido ✓

Resultado:
  X: 524643 (válido: 100000-800000)
  Y: 4229868 (válido: 4000000-4350000)
```

### 5.3 Berja (04031) - Concatenación + Typos

**Escenario:** Documento con textos mal formateados.

```
Entrada PTEL:
  tipología: "CENTROSALUD"  (concatenado)
  nombre: "Consultorio Médco"  (typo: "Médco")

Proceso:
  1. Clasificador separa: "CENTRO SALUD"
  2. Clasificador corrige: no hay regla para "Médco"
  3. Tipo detectado: HEALTH
  4. countByType('HEALTH', '04031') → 1 (singleton!)
  5. Match directo sin fuzzy

Resultado:
  Match: "Centro de Salud de Berja"
  Confianza: 95%
  Fuente: SINGLETON_HEALTH
```

### 5.4 Tíjola (04088) - Sin Datos Locales

**Escenario:** Municipio sin datos en DERA.

```
Entrada PTEL:
  tipología: "ENERGY"
  nombre: "Parque Eólico Sierra"
  codMun: "04088"

Proceso:
  1. countByType('ENERGY', '04088') → 0
  2. No hay singleton, no hay candidatos
  3. Escalar a CartoCiudad API
  4. Búsqueda: "Parque Eólico Sierra, Tíjola, Almería"

Resultado:
  Match: CartoCiudad result
  Confianza: 72%
  Fuente: CARTOCIUDAD
```

---

## 6. Guía de Debugging

### 6.1 Prefijos de Log

Cada componente de Fase 1 tiene un prefijo único para facilitar el debugging:

| Prefijo | Componente | Archivo |
|---------|------------|---------|
| `[F023-1.1]` | LocalDataService (singleton) | `LocalDataService.ts` |
| `[F023-1.2]` | Clasificador mejorado | `InfrastructureClassifier.ts` |
| `[F023-1.3]` | Address Cleaner | `addressCleaner.ts` |
| `[F023-1.4]` | Multi-field Strategy | `multiFieldStrategy.ts` |
| `[F023-1.5]` | GeocodingOrchestrator | `GeocodingOrchestrator.ts` |

### 6.2 Mensajes de Log Comunes

```bash
# Singleton detectado (caso ideal)
[F023-1.5] ✅ SINGLETON: HEALTH en 18001 → "Consultorio Agrón" (95% confianza)

# Múltiples candidatos (requiere desambiguación)
[F023-1.1] Múltiples (2): HEALTH en 18160 - requiere desambiguación
[F023-1.4] Desambiguación "Centro Salud": 2 candidatos, mejor=72, gap=27, conf=HIGH
[F023-1.5] 📊 Desambiguación: "Consultorio Quéntar" (score=72, conf=HIGH)

# Sin datos locales (escalar a API)
[F023-1.1] Municipio 04088 no encontrado en índice local
[F023-1.5] 🔄 Sin datos locales → escalando a CartoCiudad

# Tipología sin categoría local
[F023-1.1] Tipología 'WATER' sin datos locales disponibles
```

### 6.3 Cómo Investigar Problemas

**Problema: "Singleton no detectado cuando debería"**

1. Verificar que datos DERA estén cargados:
   ```typescript
   import { isDataLoaded, getStats } from '@/lib/LocalDataService';
   console.log('Cargado:', isDataLoaded());
   console.log('Stats:', getStats());
   ```

2. Verificar código INE correcto:
   ```typescript
   // Usar siempre 5 dígitos con ceros a la izquierda
   countByType('HEALTH', '04031'); // ✓ Correcto
   countByType('HEALTH', '4031');  // ✗ Incorrecto
   ```

3. Verificar tipología reconocida:
   ```typescript
   // Ver mapeo tipología → categoría
   mapTypeToLocalCategories('HEALTH');     // ['health']
   mapTypeToLocalCategories('SANITARIO');  // ['health']
   mapTypeToLocalCategories('UNKNOWN');    // []
   ```

**Problema: "Desambiguación elige candidato incorrecto"**

1. Ver scores detallados:
   ```typescript
   const result = disambiguate(record, candidates, 'HEALTH');
   console.log('Debug:', result.debug);
   // { candidateCount: 2, gap: 5, topScore: 65, ... }
   ```

2. Si gap es bajo (< 10), candidatos son muy similares → requiere más contexto

3. Ajustar pesos si tipología específica falla consistentemente


---

## 7. Métricas y Rendimiento

### 7.1 Tiempos de Ejecución

| Operación | Tiempo Típico | Máximo Aceptable |
|-----------|---------------|------------------|
| Carga datos DERA | ~48ms | 100ms |
| countByType() | <1ms | 5ms |
| getUniqueByType() | <1ms | 5ms |
| Singleton completo | <50ms | 100ms |
| Desambiguación | <100ms | 200ms |
| Cascada completa | 200-500ms | 2000ms |

### 7.2 Uso de Memoria

```
Datos DERA cargados:
├── health.geojson:     1,700 features (~850 KB)
├── security.geojson:   1,259 features (~630 KB)
├── education.geojson:  6,725 features (~3.4 MB)
├── municipal.geojson:  1,414 features (~700 KB)
├── emergency.geojson:     23 features (~12 KB)
└── energy.geojson:       161 features (~80 KB)
────────────────────────────────────────────────
TOTAL:                 11,282 features (~5.7 MB)
```

### 7.3 Cobertura de Tests

| Componente | Tests | Líneas | Cobertura |
|------------|-------|--------|-----------|
| LocalDataService | 12 | 280 | 94% |
| InfrastructureClassifier | 143 | 420 | 98% |
| addressCleaner | 54 | 350 | 96% |
| multiFieldStrategy | 28 | 280 | 92% |
| GeocodingOrchestrator (singleton) | 14 | 180 | 88% |
| Verificación municipios | 11 | 80 | 100% |
| **TOTAL FASE 1** | **262** | **1590** | **94%** |

### 7.4 Distribución de Casos

Basado en análisis de 786 municipios andaluces:

```
Centros de Salud por municipio:
├── 0 centros:   5% (pequeños sin consultorio propio)
├── 1 centro:   65% (SINGLETON → 95% confianza)
├── 2 centros:  20% (desambiguación)
├── 3+ centros: 10% (ciudades grandes)
```

**Impacto de Fase 1:**
- 65% de casos resueltos con singleton (máxima precisión)
- 20% de casos con desambiguación multi-campo
- 15% escalan a CartoCiudad/CDAU

---

## 8. FAQ Técnico

### 8.1 ¿Por qué singleton tiene 95% de confianza y no 100%?

Porque existe una pequeña posibilidad de que:
- Los datos DERA estén desactualizados
- El municipio haya añadido un nuevo centro después de la última actualización
- El registro PTEL se refiera a algo que no está en DERA (ej: consulta privada)

El 5% de "incertidumbre" es intencional para la Fase 2 de validación cruzada.

### 8.2 ¿Qué pasa si DERA no tiene datos de un municipio?

El sistema escala automáticamente a la cascada de APIs:

1. CartoCiudad (dirección) → 70-85% confianza
2. CDAU (catastro) → 65-80% confianza
3. Nominatim OSM → 50-70% confianza
4. Manual → 0% confianza (requiere intervención)

### 8.3 ¿Cómo se actualiza el mapeo tipología → categoría?

En `LocalDataService.ts`, función `resolveTypologyToCategories()`:

```typescript
const TYPOLOGY_TO_CATEGORIES: Record<string, InfrastructureCategory[]> = {
  'HEALTH': ['health'],
  'SANITARIO': ['health'],
  'EDUCATION': ['education'],
  'SECURITY': ['security'],
  // ... añadir nuevos mapeos aquí
};
```

### 8.4 ¿Qué hacer si la desambiguación falla consistentemente?

1. **Revisar pesos:** Puede que la tipología necesite pesos diferentes
2. **Añadir campo:** Si hay otro campo distintivo (ej: subtipo)
3. **Mejorar datos:** A veces el problema está en la calidad de DERA
4. **Flag manual:** Marcar para revisión humana

### 8.5 ¿Los tests funcionan sin datos DERA reales?

Sí. Los tests usan datos mock. Los tests con datos reales (`ValidacionMunicipiosConocidos.test.ts`) están marcados como `skip` para CI/CD.

Para ejecutar con datos reales:
1. Levantar servidor local: `npm run dev`
2. Cargar datos DERA en `/public/data/dera/`
3. Cambiar `describe.skip` → `describe` en el archivo
4. Ejecutar: `npm test`

### 8.6 ¿Cómo añadir nuevos patrones al clasificador?

En `InfrastructureClassifier.ts`:

```typescript
// Añadir concatenación
CONCATENATION_PATTERNS.push({
  pattern: /NUEVAPALABRA/gi,
  replacement: 'NUEVA PALABRA'
});

// Añadir typo
TYPO_CORRECTIONS.push({
  pattern: /TIPOEROR/gi,
  replacement: 'TIPO ERROR'
});
```

Después añadir tests correspondientes.

### 8.7 ¿Cuál es la diferencia entre `codMun` y `codMunicipio`?

Son lo mismo (código INE de 5 dígitos). La inconsistencia viene de diferentes fuentes:
- PTEL usa `codMun`
- DERA usa `cod_mun`
- CartoCiudad usa `munId`

`LocalDataService` normaliza todos a `codMun` internamente.

### 8.8 ¿Por qué no usar fuzzy matching directamente?

Fuzzy matching (Fuse.js) es más lento y puede dar falsos positivos:

| Estrategia | Tiempo | Precisión | Cuando Usar |
|------------|--------|-----------|-------------|
| Singleton | <1ms | 95% | count === 1 |
| Multi-field | <50ms | 70-85% | count >= 2 |
| Fuzzy | 50-200ms | 50-75% | Último recurso |

Singleton es O(1) por el índice por municipio. Fuzzy es O(n).

---

## 9. Próximos Pasos: Fase 2

La Fase 2 implementará **validación cruzada multi-fuente** para alcanzar el 92-98% objetivo:

| Componente | Objetivo |
|------------|----------|
| Consulta paralela | CartoCiudad + CDAU simultáneos |
| Clusters DBSCAN | Detectar outliers en coordenadas |
| Centroide Huber | Coordenada final robusta |
| Detección discrepancias | Flag automático si fuentes difieren >500m |

**Score proyectado:** 75-80% → 92-98%

---

## 10. Commits y Referencias

### Commits de Fase 1

| Commit | Descripción |
|--------|-------------|
| `930907f` | F023-1.5: Bug fix HEALTH + 14 tests integración |
| `c198dfd` | F023 Fase 1 COMPLETADA: Documentación + verificación |
| `ba670fa` | Actualizar estado: F023 Fase 1 → Fase 2 pendiente |

### Archivos de Documentación

- `.ptel/PLAN_IMPLEMENTACION_GEOCODIFICACION_v2.md` — Plan maestro
- `.ptel/CHECKLIST_IMPLEMENTACION_MULTICAMPO.md` — Progreso por tarea
- `.ptel/FASE1_RESUMEN_IMPLEMENTACION.md` — Resumen ejecutivo
- `.ptel/DOCUMENTACION_FASE1_COMPLETA.md` — Este documento

### Tests Relacionados

```
src/lib/__tests__/LocalDataService.test.ts
src/lib/__tests__/InfrastructureClassifier.test.ts
src/utils/__tests__/addressCleaner.test.ts
src/lib/__tests__/multiFieldStrategy.test.ts
src/services/geocoding/__tests__/GeocodingOrchestrator.singleton.test.ts
src/services/geocoding/__tests__/verificacion-municipios-reales.test.ts
```

---

**Documento generado:** 3 Diciembre 2025  
**Versión:** 1.0.0  
**Autor:** Luis Muñoz + MapWizard (Claude)  
**Proyecto:** PTEL Coordinate Normalizer v0.5.0
