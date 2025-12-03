# CHECKLIST DE IMPLEMENTACIÓN - Geocodificación Multi-Campo + Validación Cruzada
## Fecha: 3 Diciembre 2025
## Estado: EN ESPERA DE IMPLEMENTACIÓN

---

## FASE 1: Estrategia Multi-Campo
**Objetivo:** +20% score | **Duración:** 2-3 días

### 1.1 LocalDataService - Métodos Singleton
- [x] Implementar `countByType(tipologia: string, codMunicipio: string): Promise<number>`
- [x] Implementar `getUniqueByType(tipologia: string, codMunicipio: string): Promise<Feature | null>`
- [x] Tests unitarios para singletons (12 tests)
- [ ] Verificar con municipios conocidos (Quéntar: 2 centros, Colomera: 2 centros)

### 1.2 Clasificador Mejorado
- [x] Detectar concatenaciones: "CENTROSALUD" → "CENTRO SALUD" → HEALTH
- [x] Detectar typos comunes: "SANITARIODE" → "SANITARIO DE"
- [x] Separación camelCase: "SevillanaEndesa" → "Sevillana Endesa"
- [x] Separación números pegados: "Trasformador60822" → "Trasformador 60822"
- [x] Restauración tildes: "policia" → "policía" (para matching con patrones)
- [x] Ampliar keywords por tipología (gasolinera/garolinera)
- [x] Tests con nombres reales de documentos PTEL (143 tests)

### 1.3 Limpieza de Direcciones (`addressCleaner.ts`)
- [x] Crear archivo `src/utils/addressCleaner.ts`
- [x] Eliminar horarios: "24h", "L-V 8:00-15:00"
- [x] Eliminar teléfonos: "Tel: 950123456"
- [x] Eliminar equipamiento: "1 mesa, 2 sillas"
- [x] Normalizar abreviaturas: "C/" → "Calle", "Avda." → "Avenida"
- [x] Corregir errores comunes: "Garci laso" → "Garcilaso"
- [x] Evaluar calidad de dirección (¿geocodificable?)
- [x] Tests con direcciones reales de PTEL (54 tests)

### 1.4 Desambiguación Multi-Campo (`multiFieldStrategy.ts`)
- [x] Crear archivo `src/lib/multiFieldStrategy.ts`
- [x] Definir pesos por tipología (HEALTH, EDUCATION, SECURITY, etc.)
- [x] Implementar scoring combinado: nombre + dirección + localidad
- [x] Tests con casos de múltiples candidatos (28 tests)

### 1.5 Integración en GeocodingOrchestrator
- [ ] Añadir lógica de detección singleton ANTES de cascada
- [ ] Si singleton → retorno directo con 95% confianza
- [ ] Si múltiples → pasar a desambiguación
- [ ] Si cero → escalar a CartoCiudad/CDAU
- [ ] Tests de integración

---

## FASE 2: Validación Cruzada Completa
**Objetivo:** +7-10% score, 95% detección errores | **Duración:** 3-4 días

### 2.1 Módulo de Validación Cruzada (`crossValidation.ts`)
- [ ] Crear archivo `src/lib/crossValidation.ts`

### 2.2 Consulta Paralela Multi-Fuente
- [ ] Implementar `queryMultipleSources()`
- [ ] Promise.all para consultas paralelas
- [ ] Manejo de errores por fuente (una falla no bloquea otras)
- [ ] Tests con fuentes simuladas

### 2.3 Cálculo de Distancias
- [ ] Implementar `distanceUTM()` - Euclidiana para EPSG:25830
- [ ] Verificar precisión vs Haversine (debe ser ≈igual en distancias <100km)
- [ ] Tests unitarios

### 2.4 Análisis de Clusters
- [ ] Implementar `analyzeResultClusters()`
- [ ] Identificar cluster principal (fuentes que concuerdan)
- [ ] Identificar outliers (fuentes discrepantes)
- [ ] Calcular radio del cluster
- [ ] Tests con casos de concordancia y discrepancia

### 2.5 Centroide Robusto
- [ ] Implementar `huberCentroid()` - resistente a outliers
- [ ] Parámetro delta configurable
- [ ] Tests con datasets con outliers

### 2.6 Score Compuesto
- [ ] Implementar `calculateCompositeScore()`
- [ ] Fórmula: α×match + β×concordancia + γ×autoridad
- [ ] Pesos configurables: α=0.40, β=0.35, γ=0.25
- [ ] Autoridad por fuente: LOCAL=0.95, WFS=0.85, CARTO=0.80, NOM=0.55
- [ ] Tests de scoring

### 2.7 Detección de Discrepancias
- [ ] Implementar `detectDiscrepancy()`
- [ ] Umbrales por tipología: HEALTH=25m, EDUCATION=50m, etc.
- [ ] Retornar recomendación: MANUAL_REVIEW, USE_CLUSTER, REJECT
- [ ] Tests con casos de discrepancia real

### 2.8 Integración Final
- [ ] Integrar validación cruzada en GeocodingOrchestrator
- [ ] Metadata completa en resultados (fuentes usadas, outliers, etc.)
- [ ] Flag DISCREPANCY_DETECTED cuando corresponda
- [ ] Tests de integración completos

---

## FASE 3: Optimizaciones Técnicas
**Objetivo:** +3-5% score, 3-5x velocidad | **Duración:** 2-3 días

### 3.1 Migración uFuzzy
- [ ] `npm uninstall fuse.js`
- [ ] `npm install @leeoniya/ufuzzy`
- [ ] Actualizar imports en todos los archivos
- [ ] Adaptar API (similar pero no idéntica)
- [ ] Verificar que tests pasan
- [ ] Benchmark: comparar velocidad vs Fuse.js

### 3.2 Normalización Española (`spanishNormalizer.ts`)
- [ ] Crear archivo `src/utils/spanishNormalizer.ts`
- [ ] Normalización Unicode NFD
- [ ] Eliminación de diacríticos
- [ ] Diccionario de abreviaturas españolas
- [ ] Tests con textos reales de PTEL

### 3.3 Índice Espacial Flatbush
- [ ] `npm install flatbush`
- [ ] Construir índice R-tree en carga de DERA
- [ ] Serializar/deserializar en IndexedDB
- [ ] Queries por bounding box
- [ ] Benchmark: comparar vs búsqueda lineal

### 3.4 Web Workers (OPCIONAL)
- [ ] Evaluar si UI se bloquea significativamente
- [ ] Si necesario: `npm install comlink`
- [ ] Crear worker para procesamiento pesado
- [ ] Mover lógica de geocodificación a worker

---

## 📊 PROGRESO GENERAL

| Fase | Tareas | Completadas | % |
|------|--------|-------------|---|
| Fase 1 | 20 | 19 | 95% |
| Fase 2 | 18 | 0 | 0% |
| Fase 3 | 12 | 0 | 0% |
| **Total** | **50** | **19** | **38%** |

---

## 🧪 DATOS DE PRUEBA

### Municipios para validación
- **Quéntar (18160):** 2 centros salud - probar desambiguación
- **Colomera (18048):** 2 centros salud - probar desambiguación
- **Tíjola (04088):** 0 centros en DERA - probar escalado a CartoCiudad
- **Castril (18044):** Muchos registros - probar rendimiento

### Casos edge
- Nombre concatenado: "CENTROSALUD" (sin espacio)
- Dirección sucia: "C/Garci laso de la Vega, n/ 5, bajo, 24h"
- Sin tipo: campo TIPO vacío o "Indicar"
- Discrepancia real: coordenadas movidas entre actualizaciones

---

## 📝 NOTAS DE IMPLEMENTACIÓN

1. **Orden de implementación:** Fase 1 → Fase 2 → Fase 3 (secuencial)
2. **Tests primero:** Escribir tests antes de implementar cada función
3. **Commits atómicos:** Un commit por cada checkbox completado
4. **Sin breaking changes:** Mantener API existente funcionando

---

**Última actualización:** 2025-12-03 (Fase 1.3 completada)
**Próxima revisión:** Al completar Fase 1
