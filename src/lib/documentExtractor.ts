/**
 * Utilidades para extracción de infraestructuras de documentos PTEL
 * 
 * Extrae TODAS las infraestructuras del documento, incluyendo las que
 * no tienen coordenadas (para geocodificación posterior).
 * 
 * @module lib/documentExtractor
 */

import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { ExtractedInfrastructure, ExtractionStats, DocumentMetadata } from '../types/processing';

// ============================================================================
// UTILIDADES DE LIMPIEZA
// ============================================================================

/**
 * Genera un ID único para una infraestructura
 */
function generateId(): string {
  return `inf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Limpia y normaliza un valor de coordenada
 */
export function cleanCoordinateValue(val: string): string {
  if (!val || typeof val !== 'string') return '';
  
  let cleaned = val.trim();
  
  // Detectar placeholders
  if (/^(indicar|sin datos?|-|n\/?[ac]|\.+|_+|xxx)$/i.test(cleaned)) {
    return '';
  }
  
  // Eliminar comillas especiales
  cleaned = cleaned.replace(/[´`''""]+/g, '');
  
  // Espacios como separadores de miles
  if (/^\d[\d\s]+\d$/.test(cleaned) && cleaned.includes(' ')) {
    const noSpaces = cleaned.replace(/\s/g, '');
    if (/^\d+$/.test(noSpaces)) {
      if (noSpaces.length > 6) {
        cleaned = noSpaces.slice(0, -2) + '.' + noSpaces.slice(-2);
      } else {
        cleaned = noSpaces;
      }
    }
  }
  
  // Puntos como separadores de miles
  const dotCount = (cleaned.match(/\./g) || []).length;
  if (dotCount > 1) {
    cleaned = cleaned.replace(/\./g, '');
  } else if (dotCount === 1) {
    const parts = cleaned.split('.');
    if (parts[1] && parts[1].length === 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
      if (parseInt(parts[0]) >= 1000) {
        cleaned = cleaned.replace('.', '');
      }
    }
  }
  
  // Coma por punto
  cleaned = cleaned.replace(',', '.');
  
  // Espacios restantes
  cleaned = cleaned.replace(/\s/g, '');
  
  return cleaned;
}

/**
 * Verifica si un valor parece una coordenada UTM válida para Andalucía
 */
export function isValidUTMValue(val: string, type: 'x' | 'y'): boolean {
  const num = parseFloat(val);
  if (isNaN(num) || num === 0) return false;
  
  if (type === 'x') {
    return num >= 100000 && num <= 800000;
  } else {
    return num >= 4000000 && num <= 4300000;
  }
}

/**
 * Detecta municipio del nombre del archivo o contenido
 */
export function detectMunicipality(fileName: string, content?: string): string | undefined {
  // Patrones comunes en nombres de archivo PTEL
  const filePatterns = [
    /PTEL[_\s]+(?:Ayto?\.?\s*)?(\w+)/i,
    /Ficha[_\s]+(?:Plantilla[_\s]+)?PTEL[_\s]+(?:Ayto?\.?\s*)?(\w+)/i,
    /(\w+)[_\s]+PTEL/i
  ];
  
  for (const pattern of filePatterns) {
    const match = fileName.match(pattern);
    if (match && match[1]) {
      // Limpiar y capitalizar
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }
  
  return undefined;
}

/**
 * Detecta provincia basándose en el municipio
 */
export function detectProvince(municipality?: string): string {
  // Por defecto Granada (para pruebas de Colomera)
  // En producción, esto debería consultar una tabla de municipios
  if (!municipality) return 'Granada';
  
  // Lista simplificada de municipios por provincia (expandir en producción)
  const granadaMunicipalities = [
    'colomera', 'granada', 'motril', 'baza', 'guadix', 'loja', 'almuñécar',
    'armilla', 'maracena', 'atarfe', 'pinos puente', 'santa fe'
  ];
  
  if (granadaMunicipalities.includes(municipality.toLowerCase())) {
    return 'Granada';
  }
  
  // Por defecto
  return 'Granada';
}

// ============================================================================
// PARSER ODT MEJORADO - EXTRAE TODAS LAS INFRAESTRUCTURAS
// ============================================================================

function getRowCells(row: Element, ns: string): string[] {
  const cells = row.getElementsByTagNameNS(ns, 'table-cell');
  const result: string[] = [];
  
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const repeatCount = parseInt(cell.getAttribute('table:number-columns-repeated') || '1', 10);
    const text = cell.textContent?.trim() || '';
    
    const effectiveRepeat = Math.min(repeatCount, text ? 20 : 3);
    for (let r = 0; r < effectiveRepeat; r++) {
      result.push(text);
    }
  }
  
  return result;
}

/**
 * Detecta si una fila contiene una infraestructura válida
 */
function isInfrastructureRow(cells: string[]): boolean {
  // Debe tener al menos un nombre significativo
  const nonEmptyCells = cells.filter(c => 
    c.trim() && 
    !/^(indicar|sin datos?|-|\.+|_+|x|y|coordenadas?)$/i.test(c.trim())
  );
  
  if (nonEmptyCells.length < 1) return false;
  
  // El primer campo no vacío debe parecer un nombre
  const firstContent = nonEmptyCells[0];
  if (firstContent.length < 3) return false;
  
  // Excluir headers y labels
  const headerPatterns = /^(nombre|tipo|dirección|coordenadas?|denominación|descripción|observaciones)$/i;
  if (headerPatterns.test(firstContent)) return false;
  
  return true;
}

/**
 * Detecta el tipo de infraestructura desde el contexto
 */
function detectInfrastructureType(tableName: string, rowText: string): string {
  const combined = `${tableName} ${rowText}`.toLowerCase();
  
  if (/patrimonio|histórico|cultural|monumento|iglesia|ermita|museo/i.test(combined)) return 'PATRIMONIO';
  if (/sanita|salud|médico|consultorio|hospital|ambulatorio/i.test(combined)) return 'SANITARIO';
  if (/educa|enseñanza|colegio|instituto|escuela|ceip|ies/i.test(combined)) return 'EDUCATIVO';
  if (/seguridad|policía|guardia civil|bomberos|protección/i.test(combined)) return 'SEGURIDAD';
  if (/telecom|antena|repetidor|comunicación/i.test(combined)) return 'TELECOMUNICACIONES';
  if (/deport|piscina|polideportivo|campo|pabellón/i.test(combined)) return 'DEPORTIVO';
  if (/hidráulic|agua|depósito|embalse|edar|depuradora/i.test(combined)) return 'HIDRAULICO';
  if (/energía|eléctric|subestación|transformador/i.test(combined)) return 'ENERGIA';
  if (/municipal|ayuntamiento|administrativo/i.test(combined)) return 'MUNICIPAL';
  if (/vial|carretera|camino|acceso/i.test(combined)) return 'VIAL';
  if (/recreativ|parque|área/i.test(combined)) return 'RECREATIVO';
  
  return 'OTRO';
}

/**
 * Extrae infraestructuras de un documento ODT
 * Incluye TODAS las infraestructuras, con y sin coordenadas
 */
export async function extractFromODT(
  file: File,
  municipality?: string,
  province?: string
): Promise<{ infrastructures: ExtractedInfrastructure[], stats: ExtractionStats }> {
  
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  
  const contentXml = await zip.file('content.xml')?.async('text');
  if (!contentXml) {
    throw new Error('No se pudo leer el contenido del ODT');
  }
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(contentXml, 'text/xml');
  
  const tableNS = 'urn:oasis:names:tc:opendocument:xmlns:table:1.0';
  const tables = doc.getElementsByTagNameNS(tableNS, 'table');
  
  if (tables.length === 0) {
    throw new Error('No se encontraron tablas en el documento ODT');
  }
  
  const infrastructures: ExtractedInfrastructure[] = [];
  const byTypology: Record<string, number> = {};
  const byTable: Record<string, number> = {};
  let withCoordinates = 0;
  let withoutCoordinates = 0;
  
  // Detectar municipio del nombre del archivo si no se proporciona
  const detectedMunicipality = municipality || detectMunicipality(file.name);
  const detectedProvince = province || detectProvince(detectedMunicipality);
  
  for (let t = 0; t < tables.length; t++) {
    const table = tables[t];
    const tableName = table.getAttribute('table:name') || `Tabla${t + 1}`;
    const tableRows = table.getElementsByTagNameNS(tableNS, 'table-row');
    
    if (tableRows.length < 2) continue;
    
    // Obtener todas las filas como arrays de celdas
    const allRows: string[][] = [];
    for (let r = 0; r < tableRows.length; r++) {
      allRows.push(getRowCells(tableRows[r], tableNS));
    }
    
    // Detectar si esta tabla contiene infraestructuras
    const tableText = allRows.slice(0, 3).map(r => r.join(' ')).join(' ').toLowerCase();
    
    // Buscar tablas con infraestructuras (más permisivo)
    const hasInfrastructureIndicators = 
      tableText.includes('coordenada') ||
      tableText.includes('utm') ||
      tableText.includes('denominación') ||
      tableText.includes('nombre') ||
      tableText.includes('dirección') ||
      tableText.includes('tipología') ||
      tableText.includes('tipo') ||
      /patrimonio|sanita|educa|seguridad|deport|hidráulic|energía/i.test(tableText);
    
    if (!hasInfrastructureIndicators) continue;
    
    // Detectar índices de columnas
    let nombreIdx = -1;
    let tipoIdx = -1;
    let direccionIdx = -1;
    let xIdx = -1;
    let yIdx = -1;
    let dataStartRow = 1;
    
    // Buscar headers en primeras filas
    for (let r = 0; r < Math.min(3, allRows.length); r++) {
      const row = allRows[r];
      for (let c = 0; c < row.length; c++) {
        const cell = row[c].toLowerCase().trim();
        
        if (nombreIdx === -1 && /^(nombre|denominación|descripción)/.test(cell)) nombreIdx = c;
        if (tipoIdx === -1 && /^tipo/.test(cell)) tipoIdx = c;
        if (direccionIdx === -1 && /^(dirección|ubicación|localización)/.test(cell)) direccionIdx = c;
        if (xIdx === -1 && (/^x$|longitud|este|coord.*x/.test(cell) || cell === 'x')) xIdx = c;
        if (yIdx === -1 && (/^y$|latitud|norte|coord.*y/.test(cell) || cell === 'y')) yIdx = c;
        
        // Si encontramos "coordenadas", X está ahí e Y en la siguiente
        if (/^coordenadas?$/.test(cell) && xIdx === -1) {
          xIdx = c;
          yIdx = c + 1;
        }
      }
      
      // Si encontramos headers, los datos empiezan en la siguiente fila
      if (nombreIdx !== -1 || xIdx !== -1) {
        dataStartRow = r + 1;
        // Si hay subheader (X, Y solos), saltar otra fila
        if (dataStartRow < allRows.length) {
          const nextRow = allRows[dataStartRow];
          const nextText = nextRow.join(' ').toLowerCase();
          if (/^[xy\s-]+$/.test(nextText) || nextRow.filter(c => c.trim()).length <= 2) {
            dataStartRow++;
          }
        }
        break;
      }
    }
    
    // Si no encontramos nombre, usar primera columna
    if (nombreIdx === -1) nombreIdx = 0;
    
    // Procesar filas de datos
    for (let r = dataStartRow; r < allRows.length; r++) {
      const cells = allRows[r];
      
      // Verificar si es una fila de infraestructura válida
      if (!isInfrastructureRow(cells)) continue;
      
      // Extraer datos
      const nombre = (cells[nombreIdx] || cells[0] || '').trim();
      if (!nombre || nombre.length < 2) continue;
      
      const tipo = tipoIdx !== -1 ? (cells[tipoIdx] || '').trim() : '';
      const direccion = direccionIdx !== -1 ? (cells[direccionIdx] || '').trim() : '';
      
      // Coordenadas
      let rawX = xIdx !== -1 && xIdx < cells.length ? cells[xIdx] : '';
      let rawY = yIdx !== -1 && yIdx < cells.length ? cells[yIdx] : '';
      
      // Si no encontramos por índice, buscar valores numéricos UTM en la fila
      if (!rawX || !rawY) {
        for (let c = 0; c < cells.length; c++) {
          const cleaned = cleanCoordinateValue(cells[c]);
          if (!cleaned) continue;
          
          const num = parseFloat(cleaned);
          if (isNaN(num)) continue;
          
          if (!rawX && num >= 100000 && num <= 800000) {
            rawX = cleaned;
          } else if (!rawY && num >= 4000000 && num <= 4300000) {
            rawY = cleaned;
          }
        }
      }
      
      const cleanX = cleanCoordinateValue(rawX);
      const cleanY = cleanCoordinateValue(rawY);
      
      const hasValidX = isValidUTMValue(cleanX, 'x');
      const hasValidY = isValidUTMValue(cleanY, 'y');
      const hasCoords = hasValidX && hasValidY;
      
      // Detectar tipo de infraestructura
      const detectedType = tipo || detectInfrastructureType(tableName, nombre);
      
      // Crear infraestructura
      const infrastructure: ExtractedInfrastructure = {
        id: generateId(),
        tabla: tableName,
        nombre: nombre.substring(0, 150),
        tipo: detectedType,
        direccion: direccion.substring(0, 200),
        xOriginal: cleanX,
        yOriginal: cleanY,
        hasCoordinates: hasCoords,
        status: hasCoords ? 'original' : 'pending',
        municipio: detectedMunicipality,
        provincia: detectedProvince
      };
      
      infrastructures.push(infrastructure);
      
      // Estadísticas
      byTypology[detectedType] = (byTypology[detectedType] || 0) + 1;
      byTable[tableName] = (byTable[tableName] || 0) + 1;
      
      if (hasCoords) {
        withCoordinates++;
      } else {
        withoutCoordinates++;
      }
    }
  }
  
  const stats: ExtractionStats = {
    total: infrastructures.length,
    withCoordinates,
    withoutCoordinates,
    byTypology,
    byTable
  };
  
  return { infrastructures, stats };
}

/**
 * Extrae infraestructuras de un archivo Excel/ODS
 */
export async function extractFromSpreadsheet(
  file: File,
  municipality?: string,
  province?: string
): Promise<{ infrastructures: ExtractedInfrastructure[], stats: ExtractionStats }> {
  
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  const infrastructures: ExtractedInfrastructure[] = [];
  const byTypology: Record<string, number> = {};
  const byTable: Record<string, number> = {};
  let withCoordinates = 0;
  let withoutCoordinates = 0;
  
  const detectedMunicipality = municipality || detectMunicipality(file.name);
  const detectedProvince = province || detectProvince(detectedMunicipality);
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    if (data.length < 2) continue;
    
    // Buscar headers
    const headerRow = data[0].map(h => String(h || '').toLowerCase().trim());
    
    let nombreIdx = headerRow.findIndex(h => /nombre|denominación/.test(h));
    let tipoIdx = headerRow.findIndex(h => /^tipo/.test(h));
    let direccionIdx = headerRow.findIndex(h => /dirección|ubicación/.test(h));
    let xIdx = headerRow.findIndex(h => /^x$|x_?utm|longitud|este/.test(h));
    let yIdx = headerRow.findIndex(h => /^y$|y_?utm|latitud|norte/.test(h));
    
    if (nombreIdx === -1) nombreIdx = 0;
    
    // Procesar filas
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;
      
      const nombre = String(row[nombreIdx] || row[0] || '').trim();
      if (!nombre || nombre.length < 2) continue;
      
      const tipo = tipoIdx !== -1 ? String(row[tipoIdx] || '').trim() : '';
      const direccion = direccionIdx !== -1 ? String(row[direccionIdx] || '').trim() : '';
      
      let rawX = xIdx !== -1 ? String(row[xIdx] || '') : '';
      let rawY = yIdx !== -1 ? String(row[yIdx] || '') : '';
      
      const cleanX = cleanCoordinateValue(rawX);
      const cleanY = cleanCoordinateValue(rawY);
      
      const hasCoords = isValidUTMValue(cleanX, 'x') && isValidUTMValue(cleanY, 'y');
      const detectedType = tipo || detectInfrastructureType(sheetName, nombre);
      
      const infrastructure: ExtractedInfrastructure = {
        id: generateId(),
        tabla: sheetName,
        nombre: nombre.substring(0, 150),
        tipo: detectedType,
        direccion: direccion.substring(0, 200),
        xOriginal: cleanX,
        yOriginal: cleanY,
        hasCoordinates: hasCoords,
        status: hasCoords ? 'original' : 'pending',
        municipio: detectedMunicipality,
        provincia: detectedProvince
      };
      
      infrastructures.push(infrastructure);
      
      byTypology[detectedType] = (byTypology[detectedType] || 0) + 1;
      byTable[sheetName] = (byTable[sheetName] || 0) + 1;
      
      if (hasCoords) {
        withCoordinates++;
      } else {
        withoutCoordinates++;
      }
    }
  }
  
  return {
    infrastructures,
    stats: {
      total: infrastructures.length,
      withCoordinates,
      withoutCoordinates,
      byTypology,
      byTable
    }
  };
}

/**
 * Función principal de extracción - detecta tipo de archivo y extrae
 */
export async function extractInfrastructures(
  file: File,
  municipality?: string,
  province?: string
): Promise<{ 
  infrastructures: ExtractedInfrastructure[], 
  stats: ExtractionStats,
  metadata: DocumentMetadata 
}> {
  
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  let result: { infrastructures: ExtractedInfrastructure[], stats: ExtractionStats };
  
  switch (extension) {
    case 'odt':
      result = await extractFromODT(file, municipality, province);
      break;
    case 'xlsx':
    case 'xls':
    case 'ods':
      result = await extractFromSpreadsheet(file, municipality, province);
      break;
    default:
      throw new Error(`Formato no soportado para extracción completa: ${extension}`);
  }
  
  const detectedMunicipality = municipality || detectMunicipality(file.name);
  
  const metadata: DocumentMetadata = {
    fileName: file.name,
    fileType: extension || 'unknown',
    municipality: detectedMunicipality,
    province: province || detectProvince(detectedMunicipality),
    tablesProcessed: Object.keys(result.stats.byTable).length,
    processedAt: new Date()
  };
  
  return {
    ...result,
    metadata
  };
}
