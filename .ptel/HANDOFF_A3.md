# Handoff A.3: Definir esquemas IndexedDB

## Rol a activar
🔬 **DataMaster** - Geodesia/Validación

## Contexto
- **Sesiones anteriores**: A.1 ✅, A.2 ✅
- **Tests**: 1329/1329 (100%)
- **E2E**: 15 tests pipeline completo

## Tarea A.3
Definir los esquemas de Dexie.js para la base de datos local IndexedDB.

## Objetivo
Estructura de datos para almacenar DERA, CDAU, INE y límites municipales.

## Archivo a crear
```
src/lib/localData/schemas.ts
```

## Estructura propuesta
```typescript
import Dexie, { Table } from 'dexie';

// Esquemas para cada fuente de datos
interface DERAFeature {
  id: string;
  tipologia: string;  // SANITARIO, EDUCATIVO, SEGURIDAD, etc.
  nombre: string;
  municipio: string;
  codMun: string;
  x: number;
  y: number;
  metadata: Record<string, unknown>;
  fechaCarga: Date;
}

interface INEMunicipio {
  codMun: string;      // Código INE 5 dígitos
  nombre: string;
  provincia: string;
  codProv: string;
  centroides: { x: number; y: number };
}

interface SyncMetadata {
  id: string;          // 'dera', 'cdau', 'ine'
  ultimaSync: Date;
  version: string;
  registros: number;
}

// Definición de la base de datos
class PTELDatabase extends Dexie {
  dera!: Table<DERAFeature>;
  ine!: Table<INEMunicipio>;
  sync!: Table<SyncMetadata>;

  constructor() {
    super('PTELLocalData');
    this.version(1).stores({
      dera: 'id, tipologia, codMun, [tipologia+codMun]',
      ine: 'codMun, nombre, provincia',
      sync: 'id'
    });
  }
}

export const db = new PTELDatabase();
```

## Índices recomendados
- **dera**: `[tipologia+codMun]` para búsqueda singleton
- **ine**: `codMun` como PK, índice en `nombre`
- **sync**: Metadatos de sincronización

## Verificación
```bash
npm test -- --run schemas
```

## Criterios de éxito
- [ ] Esquemas Dexie.js definidos
- [ ] Tipos TypeScript exportados
- [ ] Tests de estructura básicos
- [ ] Comentarios JSDoc

---
*Preparado: 5 dic 2025 | Rol: DataMaster*
