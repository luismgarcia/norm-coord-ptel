# Handoff B.3: SingletonDetector con BBDD Local

## Rol a activar
🧙 **MapWizard** - React/TypeScript/APIs

## Contexto - Sesión B.2 COMPLETADA (terminal)
- **Tests**: 59/59 (100%)
- **Dev Server**: Validado en puerto 5001
- **Commits B.2**: 7 commits (e0ac671 → dc41e34)

### Archivos creados en B.2
```
src/lib/localData/localDataService.ts   # ~300 líneas
src/hooks/useLocalData.ts               # ~200 líneas  
src/components/DataLoader.tsx           # ~250 líneas
src/lib/localData/__tests__/localDataService.test.ts
```

### Archivos modificados en B.2
```
src/lib/localData/index.ts              # Export service
src/App.tsx                             # Integrar DataLoader + badge
```

## Pruebas navegador PENDIENTES (B2-NAV-*)
Ejecutar antes de cerrar B.2 definitivamente:

| ID | Descripción | Criterio |
|---|---|---|
| B2-NAV-01 | Modal primera carga | DataLoader visible ~3-5s |
| B2-NAV-02 | Barra progreso | Avanza por fases |
| B2-NAV-03 | Badge activa | "BBDD Local activa" verde |
| B2-NAV-04 | IndexedDB DERA | 11,282 registros |
| B2-NAV-05 | IndexedDB INE | 785 registros |
| B2-NAV-06 | SyncMetadata | status: completed |

URL: http://localhost:5001/norm-coord-ptel/

## Tarea B.3
Modificar `SingletonDetector` para usar `db.dera` (IndexedDB) en vez de consultas WFS.

### Objetivo
El 65% de municipios andaluces tiene solo UNA infraestructura de cada tipo → matching directo sin fuzzy.

### Implementación
1. Localizar SingletonDetector actual
2. Refactorizar para consultar `db.dera.where({municipio, tipologia})`
3. Mantener fallback a WFS si IndexedDB vacía
4. Tests unitarios

### API disponible (de useLocalData)
```typescript
const { findDERAByMunicipio, countByTipologia } = useLocalData();

// Buscar por municipio y tipología
const centros = await findDERAByMunicipio('Colomera', 'education');

// Contar para detectar singleton
const count = await countByTipologia('Colomera', 'health');
if (count === 1) {
  // ¡Singleton! Matching directo
}
```

## Criterios de éxito
- [ ] SingletonDetector usa IndexedDB primero
- [ ] Fallback a WFS si datos locales vacíos
- [ ] Tests verifican ambos caminos
- [ ] Sin regresión en tests existentes

## Duración estimada
~2 horas

---
*Preparado: 5 dic 2025 | Sesión: B.2 → B.3*
