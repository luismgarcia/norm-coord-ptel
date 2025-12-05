#!/usr/bin/env node
/**
 * extract-municipios-ine.cjs
 * 
 * Extrae municipios únicos de los datos DERA para crear INEMunicipio[]
 * compatible con el schema IndexedDB (Dexie.js)
 * 
 * @version 1.0.0
 * @date 2025-12-05
 * @session B.1
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../../public/data/dera-dexie/all-dera.json');
const OUTPUT_DIR = path.join(__dirname, '../../public/data/ine');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'municipios.json');

/**
 * Normaliza texto para búsqueda (sin acentos, mayúsculas)
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║     EXTRACCIÓN MUNICIPIOS INE DESDE DERA                         ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Leer datos DERA consolidados
  const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`  📁 Features DERA: ${data.features.length}`);

  // Agrupar por codMun
  const municipiosMap = new Map();

  data.features.forEach(f => {
    const codMun = f.codMun;
    if (!codMun || codMun === '00000') return;

    if (!municipiosMap.has(codMun)) {
      municipiosMap.set(codMun, {
        codMun,
        nombre: f.municipio,
        provincia: f.provincia,
        codProv: f.codProv,
        coords: []
      });
    }

    // Agregar coordenadas para calcular centroide
    if (f.x && f.y) {
      municipiosMap.get(codMun).coords.push({ x: f.x, y: f.y });
    }
  });

  console.log(`  🏛️  Municipios únicos: ${municipiosMap.size}`);

  // Calcular centroides y generar INEMunicipio[]
  const municipios = [];

  municipiosMap.forEach((mun, codMun) => {
    // Calcular centroide promedio
    let centroideX = 0, centroideY = 0;
    if (mun.coords.length > 0) {
      centroideX = mun.coords.reduce((sum, c) => sum + c.x, 0) / mun.coords.length;
      centroideY = mun.coords.reduce((sum, c) => sum + c.y, 0) / mun.coords.length;
    }

    municipios.push({
      codMun,
      nombre: mun.nombre,
      nombreNorm: normalizeText(mun.nombre),
      provincia: mun.provincia,
      codProv: mun.codProv,
      centroideX: Math.round(centroideX * 100) / 100,
      centroideY: Math.round(centroideY * 100) / 100,
      infraestructuras: mun.coords.length
    });
  });

  // Ordenar por código INE
  municipios.sort((a, b) => a.codMun.localeCompare(b.codMun));

  // Estadísticas por provincia
  const byProv = {};
  municipios.forEach(m => {
    byProv[m.provincia] = (byProv[m.provincia] || 0) + 1;
  });

  console.log('\\n  📊 Por provincia:');
  Object.entries(byProv)
    .sort((a, b) => b[1] - a[1])
    .forEach(([prov, count]) => {
      console.log(`     ${prov.padEnd(15)}: ${count}`);
    });

  // Crear directorio y guardar
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    type: 'INEMunicipioCollection',
    municipios,
    metadata: {
      totalMunicipios: municipios.length,
      source: 'Extraído de datos DERA',
      extractedAt: new Date().toISOString(),
      nota: 'Centroides aproximados basados en promedio de infraestructuras'
    }
  }, null, 2), 'utf8');

  const fileSize = fs.statSync(OUTPUT_FILE).size / 1024;

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                        RESULTADO                                  ║
╠══════════════════════════════════════════════════════════════════╣
  ✅ Municipios extraídos: ${municipios.length}
  📁 Archivo: ${path.basename(OUTPUT_FILE)}
  📦 Tamaño: ${fileSize.toFixed(1)} KB
╚══════════════════════════════════════════════════════════════════╝
`);

  return 0;
}

main();
