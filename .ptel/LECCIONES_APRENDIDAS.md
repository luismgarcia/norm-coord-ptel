# Lecciones Aprendidas - PTEL

Principios generalizables extraídos de problemas reales durante el desarrollo.
Aplicables a cualquier documento PTEL nuevo con contenido, errores y variables desconocidas.

---

## L1: Validación contra Fuente Autoritativa

**Problema original**: Códigos INE incorrectos en `seedPatterns.ts` (ej: 18062 en vez de 18051 para Colomera)

**Principio generalizable**: Cualquier dato referencial (códigos INE, nombres de municipios, provincias) debe validarse contra la fuente autoritativa antes de usarse.

**Implementación**:
- Fuente autoritativa: `municipiosCentroides.ts` (785 municipios desde WFS DERA)
- Test automático: `integridad referencial` en `quickProfiler.test.ts`
- Verificación manual: `grep "NombreMunicipio" src/lib/municipiosCentroides.ts`

**Aplica cuando**: Se añade un nuevo municipio al sistema, se crean perfiles, se escriben tests.

---

## L2: Preservar Estructura Semántica al Normalizar

**Problema original**: `normalizarTexto()` eliminaba separadores (`_`, `-`) silenciosamente, convirtiendo `"PTEL_Berja_Almeria"` en `"ptelberjaalmeria"` (una cadena inseparable).

**Principio generalizable**: Al normalizar texto para búsqueda, los separadores estructurales deben convertirse a espacios, no eliminarse.

**Implementación**:
```typescript
// ❌ MAL: elimina separadores
.replace(/[^a-z0-9\s]/g, '')

// ✓ BIEN: convierte separadores a espacios PRIMERO
.replace(/[_\-]/g, ' ')
.replace(/[^a-z0-9\s]/g, '')
```

**Aplica cuando**: Se procesa cualquier nombre de archivo, cabecera de documento, o texto estructurado.

---

## L3: Tests con Múltiples Casos Edge

**Problema original**: El test con "Colomera" pasaba pero "Berja" fallaba. Ambos usaban la misma función pero con patrones de nombre diferentes.

**Principio generalizable**: Un solo caso de prueba exitoso no garantiza que la función sea correcta. Se necesitan múltiples casos que ejerciten diferentes rutas del código.

**Implementación**:
- Probar municipios de diferentes provincias (Almería, Granada, Jaén)
- Probar diferentes formatos de nombre (`PTEL_Municipio_Año`, `Municipio_PTEL`, etc.)
- Probar municipios con nombres compuestos (`Cenes de la Vega`)
- Probar municipios con caracteres especiales (`Tíjola`, `Quéntar`)

**Aplica cuando**: Se añaden tests para cualquier función de detección o normalización.

---

## L4: Ubicación Canónica del Repositorio

**Problema original**: Dos copias del repo en diferentes ubicaciones causaron pérdida de archivos al eliminar la copia incorrecta.

**Principio generalizable**: Debe existir una única ubicación estándar para el repositorio, documentada explícitamente.

**Implementación**:
- **Ruta estándar**: `~/Documents/GitHub/norm-coord-ptel/`
- **Nunca**: Clonar en múltiples ubicaciones
- **Si existe otra copia**: Eliminarla después de verificar que no tiene cambios únicos

**Aplica cuando**: Se trabaja desde diferentes ordenadores o se clona el repositorio.

---

## L5: Tests de Integridad Referencial

**Problema original**: Los tests usaban códigos INE que no existían en la fuente de datos real.

**Principio generalizable**: Cuando existen estructuras de datos relacionadas, debe haber tests que validen la consistencia entre ellas automáticamente.

**Implementación**:
```typescript
// Test que detecta automáticamente INEs incorrectos
it('códigos INE deben existir en fuente autoritativa', () => {
  for (const ine of Object.keys(MUNICIPIO_PROFILES)) {
    expect(CENTROIDES_MUNICIPIOS[ine]).toBeDefined();
  }
});
```

**Aplica cuando**: Se tienen múltiples estructuras de datos que deben mantenerse sincronizadas (perfiles ↔ centroides, patrones ↔ normalizador, etc.)

---

## Checklist para Nuevos Municipios

Cuando se añada un municipio nuevo (ej: Purchena, Vélez-Rubio):

1. [ ] Verificar código INE en `municipiosCentroides.ts`
2. [ ] Copiar nombre y provincia exactamente como aparecen en centroides
3. [ ] Añadir perfil en `seedPatterns.ts` con INE verificado
4. [ ] Ejecutar tests de integridad: `npx vitest run -t "integridad"`
5. [ ] Probar detección desde nombre de archivo con diferentes formatos

---

## Historial de Incidentes

| Fecha | Problema | Solución | Lección |
|-------|----------|----------|---------|
| 2025-12-02 | INEs incorrectos en 7 municipios | Corregir contra centroides + tests integridad | L1, L5 |
| 2025-12-02 | Berja no detectado desde nombre archivo | Fix normalizarTexto() preservando separadores | L2 |
| 2025-12-02 | Repo duplicado, archivos perdidos | Unificar en ubicación estándar | L4 |

---

*Última actualización: 2025-12-02*
