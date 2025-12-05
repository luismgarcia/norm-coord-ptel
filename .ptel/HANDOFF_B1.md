# Handoff B.1: Descarga DERA (TopoJSON/WFS)

## Rol a activar
🔬 **DataMaster** - Geodesia/validación

## Contexto
- **Fase A COMPLETADA**: A.1 ✅, A.2 ✅, A.3 ✅, A.4 ✅
- **Tests**: 1349/1349 (100%)
- **Benchmarks**: 4 suites configuradas
- **Schemas IndexedDB**: 5 tablas definidas

## Tarea B.1
Descargar datos DERA de infraestructuras críticas en formato TopoJSON.

## Fuentes DERA
| Capa | WFS URL | Features est. |
|------|---------|---------------|
| Sanitarios | g12_04_equipamiento_sanitario | ~1,700 |
| Educativos | g12_05_centro_ensenanza | ~6,725 |
| Seguridad | g12_06_equipamiento_seguridad | ~1,259 |
| Emergencias | g12_01_centro_gestion_emergencias | ~23 |
| Energía | g08_energia | ~161 |
| Municipales | Varios | ~1,414 |

## Objetivo
```
public/data/
├── dera/
│   ├── health.json     # Sanitarios (TopoJSON)
│   ├── education.json  # Educativos
│   ├── security.json   # Seguridad
│   ├── emergency.json  # Emergencias
│   ├── energy.json     # Energía
│   └── municipal.json  # Ayuntamientos
└── ine/
    └── municipios.json # 786 municipios Andalucía
```

## Formato destino
```typescript
interface DERAFile {
  type: 'Topology';
  objects: {
    features: {
      type: 'GeometryCollection';
      geometries: TopoJSONGeometry[];
    }
  };
  arcs: number[][][];
}
```

## Alternativa GeoJSON
Si TopoJSON es complejo, usar GeoJSON simplificado:
```typescript
interface DERAGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      id: string;
      nombre: string;
      tipologia: string;
      codMun: string;
      // ...
    };
    geometry: {
      type: 'Point';
      coordinates: [number, number]; // EPSG:25830
    };
  }>;
}
```

## Criterios de éxito
- [ ] ≥6 archivos JSON con datos DERA
- [ ] Coordenadas en EPSG:25830
- [ ] Estructura compatible con schemas.ts
- [ ] Script de descarga reproducible

---
*Preparado: 5 dic 2025 | Rol: DataMaster*
