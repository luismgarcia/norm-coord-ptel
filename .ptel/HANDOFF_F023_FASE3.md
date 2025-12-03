# 🧙‍♂️ HANDOFF: F023 Fase 3 - Optimizaciones

## Rol a activar
**MapWizard** - React/TypeScript/APIs

## Contexto rápido
- Proyecto: PTEL Normalizador de Coordenadas
- Versión actual: 0.5.2
- Tests: 1037/1044 passed
- Último commit: `31be2ec` - F023-2D integración validateEnhanced()

## Tarea asignada
**F023 Fase 3: Optimizaciones de rendimiento**

### Objetivos específicos

#### 1. Integrar uFuzzy para búsqueda fuzzy optimizada
- Ubicación: `src/lib/multiFieldStrategy.ts`
- Reemplazar búsqueda fuzzy actual por uFuzzy
- Instalar: `npm install @leeoniya/ufuzzy`
- Beneficio: 10-100x más rápido que alternativas

#### 2. Añadir índice espacial Flatbush (R-tree)
- Ubicación: `src/services/geocoding/DERALocalService.ts`
- Instalar: `npm install flatbush`
- Crear índice espacial para búsquedas por proximidad
- Beneficio: O(log n) en lugar de O(n) para búsquedas espaciales

#### 3. Mejorar normalización de nombres
- Ubicación: `src/utils/addressCleaner.ts`
- Normalizar acentos, mayúsculas, artículos
- Unificar variantes: "C.P.", "CP", "Centro de Salud"

### Archivos a modificar
```
src/lib/multiFieldStrategy.ts      → uFuzzy
src/services/geocoding/DERALocalService.ts → Flatbush
src/utils/addressCleaner.ts        → Normalización mejorada
```

### Criterios de éxito
- [ ] Tests existentes siguen pasando (1037+)
- [ ] Nuevos tests para las optimizaciones
- [ ] Sin regresiones en funcionalidad
- [ ] Build sin errores: `npm run build`

## Instrucciones de ejecución

### Paso 1: Leer estado actual
```bash
cat .ptel/PTEL_ESTADO_SESION.json
cat .ptel/PTEL_FEATURES.json
```

### Paso 2: Verificar tests base
```bash
npm test
```

### Paso 3: Implementar en orden
1. uFuzzy primero (más impacto)
2. Flatbush segundo
3. Normalización tercero

### Paso 4: Tests después de cada cambio
```bash
npm test
npm run build
```

### Paso 5: Si TODO pasa → Commit
```bash
git add .
git commit -m "feat(F023): Fase 3 - Optimizaciones rendimiento

- Integrar uFuzzy para búsqueda fuzzy 10-100x más rápida
- Añadir índice espacial Flatbush (R-tree) para DERA
- Mejorar normalización nombres infraestructuras
- Tests: XXX/1044 passed"
git push
```

### Paso 6: Actualizar documentación
- `.ptel/PTEL_ESTADO_SESION.json`
- `.ptel/PTEL_FEATURES.json`

## Si hay problemas

### Problema: Tests fallan
→ Revertir cambio específico, documentar qué falló

### Problema: Dependencia no instala
→ Verificar compatibilidad, buscar alternativa similar

### Problema: Build falla
→ Revisar tipos TypeScript, no forzar con `any`

### Problema: Cambio demasiado grande
→ Hacer commit parcial de lo que funciona, documentar pendiente

## NO hacer
- No cambiar APIs públicas existentes
- No modificar GeocodingOrchestrator (ya integrado)
- No tocar UI/componentes React
- No eliminar tests existentes

## Resultado esperado
Al finalizar, Luis debería poder:
1. Ver commit con optimizaciones
2. Revisar `.ptel/` actualizado
3. Ejecutar `npm test` y ver mejoras
4. Continuar con F015 o visor cartográfico

---
Preparado por: Claude (MapWizard)
Fecha: 2025-12-04
Para: Sesión autónoma siguiente
