# Tareas Pendientes PTEL - 28 Noviembre 2025

## 🔴 PRIORIDAD ALTA (Bloqueantes)

| # | Tarea | Tiempo | Estado |
|---|-------|--------|--------|
| 1 | ~~Integrar validación INE en cascada~~ | 2-3h | ✅ Commit 47dcaef |
| 2 | ~~Probar geocodificación con documentos reales~~ | 2h | ✅ 5 docs analizados |
| 3 | Aplicar parches documentación (8 parches) | 1h | ⏳ |
| 4 | **Validar coordenadas truncadas (Y < 4M)** | 30min | ⏳ |
| 5 | **Validar outliers espaciales (BBOX municipal)** ⚠️ | 1h | ⏳ |
| 6 | **Mejorar parser ODT celdas fusionadas** ⚠️ | 2-3h | ⏳ |
| 7 | **Filtrar nombres propios de personas** | 1h | ⏳ |
| 8 | **Validar provincia vs código INE** ⚠️ NUEVO | 30min | ⏳ |
| 9 | **Integrar capa hidrográfica DERA** ⚠️ NUEVO | 2h | ⏳ |

## 🟡 PRIORIDAD MEDIA (Fase 3 - Visor Cartográfico)

| # | Tarea | Tiempo |
|---|-------|--------|
| 4 | Visor Leaflet básico (integrar react-leaflet en Step 3) | 1 semana |
| 5 | Configurar EPSG:25830 (proyección UTM30 con Proj4Leaflet) | 1 día |
| 6 | Capas WMS españolas (Ortofoto Andalucía, PNOA-MA, CDAU callejero) | 2 días |
| 7 | Click-to-set coordenadas (corrección manual en mapa) | 2 días |
| 8 | Drag-and-drop marcadores (edición visual puntos) | 1 día |

## 🟢 PRIORIDAD BAJA (Mejoras)

| # | Tarea | Tiempo |
|---|-------|--------|
| 9 | Script actualización INE anual (generate_ine_data.py + GitHub Action) | 1h |
| 10 | Dashboard métricas rechazos (visualizar estadísticas validación) | 2h |
| 11 | Exportación GeoJSON/KML mejorada (metadata extendida) | 3h |
| 12 | Replicar entorno en otro ordenador (copiar Git + configuración) | 30min |

## 📋 DECISIONES PENDIENTES

1. ¿Mantener validación INE aunque CartoCiudad arregle bug? → Recomendación: SÍ (defensa en profundidad)
2. ¿Priorizar visor Leaflet o mejoras geocodificación? → Depende necesidades inmediatas
3. ¿Implementar CDAU como fuente alternativa? → Requiere autorización NAOS
4. ¿Usar LocationIQ/HERE como backup? → Evaluar tras testing
5. ¿Configurar GitHub Pages para deploy? → Cuando tengamos Fase 3

## 📊 MÉTRICAS ACTUALES (5 documentos analizados)

| Documento | Infraestructuras | Éxito | Validación INE |
|-----------|------------------|-------|----------------|
| Colomera (Granada) | 31 | 48.4% | ✅ 9/9 válidas |
| Quéntar (Granada) | 12 | 58.3% | N/A |
| Hornos (Jaén) | 11 | 72.7% | N/A |
| Castril (Granada) | 198 | 73.2% | N/A |
| Tíjola (Almería) | 41 | 41.5% | ⚠️ Prov. incorrecta |
| **TOTAL** | **293** | **65.5%** | ✅ Funcionando |

- Archivos procesables: 8 formatos ✅
- Municipios en tabla INE: 786 ✅
- Bug Colomera/Colomers: ✅ EVITADO
- Provincias analizadas: Granada, Jaén, Almería ✅

## 📁 PARCHES DOCUMENTACIÓN PENDIENTES

Ubicación: `/mnt/user-data/outputs/`

1. `INDICE_PARCHES_VALIDACION_INE.md` - Índice maestro
2. `ARQUITECTURA_VALIDACION_INE_PATCH.md` - Para ARQUITECTURA_COMPONENTES.md
3. `FAQ_TECNICO_DESAMBIGUACION_PATCH.md` - Para FAQ_TECNICO.md (7 nuevas preguntas)
4. `README_VALIDACION_INE_PATCH.md` - Para README.md
5. `PLAN_MAESTRO_CODIGOS_INE_PATCH.md` - Para PLAN_MAESTRO_PTEL_DESARROLLO_2025.md
6. `INTEGRACION_MODULOS_INE.md` - Guía integración completa

## ⚠️ ISSUES DETECTADOS EN PRUEBAS REALES

| Issue | Documento | Descripción | Prioridad |
|-------|-----------|-------------|----------|
| Coordenada Y truncada | Quéntar, Tíjola | Y=416279, Y=413364 (falta "4") | 🔴 Alta |
| Nombre persona geocodificado | Hornos | "RAUL" → centroide municipio | 🟡 Media |
| Placeholder "Indicar" | Todos | Registros vacíos intentan geocodificar | 🟡 Media |
| Parser ODT texto concatenado | Colomera, Castril | "AtalayaAntonioOrtega..." sin espacios | 🔴 Alta |
| **Outlier espacial** | Castril | NAVES MUNICIPALES X=219926 (200km fuera) | 🔴 Alta |
| **Parser ODT masivo** | Castril | 52 registros con texto concatenado | 🔴 Alta |
| **Provincia incorrecta** | Tíjola | Indica "Granada" pero es Almería | 🔴 Alta |
| **Cauces hidrográficos** | Tíjola | 12 ríos/ramblas sin geocodificar | 🟡 Media |

---
*Actualizado: 28 Nov 2025 - Análisis completo: Colomera, Quéntar, Hornos, Castril, Tíjola*