# Solución A+C: Fuente Única de Verdad para Códigos INE

## Resumen del problema

Los tests de `CoordinateValidator` fallaban porque usaban códigos INE **incorrectos**:

| Municipio | Código usado (❌) | Código correcto (✅) |
|-----------|-------------------|----------------------|
| Colomera  | 18052             | **18051**            |
| Castril   | 18054/18040       | **18046**            |

**Causa raíz**: Existían dos fuentes de códigos INE no sincronizadas:
- `codigosINE.ts` → datos incorrectos (creado manualmente)
- `municipiosCentroides.ts` → datos correctos (derivado de WFS DERA oficial)

## Solución implementada

### 1. Nueva fuente única derivada (`codigosINEDerivados.ts`)

```
src/lib/codigosINEDerivados.ts (NUEVO)
```

- **Deriva automáticamente** todos los códigos INE desde `municipiosCentroides.ts`
- Proporciona funciones de búsqueda: `getCodigoINE()`, `existeCodigoINE()`
- Incluye estadísticas del catálogo (785 municipios, distribución por provincia)
- **NUNCA se modifica manualmente** - los cambios van a `municipiosCentroides.ts`

### 2. Constantes centralizadas para tests (`fixtures/municipiosTest.ts`)

```
src/lib/__tests__/fixtures/municipiosTest.ts (NUEVO)
```

- Municipios de prueba con códigos INE **verificados automáticamente**
- Si un código es incorrecto, **el módulo lanza error al cargar**
- Coordenadas reales de documentos PTEL para pruebas
- Exportaciones por provincia: `GRANADA`, `ALMERIA`, `JAEN`, etc.

### 3. Tests de integridad (`dataIntegrity.test.ts`)

```
src/lib/__tests__/dataIntegrity.test.ts (ACTUALIZADO)
```

- Verifica consistencia entre catálogos
- Detecta códigos problemáticos históricos
- Previene regresiones futuras

### 4. Test de CoordinateValidator actualizado

```
src/lib/__tests__/CoordinateValidator.test.ts (ACTUALIZADO)
```

- Ahora importa fixtures centralizados
- Usa códigos INE validados automáticamente

## Archivos modificados/creados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/lib/codigosINEDerivados.ts` | CREADO | Fuente única derivada de INE |
| `src/lib/__tests__/fixtures/municipiosTest.ts` | CREADO | Constantes de test validadas |
| `src/lib/__tests__/dataIntegrity.test.ts` | ACTUALIZADO | Tests de integridad |
| `src/lib/__tests__/CoordinateValidator.test.ts` | ACTUALIZADO | Usa fixtures centralizados |

## Verificación

Ejecutar para comprobar que los 4 tests que fallaban ahora pasan:

```bash
cd /Users/lm/Documents/GitHub/norm-coord-ptel
npm test -- --testPathPattern="CoordinateValidator|dataIntegrity" --no-coverage
```

### Tests que deben pasar ahora:

1. ✅ `Colomera: coordenadas reales dentro del radio`
2. ✅ `Castril: coordenadas reales dentro del radio`
3. ✅ `Coordenada muy lejana: dentroRadio=false`
4. ✅ `Coordenadas Colomera: distancia OK`

### Nuevos tests de integridad:

1. ✅ `todos los códigos de centroides existen en derivados`
2. ✅ `nombres coinciden entre fuentes`
3. ✅ `búsqueda por nombre devuelve código correcto`
4. ✅ `códigos que causaron errores históricos`

## Prevención futura

### Si necesitas añadir un municipio de prueba:

```typescript
// En fixtures/municipiosTest.ts
NUEVO_MUNICIPIO: {
  codigo: '18XXX',  // Verificar en municipiosCentroides.ts PRIMERO
  nombre: 'Nombre',
  provincia: 'Granada'
},
```

La validación automática fallará si el código es incorrecto.

### Si encuentras un código INE incorrecto:

1. **NUNCA** modificar `codigosINE.ts` ni `codigosINEDerivados.ts`
2. Verificar el código correcto en `municipiosCentroides.ts`
3. Si el error está en `municipiosCentroides.ts`, corregirlo ahí
4. Los derivados se actualizarán automáticamente

## Códigos INE de referencia (municipios problemáticos)

| Municipio | Código INE | Notas |
|-----------|------------|-------|
| Colomera | **18051** | ❌ 18052 NO EXISTE |
| Castril | **18046** | ❌ 18040 es Cáñar |
| Cortes de Baza | **18053** | - |
| Cortes y Graena | **18054** | - |
| Quéntar | **18168** | ❌ 18167 es Purullena |
| Hornos | **23043** | - |

---

*Documento generado: 2025-12-02*
*Solución: A+C (Fuente única + Constantes centralizadas)*
