#!/usr/bin/env node
/**
 * Script para generar TopoJSON de municipios andaluces desde DERA WFS
 * 
 * REQUISITOS:
 *   npm install topojson-server topojson-simplify node-fetch
 * 
 * USO:
 *   node scripts/generate-topojson.mjs
 * 
 * SALIDA:
 *   src/data/municipios-andalucia.topojson (~3-5MB)
 * 
 * @version 1.0.0
 * @date Diciembre 2025
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  // WFS DERA - Datos Espaciales de Referencia de Andalucía
  wfsUrl: 'https://www.ideandalucia.es/services/DERA_g13_limites_administrativos/wfs',
  
  // Layer de términos municipales
  typeName: 'g13_08_TerminoMunicipal',
  
  // Sistema de coordenadas
  srs: 'EPSG:25830',
  
  // Archivo de salida
  outputPath: path.join(__dirname, '..', 'src', 'data', 'municipios-andalucia.topojson'),
  
  // Simplificación (para reducir tamaño)
  // 1e-5 = ~1m de precisión, 1e-4 = ~10m
  simplifyWeight: 1e-4,
  
  // Quantización para compresión
  quantize: 1e5,
};

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Construye URL para petición WFS GetFeature
 */
function buildWfsUrl() {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: CONFIG.typeName,
    outputFormat: 'application/json',
    srsName: CONFIG.srs,
    count: '1000', // Máximo por petición
  });
  
  return `${CONFIG.wfsUrl}?${params.toString()}`;
}

/**
 * Descarga GeoJSON desde WFS
 */
async function downloadGeoJSON() {
  console.log('📥 Descargando GeoJSON desde DERA WFS...');
  console.log(`   URL: ${CONFIG.wfsUrl}`);
  console.log(`   Layer: ${CONFIG.typeName}`);
  
  const url = buildWfsUrl();
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`WFS Error: ${response.status} ${response.statusText}`);
  }
  
  const geojson = await response.json();
  
  console.log(`✅ Descargados ${geojson.features?.length || 0} municipios`);
  
  return geojson;
}

/**
 * Convierte GeoJSON a TopoJSON
 */
async function convertToTopojson(geojson) {
  console.log('🔄 Convirtiendo a TopoJSON...');
  
  // Importar topojson dinámicamente
  const topojson = await import('topojson-server');
  const simplify = await import('topojson-simplify');
  
  // Preparar propiedades (solo las necesarias)
  const features = geojson.features.map(f => ({
    type: 'Feature',
    geometry: f.geometry,
    properties: {
      cod_ine: f.properties.cod_ine || f.properties.COD_INE || f.properties.codigo_ine,
      nombre: f.properties.nombre || f.properties.NOMBRE || f.properties.municipio,
      provincia: f.properties.provincia || f.properties.PROVINCIA,
    },
  }));
  
  const cleanGeojson = {
    type: 'FeatureCollection',
    features,
  };
  
  // Convertir a TopoJSON
  let topology = topojson.topology({ municipios: cleanGeojson }, CONFIG.quantize);
  
  // Simplificar
  topology = simplify.presimplify(topology);
  topology = simplify.simplify(topology, CONFIG.simplifyWeight);
  
  // Eliminar propiedades de simplificación
  delete topology.transform;
  topology.arcs = topology.arcs.map(arc => 
    arc.map(point => [Math.round(point[0]), Math.round(point[1])])
  );
  
  const size = JSON.stringify(topology).length;
  console.log(`✅ TopoJSON generado: ${(size / 1024 / 1024).toFixed(2)} MB`);
  
  return topology;
}

/**
 * Genera estadísticas del TopoJSON
 */
function generateStats(topology) {
  const municipios = topology.objects.municipios.geometries;
  
  const byProvince = {};
  for (const m of municipios) {
    const prov = m.properties.provincia || 'Desconocida';
    byProvince[prov] = (byProvince[prov] || 0) + 1;
  }
  
  return {
    totalMunicipios: municipios.length,
    porProvincia: byProvince,
    arcos: topology.arcs.length,
  };
}

/**
 * Guarda TopoJSON en archivo
 */
async function saveTopojson(topology) {
  console.log('💾 Guardando TopoJSON...');
  
  // Crear directorio si no existe
  const dir = path.dirname(CONFIG.outputPath);
  await fs.mkdir(dir, { recursive: true });
  
  // Guardar JSON compacto
  await fs.writeFile(
    CONFIG.outputPath,
    JSON.stringify(topology),
    'utf-8'
  );
  
  const stats = await fs.stat(CONFIG.outputPath);
  console.log(`✅ Guardado: ${CONFIG.outputPath}`);
  console.log(`   Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═'.repeat(60));
  console.log('🗺️  GENERADOR DE TOPOJSON - MUNICIPIOS DE ANDALUCÍA');
  console.log('═'.repeat(60));
  console.log('');
  
  try {
    // 1. Descargar GeoJSON desde WFS
    const geojson = await downloadGeoJSON();
    
    if (!geojson.features || geojson.features.length === 0) {
      throw new Error('No se obtuvieron features del WFS');
    }
    
    // 2. Convertir a TopoJSON
    const topology = await convertToTopojson(geojson);
    
    // 3. Generar estadísticas
    const stats = generateStats(topology);
    console.log('\n📊 Estadísticas:');
    console.log(`   Municipios: ${stats.totalMunicipios}`);
    console.log(`   Arcos: ${stats.arcos}`);
    console.log('   Por provincia:');
    for (const [prov, count] of Object.entries(stats.porProvincia)) {
      console.log(`     - ${prov}: ${count}`);
    }
    
    // 4. Guardar archivo
    await saveTopojson(topology);
    
    console.log('\n✅ Proceso completado exitosamente');
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Alternativas:');
    console.log('   1. Verificar conexión a Internet');
    console.log('   2. El servicio WFS de DERA puede estar temporalmente no disponible');
    console.log('   3. Usar TopoJSON pre-generado de un backup');
    process.exit(1);
  }
}

// Ejecutar si es el script principal
main();
