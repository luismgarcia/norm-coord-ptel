# Handoff A.4: Suite Benchmark Vitest

## Rol a activar
🧙 **MapWizard** - React/TypeScript/APIs

## Contexto
- **Sesiones anteriores**: A.1 ✅, A.2 ✅, A.3 ✅
- **Tests**: 1349/1349 (100%)
- **Schemas**: 5 tablas IndexedDB definidas

## Tarea A.4
Configurar suite de benchmarks con Vitest para medir rendimiento del sistema.

## Objetivo
Medir tiempos de respuesta de componentes críticos para establecer línea base.

## Archivo a crear
```
src/lib/__tests__/benchmarks/
├── coordinateNormalizer.bench.ts
├── addressExtractor.bench.ts
├── geocoding.bench.ts
└── localData.bench.ts
```

## Benchmarks sugeridos
```typescript
import { bench, describe } from 'vitest';

describe('CoordinateNormalizer Benchmarks', () => {
  bench('normalizar coordenada formato europeo', () => {
    normalizarCoordenada('436.780,00');
  });
  
  bench('normalizar lote 100 coordenadas', () => {
    for (let i = 0; i < 100; i++) {
      normalizarCoordenada(`${400000 + i}.00`);
    }
  });
});

describe('AddressExtractor Benchmarks', () => {
  bench('extraer dirección simple', () => {
    extractStreetAddress('C/ Mayor, 1');
  });
  
  bench('extraer dirección con ruido', () => {
    extractStreetAddress('Centro de Salud Tíjola, Plaza Luis Gonzaga, n/ 1, disponible 24h');
  });
});
```

## Comando de ejecución
```bash
npx vitest bench
```

## Criterios de éxito
- [ ] ≥4 archivos de benchmark
- [ ] Cobertura: normalizer, extractor, geocoding, localData
- [ ] Métricas base establecidas
- [ ] Documentación de umbrales aceptables

---
*Preparado: 5 dic 2025 | Rol: MapWizard*
