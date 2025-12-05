# 📚 Catálogo de Fuentes de Datos para BBDDs Locales PTEL

> **Sesión**: F0.1 | **Rol**: DataMaster | **Fecha**: 5 diciembre 2025
> **Objetivo**: Documentar fuentes oficiales para sistema de validación multi-BBDD

---

## 📊 Resumen Ejecutivo

| Fuente | Tipo | Cobertura | Actualización | Tamaño Est. | Prioridad |
|--------|------|-----------|---------------|-------------|:---------:|
| **DERA WFS** | Infraestructuras | 100% Andalucía | Trimestral | ~50-100MB | 🔴 Alta |
| **CDAU** | Direcciones | 100% Andalucía | Continua | ~200MB/prov | 🔴 Alta |
| **INE** | Municipios | 100% España | Anual (1 enero) | ~2MB | 🟡 Media |
| **Límites** | Polígonos | 100% Andalucía | Anual | ~15MB | 🟢 Ya existe |

---

## 🏗️ 1. DERA - Datos Espaciales de Referencia de Andalucía

### 1.1 Información General

| Atributo | Valor |
|----------|-------|
| **Proveedor** | IECA (Instituto de Estadística y Cartografía de Andalucía) |
| **Última actualización** | 30/06/2025 |
| **Licencia** | CC BY 4.0 |
| **CRS** | EPSG:25830 (UTM30 ETRS89) |
| **Formato respuesta** | GeoJSON, GML, Shapefile |

### 1.2 Endpoint Base WFS

```
https://www.ideandalucia.es/services/DERA_{grupo}_{tema}/wfs
```

**Parámetros estándar WFS**:
- `service=WFS`
- `version=2.0.0`
- `request=GetFeature`
- `typeName={capa}`
- `outputFormat=application/json`
- `srsName=EPSG:25830`
- `count={limite}` (paginación)

### 1.3 Grupos DERA Relevantes para PTEL


#### G12 - Servicios Sanitarios 🏥

| Capa | TypeName | Registros Est. | Tipología PTEL |
|------|----------|----------------|----------------|
| Centros de Salud | `g12_01_CentroSalud` | ~400 | SANITARIO |
| Hospitales | `g12_02_Hospital` | ~40 | SANITARIO |
| Consultorios | `g12_03_Consultorio` | ~1,000 | SANITARIO |

**Endpoint**: `https://www.ideandalucia.es/services/DERA_g12_servicios/wfs`

**Campos principales**:
- `DENOMINACION`: Nombre del centro
- `MUNICIPIO`: Nombre del municipio
- `PROVINCIA`: Nombre de la provincia
- `DIRECCION`: Dirección postal
- `TIPO_CENTRO`: Tipo de centro sanitario
- `DISTRITO_SANITARIO`: Distrito sanitario

---

#### G14 - Servicios Educativos 📚

| Capa | TypeName | Registros Est. | Tipología PTEL |
|------|----------|----------------|----------------|
| Centros Docentes | `g14_01_CentroDocente` | ~3,800 | EDUCATIVO |

**Endpoint**: `https://www.ideandalucia.es/services/DERA_g14_educacion/wfs`

**Nota**: Datos más completos disponibles vía API CKAN de Educación:
```
https://www.juntadeandalucia.es/datosabiertos/portal/api/
dataset: directorio-de-centros-docentes-de-andalucia
```

---

#### G15 - Patrimonio Cultural 🏛️

| Capa | TypeName | Registros Est. | Tipología PTEL |
|------|----------|----------------|----------------|
| Bienes Culturales | `g15_01_BienCultural` | ~500 | CULTURAL |
| Museos | `g15_02_Museo` | ~150 | CULTURAL |
| Archivos | `g15_03_Archivo` | ~50 | CULTURAL |
| Bibliotecas | `g15_04_Biblioteca` | ~400 | CULTURAL |

**Endpoint**: `https://www.ideandalucia.es/services/DERA_g15_patrimonio/wfs`

---

#### G16 - Otros Servicios 🏢

| Capa | TypeName | Registros Est. | Tipología PTEL |
|------|----------|----------------|----------------|
| Servicios Sociales | `g16_01_ServicioSocial` | ~300 | SOCIAL |
| Centros Deportivos | `g16_02_Deportivo` | ~2,000 | DEPORTIVO |
| Cementerios | `g16_03_Cementerio` | ~800 | FUNERARIO |

**Endpoint**: `https://www.ideandalucia.es/services/DERA_g16_servicios/wfs`

---


#### G09 - Transportes 🚌

| Capa | TypeName | Registros Est. | Tipología PTEL |
|------|----------|----------------|----------------|
| Estaciones Ferrocarril | `g09_01_EstacionFerrocarril` | ~100 | TRANSPORTE |
| Puertos | `g09_02_Puerto` | ~30 | TRANSPORTE |
| Aeropuertos | `g09_03_Aeropuerto` | ~8 | TRANSPORTE |
| Estaciones Autobús | `g09_04_EstacionAutobus` | ~200 | TRANSPORTE |

**Endpoint**: `https://www.ideandalucia.es/services/DERA_g9_transporte/wfs`

---

#### G10 - Infraestructuras Energéticas ⚡

| Capa | TypeName | Registros Est. | Tipología PTEL |
|------|----------|----------------|----------------|
| Centrales Eléctricas | `g10_01_CentralElectrica` | ~500 | ENERGIA |
| Subestaciones | `g10_02_Subestacion` | ~200 | ENERGIA |
| Parques Eólicos | `g10_03_ParqueEolico` | ~150 | ENERGIA |
| Plantas Solares | `g10_04_PlantaSolar` | ~300 | ENERGIA |
| Plantas RSU | `g10_05_PlantaRSU` | ~100 | MEDIOAMBIENTAL |
| EDAR | `g10_06_EDAR` | ~500 | MEDIOAMBIENTAL |

**Endpoint**: `https://www.ideandalucia.es/services/DERA_g10_infra_energetica/wfs`

---

#### G11 - Infraestructuras Hidráulicas 💧

| Capa | TypeName | Registros Est. | Tipología PTEL |
|------|----------|----------------|----------------|
| Embalses | `g11_01_Embalse` | ~80 | HIDRAULICO |
| Presas | `g11_02_Presa` | ~80 | HIDRAULICO |
| ETAP | `g11_03_ETAP` | ~200 | HIDRAULICO |
| Depósitos Agua | `g11_04_Deposito` | ~1,000 | HIDRAULICO |

**Endpoint**: `https://www.ideandalucia.es/services/DERA_g11_infra_hidraulica/wfs`

---

#### G17 - Divisiones Administrativas 🗺️

| Capa | TypeName | Registros Est. | Tipología PTEL |
|------|----------|----------------|----------------|
| Municipios | `g17_01_Municipio` | 786 | - |
| Provincias | `g17_02_Provincia` | 8 | - |
| Núcleos Población | `g17_03_NucleoPoblacion` | ~4,500 | POBLACION |

**Endpoint**: `https://www.ideandalucia.es/services/DERA_g17_divisiones/wfs`

---

#### Servicios de Seguridad 🚔 (Overpass/OSM + WFS)

| Fuente | Tipo | Registros Est. | Tipología PTEL |
|--------|------|----------------|----------------|
| Overpass API | Guardia Civil | ~500 | SEGURIDAD |
| Overpass API | Policía Local | ~400 | SEGURIDAD |
| Overpass API | Bomberos | ~150 | SEGURIDAD |

**Nota**: Servicios de seguridad no están en DERA, usamos Overpass API (OSM).


---

## 📍 2. CDAU - Callejero Digital de Andalucía Unificado

### 2.1 Información General

| Atributo | Valor |
|----------|-------|
| **Proveedor** | IECA + Ayuntamientos + Diputaciones |
| **Portal** | https://www.callejerodeandalucia.es |
| **Licencia** | CC BY 4.0 |
| **CRS** | EPSG:25830 (UTM30 ETRS89) |
| **Actualización** | Continua (mantenimiento descentralizado) |

### 2.2 Contenido

- **Vías**: ~100,000+ calles en Andalucía
- **Tramos**: Segmentos de vía con geometría
- **Portales**: ~2,500,000+ direcciones con coordenadas
- **Secciones censales**: Delimitación INE
- **Códigos postales**: Información Correos

### 2.3 Acceso a Datos

#### WFS (Servicio OGC)
```
https://www.ideandalucia.es/wfs-cdau/services?service=WFS
```
**Limitación**: No permite descarga masiva (límite de features)

#### Descarga Masiva (Cliente)
```
https://www.callejerodeandalucia.es/descargas/
```
Formato: Shapefile por provincia (~200MB/provincia)

#### API SOAP (Geocodificación)
```
http://www.callejerodeandalucia.es/ws/services/InterfazCDAUWS?wsdl
```
**⚠️ Requiere autorización** desde 31/01/2024 vía NAOS

### 2.4 Estructura de Datos Portales

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `INE_MUN` | Código INE municipio | 18087 |
| `VIA_NOMBRE` | Nombre de la vía | Calle Real |
| `VIA_TIPO` | Tipo de vía | CL, AV, PZ |
| `NUMERO` | Número portal | 15 |
| `X_ETRS89` | Coordenada X | 450123.45 |
| `Y_ETRS89` | Coordenada Y | 4123456.78 |
| `COD_POSTAL` | Código postal | 18510 |

### 2.5 Tamaño Estimado por Provincia

| Provincia | Portales | Tamaño Est. |
|-----------|:--------:|:-----------:|
| Almería | ~200,000 | ~30MB |
| Cádiz | ~400,000 | ~50MB |
| Córdoba | ~250,000 | ~35MB |
| Granada | ~300,000 | ~40MB |
| Huelva | ~150,000 | ~25MB |
| Jaén | ~200,000 | ~30MB |
| Málaga | ~500,000 | ~60MB |
| Sevilla | ~600,000 | ~70MB |
| **TOTAL** | ~2,600,000 | ~340MB |


---

## 🏛️ 3. INE - Relación de Municipios

### 3.1 Información General

| Atributo | Valor |
|----------|-------|
| **Proveedor** | Instituto Nacional de Estadística |
| **Portal** | https://www.ine.es |
| **Licencia** | Datos públicos |
| **Actualización** | Anual (1 de enero) |
| **Última versión** | 01/01/2025 (publicado 06/02/2025) |

### 3.2 URL de Descarga

```
https://www.ine.es/daco/daco42/codmun/diccionario25.xlsx
```
(Cambiar `25` por año correspondiente)

### 3.3 Estructura de Datos

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `CPRO` | Código provincia (2 dígitos) | 18 |
| `CMUN` | Código municipio (3 dígitos) | 087 |
| `DC` | Dígito de control | 7 |
| `NOMBRE` | Nombre oficial | Granada |

**Código INE completo**: `CPRO` + `CMUN` = 5 dígitos (ej: `18087`)

### 3.4 Municipios de Andalucía

| Provincia | Código | Municipios |
|-----------|:------:|:----------:|
| Almería | 04 | 103 |
| Cádiz | 11 | 45 |
| Córdoba | 14 | 77 |
| Granada | 18 | 174 |
| Huelva | 21 | 79 |
| Jaén | 23 | 97 |
| Málaga | 29 | 103 |
| Sevilla | 41 | 106 |
| **TOTAL** | - | **786** |

### 3.5 Variantes de Nombres

El archivo INE incluye nombre oficial. Para variantes considerar:
- Artículos: "El Ejido" vs "Ejido"
- Preposiciones: "Fuentes de Andalucía" vs "Fuentes Andalucía"
- Acentos: "Benalmádena" vs "Benalmadena"

**Recomendación**: Crear diccionario de variantes localmente.

---

## 🗺️ 4. Límites Municipales (TopoJSON)

### 4.1 Estado Actual

✅ **Ya disponible** en el proyecto:
```
public/data/municipios-andalucia.topojson
```

### 4.2 Fuente Original

| Atributo | Valor |
|----------|-------|
| **Proveedor** | IECA / DERA G17 |
| **Formato** | TopoJSON (simplificado) |
| **Tamaño** | ~15MB |
| **Actualización** | Anual |

### 4.3 Uso

- Validación point-in-polygon
- Verificación coordenadas dentro del municipio
- Detección errores de municipio incorrecto

---


## 🎯 5. Estrategia de Implementación

### 5.1 Prioridad de Carga

```
1️⃣ INE Municipios (~2MB)      → Inmediato (base para todo)
2️⃣ DERA G12 Sanitarios        → F2.1 (~5MB)
3️⃣ DERA G14 Educativos        → F2.1 (~10MB)
4️⃣ DERA G15 Culturales        → F2.2 (~5MB)
5️⃣ DERA G16 Otros servicios   → F2.2 (~10MB)
6️⃣ DERA G10 Energía           → F2.3 (~15MB)
7️⃣ DERA G11 Hidráulicas       → F2.3 (~10MB)
8️⃣ CDAU Direcciones           → F3.1-F3.3 (~340MB total)
```

### 5.2 Formato de Almacenamiento Local

| Fuente | Formato IndexedDB | Índices Principales |
|--------|-------------------|---------------------|
| DERA | `{id, nombre, nombreNorm, municipioINE, tipologia, x, y}` | `[municipioINE+tipologia]` |
| CDAU | `{id, viaNombre, viaNombreNorm, numero, municipioINE, x, y}` | `[municipioINE+viaNombreNorm]` |
| INE | `{codigo, nombre, nombreNorm, variantes[], provincia}` | `codigo, nombreNorm` |

### 5.3 Frecuencia de Actualización

| Fuente | Frecuencia | Trigger |
|--------|------------|---------|
| INE | Anual | Enero |
| DERA | Trimestral | Junio, Sept, Dic, Marzo |
| CDAU | Semestral | Julio, Enero |
| Límites | Anual | Cuando INE cambie |

### 5.4 Tamaño Total Estimado

```
INE:      ~2MB
DERA:     ~60MB (grupos relevantes PTEL)
CDAU:     ~340MB (toda Andalucía)
Límites:  ~15MB
─────────────────
TOTAL:    ~420MB (IndexedDB local)
```

**Nota**: IndexedDB en navegador permite hasta ~50% del disco disponible.

---

## 📋 6. Checklist F0.1

- [x] Documentar endpoints WFS DERA
- [x] Analizar estructura CDAU
- [x] Verificar formato INE
- [x] Confirmar límites existentes
- [x] Estimar tamaños
- [x] Definir prioridades de carga
- [x] Crear SOURCE_CATALOG.md

---

## 🔗 7. Referencias

### Documentación Oficial
- [DERA IECA](https://www.juntadeandalucia.es/institutodeestadisticaycartografia/dega/datos-espaciales-de-referencia-de-andalucia-dera)
- [CDAU Portal](https://www.callejerodeandalucia.es)
- [INE Municipios](https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177031)
- [IDEAndalucia](https://www.ideandalucia.es)

### Catálogos de Metadatos
- [DERA Catálogo Objetos (PDF)](https://www.juntadeandalucia.es/institutodeestadisticaycartografia/dega/sites/default/files/docs/094-datos-espaciales-referencia-dera-catalogo-objetos-geograficos-5e0z.pdf)
- [CDAU Manual Integración](https://www.callejerodeandalucia.es/portal/servicio-ws-cdau-soap)

---

**Siguiente paso**: F0.2 — Definir esquemas IndexedDB (`src/lib/localData/schemas.ts`)
