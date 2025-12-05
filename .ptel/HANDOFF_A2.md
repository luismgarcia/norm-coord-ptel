# Handoff A.2: Test E2E flujo ODT → coordenadas

## Rol a activar
🧙 **MapWizard** - React/TypeScript/APIs

## Contexto
- **Sesión anterior**: A.1 COMPLETADO - F025 AddressExtractor ya integrado
- **Versión**: 0.4.1
- **Tests**: 1314/1314 (100%)

## Tarea A.2
Crear suite de tests E2E que valide el flujo completo:
**Documento ODT → Parser → Extractor → Normalizador → Geocodificador → Coordenadas UTM30**

## Objetivo
Validar con documentos PTEL reales que todo el pipeline funciona correctamente.

## Archivos a crear
```
src/lib/__tests__/e2e/
├── odtToCoordinates.test.ts  # Tests E2E principales
├── fixtures/                  # Datos de prueba
│   ├── tíjola-sample.json    # Extracto normalizado Tíjola
│   ├── colomera-sample.json  # Extracto normalizado Colomera
│   └── berja-sample.json     # Extracto normalizado Berja
└── helpers.ts                 # Utilidades test
```

## Casos de test sugeridos
```typescript
describe('E2E: ODT → Coordenadas UTM30', () => {
  // Flujo básico
  it('debe procesar infraestructura con coordenadas válidas');
  it('debe normalizar direcciones con F025 antes de geocodificar');
  it('debe detectar y corregir coordenadas truncadas');
  
  // Casos complejos
  it('debe manejar coordenadas DMS con formato corrupto');
  it('debe geocodificar dirección cuando no hay coordenadas');
  it('debe validar municipio con código INE');
  
  // Edge cases
  it('debe rechazar coordenadas fuera de Andalucía');
  it('debe manejar UTF-8 corrupto (NÂº → Nº)');
});
```

## Verificación
```bash
cd /Users/lm/Documents/GitHub/norm-coord-ptel
npm test -- --run e2e
```

## Criterios de éxito
- [ ] Suite E2E con ≥8 tests
- [ ] Usa datos reales de 3+ municipios
- [ ] Tests pasan en <30s
- [ ] Cobertura de F025 + Normalizer + Geocoder

---
*Preparado: 5 dic 2025 | Rol: MapWizard*
