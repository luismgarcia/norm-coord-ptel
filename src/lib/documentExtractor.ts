/**
 * Extractor de Infraestructuras PTEL v3.3
 * 
 * CHANGELOG v3.3 (30-Nov-2025):
 * - FIX: Integrada desconcatenación en extractFromODT y extractFromSpreadsheet
 * - FIX: Corrige texto concatenado como "FARMACIAM.ªCarmen" → "FARMACIA M.ª Carmen"
 * 
 * CHANGELOG v3.2 (28-Nov-2025):
 * - FIX: Mejorada detección de sub-headers con "Longitud/Latitud" (tablas Hornos)
 * - FIX: Eliminado falso positivo de "y" española en patrones coordY
 * - FIX: Ampliado límite de celdas no vacías para sub-headers de 3 a 4
 * 
 * Estrategia ESCALONADA para identificar infraestructuras:
 * 1. Detección por ESTRUCTURA de tabla (columnas Nombre/Dirección/Coordenadas)
 * 2. Lista blanca de SECCIONES conocidas PTEL
 * 3. Detección por CONTENIDO (patrones de infraestructura)
 * 
 * Extrae TANTO infraestructuras con coordenadas COMO sin coordenadas
 * para posterior geocodificación.
 * 
 * @module lib/documentExtractor
 */
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { ExtractedInfrastructure, ExtractionStats, DocumentMetadata, AddressType } from '../types/processing';
import { deconcatenateText } from './textDeconcatenator';

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

/** Resultado de análisis de estructura de tabla */
interface TableStructure {
  hasNameColumn: boolean;
  hasAddressColumn: boolean;
  hasCoordColumns: boolean;
  hasCoordsInHeader: boolean;
  nameColIdx: number;
  addressColIdx: number;
  typeColIdx: number;
  xColIdx: number;
  yColIdx: number;
  dataStartRow: number;
  confidence: number; // 0-100
}

/** 
 * Patrones para detectar columnas - v3.1 AMPLIADOS
 * 
 * CAMBIOS v3.1:
 * - Eliminados anchors ^...$ para permitir texto adicional
 * - Añadidos patrones para "X - Longitud", "y- Latitud"
 * - Soporte para headers con saltos de línea "Coordenadas\n(UTM)"
 * - Soporte para columnas __EMPTY adyacentes a coordenadas
 */
const COLUMN_PATTERNS = {
  // Nombres de infraestructura - permite texto adicional
  name: /\b(nombre|denominaci[oó]n|descripci[oó]n|elemento|infraestructura|instalaci[oó]n)\b/i,
  
  // Direcciones - permite texto adicional  
  address: /\b(direcci[oó]n|ubicaci[oó]n|localizaci[oó]n|domicilio|emplazamiento)\b/i,
  
  // Tipo/categoría
  type: /\b(tipo|tipolog[ií]a|categor[ií]a|clase|naturaleza)\b/i,
  
  // Coordenada X - AMPLIADO para "X - Longitud", "x-", "X_UTM", etc.
  // v3.2: Solo detectar "x" si está sola o en contexto de coordenadas
  coordX: /\b(longitud|este|easting)\b|coord[^y]*x|^x\s*[-_]|^x$/i,
  
  // Coordenada Y - v3.2: Evitar falso positivo con conjunción "y" española
  // Solo detectar "y" si está sola, seguida de guión, o es latitud/norte/northing
  coordY: /\b(latitud|norte|northing)\b|coord[^x]*y|^y\s*[-_]|^y$/i,
  
  // Coordenadas combinadas - "Coordenadas", "Coordenadas (UTM)", "Coordenadas\n(UTM- Geográficas)"
  coordCombined: /coordenadas?/i,
  
  // Propietario/titular
  owner: /\b(titular|propietario|entidad|organismo|responsable)\b/i,
};

/** Secciones PTEL conocidas que contienen infraestructuras */
const KNOWN_SECTIONS = [
  /patrimonio\s*(hist[oó]rico|cultural|natural)?/i,
  /elementos?\s*vulnerables?/i,
  /infraestructuras?\s*(cr[ií]ticas?|esenciales?)?/i,
  /servicios?\s*(esenciales?|b[aá]sicos?)/i,
  /centros?\s*(sanitarios?|educativos?|deportivos?)/i,
  /instalaciones?\s*(deportivas?|municipales?)/i,
  /recursos?\s*(municipales?|materiales?)/i,
  /medios?\s*(materiales?|humanos?)/i,
];

/** Patrones para clasificar tipo de dirección */
const ADDRESS_PATTERNS = {
  postal: /^(c\/|calle|avda?\.?|avenida|plaza|pza\.?|paseo|ctra\.?|carretera|camino|travesía|ronda|glorieta)\s/i,
  toponym: /^(paraje|cerro|cortijo|barranco|arroyo|fuente|era|cañada|llano|loma|monte|sierra|vega|haza)\s/i,
  cadastral: /^(pol[ií]gono|parcela|pol\.?\s*\d|parc\.?\s*\d|\d+[-\/]\d+)/i,
  sports: /(piscina|campo\s*(de\s*)?(f[uú]tbol|golf)|polideportivo|pabell[oó]n|gimnasio|pista)/i,
  telecom: /(antena|repetidor|torre\s*(de\s*)?comunicaci[oó]n|bts|estaci[oó]n\s*base)/i,
  road: /^(carretera|autov[ií]a|autopista|ctra\.?|[anc][-\s]?\d{1,4}|gr[-\s]?\d{3,4})/i,
};

// ============================================================================
// UTILIDADES
// ============================================================================

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
  if (/^(indicar|sin\s*datos?|-+|n\/?[ac]|\.+|_+|xxx?|completar)$/i.test(cleaned)) {
    return '';
  }
  
  // Eliminar comillas especiales
  cleaned = cleaned.replace(/[´`''""]+/g, '');
  
  // Espacios como separadores de miles: "437 686 30" → "437686.30"
  if (/^\d[\d\s]+\d$/.test(cleaned) && cleaned.includes(' ')) {
    const noSpaces = cleaned.replace(/\s/g, '');
    if (/^\d+$/.test(noSpaces) && noSpaces.length > 6) {
      cleaned = noSpaces.slice(0, -2) + '.' + noSpaces.slice(-2);
    } else {
      cleaned = noSpaces;
    }
  }
  
  // Puntos como separadores de miles (ej: "524.891" → "524891", "4.230.105" → "4230105")
  const dotCount = (cleaned.match(/\./g) || []).length;
  if (dotCount > 1) {
    // Múltiples puntos = claramente separadores de miles (ej: 4.230.105)
    cleaned = cleaned.replace(/\./g, '');
  } else if (dotCount === 1) {
    const parts = cleaned.split('.');
    // Si la parte después del punto tiene exactamente 3 dígitos, es separador de miles
    // Ejemplos: "524.891" → "524891", "4230.105" → "4230105"
    // PERO NO: "437301.8" (decimal legítimo con 1 dígito)
    if (parts[1]?.length === 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
      // Verificar que el resultado sería una coordenada válida
      const combined = parseInt(parts[0] + parts[1]);
      // Para X: debe ser 100000-800000 (6 dígitos que empiezan con 1-8)
      // Para Y: debe ser 3980000-4320000 (7 dígitos que empiezan con 39-43)
      const isValidX = combined >= 100000 && combined <= 800000;
      const isValidY = combined >= 3980000 && combined <= 4320000;
      if (isValidX || isValidY) {
        cleaned = cleaned.replace('.', '');
      }
    }
  }
  
  // Coma por punto decimal
  cleaned = cleaned.replace(',', '.');
  
  // Limpiar espacios
  cleaned = cleaned.replace(/\s/g, '');
  
  return cleaned;
}

/**
 * Verifica si un valor es una coordenada UTM válida para Andalucía
 */
export function isValidUTMValue(val: string, type: 'x' | 'y'): boolean {
  const num = parseFloat(val);
  if (isNaN(num) || num === 0) return false;
  
  if (type === 'x') {
    return num >= 100000 && num <= 800000;
  } else {
    return num >= 4000000 && num <= 4350000;
  }
}

/**
 * Detecta municipio del nombre del archivo
 */
export function detectMunicipality(fileName: string): string | undefined {
  const patterns = [
    /PTEL[_\s]+(?:Ayto?\.?\s*)?([A-Za-záéíóúñÁÉÍÓÚÑ]+)/i,
    /Ficha[_\s]+(?:Plantilla[_\s]+)?PTEL[_\s]+(?:Ayto?\.?\s*)?([A-Za-záéíóúñÁÉÍÓÚÑ]+)/i,
    /([A-Za-záéíóúñÁÉÍÓÚÑ]+)[_\s]+PTEL/i
  ];
  
  for (const pattern of patterns) {
    const match = fileName.match(pattern);
    if (match?.[1]) {
      const name = match[1].replace(/_/g, ' ');
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
  }
  return undefined;
}

/**
 * Detecta provincia basándose en el municipio
 */
export function detectProvince(municipality?: string): string {
  if (!municipality) return 'Granada';
  
  const municipiosPorProvincia: Record<string, string[]> = {
    'Granada': ['colomera', 'granada', 'motril', 'baza', 'guadix', 'loja', 'almuñécar', 'quéntar', 'quentar', 'castril'],
    'Almería': ['almería', 'almeria', 'roquetas', 'ejido', 'níjar', 'berja', 'adra', 'garrucha', 'tijola'],
    'Jaén': ['jaén', 'jaen', 'linares', 'úbeda', 'baeza', 'andújar', 'hornos'],
    'Málaga': ['málaga', 'malaga', 'marbella', 'fuengirola', 'torremolinos', 'ronda'],
    'Sevilla': ['sevilla', 'dos hermanas', 'alcalá', 'utrera', 'écija'],
    'Córdoba': ['córdoba', 'cordoba', 'lucena', 'puente genil', 'montilla'],
    'Cádiz': ['cádiz', 'cadiz', 'jerez', 'algeciras', 'san fernando'],
    'Huelva': ['huelva', 'lepe', 'almonte', 'moguer', 'ayamonte'],
  };
  
  const muni = municipality.toLowerCase();
  for (const [provincia, municipios] of Object.entries(municipiosPorProvincia)) {
    if (municipios.some(m => muni.includes(m))) {
      return provincia;
    }
  }
  
  return 'Granada';
}

/**
 * Clasifica el tipo de dirección para determinar estrategia de geocodificación
 */
export function classifyAddressType(address: string, name: string): AddressType {
  const combined = `${name} ${address}`.toLowerCase();
  
  // Orden importa: más específico primero
  if (ADDRESS_PATTERNS.telecom.test(combined)) return 'telecom';
  if (ADDRESS_PATTERNS.sports.test(combined)) return 'sports';
  if (ADDRESS_PATTERNS.road.test(name)) return 'road';
  if (ADDRESS_PATTERNS.cadastral.test(address)) return 'cadastral';
  if (ADDRESS_PATTERNS.toponym.test(address)) return 'toponym';
  if (ADDRESS_PATTERNS.postal.test(address)) return 'postal';
  
  // Si tiene número de portal, probablemente es postal
  if (/,?\s*\d+\s*$/.test(address) || /n[ºo°]?\s*\d+/i.test(address)) return 'postal';
  
  // Si tiene nombre de calle común
  if (/s\/n|sin\s*n[úu]mero/i.test(address)) return 'postal';
  
  return 'unknown';
}

/**
 * Detecta el tipo de infraestructura desde nombre y contexto
 */
function detectInfrastructureType(name: string, type: string, tableName: string): string {
  const combined = `${name} ${type} ${tableName}`.toLowerCase();
  
  if (/patrimonio|hist[oó]rico|cultural|monumento|iglesia|ermita|museo|castillo|torre|puente/i.test(combined)) return 'PATRIMONIO';
  if (/sanita|salud|m[eé]dico|consultorio|hospital|ambulatorio|farmacia|centro\s*de\s*salud/i.test(combined)) return 'SANITARIO';
  if (/educa|enseñanza|colegio|instituto|escuela|ceip|ies|guarder[ií]a|infantil/i.test(combined)) return 'EDUCATIVO';
  if (/seguridad|polic[ií]a|guardia\s*civil|bomberos|protecci[oó]n\s*civil/i.test(combined)) return 'SEGURIDAD';
  if (/telecom|antena|repetidor|comunicaci[oó]n|telef[oó]nica|movistar|vodafone|orange/i.test(combined)) return 'TELECOMUNICACIONES';
  if (/deport|piscina|polideportivo|campo|pabell[oó]n|gimnasio|pista/i.test(combined)) return 'DEPORTIVO';
  if (/hidr[aá]ulic|agua|dep[oó]sito|embalse|edar|depuradora|potabilizadora/i.test(combined)) return 'HIDRAULICO';
  if (/energ[ií]a|el[eé]ctric|subestaci[oó]n|transformador|endesa|iberdrola/i.test(combined)) return 'ENERGIA';
  if (/municipal|ayuntamiento|administrativo|casa\s*consist/i.test(combined)) return 'MUNICIPAL';
  if (/vial|carretera|camino|acceso|autopista|autov[ií]a/i.test(combined)) return 'VIAL';
  if (/recreativ|parque|[aá]rea\s*recreativa|jard[ií]n/i.test(combined)) return 'RECREATIVO';
  
  return 'OTRO';
}

// ============================================================================
// EXTRACCIÓN DE CELDAS ODT
// ============================================================================

function getRowCells(row: Element, ns: string): string[] {
  const cells = row.getElementsByTagNameNS(ns, 'table-cell');
  const result: string[] = [];
  
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const repeatAttr = cell.getAttribute('table:number-columns-repeated');
    const repeatCount = repeatAttr ? parseInt(repeatAttr, 10) : 1;
    const text = cell.textContent?.trim() || '';
    
    // Limitar repeticiones para evitar arrays enormes
    const effectiveRepeat = Math.min(repeatCount, text ? 15 : 2);
    for (let r = 0; r < effectiveRepeat; r++) {
      result.push(text);
    }
  }
  
  return result;
}

// ============================================================================
// ANÁLISIS DE ESTRUCTURA DE TABLA
// ============================================================================

/**
 * Analiza la estructura de una tabla para determinar si contiene infraestructuras
 */
function analyzeTableStructure(rows: string[][]): TableStructure {
  const result: TableStructure = {
    hasNameColumn: false,
    hasAddressColumn: false,
    hasCoordColumns: false,
    hasCoordsInHeader: false,
    nameColIdx: -1,
    addressColIdx: -1,
    typeColIdx: -1,
    xColIdx: -1,
    yColIdx: -1,
    dataStartRow: 1,
    confidence: 0,
  };
  
  if (rows.length < 2) return result;
  
  // Analizar primeras 3 filas como posibles headers
  for (let headerRow = 0; headerRow < Math.min(3, rows.length); headerRow++) {
    const cells = rows[headerRow];
    
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i].toLowerCase().trim();
      if (!cell) continue;
      
      // Detectar columnas por patrón
      if (result.nameColIdx === -1 && COLUMN_PATTERNS.name.test(cell)) {
        result.nameColIdx = i;
        result.hasNameColumn = true;
      }
      if (result.addressColIdx === -1 && COLUMN_PATTERNS.address.test(cell)) {
        result.addressColIdx = i;
        result.hasAddressColumn = true;
      }
      if (result.typeColIdx === -1 && COLUMN_PATTERNS.type.test(cell)) {
        result.typeColIdx = i;
      }
      if (result.xColIdx === -1 && COLUMN_PATTERNS.coordX.test(cell)) {
        result.xColIdx = i;
        result.hasCoordColumns = true;
      }
      if (result.yColIdx === -1 && COLUMN_PATTERNS.coordY.test(cell)) {
        result.yColIdx = i;
        result.hasCoordColumns = true;
      }
      // Columna combinada "Coordenadas"
      if (COLUMN_PATTERNS.coordCombined.test(cell)) {
        result.hasCoordsInHeader = true;
        if (result.xColIdx === -1) result.xColIdx = i;
        if (result.yColIdx === -1) result.yColIdx = i + 1;
        result.hasCoordColumns = true;
      }
    }
    
    // Si encontramos estructura, los datos empiezan después
    if (result.hasNameColumn || result.hasAddressColumn || result.hasCoordColumns) {
      result.dataStartRow = headerRow + 1;
      
      // Verificar si siguiente fila es sub-header de coordenadas (X/Y, Longitud/Latitud)
      // v3.2: Mejorado para detectar sub-headers con texto adicional
      if (result.dataStartRow < rows.length) {
        const nextRow = rows[result.dataStartRow];
        const nonEmptyCells = nextRow.filter(c => c.trim());
        const nextText = nonEmptyCells.join(' ').toLowerCase().trim();
        
        // Detectar sub-header si:
        // 1. Solo contiene X, Y, espacios, guiones
        // 2. O tiene ≤4 celdas no vacías y contiene X e Y (incluyendo "X - Longitud", "y- Latitud")
        // 3. O contiene palabras clave de coordenadas como "longitud", "latitud", "utm"
        const isCoordSubHeader = 
          /^[xy\s\-_]+$/i.test(nextText) || 
          (nonEmptyCells.length <= 4 && /\bx\b.*\by\b/i.test(nextText)) ||
          (nonEmptyCells.length <= 4 && /(longitud|latitud|utm)/i.test(nextText));
        
        if (isCoordSubHeader) {
          // Es sub-header, buscar índices X/Y aquí usando patrones más flexibles
          for (let i = 0; i < nextRow.length; i++) {
            const c = nextRow[i].toLowerCase().trim();
            if (!c) continue;
            // Detectar X: "x", "x-", "x - longitud", "longitud", etc.
            if (result.xColIdx === -1 && (c === 'x' || /^x\s*[-_]/.test(c) || /\blongitud\b/.test(c) || /\beste\b/.test(c))) {
              result.xColIdx = i;
            }
            // Detectar Y: "y", "y-", "y - latitud", "latitud", etc.
            if (result.yColIdx === -1 && (c === 'y' || /^y\s*[-_]/.test(c) || /\blatitud\b/.test(c) || /\bnorte\b/.test(c))) {
              result.yColIdx = i;
            }
          }
          result.dataStartRow++;
        }
      }
      break;
    }
  }
  
  // Si no encontramos nombre por header, usar primera columna
  if (result.nameColIdx === -1 && rows[0]?.length > 0) {
    result.nameColIdx = 0;
  }
  
  // Calcular confianza
  let confidence = 0;
  if (result.hasNameColumn) confidence += 30;
  if (result.hasAddressColumn) confidence += 30;
  if (result.hasCoordColumns) confidence += 40;
  result.confidence = confidence;
  
  return result;
}

/**
 * Verifica si una fila contiene datos de infraestructura válidos
 */
function isValidInfrastructureRow(cells: string[], structure: TableStructure): boolean {
  // Debe tener un nombre válido
  const nameIdx = structure.nameColIdx >= 0 ? structure.nameColIdx : 0;
  const name = cells[nameIdx]?.trim() || '';
  
  // Filtrar nombres vacíos o muy cortos
  if (name.length < 3) return false;
  
  // Filtrar headers y sub-headers de coordenadas
  if (COLUMN_PATTERNS.name.test(name) || COLUMN_PATTERNS.address.test(name)) return false;
  if (/^[xy][-_\s]*(longitud|latitud|utm|coord)?$/i.test(name)) return false;
  if (/^(longitud|latitud|este|norte|easting|northing)$/i.test(name)) return false;
  
  // Filtrar placeholders
  if (/^(indicar|completar|rellenar|ejemplo|muestra|-+|\.+|_+|n\/a|sin\s*datos?)$/i.test(name)) return false;
  
  // Filtrar textos que son claramente descripciones de riesgos
  if (/^(movimiento|incendio|accidente|inundaci|sequ[ií]a|terremoto|epidemia|tipolog[ií]a)s?\s/i.test(name)) return false;
  
  // Filtrar nombres de personas (Nombre Apellido Apellido)
  if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(name)) return false;
  
  // Filtrar textos tipo "AFORO: X PERSONAS" que son recursos, no infraestructuras
  if (/AFORO:\s*\d+\s*PERSONAS?/i.test(name)) return false;
  
  // Filtrar textos genéricos sin valor
  if (/^(no existe|suplente|pendiente|sin\s*(constancia|determinar)|otros?)$/i.test(name)) return false;
  
  // Debe tener algo más que solo el nombre
  const nonEmptyCells = cells.filter(c => c.trim() && c.trim().length > 1);
  if (nonEmptyCells.length < 2) return false;
  
  return true;
}

// ============================================================================
// EXTRACTOR PRINCIPAL ODT
// ============================================================================

/**
 * Extrae infraestructuras de un documento ODT usando estrategia escalonada
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
  
  const detectedMunicipality = municipality || detectMunicipality(file.name);
  const detectedProvince = province || detectProvince(detectedMunicipality);
  
  // Procesar cada tabla
  for (let t = 0; t < tables.length; t++) {
    const table = tables[t];
    const tableName = table.getAttribute('table:name') || `Tabla${t + 1}`;
    const tableRows = table.getElementsByTagNameNS(tableNS, 'table-row');
    
    if (tableRows.length < 2) continue;
    
    // Convertir filas a arrays de celdas
    const allRows: string[][] = [];
    for (let r = 0; r < tableRows.length; r++) {
      allRows.push(getRowCells(tableRows[r], tableNS));
    }
    
    // PASO 1: Analizar estructura de la tabla
    const structure = analyzeTableStructure(allRows);
    
    // Solo procesar tablas con estructura de infraestructura (confianza >= 50)
    // O que contengan coordenadas UTM válidas
    const hasUTMCoords = allRows.some(row => 
      row.some(cell => {
        const cleaned = cleanCoordinateValue(cell);
        return isValidUTMValue(cleaned, 'y'); // Y es más distintivo
      })
    );
    
    // Filtrar tablas que son claramente de personal/contactos
    const tableText = allRows.slice(0, 5).flat().join(' ').toLowerCase();
    const isPersonnelTable = /cargo|tel[eé]fono\s*(de)?\s*contacto|disponibilidad|suplente|titular|responsable/.test(tableText)
      && !/coordenada|utm|direcci[oó]n|ubicaci[oó]n/.test(tableText);
    
    if (isPersonnelTable) continue;
    
    // Requerir confianza mínima de 50 (Nombre+Dirección o Nombre+Coordenadas)
    // O presencia de coordenadas UTM válidas
    if (structure.confidence < 50 && !hasUTMCoords) continue;
    
    // PASO 2: Si no detectamos estructura pero hay coords, buscar por valores
    if (!structure.hasCoordColumns && hasUTMCoords) {
      // Buscar columnas por valores numéricos
      for (let r = structure.dataStartRow; r < Math.min(allRows.length, structure.dataStartRow + 3); r++) {
        const row = allRows[r];
        for (let c = 0; c < row.length; c++) {
          const cleaned = cleanCoordinateValue(row[c]);
          if (isValidUTMValue(cleaned, 'x') && structure.xColIdx === -1) {
            structure.xColIdx = c;
          } else if (isValidUTMValue(cleaned, 'y') && structure.yColIdx === -1) {
            structure.yColIdx = c;
          }
        }
        if (structure.xColIdx !== -1 && structure.yColIdx !== -1) break;
      }
      structure.hasCoordColumns = structure.xColIdx !== -1 || structure.yColIdx !== -1;
    }
    
    // PASO 3: Extraer infraestructuras
    for (let r = structure.dataStartRow; r < allRows.length; r++) {
      const cells = allRows[r];
      
      if (!isValidInfrastructureRow(cells, structure)) continue;
      
      // Extraer campos con desconcatenación
      const nombreRaw = (cells[structure.nameColIdx] || cells[0] || '').trim();
      const direccionRaw = structure.addressColIdx >= 0 ? (cells[structure.addressColIdx] || '').trim() : '';
      const tipoRaw = structure.typeColIdx >= 0 ? (cells[structure.typeColIdx] || '').trim() : '';
      
      const nombre = deconcatenateText(nombreRaw).corrected;
      const direccion = deconcatenateText(direccionRaw).corrected;
      const tipo = deconcatenateText(tipoRaw).corrected;
      
      // Coordenadas
      let rawX = structure.xColIdx >= 0 && structure.xColIdx < cells.length ? cells[structure.xColIdx] : '';
      let rawY = structure.yColIdx >= 0 && structure.yColIdx < cells.length ? cells[structure.yColIdx] : '';
      
      const cleanX = cleanCoordinateValue(rawX);
      const cleanY = cleanCoordinateValue(rawY);
      
      const hasValidX = isValidUTMValue(cleanX, 'x');
      const hasValidY = isValidUTMValue(cleanY, 'y');
      const hasCoords = hasValidX && hasValidY;
      
      // Clasificar tipo de dirección para geocodificación
      const addressType = classifyAddressType(direccion, nombre);
      
      // Detectar tipo de infraestructura
      const detectedType = tipo || detectInfrastructureType(nombre, tipo, tableName);
      
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
        provincia: detectedProvince,
        addressType,
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

// ============================================================================
// EXTRACTOR SPREADSHEET
// ============================================================================

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
    
    // Convertir a strings
    const rows: string[][] = data.map(row => 
      (row || []).map(cell => String(cell ?? '').trim())
    );
    
    const structure = analyzeTableStructure(rows);
    
    // Procesar filas
    for (let r = structure.dataStartRow; r < rows.length; r++) {
      const cells = rows[r];
      if (!isValidInfrastructureRow(cells, structure)) continue;
      
      // Extraer campos con desconcatenación (igual que ODT)
      const nombreRaw = (cells[structure.nameColIdx] || cells[0] || '').trim();
      const direccionRaw = structure.addressColIdx >= 0 ? (cells[structure.addressColIdx] || '').trim() : '';
      const tipoRaw = structure.typeColIdx >= 0 ? (cells[structure.typeColIdx] || '').trim() : '';
      
      const nombre = deconcatenateText(nombreRaw).corrected;
      const direccion = deconcatenateText(direccionRaw).corrected;
      const tipo = deconcatenateText(tipoRaw).corrected;
      
      let rawX = structure.xColIdx >= 0 ? cells[structure.xColIdx] : '';
      let rawY = structure.yColIdx >= 0 ? cells[structure.yColIdx] : '';
      
      const cleanX = cleanCoordinateValue(rawX);
      const cleanY = cleanCoordinateValue(rawY);
      
      const hasCoords = isValidUTMValue(cleanX, 'x') && isValidUTMValue(cleanY, 'y');
      const addressType = classifyAddressType(direccion, nombre);
      const detectedType = tipo || detectInfrastructureType(nombre, tipo, sheetName);
      
      infrastructures.push({
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
        provincia: detectedProvince,
        addressType,
      });
      
      byTypology[detectedType] = (byTypology[detectedType] || 0) + 1;
      byTable[sheetName] = (byTable[sheetName] || 0) + 1;
      
      if (hasCoords) withCoordinates++;
      else withoutCoordinates++;
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

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

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
      throw new Error(`Formato no soportado: ${extension}. Use ODT, XLSX, XLS u ODS.`);
  }
  
  const detectedMunicipality = municipality || detectMunicipality(file.name);
  
  return {
    ...result,
    metadata: {
      fileName: file.name,
      fileType: extension || 'unknown',
      municipality: detectedMunicipality,
      province: province || detectProvince(detectedMunicipality),
      tablesProcessed: Object.keys(result.stats.byTable).length,
      processedAt: new Date()
    }
  };
}
