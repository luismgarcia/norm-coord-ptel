# Análisis Comparativo Geocodificación PTEL - Plantilla de Referencia

## 📅 Fecha: 28 Noviembre 2025

---

## 🏘️ DOCUMENTO 1: COLOMERA (Granada)

### Métricas
| Métrica | Valor |
|---------|-------|
| Total infraestructuras | 31 |
| Con coordenadas originales | 6 (19.4%) |
| Geocodificados CartoCiudad | 9 (29.0%) |
| Fallidos | 16 (51.6%) |
| **Tasa éxito total** | **48.4%** |

### Validación INE
- ✅ Bug Colomera/Colomers: **EVITADO**
- ✅ Todas las coordenadas en rango correcto (UTM30 ~436800-437000, ~4135700-4136700)
- ✅ Distancia centros original/geocodificado: 1.430m (coherente)
- ✅ Municipio correcto en todos los resultados: "Colomera, Granada"

### Causas de Fallos (16 infraestructuras)
1. **Direcciones con topónimos** (Paraje Preteles, Cerro Cementerio) → Necesita NGA
2. **Sin dirección postal** (Piscina, Campo fútbol) → Necesita IAID
3. **Texto corrupto/concatenado** (parser ODT) → Mejorar extracción
4. **Referencias catastrales** (Pol 7 - parc 29,30,36) → Integrar Catastro
5. **Pedanías sin cobertura** (Cerro Cauro) → CDAU o NGA local

---

## 🏘️ DOCUMENTO 2: QUÉNTAR (Granada)

### Métricas
| Métrica | Valor |
|---------|-------|
| Total infraestructuras | 12 |
| Con coordenadas originales | 7 (58.3%) |
| Geocodificados CartoCiudad | 0 (0.0%) |
| Fallidos | 5 (41.7%) |
| **Tasa éxito total** | **58.3%** |

### Validación INE
- ✅ Bug municipio incorrecto: N/A (CartoCiudad no devolvió resultados)
- ✅ Coordenadas en rango correcto: 7/7 originales OK
- ⚠️ Anomalía detectada: Ayuntamiento con Y=416279 (truncada)

### Causas de Fallos (5 infraestructuras)
1. **Sin dirección válida** (Guardia Civil, Centro Sanitario) → Necesita geocodificador especializado
2. **Placeholder "Indicar"** (2 registros) → Datos incompletos en origen
3. **Coordenada truncada** (Ayuntamiento: Y=416279 en vez de 4116279) → Bug validación

### ⚠️ HALLAZGO NUEVO: Coordenada Truncada
```
Infraestructura: Ayuntamiento de Quéntar
Y_ORIGINAL:  416279.61  ← INCORRECTO
Y_ESPERADO: 4116279.61  ← Falta dígito "4" inicial

ACCIÓN: Añadir validación Y >= 4.000.000 para España peninsular
```

---

## 🏘️ DOCUMENTO 3: HORNOS (Jaén)

### Métricas
| Métrica | Valor |
|---------|-------|
| Total infraestructuras | 11 |
| Con coordenadas originales | 7 (63.6%) |
| Geocodificados CartoCiudad | 0 (0.0%) |
| Geocodificados Nominatim | 1 (9.1%) ⚠️ |
| Fallidos | 3 (27.3%) |
| **Tasa éxito total** | **72.7%** 🏆 |

### Validación INE
- ✅ Todas las coordenadas en rango correcto (UTM30 ~517000-525000, ~4216000-4230000)
- ✅ No hay coordenadas truncadas
- ✅ Provincia correcta: Jaén (primer documento no-Granada)
- N/A Validación INE: CartoCiudad no devolvió resultados

### Causas de Fallos (3 infraestructuras)
1. **Placeholder "Indicar"** (3 registros) → Datos incompletos en origen

### ⚠️ HALLAZGO NUEVO: Nominatim con confianza CRÍTICA
```
Infraestructura: "RAUL"
Fuente: nominatim (Nivel 7 cascada)
Confianza: CRITICA
Coordenadas: (524582.94, 4229900.15) ← Centroide municipio

ANÁLISIS: "RAUL" parece nombre propio, no infraestructura.
Nominatim devolvió centroide como último recurso.

ACCIÓN: Filtrar nombres que parezcan personas antes de geocodificar.
```

---

## 🏘️ DOCUMENTO 4: CASTRIL DE LA PEÑA (Granada)

### Métricas
| Métrica | Valor |
|---------|-------|
| Total infraestructuras | 198 |
| Con coordenadas originales | 145 (73.2%) |
| Geocodificados CartoCiudad | 0 (0.0%) |
| Geocodificados Nominatim | 0 (0.0%) |
| Fallidos | 53 (26.8%) |
| **Tasa éxito total** | **73.2%** |

### Validación INE
- ✅ No hay coordenadas Y truncadas
- ⚠️ Outlier espacial: NAVES MUNICIPALES X=219926 (200km del resto)
- N/A Validación INE: CartoCiudad no devolvió resultados

### Causas de Fallos (53 infraestructuras)
1. **Parser ODT texto concatenado** (52 registros) → Problema grave
2. **Topónimos** (10+ registros) → Parque Natural Sierra de Castril
3. **Placeholder "Indicar"** (1 registro)

### ⚠️ HALLAZGOS NUEVOS

**1. Outlier espacial grave:**
```
NAVES MUNICIPALES: X=219926, Y=4183083
Resto municipio:   X=423385-527140

→ Coordenada 200km al oeste, posible error de sistema de referencia
ACCIÓN: Validar X dentro del BBOX municipal esperado
```

**2. Parser ODT masivamente corrupto:**
```
Ejemplos texto concatenado:
• "Hnos. SánchezCarpintería"
• "Abonosnaturales JaimeMorenillaAlmacenami"
• "PN. Sierrade Castril"

ACCIÓN: Mejorar parser para detectar celdas fusionadas
```

---

## 🏘️ DOCUMENTO 5: TÍJOLA (Almería)

### Métricas
| Métrica | Valor |
|---------|-------|
| Total infraestructuras | 41 |
| Con coordenadas originales | 17 (41.5%) |
| Geocodificados CartoCiudad | 0 (0.0%) |
| Geocodificados Nominatim | 0 (0.0%) |
| Fallidos | 24 (58.5%) |
| **Tasa éxito total** | **41.5%** (la más baja) |

### Validación INE
- ⚠️ **Provincia incorrecta en metadatos**: Indica "Granada" pero es ALMERÍA (04091)
- ⚠️ **2 coordenadas Y truncadas**: Y=413364 y Y=413344 (falta "4" inicial)
- ✅ Coordenadas UTM30 corresponden a zona Almería (X~550000, Y~4133000)
- ✅ Primer documento de provincia Almería analizado

### Causas de Fallos (24 infraestructuras)
1. **Cauces hidrográficos sin dirección** (12 registros) → Requiere capa DERA hidrografía
2. **Otros sin dirección** (12 registros) → Sin datos suficientes

### ⚠️ HALLAZGOS NUEVOS

**1. Provincia incorrecta en metadatos:**
```
Documento indica: Granada
Provincia real:   Almería (código INE 04091)

→ Las coordenadas SÍ son de Almería (X~550000)
→ Error en configuración del procesador o documento origen
ACCIÓN: Validar provincia contra código INE del municipio
```

**2. Cauces hidrográficos (nuevo tipo de infraestructura):**
```
12 elementos lineales sin geocodificar:
• Rambla del Higueral, Rambla de Guanila
• Río Almanzora, Río Bacares, Río Alcóntar
• Barranco del Layón, Barranco del Agua

→ Son elementos lineales, no puntuales
→ Requieren capa hidrográfica DERA/REDIAM
ACCIÓN: Integrar WFS hidrografía para ríos/ramblas/barrancos
```

**3. Coordenadas Y truncadas (confirma patrón Quéntar):**
```
RESIDENCIA TERCERA EDAD: Y=413364 → debería ser Y=4133640
Pabellón Municipal:      Y=413344 → debería ser Y=4133440

ACCIÓN: Validar Y >= 4.000.000 (ya identificado en Quéntar)
```

---

## 📋 RECOMENDACIONES GENERALES (Acumulativas)

### Alta Prioridad
1. **NGA (Nomenclátor Geográfico Andalucía)** para topónimos rurales
   - Parajes, cerros, cortijos, veredas
   - Cobertura: 232.000+ topónimos

2. **IAID (Inventario Instalaciones Deportivas)** para deportes
   - Piscinas, campos, polideportivos
   - Cobertura: Censo oficial Junta Andalucía

3. **Mejorar parser ODT** 
   - Detectar texto concatenado sin espacios
   - Separar celdas fusionadas correctamente

4. **Validación coordenadas truncadas** ⚠️ NUEVO (Quéntar)
   - Rechazar Y < 4.000.000 (España peninsular)
   - Rechazar X fuera de rango 100.000-800.000 (UTM zonas 29-31)
   - Caso real: Quéntar Y=416279 debería ser Y=4116279

5. **Filtrar nombres propios de personas** ⚠️ NUEVO (Hornos)
   - Detectar registros que parezcan nombres de personas
   - "RAUL", "Pedro García", etc. no son infraestructuras
   - Evita geocodificaciones espurias con confianza CRÍTICA
   - Caso real: "RAUL" geocodificado a centroide municipio

6. **Validar outliers espaciales (BBOX municipal)** ⚠️ NUEVO (Castril)
   - Calcular BBOX del municipio con coordenadas válidas
   - Rechazar coordenadas que estén > 3σ del centro
   - Caso real: NAVES MUNICIPALES X=219926 (200km del resto)
   - Probable error de sistema de referencia o dato corrupto

### Media Prioridad (mejoras parser)

7. **Mejorar parser ODT para celdas fusionadas** ⚠️ CRÍTICO (Castril)
   - 52 registros con texto concatenado sin espacios
   - Detectar patrones: "PalabraPalabra" → "Palabra Palabra"
   - Afecta tanto a nombres como a direcciones
   - Ejemplos: "Hnos. SánchezCarpintería", "PN. Sierrade Castril"

### Media Prioridad
4. **Integrar Catastro** para referencias parcelarias
   - Formato: "Pol X - Parc Y"
   - API: Sede electrónica Catastro

5. **CDAU pedanías** para núcleos menores
   - Cobertura limitada en CartoCiudad
   - CDAU tiene mejor granularidad local

### Métricas Objetivo
- Tasa éxito actual: ~41-73% (varía según calidad documento origen)
- Tasa éxito objetivo con NGA+IAID+Hidrografía: ~80-85%
- Tasa éxito objetivo completo: ~90-95%

### Métricas Acumuladas (5 documentos)
| Métrica | Colomera | Quéntar | Hornos | Castril | Tíjola | **TOTAL** |
|---------|----------|---------|--------|---------|--------|------------|
| Infraestructuras | 31 | 12 | 11 | 198 | 41 | **293** |
| Con coords origen | 6 | 7 | 7 | 145 | 17 | **182 (62.1%)** |
| Geocodificados | 9 | 0 | 1 | 0 | 0 | **10 (3.4%)** |
| Fallidos | 16 | 5 | 3 | 53 | 24 | **101 (34.5%)** |
| **Tasa éxito** | 48.4% | 58.3% | 72.7% | 73.2% | 41.5% | **65.5%** |

---

## 🔍 CHECKLIST VALIDACIÓN POR DOCUMENTO

Para cada documento verificar:
- [ ] Ningún resultado fuera de Andalucía (códigos INE 04,11,14,18,21,23,29,41)
- [ ] Provincia correcta según documento
- [ ] Municipio correcto (código INE coincide)
- [ ] Coordenadas dentro de BBOX municipal esperado
- [ ] No hay saltos de >50km entre coordenadas del mismo municipio
- [ ] **(Quéntar, Tíjola):** No hay coordenadas Y truncadas (Y < 4.000.000)
- [ ] **(Quéntar):** No hay coordenadas X fuera de rango UTM (100.000-800.000)
- [ ] **(Hornos):** No hay registros con nombres de personas geocodificados
- [ ] **(Hornos):** Resultados Nominatim con confianza CRÍTICA revisados manualmente
- [ ] **(Castril):** No hay outliers espaciales (coordenadas > 3σ del centro)
- [ ] **(Castril):** Parser ODT no generó texto concatenado sin espacios
- [ ] **(Tíjola):** Provincia en metadatos coincide con código INE
- [ ] **(Tíjola):** Cauces hidrográficos marcados para geocodificación especial

---
*Archivo de referencia para comparación entre documentos PTEL*
*Actualizado: 28 Nov 2025 - Análisis completo: Colomera, Quéntar, Hornos, Castril, Tíjola*