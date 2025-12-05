#!/usr/bin/env node
/**
 * transform-to-dexie.js
 * 
 * Transforma archivos GeoJSON de DERA al formato DERAFeature
 * compatible con el schema IndexedDB (Dexie.js) definido en schemas.ts
 * 
 * USO:
 *   node transform-to-dexie.js
 * 
 * ENTRADA:
 *   public/data/dera/*.geojson (archivos originales DERA)
 * 
 * SALIDA:
 *   public/data/dera-dexie/*.json (formato DERAFeature[])
 * 
 * @version 1.0.0
 * @date 2025-12-05
 * @session B.1
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const INPUT_DIR = path.join(__dirname, '../../public/data/dera');
const OUTPUT_DIR = path.join(__dirname, '../../public/data/dera-dexie');

// Mapeo archivo → tipología
const FILE_TO_TIPOLOGIA = {
  'health': 'SANITARIO',
  'education': 'EDUCATIVO',
  'security': 'SEGURIDAD',
  'emergency': 'EMERGENCIA',
  'energy': 'ENERGIA',
  'municipal': 'MUNICIPAL'
};

// ============================================================================
// TRANSFORMACIÓN
// ============================================================================

/**
 * Extrae código de provincia de código de municipio
 * @param {string} codMun - Código INE municipio (5 dígitos)
 * @returns {string} Código provincia (2 dígitos)
 */
function extractCodProv(codMun) {
  if (!codMun || codMun.length < 2) return '00';
  return codMun.substring(0, 2);
}

/**
 * Transforma un feature GeoJSON a DERAFeature
 */
function transformFeature(feature, tipologia, index) {
  const props = feature.properties || {};
  const geom = feature.geometry || {};
  
  // Extraer coordenadas de MultiPoint
  let x = 0, y = 0;
  if (geom.type === 'MultiPoint' && geom.coordinates?.[0]) {
    x = geom.coordinates[0][0];
    y = geom.coordinates[0][1];
  } else if (geom.type === 'Point' && geom.coordinates) {
    x = geom.coordinates[0];
    y = geom.coordinates[1];
  }
  
  const codMun = String(props.cod_mun || '').padStart(5, '0');
  const codProv = extractCodProv(codMun);
  
  return {
    id: `${tipologia}_${codMun}_${index}`,
    tipologia,
    nombre: props.nombre || '',
    subtipo: props.tipo || props.tipo_abr || props.tip_centro || null,
    direccion: props.direccion || null,
    localidad: props.localidad || null,
    codMun,
    municipio: props.municipio || '',
    provincia: props.provincia || '',
    codProv,
    x,
    y,
    capaOrigen: props._source || 'DERA',
    metadata: {
      id_dera: props.id_dera,
      gestion: props.gestion,
      titular: props.titular,
      categoria: props.categoria,
      potenc_MW: props.potenc_MW,
      codigo: props.codigo
    },
    fechaCarga: new Date().toISOString()
  };
}

/**
 * Procesa un archivo GeoJSON y genera DERAFeature[]
 */
function processFile(filename) {
  const baseName = path.basename(filename, '.geojson');
  const tipologia = FILE_TO_TIPOLOGIA[baseName];
  
  if (!tipologia) {
    console.log(`  ⏭️  Saltando ${filename} (tipología no definida)`);
    return null;
  }
  
  const inputPath = path.join(INPUT_DIR, filename);
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const features = data.features || [];
  
  console.log(`\n  📁 ${baseName}.geojson`);
  console.log(`     Tipología: ${tipologia}`);
  console.log(`     Features origen: ${features.length}`);
  
  const transformed = features.map((f, i) => transformFeature(f, tipologia, i));
  
  // Filtrar features sin coordenadas válidas
  const valid = transformed.filter(f => f.x !== 0 && f.y !== 0);
  const invalid = transformed.length - valid.length;
  
  if (invalid > 0) {
    console.log(`     ⚠️  Sin coordenadas: ${invalid}`);
  }
  console.log(`     ✅ Features válidos: ${valid.length}`);
  
  return {
    baseName,
    tipologia,
    features: valid,
    metadata: {
      source: baseName,
      tipologia,
      count: valid.length,
      transformedAt: new Date().toISOString(),
      originalFile: filename
    }
  };
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║     TRANSFORMACIÓN DERA → DERAFeature (Dexie.js)                 ║
╚══════════════════════════════════════════════════════════════════╝
  Input:  ${INPUT_DIR}
  Output: ${OUTPUT_DIR}
`);

  // Crear directorio de salida
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`  📂 Creado: ${OUTPUT_DIR}`);
  }

  // Listar archivos GeoJSON
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.geojson'));
  console.log(`  📋 Archivos encontrados: ${files.length}`);

  let totalFeatures = 0;
  const allFeatures = [];
  const stats = [];

  // Procesar cada archivo
  files.forEach(file => {
    const result = processFile(file);
    if (result) {
      // Guardar archivo individual
      const outputPath = path.join(OUTPUT_DIR, `${result.baseName}.json`);
      fs.writeFileSync(outputPath, JSON.stringify({
        type: 'DERAFeatureCollection',
        features: result.features,
        metadata: result.metadata
      }, null, 2), 'utf8');
      
      totalFeatures += result.features.length;
      allFeatures.push(...result.features);
      stats.push({
        file: result.baseName,
        tipologia: result.tipologia,
        count: result.features.length
      });
    }
  });

  // Guardar archivo consolidado
  const consolidatedPath = path.join(OUTPUT_DIR, 'all-dera.json');
  fs.writeFileSync(consolidatedPath, JSON.stringify({
    type: 'DERAFeatureCollection',
    features: allFeatures,
    metadata: {
      totalFeatures,
      transformedAt: new Date().toISOString(),
      sources: stats
    }
  }, null, 2), 'utf8');

  // Resumen
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                        RESUMEN                                    ║
╠══════════════════════════════════════════════════════════════════╣`);
  stats.forEach(s => {
    console.log(`  ${s.tipologia.padEnd(12)} : ${s.count.toLocaleString().padStart(6)} features`);
  });
  console.log(`╠══════════════════════════════════════════════════════════════════╣
  TOTAL: ${totalFeatures.toLocaleString()} features
  
  📁 Archivos generados:
     • ${stats.length} archivos individuales (.json)
     • 1 archivo consolidado (all-dera.json)
╚══════════════════════════════════════════════════════════════════╝`);

  return 0;
}

main();
