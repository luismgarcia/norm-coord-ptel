#!/usr/bin/env node
/**
 * Script de corrección UTF-8 para documentación PTEL
 * 
 * Corrige mojibake (UTF-8 leído como Latin-1) en archivos Markdown.
 * Basado en patrones de coordinateNormalizer.ts
 * 
 * Uso: node scripts/fix-utf8-docs.js <archivo_entrada> [archivo_salida]
 * 
 * @author PTEL Development Team
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// PATRONES DE CORRECCIÓN MOJIBAKE
// ============================================================================

/**
 * Patrones de corrección UTF-8 (mojibake)
 * Ordenados por frecuencia de aparición en documentos españoles
 */
const MOJIBAKE_PATTERNS = [
  // Vocales acentuadas minúsculas (más comunes)
  ['Ã³', 'ó'],  // ó
  ['Ã¡', 'á'],  // á
  ['Ã©', 'é'],  // é
  ['Ã­', 'í'],  // í
  ['Ãº', 'ú'],  // ú
  
  // Vocales acentuadas mayúsculas
  ['Ã"', 'Ó'],  // Ó
  ['Ã', 'Á'],   // Á (cuidado: Ã solo puede ser Á en contexto)
  ['Ã‰', 'É'],  // É
  ['Ã', 'Í'],   // Í
  ['Ãš', 'Ú'],  // Ú
  
  // Ñ
  ['Ã±', 'ñ'],  // ñ
  ['Ã'', 'Ñ'],  // Ñ
  
  // Diéresis
  ['Ã¼', 'ü'],  // ü
  ['Ãœ', 'Ü'],  // Ü
  
  // Signos de puntuación españoles
  ['Â¿', '¿'],  // ¿
  ['Â¡', '¡'],  // ¡
  
  // Euro y otros símbolos
  ['â‚¬', '€'],  // €
  
  // Comillas tipográficas
  ['â€œ', '"'],  // "
  ['â€', '"'],   // "
  ['â€™', "'"],  // '
  ['â€˜', "'"],  // '
  
  // Guiones
  ['â€"', '–'],  // en-dash
  ['â€"', '—'],  // em-dash
  
  // Caracteres de control residuales
  ['Â', ''],     // Byte residual Latin-1
  
  // Emojis comunes en documentación (doble-encoded)
  ['ðŸ"‹', '📋'],
  ['ðŸŽ¯', '🎯'],
  ['âœ…', '✅'],
  ['âš ï¸', '⚠️'],
  ['ðŸ"¥', '🔥'],
  ['ðŸš€', '🚀'],
  ['ðŸ'¡', '💡'],
  ['ðŸ"Š', '📊'],
  ['ðŸ"', '📍'],
  ['ðŸ—ºï¸', '🗺️'],
  ['ðŸ"§', '🔧'],
  ['ðŸ› ï¸', '🛠️'],
  ['ðŸ"ˆ', '📈'],
  ['ðŸ"‰', '📉'],
  ['ðŸ"¦', '📦'],
  ['ðŸ—‚ï¸', '🗂️'],
  ['ðŸ"', '📁'],
  ['ðŸ"‚', '📂'],
  ['ðŸ"', '🔍'],
  ['ðŸ"Ž', '🔎'],
  ['ðŸ"'', '🔑'],
  ['ðŸ"'', '🔒'],
  ['ðŸ""', '🔓'],
  ['ðŸ"—', '🔗'],
  ['ðŸ"Œ', '📌'],
  ['ðŸ"', '📝'],
  ['âœ', '✏'],
  ['âœ"', '✔'],
  ['âœ"ï¸', '✔️'],
  ['âœ–', '✖'],
  ['âŒ', '❌'],
  ['â—', '❗'],
  ['â"', '❓'],
  ['â„¹ï¸', 'ℹ️'],
  ['ðŸ†•', '🆕'],
  ['ðŸ†"', '🆓'],
  ['ðŸ†—', '🆗'],
  ['ðŸ†™', '🆙'],
  ['ðŸ†š', '🆚'],
  
  // Tipografía de documentación técnica
  ['â†'', '→'],  // flecha derecha
  ['â†', '←'],   // flecha izquierda
  ['â†"', '↔'],  // flecha bidireccional
  ['â‡'', '⇒'],  // doble flecha
  ['â€¢', '•'],  // bullet point
  ['Â·', '·'],   // middle dot
  ['â€¦', '…'],  // ellipsis
  ['Â©', '©'],   // copyright
  ['Â®', '®'],   // registered
  ['â„¢', '™'],  // trademark
  ['Â°', '°'],   // degree
  ['Â±', '±'],   // plus-minus
  ['Ã—', '×'],   // multiplication
  ['Ã·', '÷'],   // division
  ['â‰¤', '≤'],  // less than or equal
  ['â‰¥', '≥'],  // greater than or equal
  ['â‰ ', '≠'],  // not equal
  ['âˆž', '∞'],  // infinity
  
  // Infraestructuras PTEL (emojis específicos)
  ['ðŸ¥', '🏥'],   // hospital
  ['ðŸŽ"', '🎓'],   // educación
  ['ðŸš"', '🚔'],   // policía
  ['ðŸš'', '🚒'],   // bomberos
  ['ðŸš'', '🚑'],   // ambulancia
  ['â›ª', '⛪'],   // religioso
  ['ðŸ›ï¸', '🏛️'],  // municipal/cultural
  ['ðŸŸï¸', '🏟️'],  // deportivo
  ['ðŸ¤', '🤝'],   // social
  ['â›½', '⛽'],   // combustible
];

// ============================================================================
// FUNCIONES DE NORMALIZACIÓN
// ============================================================================

/**
 * Normaliza texto corrigiendo problemas de encoding UTF-8 (mojibake).
 * 
 * @param {string} text - Texto con posible corrupción UTF-8
 * @returns {string} Texto normalizado
 */
function normalizeEncoding(text) {
  let result = text;
  
  for (const [corrupted, correct] of MOJIBAKE_PATTERNS) {
    result = result.split(corrupted).join(correct);
  }
  
  // Limpiar espacios no rompibles residuales
  result = result.replace(/\u00A0/g, ' ');
  
  return result;
}

/**
 * Procesa un archivo Markdown corrigiendo mojibake
 * 
 * @param {string} inputPath - Ruta del archivo de entrada
 * @param {string} outputPath - Ruta del archivo de salida (opcional)
 * @returns {Object} Estadísticas del procesamiento
 */
function processFile(inputPath, outputPath) {
  // Leer archivo
  const content = fs.readFileSync(inputPath, 'utf8');
  
  // Normalizar
  const normalized = normalizeEncoding(content);
  
  // Calcular estadísticas
  const stats = {
    inputPath,
    outputPath: outputPath || inputPath,
    originalSize: content.length,
    normalizedSize: normalized.length,
    changed: content !== normalized,
    changePercent: ((content.length - normalized.length) / content.length * 100).toFixed(2)
  };
  
  // Guardar
  fs.writeFileSync(outputPath || inputPath, normalized, 'utf8');
  
  return stats;
}

// ============================================================================
// CLI
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║     PTEL UTF-8 Normalizer - Corrector de Mojibake v1.0       ║
╠══════════════════════════════════════════════════════════════╣
║ Uso:                                                          ║
║   node fix-utf8-docs.js <archivo>           # Corrige in-place║
║   node fix-utf8-docs.js <entrada> <salida>  # Copia corregida ║
║   node fix-utf8-docs.js --batch <directorio> # Lote           ║
╚══════════════════════════════════════════════════════════════╝
    `);
    process.exit(0);
  }
  
  // Modo batch
  if (args[0] === '--batch' && args[1]) {
    const dir = args[1];
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    
    console.log(`\n🔧 Procesando ${files.length} archivos Markdown en ${dir}\n`);
    
    let totalChanged = 0;
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = processFile(filePath, filePath);
      
      if (stats.changed) {
        console.log(`✅ ${file} - ${stats.changePercent}% reducido`);
        totalChanged++;
      } else {
        console.log(`⏭️  ${file} - sin cambios`);
      }
    }
    
    console.log(`\n📊 Resumen: ${totalChanged}/${files.length} archivos corregidos\n`);
    return;
  }
  
  // Modo archivo único
  const inputPath = args[0];
  const outputPath = args[1] || inputPath;
  
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: No se encuentra el archivo ${inputPath}`);
    process.exit(1);
  }
  
  console.log(`\n🔧 Procesando: ${inputPath}`);
  const stats = processFile(inputPath, outputPath);
  
  if (stats.changed) {
    console.log(`✅ Corregido: ${stats.outputPath}`);
    console.log(`   Tamaño: ${stats.originalSize} → ${stats.normalizedSize} (${stats.changePercent}% reducido)`);
  } else {
    console.log(`⏭️  Sin cambios necesarios`);
  }
  console.log('');
}

main();
