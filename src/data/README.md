# Datos Geográficos PTEL

Este directorio contiene archivos de datos geográficos para validación municipal.

## Archivos

### `municipios-andalucia.topojson` (pendiente de generación)

Polígonos de los 785 municipios de Andalucía en formato TopoJSON.

**Fuente:** DERA (Datos Espaciales de Referencia de Andalucía) - Junta de Andalucía

**Para generar:**
```bash
# Instalar dependencias
npm install topojson-server topojson-simplify node-fetch

# Ejecutar script
node scripts/generate-topojson.mjs
```

**Especificaciones:**
- Sistema de coordenadas: EPSG:25830 (UTM zona 30N)
- Simplificación: 10m de precisión
- Tamaño aproximado: 3-5 MB
- Propiedades incluidas:
  - `cod_ine`: Código INE del municipio (5 dígitos)
  - `nombre`: Nombre oficial del municipio
  - `provincia`: Provincia

## Modo Degradado

Si el TopoJSON no está disponible, el sistema funciona en **modo degradado** usando:
- Centroides de los 785 municipios (pre-cargados en `municipiosCentroides.ts`)
- Validación por radio aproximado al centroide
- Servicios remotos (CartoCiudad) como fallback

## Actualización

Los límites municipales raramente cambian. Se recomienda actualizar anualmente o cuando:
- Se produzcan fusiones/segregaciones municipales
- Se corrijan errores en la fuente DERA
