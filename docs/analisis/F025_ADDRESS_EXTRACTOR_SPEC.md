# F025: Address Extractor - Especificación Técnica

> **Estado**: Análisis completado, implementación pendiente  
> **Fecha análisis**: 2025-12-04  
> **Documentos analizados**: 12 (6 PTEL + 3 DBF + 3 ODS)  
> **Rol asignado**: MapWizard

## 1. Problema Identificado

### 1.1 Hallazgo Crítico

El módulo `addressCleaner.ts` existe (879 líneas) pero **NO se usa** en el flujo principal de geocodificación:

```typescript
// GeocodingOrchestrator.ts - línea ~720 (ACTUAL)
const address = options.address 
  ? `${options.address}, ${options.municipality}`  // ← SE PASA TAL CUAL
  : `${options.name}, ${options.municipality}`;
```

Solo se usa en `multiFieldStrategy.ts` (línea 213-214) para comparación de similaridad entre candidatos, **no para preparar direcciones antes de geocodificar**.

### 1.2 Impacto

Las direcciones con formato problemático fallan al geocodificar:

| Entrada | Problema | Resultado CartoCiudad |
|---------|----------|----------------------|
| "Centro de Salud Tíjola, Plaza Luis Gonzaga, n/ 1, disponible 24h" | Nombre infraestructura + horario | ❌ No encontrado |
| "C/Garcilaso de la Vega, n/ 5, bajo, Tíjola" | Formato n/ + piso | ❌ No encontrado |
| "Lugar más próximo donde se localice la emergencia" | No geocodificable | ❌ Error silencioso |

## 2. Análisis de Documentos

### 2.1 Fuentes Analizadas

| Documento | Tipo | Candidatos | Problemas |
|-----------|------|------------|-----------|
| Tíjola | ODT | 228 | 53 |
| Colomera | ODT | 236 | 39 |
| Berja | DOCX | 180+ | 40+ |
| Quéntar | ODT | 143 | 23 |
| Castril | ODT | 517 | 80 |
| Hornos | ODT | 180 | 24 |
| INDUSTRIAL.dbf | DBF | 3 | 1 |
| PATRIMONIO.dbf | DBF | 2 | 0 |
| VULNERABLES.dbf | DBF | 5 | 1 |
| *.ods | ODS | 15 | 3 |

### 2.2 Problemas por Frecuencia

| Problema | Casos | % |
|----------|-------|---|
| Teléfonos embebidos | 111 | 51% |
| No geocodificables | 52 | 24% |
| Horarios embebidos | 15 | 7% |
| Formato n/ (n barra) | 14 | 6% |
| Descripciones (no dirección) | 9 | 4% |
| Otro municipio mencionado | 6 | 3% |
| Polígono sin calle | 6 | 3% |
| Personal embebido | 4 | 2% |
| Nombre mezclado con dirección | 2 | 1% |



## 3. Catálogo de Patrones

### 3.1 Tipos de Vía (47 variantes)

```
Calle: C/, c/, CL., Calle, CALLE
Avenida: Av/, Av., Avd, Avd., Avda, Avda., Avenida, AVENIDA
Plaza: Pl/, Pl., Pza, Pza., Plaza, PLAZA, Plza
Carretera: Ctra, Ctra., Carretera, CARRETERA
Polígono: Pol, Pol., Polígono, Poligono, POLIGONO
Camino: Cno, Cno., Camino
Paraje: Pje, Pje., Paraje
Paseo: Pº, Pso, Pso., Paseo
Vereda, Cuesta, Barrio (Bº, Bo.), Partida (Ptda), Urbanización (Urb.)
```

### 3.2 Prefijos de Infraestructura (51)

```
Centro de Salud [de Municipio], Consultorio [Local|Médico]
Residencia [de Mayores|Tercera Edad|Asistencial]
CEIP, IES, Colegio, Instituto, Escuela Infantil, Guardería
Ayuntamiento [de Municipio], Casa Consistorial
Policía Local [Municipal], Casa Cuartel, Guardia Civil
Bomberos, Consorcio de Bomberos, Parque de Bomberos
Pabellón Municipal [de Deportes], Polideportivo, Piscina Municipal
Biblioteca [Municipal], Casa de la Cultura, Centro Cultural
Hogar del Pensionista, Centro de Día, Tanatorio
Farmacia, Servicio de [...]
```

### 3.3 Sufijos a Eliminar

```
, disponible 24 horas / Disponibilidad 24h / 24h
Tel: XXXXXXXXX / Tlf. XXXXXXXXX / Tfno: XXXXXXXXX / [69]XXXXXXXX
(Almería) / (Granada) / ... (provincias entre paréntesis)
, bajo / , alto / , izq / , dcha / , pta
, 04760 / , 18XXX / ... (códigos postales)
L-V 8-15 / horario ...
```

### 3.4 Patrones No Geocodificables

```
"Lugar [más próximo] donde se localice la emergencia"
"según la emergencia" / "los disponibles" / "los asignados"
"Indicar" / "Pendiente de"
"X,- Cargos Políticos, X,- Funcionarios de..."
"Pol XX- P XXX" (parcelas catastrales)
Múltiples "C/" en el mismo texto
```

### 3.5 Correcciones OCR/UTF-8

```
NÂº → Nº
Ã± → ñ, Ã¡ → á, Ã© → é, Ã­ → í, Ã³ → ó, Ãº → ú
Âº → º
s7n → s/n
Diponibilidad → Disponibilidad
ACTECAS → Aztecas
```



## 4. Casos de Test (63 total)

### 4.1 Casos Reales - Tíjola (13)

| # | Input | Expected | Tipo |
|---|-------|----------|------|
| 1 | "Centro de Salud Tíjola, Plaza Luis Gonzaga, n/ 1, de Tíjola, disponible 24 horas" | "Plaza Luis Gonzaga, 1, Tíjola" | nombre+dir+horario |
| 2 | "Ayuntamiento de Tíjola, despachos municipales, Plaza de España, n/ 1, Tíjola, 950420300- Disponible 24 horas" | "Plaza de España, 1, Tíjola" | nombre+extra+tel+horario |
| 3 | "C/Garcilaso de la Vega, n/ 5, bajo, Tíjola, disponible 24 horas" | "Calle Garcilaso de la Vega, 5, Tíjola" | dir+piso+horario |
| 4 | "Policía Local, C/Garcilaso de la Vega, n/ 5, bajo, Tíjola" | "Calle Garcilaso de la Vega, 5, Tíjola" | nombre+dir+piso |
| 5 | "Consorcio de Bomberos Levante Almeriense, Avda. De la Estación s/n, Albox (Almería)" | "Avenida de la Estación, s/n, Albox" | nombre+dir+otro_municipio |
| 6 | "Pabellón Municipal de Deportes, C/ Francisco Quevedo, s/n, Tíjola" | "Calle Francisco Quevedo, s/n, Tíjola" | nombre+dir |
| 7 | "Poligono Industrial Tíjola, s/n, Diponibilidad 24 horas" | "Polígono Industrial, s/n, Tíjola" | poligono+typo |
| 8 | "Carretera 334, frente Cuartel Guardia Civil, Tíjola" | "Carretera 334, Tíjola" | carretera+ref_relativa |
| 9 | "Lugar más próximo donde se localice la emergencia" | null | no_geocodificable |
| 10 | "3,- Cargos Políticos, 3,- Funcionarios de Ayuntamiento Tíjola" | null | no_geocodificable |
| 11 | "Avda José Antonio, n/ 18, Tíjola" | "Avenida José Antonio, 18, Tíjola" | dir_simple |
| 12 | "C/ Santa María, n/ 1" | "Calle Santa María, 1" | dir_sin_municipio |
| 13 | "C/ Enriqueta Reche, s7n" | "Calle Enriqueta Reche, s/n" | typo_sn |

### 4.2 Casos Reales - Colomera (10)

| # | Input | Expected | Tipo |
|---|-------|----------|------|
| 14 | "C/ erillas, 2Colomera" | "Calle Erillas, 2, Colomera" | numero_pegado |
| 15 | "Avd Virgen de la Cabeza, 9. Colomera" | "Avenida Virgen de la Cabeza, 9, Colomera" | punto_vs_coma |
| 16 | "CONSULTORIO MÉDICO DE COLOMERA Y DEL CONSULTORIO AUXILIAR DEL CAURO" | null | solo_nombre |
| 17 | "Avd. Benalua C/ Paz 1 C/ Amapola 8" | null | multiples_direcciones |
| 18 | "Pol 14- P 146" | null | parcela_catastral |
| 19 | "C/ Pilarillo s/n C/ Cuesta de las Fuentes s/n" | null | multiples_direcciones |
| 20 | "Calle Iglesia, 1" | "Calle Iglesia, 1" | direccion_limpia |
| 21 | "Vereda del Camino Real de Madrid" | "Vereda del Camino Real de Madrid" | vereda_sin_num |
| 22 | "Paraje cortijo el chopo" | "Paraje Cortijo El Chopo" | paraje |
| 23 | "AV. Benalúa s/n" | "Avenida Benalúa, s/n" | mayusculas |

### 4.3 Casos Reales - Berja (9)

| # | Input | Expected | Tipo |
|---|-------|----------|------|
| 24 | "Plaza de la Constitución 1.  Berja 04760" | "Plaza de la Constitución, 1, Berja" | dir+cp |
| 25 | "C/ Carretera de Adra s/n Berja. Teléfono. 600 10 90 00" | "Calle Carretera de Adra, s/n, Berja" | dir+telefono |
| 26 | "C/LOS ACTECAS NAVE N.º 11" | "Calle Los Aztecas, nave 11" | nave+typo |
| 27 | "POLIGONO C/ QUINTA AVENIDA S/N" | "Polígono, Calle Quinta Avenida, s/n" | poligono+calle |
| 28 | "C/ PLAZA DE LA CONSTITUCIÓN N.º 6" | "Plaza de la Constitución, 6" | c_plaza_redundante |
| 29 | "Policía Local Municipal. Jefatura: Plaza de la Constitución 1. Berja 04760" | "Plaza de la Constitución, 1, Berja" | nombre+jefatura+dir |
| 30 | "Consultorio Centro de Salud de Berja - URGENCIAS. C/ Carretera de Adra s/n Berja" | "Calle Carretera de Adra, s/n, Berja" | nombre_largo+dir |
| 31 | "c/ llano Vilches 21" | "Calle Llano Vilches, 21" | minusculas |
| 32 | "C/ LOS Geranios - 2" | "Calle Los Geranios, 2" | guion_numero |

### 4.4 Casos Reales - DBF/ODS (7)

| # | Input | Expected | Tipo |
|---|-------|----------|------|
| 33 | "CALLE ESCUELAS NÂº 1" | "Calle Escuelas, 1" | utf8_corrupto |
| 34 | "CUESTA MATUETE S/N" | "Cuesta Matuete, s/n" | mayusculas |
| 35 | "AUTOVIA A-92 DIRECCION GRANADA" | "Autovía A-92, dirección Granada" | autovia |
| 36 | "Moredal, 15" | "Moredal, 15" | sin_tipo_via |
| 37 | "CL. Ramón y Cajal 5." | "Calle Ramón y Cajal, 5" | cl_punto |
| 38 | "CAMINO CAMPO FUTBOL 7" | "Camino Campo Fútbol, 7" | camino |
| 39 | "CAMINO CAMPO DE FÚTBOL N4" | "Camino Campo de Fútbol, 4" | n_pegado |

### 4.5 Casos Sintéticos (24)

Ver archivo `addressExtractor.testCases.ts` para variaciones de:
- Orden de elementos (7 variantes)
- Prefijos de infraestructura (8 variantes)
- Sufijos problemáticos (9 variantes)



## 5. Algoritmo Propuesto

### 5.1 Flujo de Procesamiento (8 pasos)

```
┌─────────────────────────────────────────────────────────────────┐
│ ENTRADA: texto crudo del documento                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 1: Detectar NO geocodificable                              │
│ - "lugar donde se localice", "según emergencia"                 │
│ - Múltiples "C/" en texto                                       │
│ - Parcelas catastrales "Pol XX- P XXX"                          │
│ → Si detectado: return { address: null, confidence: 0 }         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 2: Corregir errores OCR/UTF-8                              │
│ - NÂº → Nº, Ã± → ñ, s7n → s/n, etc.                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 3: Eliminar prefijos de infraestructura                    │
│ - "Centro de Salud de Tíjola," → ""                             │
│ - Ordenar por longitud (más largos primero)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 4: Eliminar sufijos no deseados                            │
│ - Horarios: "disponible 24 horas", "24h"                        │
│ - Teléfonos: "Tel: XXX", "950XXXXXX"                            │
│ - Pisos: "bajo", "alto", "izq"                                  │
│ - Provincias: "(Almería)", "(Granada)"                          │
│ - Códigos postales: "04760", "18XXX"                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 5: Expandir abreviaturas de vía                            │
│ - C/ → Calle, Avd → Avenida, Pza → Plaza                        │
│ - Con límites de palabra para evitar conflictos                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 6: Normalizar formato de número                            │
│ - "n/ 1" → "1", "N.º 15" → "15"                                 │
│ - "N4" → "4", "2Colomera" → "2, Colomera"                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 7: Normalizar puntuación y espacios                        │
│ - ". " → ", ", " - " → ", "                                     │
│ - Múltiples espacios → espacio único                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 8: Capitalización inteligente                              │
│ - MAYÚSCULAS → Title Case                                       │
│ - Preservar: de, del, la, el, los, las, y, e, a                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ SALIDA: { address: string | null, confidence: number }          │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Niveles de Confianza

| Confidence | Criterio | Acción Recomendada |
|------------|----------|-------------------|
| 90-100 | Tipo vía + nombre + número/s/n | Geocodificar directamente |
| 60-89 | Tipo vía + nombre, sin número | Geocodificar con warning |
| 40-59 | Formato parcial reconocido | Intentar fuzzy matching |
| 1-39 | Solo texto libre | Marcar revisión manual |
| 0 | No geocodificable detectado | Descartar |

### 5.3 Integración Propuesta

```typescript
// GeocodingOrchestrator.ts - línea ~710 (MODIFICAR)

// ANTES:
const address = options.address 
  ? `${options.address}, ${options.municipality}`
  : `${options.name}, ${options.municipality}`;

// DESPUÉS:
import { extractStreetAddress } from '../../utils/addressExtractor';

const rawText = options.address || options.name;
const extracted = extractStreetAddress(rawText, options.municipality);

// Logging para casos de baja confianza
if (extracted.confidence < 70) {
  console.warn(`[AddressExtractor] Low confidence (${extracted.confidence}):`, {
    input: rawText,
    output: extracted.address,
    municipality: options.municipality
  });
}

const address = extracted.address 
  ? `${extracted.address}, ${options.municipality}`
  : `${options.name}, ${options.municipality}`;  // Fallback seguro
```



## 6. Decisiones de Arquitectura

### 6.1 Módulo Nuevo vs. Modificar Existente

**Decisión**: Crear `addressExtractor.ts` nuevo, NO modificar `addressCleaner.ts`

**Razones**:
1. `addressCleaner.ts` funciona correctamente en `multiFieldStrategy.ts` para scoring
2. Responsabilidades diferentes:
   - `addressCleaner`: Normaliza para comparación de similaridad
   - `addressExtractor`: Extrae dirección geocodificable de texto libre
3. Fácil rollback si algo falla
4. Testeable independientemente

### 6.2 Interfaz del Módulo

```typescript
// src/utils/addressExtractor.ts

export interface AddressExtractionResult {
  address: string | null;
  confidence: number;  // 0-100
  extractedParts: {
    streetType?: string;
    streetName?: string;
    number?: string;
    municipality?: string;
  };
  warnings: string[];
}

export function extractStreetAddress(
  rawText: string,
  municipality?: string
): AddressExtractionResult;
```

### 6.3 Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/utils/addressExtractor.ts` | CREAR | Módulo principal |
| `src/utils/__tests__/addressExtractor.test.ts` | CREAR | 63+ casos de test |
| `src/lib/GeocodingOrchestrator.ts` | MODIFICAR | Integrar extractor (línea ~710) |

## 7. Métricas de Éxito

### 7.1 Prototipo Python (Referencia)

- Casos correctos: 52/63 (82.5%)
- No-geocodificables detectados: 3/63 (4.8%)
- Fallos: 8/63 (12.7%)

### 7.2 Objetivos TypeScript

| Métrica | Objetivo | Método de Medición |
|---------|----------|-------------------|
| Precisión casos test | ≥85% | Vitest suite |
| Detección no-geocodificables | 100% | Casos marcados como null |
| Tiempo procesamiento | <10ms/dirección | Performance test |
| Cobertura código | ≥90% | c8/istanbul |

## 8. Referencias

- Análisis completo: `/docs/analisis/F025_ADDRESS_EXTRACTOR_SPEC.md` (este archivo)
- Casos de test: `/src/utils/__tests__/addressExtractor.testCases.ts`
- addressCleaner actual: `/src/utils/addressCleaner.ts` (879 líneas)
- Punto de integración: `/src/lib/GeocodingOrchestrator.ts` (línea ~710)

---

**Última actualización**: 2025-12-04  
**Autor**: Claude (sesión análisis addressExtractor)  
**Estado**: Análisis completado, pendiente implementación
