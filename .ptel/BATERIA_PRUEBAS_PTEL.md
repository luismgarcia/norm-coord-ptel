# 🧪 Batería de Pruebas PTEL

> Documento consolidado de todas las pruebas del sistema de normalización de coordenadas PTEL.
> 
> **Última actualización:** 2025-12-05
> **Versión proyecto:** 0.4.2

---

## 📋 Índice

1. [Pruebas Navegador B.2 (IndexedDB)](#pruebas-navegador-b2)
2. [Pruebas Terminal](#pruebas-terminal)
3. [Pruebas E2E](#pruebas-e2e)
4. [Pruebas Geocodificación](#pruebas-geocodificación)
5. [Pruebas Validación](#pruebas-validación)
6. [Pruebas Rendimiento](#pruebas-rendimiento)

---

## 🌐 Pruebas Navegador B.2

**Contexto:** Validación manual del sistema de BBDD local con IndexedDB (Dexie.js).

**Prerrequisitos:**
1. Servidor dev corriendo: `npm run dev`
2. Abrir: http://localhost:5001/norm-coord-ptel/
3. Abrir DevTools (F12) → Application → IndexedDB

| ID | Descripción | Pasos | Resultado Esperado | Estado |
|----|-------------|-------|-------------------|--------|
| B2-NAV-01 | Modal aparece en primera carga | 1. Limpiar localStorage/IndexedDB<br>2. Recargar página | Modal "Cargando datos locales..." visible 3-5 segundos | ⏳ Pendiente |
| B2-NAV-02 | Barra progreso funcional | 1. Observar modal durante carga | Barra progresa 0% → 100% con animación | ⏳ Pendiente |
| B2-NAV-03 | Badge BBDD activa | 1. Esperar fin de carga<br>2. Buscar indicador en UI | Badge "BBDD Local activa" o similar visible | ⏳ Pendiente |
| B2-NAV-04 | IndexedDB tabla DERA | 1. DevTools → Application → IndexedDB<br>2. Expandir "PTELDatabase" | Tabla `dera` con 11,282 registros | ⏳ Pendiente |
| B2-NAV-05 | IndexedDB tabla INE | 1. DevTools → IndexedDB<br>2. Ver tabla `municipios` | Tabla `municipios` con 785 registros | ⏳ Pendiente |
| B2-NAV-06 | SyncMetadata completado | 1. DevTools → IndexedDB<br>2. Ver tabla `syncMetadata` | Campo `status: 'completed'` | ⏳ Pendiente |

### Instrucciones detalladas B2-NAV-04/05

```
Chrome DevTools:
1. F12 → Application (pestaña)
2. Panel izquierdo → Storage → IndexedDB
3. Expandir "PTELDatabase"
4. Click en tabla "dera" o "municipios"
5. Panel derecho muestra registros
6. Verificar count en esquina inferior
```

---

## 💻 Pruebas Terminal

**Prerrequisitos:**
```bash
cd /Users/lm/Documents/GitHub/norm-coord-ptel
export PATH="/opt/homebrew/bin:$PATH"  # macOS
```

| ID | Comando | Resultado Esperado | Estado |
|----|---------|-------------------|--------|
| T-01 | `npm test` | 59/59 tests passing | ✅ OK |
| T-02 | `npm run build` | Build sin errores | ⏳ Verificar |
| T-03 | `npm run dev` | Server en puerto 5001 | ✅ OK |
| T-04 | `npm run lint` | Sin errores críticos | ⏳ Verificar |
| T-05 | `git status` | Sin cambios pendientes | ✅ OK |

---

## 🔄 Pruebas E2E (End-to-End)

**Flujo completo:** Documento ODT → Extracción → Normalización → Geocodificación → Exportación

| ID | Flujo | Documento Test | Resultado Esperado | Estado |
|----|-------|----------------|-------------------|--------|
| E2E-01 | ODT básico | Colomera_PTEL.odt | Coordenadas extraídas correctamente | ✅ Tests |
| E2E-02 | CSV importación | municipio_test.csv | Parsing sin errores | ✅ Tests |
| E2E-03 | UTF-8 corrupto | doc_corrupto.odt | Caracteres normalizados | ✅ Tests |
| E2E-04 | Exportar GeoJSON | - | Archivo válido descargable | ⏳ Manual |
| E2E-05 | Exportar CSV | - | Separadores correctos (;) | ⏳ Manual |

### Tests automatizados E2E

```bash
# Ejecutar suite E2E específica
npm test -- --grep "DocumentExtractor"
npm test -- --grep "E2E"
```

**Cobertura actual:** 15 tests E2E en `documentExtractor.test.ts`

---

## 📍 Pruebas Geocodificación

### Por tipología PTEL

| ID | Tipología | Servicio Principal | Test Ejemplo | Estado |
|----|-----------|-------------------|--------------|--------|
| GEO-01 | 🏥 Sanitario | DERA G09 Health | "Centro Salud Colomera" | ✅ |
| GEO-02 | 🎓 Educativo | DERA G10 Education | "CEIP San José" | ✅ |
| GEO-03 | 🚔 Seguridad | DERA G12 Security | "Cuartel Guardia Civil" | ✅ |
| GEO-04 | 🏛️ Municipal | DERA G12 Municipal | "Ayuntamiento Colomera" | ✅ |
| GEO-05 | ⛪ Religioso | Nominatim OSM | "Iglesia Parroquial" | ✅ |
| GEO-06 | ⚡ Energía | DERA G17 Energy | "Subestación eléctrica" | ✅ |
| GEO-07 | 💧 Hidráulico | DERA G09 Hydraulic | "Depósito agua" | ✅ |
| GEO-08 | 🏟️ Deportivo | IAID | "Pabellón municipal" | ✅ |

### Pruebas SingletonDetector (B.3)

| ID | Función | Input Test | Resultado Esperado | Estado |
|----|---------|------------|-------------------|--------|
| SD-01 | detectSingleton | codMun="18079", tipo="HEALTH" | `{isSingleton: true/false, count: N}` | ✅ Tests |
| SD-02 | getSingletonFeature | codMun singleton | Feature DERA directa | ✅ Tests |
| SD-03 | getMunicipioTypologyCounts | codMun="18079" | Objeto con counts por tipo | ✅ Tests |
| SD-04 | getGlobalSingletonStats | - | Estadísticas 785 municipios | ✅ Tests |

---

## ✅ Pruebas Validación

### Multi-medida (F018)

| ID | Medida | Descripción | Umbral | Estado |
|----|--------|-------------|--------|--------|
| VAL-01 | Pertenencia municipal | Coordenada dentro polígono municipio | 100% dentro | ✅ |
| VAL-02 | Distancia centroide | Distancia al centro del municipio | <15km típico | ✅ |
| VAL-03 | Reverse geocoding | Confirmar municipio vía API | Match nombre | ✅ |

### Validación cruzada (F023 Fase 2)

| ID | Prueba | Fuentes | Resultado Esperado | Estado |
|----|--------|---------|-------------------|--------|
| CROSS-01 | 2 fuentes coinciden | DERA + CartoCiudad | Cluster <25m | ✅ Tests |
| CROSS-02 | Discrepancia detectada | Fuentes divergentes | Flag MANUAL_REVIEW | ✅ Tests |
| CROSS-03 | Centroide Huber | 3+ fuentes | Coordenada consenso robusta | ✅ Tests |

### Clasificación confianza

| Nivel | Criterio | Color UI |
|-------|----------|----------|
| CONFIRMADA | 3/3 medidas OK | 🟢 Verde |
| ALTA | 2/3 medidas OK | 🟡 Amarillo claro |
| MEDIA | 1/3 medidas OK | 🟠 Naranja |
| BAJA | 0/3 medidas OK | 🔴 Rojo |

---

## ⚡ Pruebas Rendimiento

### Benchmarks configurados (A.4)

| ID | Métrica | Objetivo | Medición | Estado |
|----|---------|----------|----------|--------|
| PERF-01 | Carga IndexedDB | <5 segundos | 11,282 DERA + 785 INE | ✅ Suite |
| PERF-02 | Query singleton | <10ms | detectSingleton() | ✅ Suite |
| PERF-03 | Geocodificación batch | <2s/100 registros | GeocodingOrchestrator | ✅ Suite |
| PERF-04 | Exportación GeoJSON | <1s/1000 registros | ExportService | ⏳ Pendiente |

### Ejecutar benchmarks

```bash
npm test -- --grep "benchmark"
npm test -- --grep "performance"
```

---

## 📊 Resumen Estado Pruebas

| Categoría | Total | Pasando | Pendientes |
|-----------|-------|---------|------------|
| Navegador B.2 | 6 | 0 | 6 |
| Terminal | 5 | 3 | 2 |
| E2E | 5 | 3 | 2 |
| Geocodificación | 12 | 12 | 0 |
| Validación | 7 | 7 | 0 |
| Rendimiento | 4 | 3 | 1 |
| **TOTAL** | **39** | **28** | **11** |

---

## 🔧 Cómo ejecutar pruebas

### Todas las pruebas automatizadas
```bash
npm test
```

### Pruebas específicas
```bash
# Por archivo
npm test -- src/lib/localData/__tests__/singletonDetector.test.ts

# Por patrón
npm test -- --grep "SingletonDetector"
npm test -- --grep "geocoding"
```

### Pruebas navegador (manual)
1. `npm run dev`
2. Abrir http://localhost:5001/norm-coord-ptel/
3. Seguir checklist B2-NAV-01 a B2-NAV-06

---

## 📝 Registro de Ejecución

| Fecha | Ejecutor | Pruebas | Resultado | Notas |
|-------|----------|---------|-----------|-------|
| 2025-12-05 | Claude | T-01, T-03, T-05 | ✅ OK | Sesión B.3 |
| - | Luis | B2-NAV-* | ⏳ | Pendiente validación manual |

---

*Documento creado: 2025-12-05*
*Próxima revisión: Tras completar B.4*
