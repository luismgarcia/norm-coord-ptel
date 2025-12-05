# Handoff B.2: Carga inicial IndexedDB

## Rol a activar
🧙 **MapWizard** - React/TypeScript/APIs

## Contexto
- **Sesión B.1 COMPLETADA**: Datos DERA descargados y transformados
- **Tests**: 1349/1349 (100%)
- **DERA Features**: 11,282 en formato DERAFeature[]
- **INE Municipios**: 785 municipios con centroides

## Datos disponibles
```
public/data/
├── dera-dexie/
│   ├── all-dera.json     # 11,282 features (~7 MB)
│   ├── health.json       # 1,700 sanitarios
│   ├── education.json    # 6,725 educativos
│   ├── security.json     # 1,259 seguridad
│   ├── emergency.json    # 23 emergencias
│   ├── energy.json       # 161 energía
│   └── municipal.json    # 1,414 municipales
├── ine/
│   └── municipios.json   # 785 municipios (~190 KB)
└── metadata.json
```

## Tarea B.2
Implementar carga inicial de datos en IndexedDB (Dexie.js).

### Componentes a crear
1. **DataLoader.tsx** - Componente de carga inicial con progreso
2. **useLocalData.ts** - Hook para acceso a datos locales
3. **localDataService.ts** - Servicio de carga/sincronización

### Flujo esperado
```
App Start → Check IndexedDB
  ↓
¿Datos cargados?
  SÍ → Continuar app normal
  NO → Mostrar DataLoader
         ↓
       Fetch JSON → Insert Dexie
         ↓
       Guardar SyncMetadata
         ↓
       Continuar app
```

### Schema Dexie (ya definido en schemas.ts)
- `db.dera` - DERAFeature[]
- `db.ine` - INEMunicipio[]
- `db.syncMetadata` - Estado de sincronización

## Criterios de éxito
- [ ] Carga completa ~14 MB en <5 segundos
- [ ] Indicador de progreso visible
- [ ] Verificación de integridad post-carga
- [ ] Fallback si falla carga

## Archivos a consultar
- src/lib/localData/schemas.ts
- public/data/metadata.json

---
*Preparado: 5 dic 2025 | Sesión: B.1 → B.2*
