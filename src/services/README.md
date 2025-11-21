# Arquitectura de Servicios - Geocodificación Tipológica Fase 1

## 📁 Estructura

```
src/
├── services/
│   ├── classification/
│   │   └── InfrastructureClassifier.ts    # Clasificador tipológico 12 categorías
│   │
│   ├── geocoding/
│   │   └── specialized/
│   │       ├── WFSBaseGeocoder.ts         # Clase base para todos los WFS
│   │       └── WFSHealthGeocoder.ts       # Geocodificador sanitarios (Fase 1)
│   │
│   └── examples.ts                         # Ejemplos de uso completos
│
└── types/
    └── infrastructure.ts                   # Tipos TypeScript compartidos
```

## 🎯 Componentes Implementados

### 1. InfrastructureClassifier (✅ COMPLETO)

**Ubicación**: `src/services/classification/InfrastructureClassifier.ts`

**Función**: Clasifica automáticamente infraestructuras PTEL en 12 categorías mediante regex patterns.

**Categorías soportadas**:
- ✅ SANITARIO (hospitales, centros salud, consultorios)
- ✅ EDUCATIVO (colegios, institutos, escuelas)
- ✅ POLICIAL (comisarías, cuarteles GC)
- ✅ BOMBEROS (parques bomberos)
- ✅ CULTURAL (museos, bibliotecas, teatros)
- ✅ RELIGIOSO (iglesias, ermitas, parroquias)
- ✅ DEPORTIVO (polideportivos, pabellones)
- ✅ MUNICIPAL (ayuntamientos, oficinas)
- ✅ SOCIAL (centros sociales, residencias)
- ✅ COMBUSTIBLE (gasolineras)
- ✅ EMERGENCIAS (112, protección civil)
- ✅ GENERICO (fallback)

**Uso básico**:
```typescript
import { InfrastructureClassifier } from './services/classification/InfrastructureClassifier';

const classifier = new InfrastructureClassifier();
const result = classifier.classify("Centro de Salud San Antón");
// result.type === InfrastructureType.HEALTH
// result.confidence === ClassificationConfidence.HIGH
```

### 2. WFSBaseGeocoder (✅ COMPLETO)

**Ubicación**: `src/services/geocoding/specialized/WFSBaseGeocoder.ts`

**Función**: Clase abstracta base para todos los geocodificadores WFS especializados.

**Características**:
- ✅ Cliente HTTP con timeout configurable
- ✅ Construcción automática de peticiones WFS GetFeature
- ✅ Parsing GeoJSON de respuestas
- ✅ Fuzzy matching con Fuse.js (threshold 0.3)
- ✅ Filtros CQL (municipio, provincia, BBOX)
- ✅ Caché de features
- ✅ Geocodificación batch

**Métodos principales**:
- `geocode(options)`: Geocodifica una infraestructura
- `geocodeBatch(options[])`: Geocodifica múltiples en batch
- `buildCQLFilter(options)`: Construye filtros WFS (sobrescribible)
- `parseFeature(feature)`: Parsea feature GML/GeoJSON (abstracto)

### 3. WFSHealthGeocoder (✅ COMPLETO)

**Ubicación**: `src/services/geocoding/specialized/WFSHealthGeocoder.ts`

**Función**: Geocodificador especializado para infraestructuras sanitarias andaluzas.

**Fuentes de datos**:
- WFS DERA G12 Servicios (IECA)
- Capas: g12_01_CentroSalud, g12_02_Hospital, g12_03_Consultorio
- Cobertura: ~1,500 centros sanitarios en Andalucía

**Características únicas**:
- ✅ Auto-cambio de capa según tipo detectado
- ✅ Validación de coordenadas existentes
- ✅ Obtención de todos los centros de un municipio (pre-caching)
- ✅ Parsing específico de estructura DERA G12

**Uso básico**:
```typescript
import { WFSHealthGeocoder } from './services/geocoding/specialized/WFSHealthGeocoder';

const geocoder = new WFSHealthGeocoder();
const result = await geocoder.geocodeWithAutoLayer({
  name: 'Centro de Salud San Antón',
  municipality: 'Granada',
  province: 'Granada'
});
// result.x, result.y: Coordenadas UTM30
// result.confidence: 0-100
// result.fuzzyScore: 0-1 (similaridad nombre)
```

## 🔧 Dependencias Agregadas

```json
{
  "axios": "^1.7.0",      // Cliente HTTP para WFS
  "fuse.js": "^7.0.0"     // Fuzzy matching de nombres
}
```

**Instalación**:
```bash
npm install
```

## 📊 Pipeline de Geocodificación Tipológica

```
┌─────────────────────────────────────────────────────────────┐
│  1. ENTRADA (CSV PTEL)                                      │
│  ────────────────────────────────────────────────────────   │
│  Nombre: "Centro Salud La Esperanza"                        │
│  Municipio: "Granada"                                       │
│  Coordenadas: "" (vacías o corruptas)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  2. CLASIFICACIÓN TIPOLÓGICA                                │
│  ────────────────────────────────────────────────────────   │
│  InfrastructureClassifier.classify()                        │
│  → Tipo: SANITARIO                                          │
│  → Confianza: ALTA                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  3. SELECCIÓN DE GEOCODIFICADOR                             │
│  ────────────────────────────────────────────────────────   │
│  if (type === SANITARIO) → WFSHealthGeocoder               │
│  if (type === EDUCATIVO) → WFSEducationGeocoder (Fase 1)   │
│  if (type === CULTURAL) → WFSCulturalGeocoder (Fase 1)     │
│  else → Generic Geocoder (CartoCiudad)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  4. GEOCODIFICACIÓN ESPECIALIZADA                           │
│  ────────────────────────────────────────────────────────   │
│  WFSHealthGeocoder.geocodeWithAutoLayer()                   │
│  → Query WFS DERA G12                                       │
│  → Fuzzy match contra 1,500 centros oficiales               │
│  → Best match: "Centro de Salud Esperanza" (score: 0.95)   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  5. SALIDA (Coordenadas Mejoradas)                          │
│  ────────────────────────────────────────────────────────   │
│  X: 447234.56 (EPSG:25830)                                  │
│  Y: 4112876.23 (EPSG:25830)                                 │
│  Confidence: 95/100                                         │
│  Source: "g12_01_CentroSalud" (oficial SAS)                 │
│  Precisión: ±2-10m (vs ±100-500m genérico)                  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Próximos Pasos (Semana 1-2)

### Geocodificadores pendientes (Fase 1):

1. **WFSEducationGeocoder** (prioridad ALTA)
   - Fuente: DERA G13 Educación + API CKAN Educación
   - Cobertura: ~3,800 centros educativos
   - Timeline: Días 6-8

2. **WFSCulturalGeocoder** (prioridad ALTA)
   - Fuente: WFS IAPH Patrimonio
   - Cobertura: ~7,000 bienes culturales
   - Timeline: Días 9-11

3. **WFSPoliceGeocoder** (prioridad MEDIA)
   - Fuente: ISE Junta + scraping Interior
   - Cobertura: ~200 comisarías/cuarteles
   - Timeline: Días 12-14

### Integraciones:

4. **Integrar en pipeline Step2**
   - Llamar a clasificador antes de normalización
   - Routing a geocodificador apropiado
   - Fallback a geocodificación genérica
   - Timeline: Día 15

5. **Tests unitarios**
   - Suite completa con 50 nombres reales por categoría
   - Mocks de respuestas WFS
   - Cobertura ≥85%
   - Timeline: Día 16-17

## 📈 Mejoras Esperadas Fase 1

**Baseline actual**:
- 55-70% éxito geocodificación
- Precisión ±100-500m (genérico)
- Fuente única (CartoCiudad)

**Objetivo Fase 1**:
- 90-95% éxito geocodificación (+35-45 puntos)
- Precisión ±2-10m tipológico / ±25-50m genérico
- 4+ fuentes especializadas + fallback

**Cobertura tipológica proyectada**:
- SANITARIO: 1,500 infraestructuras (100% cobertura Andalucía)
- EDUCATIVO: 3,800 infraestructuras (95% cobertura)
- CULTURAL: 7,000 infraestructuras (90% cobertura)
- POLICIAL: 200 infraestructuras (80% cobertura)
- **Total: ~70% infraestructuras PTEL con geocodificación especializada**

## 🧪 Testing

**Ejecutar ejemplos**:
```bash
npm run dev
# En navegador consola:
import { exampleCompletePipeline } from './services/examples';
await exampleCompletePipeline();
```

**Tests con datos reales**:
- CSVs PTEL Granada (Colomera)
- CSVs PTEL Almería (Berja, Garrucha)
- Validación visual en visor mapa

## 📚 Referencias Técnicas

### Servicios WFS Oficiales:
- **DERA G12 Sanitarios**: https://www.ideandalucia.es/services/DERA_g12_servicios/wfs
- **DERA G13 Educación**: https://www.ideandalucia.es/services/DERA_g13_educacion/wfs
- **IAPH Patrimonio**: https://www.juntadeandalucia.es/institutodeestadisticaycartografia/iaph/

### Documentación:
- Estándar WFS 2.0: https://www.ogc.org/standards/wfs
- Filtros CQL: https://docs.geoserver.org/stable/en/user/tutorials/cql/cql_tutorial.html
- Fuse.js: https://fusejs.io/

## 🔄 Estado Actual

- ✅ Estructura de directorios creada
- ✅ Tipos TypeScript definidos
- ✅ InfrastructureClassifier implementado (12 categorías)
- ✅ WFSBaseGeocoder implementado (clase base reutilizable)
- ✅ WFSHealthGeocoder implementado (sanitarios completo)
- ✅ Ejemplos de uso documentados
- ✅ Dependencies actualizadas (axios, fuse.js)
- ⏳ Pendiente: WFS Educación, Cultural, Policía
- ⏳ Pendiente: Integración en pipeline existente
- ⏳ Pendiente: Tests unitarios
- ⏳ Pendiente: Validación con datos reales

**Última actualización**: 21 Nov 2024, 19:15h
