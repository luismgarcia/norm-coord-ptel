/**
 * PTEL Coordinate Normalizer v4.0
 * 
 * Sistema de normalización de coordenadas para documentos PTEL Andalucía.
 * Implementa pipeline de 12 fases con cobertura completa de 52 patrones.
 * 
 * NOVEDADES v4.0:
 * - Fase 9: Parser DMS sexagesimales (8 variantes)
 * - Fase 10: Parser NMEA GPS (4 variantes)
 * - Fase 11: Parser WKT/GeoJSON
 * - Fase 12: Detección coordenadas pegadas
 * - Detección ED50 con transformación proj4
 * - Patrones Berja: DOUBLE_DOT, SPANISH_FORMAT
 * 
 * @author PTEL Development Team
 * @version 4.0.0
 * @license MIT
 */

import proj4 from 'proj4';

// ============================================================================
// CONFIGURACIÓN PROJ4 - SISTEMAS DE REFERENCIA
// ============================================================================

// Definir sistemas de coordenadas
proj4.defs('EPSG:25830', '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'); // ETRS89 UTM30
proj4.defs('EPSG:23030', '+proj=utm +zone=30 +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs'); // ED50 UTM30
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs'); // WGS84 geográficas
proj4.defs('EPSG:4258', '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs'); // ETRS89 geográficas

// ============================================================================
// TIPOS Y INTERFACES
// ============================================================================

export interface CoordinateInput {
  x: string | number;
  y: string | number;
  municipality?: string;
  province?: Province;
  documentYear?: number; // Para detección ED50
  rawText?: string; // Para detectar formatos compuestos (WKT, GeoJSON, DMS)
}

export interface NormalizationResult {
  x: number | null;
  y: number | null;
  original: { x: string | number; y: string | number };
  corrections: Correction[];
  flags: Flag[];
  score: number;
  confidence: ConfidenceLevel;
  isValid: boolean;
  heuristicApplied?: HeuristicResult;
  sourceFormat?: SourceFormat;
  sourceCRS?: string;
}

export interface Correction {
  type: CorrectionType;
  field: 'x' | 'y' | 'both';
  from: string;
  to: string;
  pattern: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

export interface Flag {
  type: FlagType;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface HeuristicResult {
  originalValue: string;
  correctedValue: number;
  hypothesis: string;
  confidence: number;
  field: 'x' | 'y';
  method: string;
}

export interface DMSCoordinate {
  degrees: number;
  minutes: number;
  seconds: number;
  direction: 'N' | 'S' | 'E' | 'W';
}

export interface ParsedCoordinate {
  x: number;
  y: number;
  format: SourceFormat;
  crs?: string;
}

export type Province = 
  | 'Almería' | 'Cádiz' | 'Córdoba' | 'Granada' 
  | 'Huelva' | 'Jaén' | 'Málaga' | 'Sevilla';

export type ConfidenceLevel = 'CRITICAL' | 'LOW' | 'MEDIUM' | 'HIGH';

export type CorrectionType = 
  | 'Y_TRUNCATED' | 'X_TRUNCATED' | 'XY_SWAPPED' | 'PLACEHOLDER_DETECTED' 
  | 'ENCODING_FIXED' | 'SEPARATOR_FIXED' | 'THOUSANDS_REMOVED' | 'DECIMAL_FIXED' 
  | 'WHITESPACE_CLEANED' | 'KM_TO_METERS' | 'HEURISTIC_RESCUE'
  | 'DMS_CONVERTED' | 'NMEA_CONVERTED' | 'WKT_PARSED' | 'GEOJSON_PARSED'
  | 'COORDS_SEPARATED' | 'ED50_TRANSFORMED' | 'WGS84_TO_UTM';

export type FlagType = 
  | 'OUT_OF_RANGE' | 'MISSING_DECIMALS' | 'SUSPICIOUS_VALUE' 
  | 'GEOCODING_NEEDED' | 'MANUAL_REVIEW' | 'HEURISTIC_APPLIED'
  | 'ED50_DETECTED' | 'GEOGRAPHIC_COORDS' | 'FORMAT_DETECTED';

export type SourceFormat = 
  | 'UTM' | 'DMS' | 'DD' | 'NMEA' | 'WKT' | 'GEOJSON' | 'PEGADA' | 'UNKNOWN';

// ============================================================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================================================

/** Rangos válidos para coordenadas UTM30 en Andalucía */
export const ANDALUSIA_BOUNDS = {
  x: { min: 100_000, max: 800_000 },
  y: { min: 3_980_000, max: 4_320_000 }
};

/** Rangos para coordenadas geográficas en Andalucía */
export const ANDALUSIA_GEOGRAPHIC_BOUNDS = {
  lat: { min: 36.0, max: 38.75 },
  lon: { min: -7.55, max: -1.60 }
};

/** Prefijos Y típicos por provincia */
export const PROVINCE_Y_PREFIXES: Record<Province, string[]> = {
  'Almería': ['40', '41'],
  'Cádiz': ['40', '41'],
  'Córdoba': ['41', '42'],
  'Granada': ['40', '41'],
  'Huelva': ['41', '42'],
  'Jaén': ['41', '42', '42'],
  'Málaga': ['40', '41'],
  'Sevilla': ['41', '42']
};

/** Patrones de placeholder que indican "sin datos" */
const PLACEHOLDER_PATTERNS = [
  /^[Nn]\/[DdAa]$/,
  /^[Nn][Dd]$/,
  /^[Nn][Aa]$/,
  /^[Ss]in\s*datos?$/i,
  /^[Ii]ndicar$/,
  /^[Pp]endiente$/,
  /^[Nn][Oo]$/i,
  /^[-_]+$/,
  /^[Xx]+$/,
  /^0+(\.0+)?$/,
  /^9{4,}$/,
  /^\s*$/
];

/** 
 * Patrones de corrección UTF-8 (mojibake)
 */
const MOJIBAKE_PATTERNS: [RegExp, string][] = [
  [/Ã³/g, 'ó'], [/Ã¡/g, 'á'], [/Ã©/g, 'é'], [/Ã­/g, 'í'], [/Ãº/g, 'ú'],
  [/Ã"/g, 'Ó'], [/Ã/g, 'Á'], [/Ã‰/g, 'É'], [/Ã/g, 'Í'], [/Ãš/g, 'Ú'],
  [/Ã±/g, 'ñ'], [/Ã'/g, 'Ñ'],
  [/Ã¼/g, 'ü'], [/Ãœ/g, 'Ü'],
  [/Â¿/g, '¿'], [/Â¡/g, '¡'], [/â‚¬/g, '€'],
  [/â€œ/g, '"'], [/â€/g, '"'], [/â€™/g, "'"], [/â€"/g, '–'], [/â€"/g, '—'],
  [/Â/g, ''], [/\u00A0/g, ' ']
];

/**
 * Patrones de separadores numéricos corruptos
 * v4.0: Incluye TODOS los patrones de la taxonomía
 */
const SEPARATOR_PATTERNS: [RegExp, string, string][] = [
  // P0: Doble punto → punto simple (error tipográfico)
  [/(\d+)\.\.(\d+)/g, '$1.$2', 'DOUBLE_DOT'],
  
  // P1: Tildes como separador decimal (muy común en Almería)
  [/(\d+)\s*´´\s*(\d+)/g, '$1.$2', 'DOUBLE_TILDE'],
  [/(\d+)\s*´\s*(\d+)/g, '$1.$2', 'SINGLE_TILDE'],
  [/(\d+)\s*['`']\s*(\d+)/g, '$1.$2', 'QUOTE_DECIMAL'],
  
  // P2: Formato español LARGO (punto miles, coma decimal): 4.077.905,68 → 4077905.68
  [/(\d{1,3})\.(\d{3})\.(\d{3}),(\d+)/g, '$1$2$3.$4', 'SPANISH_LONG'],
  
  // P3: Formato español CORTO (punto miles, coma decimal): 504.352,98 → 504352.98
  [/(\d{3})\.(\d{3}),(\d+)/g, '$1$2.$3', 'SPANISH_SHORT'],
  
  // P4: Espacios como separador de miles
  [/(\d{1,3})\s+(\d{3})\s+(\d{3})[,.]?(\d*)/g, '$1$2$3.$4', 'SPACE_THOUSANDS_3'],
  [/(\d{1,3})\s+(\d{3})[,.]?(\d*)/g, '$1$2.$3', 'SPACE_THOUSANDS_2'],
  
  // P5: Punto como separador de miles SIN coma
  [/(\d{1,3})\.(\d{3})\.(\d{3})$/g, '$1$2$3', 'DOT_THOUSANDS_3_NODEC'],
  [/(\d{1,3})\.(\d{3})$/g, '$1$2', 'DOT_THOUSANDS_2_NODEC'],
  
  // P6: Coma decimal final
  [/(\d+),(\d+)/g, '$1.$2', 'COMMA_DECIMAL'],
];

// ============================================================================
// PARSERS DE FORMATOS ESPECIALES
// ============================================================================

/**
 * NUEVO v4.0: Parser DMS (Grados, Minutos, Segundos) - 8 variantes
 * 
 * C1: 40°26'46.5"N (símbolos correctos)
 * C2: 40º26'46"N (ordinal español)
 * C3: 40 26 46 N (espacios)
 * C4: 40-26-46.5 (guiones)
 * C5: 402646N (compacto)
 * C6: 40°26'46.5\" (escape)
 * C7: 40°26.775' (minutos decimales)
 * C8: 40.446194° (grados decimales)
 */
export function parseDMS(value: string): { decimal: number; direction: string } | null {
  const v = value.trim();
  
  // C8: Grados decimales: 40.446194° o -3.605°
  const ddMatch = v.match(/^(-?\d{1,3}\.\d+)[°º]?\s*([NSEW])?$/i);
  if (ddMatch) {
    let decimal = parseFloat(ddMatch[1]);
    const dir = ddMatch[2]?.toUpperCase() || '';
    if (dir === 'S' || dir === 'W') decimal = -Math.abs(decimal);
    return { decimal, direction: dir };
  }
  
  // C7: Minutos decimales: 40°26.775' o 40º26.775'
  const dmMatch = v.match(/^(-?\d{1,3})[°º]\s*(\d{1,2}\.\d+)[''′]\s*([NSEW])?$/i);
  if (dmMatch) {
    const deg = parseFloat(dmMatch[1]);
    const min = parseFloat(dmMatch[2]);
    const dir = dmMatch[3]?.toUpperCase() || '';
    let decimal = Math.abs(deg) + (min / 60);
    if (deg < 0 || dir === 'S' || dir === 'W') decimal = -decimal;
    return { decimal, direction: dir };
  }
  
  // C1/C2/C6: DMS con símbolos: 40°26'46.5"N, 40º26'46"N, 40°26'46.5\"
  const dmsSymbolMatch = v.match(/^(-?\d{1,3})[°º]\s*(\d{1,2})[''′]\s*(\d{1,2}(?:\.\d+)?)[""″\\"]?\s*([NSEW])?$/i);
  if (dmsSymbolMatch) {
    const deg = parseFloat(dmsSymbolMatch[1]);
    const min = parseFloat(dmsSymbolMatch[2]);
    const sec = parseFloat(dmsSymbolMatch[3]);
    const dir = dmsSymbolMatch[4]?.toUpperCase() || '';
    let decimal = Math.abs(deg) + (min / 60) + (sec / 3600);
    if (deg < 0 || dir === 'S' || dir === 'W') decimal = -decimal;
    return { decimal, direction: dir };
  }
  
  // C3: DMS con espacios: 40 26 46 N o 40 26 46.5 N
  const dmsSpaceMatch = v.match(/^(-?\d{1,3})\s+(\d{1,2})\s+(\d{1,2}(?:\.\d+)?)\s*([NSEW])?$/i);
  if (dmsSpaceMatch) {
    const deg = parseFloat(dmsSpaceMatch[1]);
    const min = parseFloat(dmsSpaceMatch[2]);
    const sec = parseFloat(dmsSpaceMatch[3]);
    const dir = dmsSpaceMatch[4]?.toUpperCase() || '';
    let decimal = Math.abs(deg) + (min / 60) + (sec / 3600);
    if (deg < 0 || dir === 'S' || dir === 'W') decimal = -decimal;
    return { decimal, direction: dir };
  }
  
  // C4: DMS con guiones: 40-26-46.5 o 40-26-46
  const dmsHyphenMatch = v.match(/^(-?\d{1,3})-(\d{1,2})-(\d{1,2}(?:\.\d+)?)\s*([NSEW])?$/i);
  if (dmsHyphenMatch) {
    const deg = parseFloat(dmsHyphenMatch[1]);
    const min = parseFloat(dmsHyphenMatch[2]);
    const sec = parseFloat(dmsHyphenMatch[3]);
    const dir = dmsHyphenMatch[4]?.toUpperCase() || '';
    let decimal = Math.abs(deg) + (min / 60) + (sec / 3600);
    if (deg < 0 || dir === 'S' || dir === 'W') decimal = -decimal;
    return { decimal, direction: dir };
  }
  
  // C5: DMS compacto: 402646N (DDMMSS)
  const dmsCompactMatch = v.match(/^(\d{2})(\d{2})(\d{2})([NSEW])$/i);
  if (dmsCompactMatch) {
    const deg = parseFloat(dmsCompactMatch[1]);
    const min = parseFloat(dmsCompactMatch[2]);
    const sec = parseFloat(dmsCompactMatch[3]);
    const dir = dmsCompactMatch[4].toUpperCase();
    let decimal = deg + (min / 60) + (sec / 3600);
    if (dir === 'S' || dir === 'W') decimal = -decimal;
    return { decimal, direction: dir };
  }
  
  return null;
}

/**
 * NUEVO v4.0: Parser NMEA GPS - 4 variantes
 * 
 * D1: 3723.383,N (latitud NMEA)
 * D2: 00559.533,W (longitud NMEA)
 * D3: 3723.383N (sin coma)
 * D4: $GPGGA sentencia (extracción)
 */
export function parseNMEA(value: string): number | null {
  const v = value.trim();
  
  // D4: Sentencia GPGGA completa
  if (v.startsWith('$GPGGA')) {
    const parts = v.split(',');
    if (parts.length >= 5) {
      const lat = parseNMEACoord(parts[2], parts[3]);
      const lon = parseNMEACoord(parts[4], parts[5]);
      // Retornar latitud por defecto, pero idealmente se procesarían ambas
      return lat;
    }
  }
  
  // D1/D2/D3: Coordenada NMEA individual
  // Formato: DDDMM.MMM,D o DDDMM.MMMD
  const nmeaMatch = v.match(/^(\d{2,3})(\d{2}\.\d+),?\s*([NSEW])$/i);
  if (nmeaMatch) {
    const degrees = parseFloat(nmeaMatch[1]);
    const minutes = parseFloat(nmeaMatch[2]);
    const direction = nmeaMatch[3].toUpperCase();
    
    let decimal = degrees + (minutes / 60);
    if (direction === 'S' || direction === 'W') decimal = -decimal;
    
    return decimal;
  }
  
  return null;
}

function parseNMEACoord(coord: string, direction: string): number | null {
  if (!coord || !direction) return null;
  
  const match = coord.match(/^(\d{2,3})(\d{2}\.\d+)$/);
  if (!match) return null;
  
  const degrees = parseFloat(match[1]);
  const minutes = parseFloat(match[2]);
  let decimal = degrees + (minutes / 60);
  
  if (direction.toUpperCase() === 'S' || direction.toUpperCase() === 'W') {
    decimal = -decimal;
  }
  
  return decimal;
}

/**
 * NUEVO v4.0: Parser WKT (Well-Known Text)
 * 
 * G2: POINT(504750 4077905)
 */
export function parseWKT(value: string): { x: number; y: number } | null {
  const v = value.trim();
  
  // POINT(x y) o POINT (x y)
  const pointMatch = v.match(/POINT\s*\(\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*\)/i);
  if (pointMatch) {
    return {
      x: parseFloat(pointMatch[1]),
      y: parseFloat(pointMatch[2])
    };
  }
  
  return null;
}

/**
 * NUEVO v4.0: Parser GeoJSON
 * 
 * G3: {"type":"Point","coordinates":[lon,lat]}
 */
export function parseGeoJSON(value: string): { x: number; y: number } | null {
  try {
    const obj = JSON.parse(value);
    
    // GeoJSON Point
    if (obj.type === 'Point' && Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
      return {
        x: obj.coordinates[0], // longitude
        y: obj.coordinates[1]  // latitude
      };
    }
    
    // GeoJSON Feature con Point
    if (obj.type === 'Feature' && obj.geometry?.type === 'Point') {
      return {
        x: obj.geometry.coordinates[0],
        y: obj.geometry.coordinates[1]
      };
    }
  } catch {
    // No es JSON válido
  }
  
  return null;
}

/**
 * NUEVO v4.0: Parser de coordenadas pegadas
 * 
 * B6: "4077905504750" → Y=4077905, X=504750
 */
export function parseGluedCoordinates(value: string): { x: number; y: number } | null {
  // Limpiar todo excepto dígitos
  const digits = value.replace(/[^\d]/g, '');
  
  // 13 dígitos: YYYYYYYXXXXXX (7+6)
  if (digits.length === 13) {
    const y = parseInt(digits.slice(0, 7));
    const x = parseInt(digits.slice(7, 13));
    
    // Validar que parecen coordenadas UTM de Andalucía
    if (y >= 3900000 && y <= 4400000 && x >= 100000 && x <= 800000) {
      return { x, y };
    }
  }
  
  // 14 dígitos: YYYYYYYYXXXXXX (8+6) - con 1 decimal implícito
  if (digits.length === 14) {
    const y = parseInt(digits.slice(0, 8)) / 10;
    const x = parseInt(digits.slice(8, 14));
    
    if (y >= 3900000 && y <= 4400000 && x >= 100000 && x <= 800000) {
      return { x, y };
    }
  }
  
  // 12 dígitos: YYYYYYXXXXXX (6+6) - Y sin el 4 inicial
  if (digits.length === 12) {
    const yTrunc = parseInt(digits.slice(0, 6));
    const x = parseInt(digits.slice(6, 12));
    const y = 4000000 + yTrunc;
    
    if (y >= 3900000 && y <= 4400000 && x >= 100000 && x <= 800000) {
      return { x, y };
    }
  }
  
  return null;
}

/**
 * NUEVO v4.0: Detectar y parsear campo de texto etiquetado
 * 
 * G1: "X=504750 Y=4077905 H=30"
 */
export function parseLabeledCoordinates(value: string): { x: number; y: number } | null {
  const v = value.trim();
  
  // Patrón: X=nnn Y=nnn (con o sin espacios, con o sin Huso)
  const labeledMatch = v.match(/X\s*[=:]\s*(-?\d+\.?\d*)\s*[,;]?\s*Y\s*[=:]\s*(-?\d+\.?\d*)/i);
  if (labeledMatch) {
    return {
      x: parseFloat(labeledMatch[1]),
      y: parseFloat(labeledMatch[2])
    };
  }
  
  // Patrón inverso: Y=nnn X=nnn
  const labeledMatchReverse = v.match(/Y\s*[=:]\s*(-?\d+\.?\d*)\s*[,;]?\s*X\s*[=:]\s*(-?\d+\.?\d*)/i);
  if (labeledMatchReverse) {
    return {
      x: parseFloat(labeledMatchReverse[2]),
      y: parseFloat(labeledMatchReverse[1])
    };
  }
  
  // Patrón: Este: nnn / Norte: nnn
  const cardinalMatch = v.match(/Este\s*[=:]\s*(-?\d+\.?\d*)\s*[\/,;]\s*Norte\s*[=:]\s*(-?\d+\.?\d*)/i);
  if (cardinalMatch) {
    return {
      x: parseFloat(cardinalMatch[1]),
      y: parseFloat(cardinalMatch[2])
    };
  }
  
  return null;
}

// ============================================================================
// TRANSFORMACIONES DE SISTEMA DE REFERENCIA
// ============================================================================

/**
 * NUEVO v4.0: Transforma coordenadas ED50 a ETRS89 UTM30
 */
export function transformED50toETRS89(x: number, y: number): { x: number; y: number } {
  try {
    const result = proj4('EPSG:23030', 'EPSG:25830', [x, y]);
    return { x: result[0], y: result[1] };
  } catch {
    // Si falla proj4, aplicar transformación aproximada
    // Offset típico ED50→ETRS89 en Andalucía: X≈-110m, Y≈-208m
    return { x: x - 110, y: y - 208 };
  }
}

/**
 * NUEVO v4.0: Transforma coordenadas geográficas WGS84 a UTM30 ETRS89
 */
export function transformWGS84toUTM30(lon: number, lat: number): { x: number; y: number } {
  try {
    const result = proj4('EPSG:4326', 'EPSG:25830', [lon, lat]);
    return { x: result[0], y: result[1] };
  } catch {
    throw new Error(`Error transformando WGS84 (${lon}, ${lat}) a UTM30`);
  }
}

/**
 * Detecta si las coordenadas son geográficas (WGS84/ETRS89)
 */
export function isGeographic(x: number, y: number): boolean {
  // Coordenadas geográficas para Andalucía:
  // Latitud (Y): 36.0 - 38.75
  // Longitud (X): -7.55 - -1.60
  const isLat = y >= 35 && y <= 40;
  const isLon = x >= -8 && x <= 0;
  
  return isLat && isLon;
}

/**
 * Detecta si las coordenadas podrían ser ED50 basándose en el año del documento
 */
export function mightBeED50(documentYear?: number): boolean {
  if (!documentYear) return false;
  return documentYear < 2007;
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE NORMALIZACIÓN v4.0
// ============================================================================

/**
 * Normaliza una coordenada aplicando el pipeline completo de 12 fases.
 */
export function normalizeCoordinate(input: CoordinateInput): NormalizationResult {
  const corrections: Correction[] = [];
  const flags: Flag[] = [];
  const original = { x: input.x, y: input.y };
  let sourceFormat: SourceFormat = 'UNKNOWN';
  let sourceCRS: string | undefined;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 0: Detectar formatos especiales en rawText
  // ═══════════════════════════════════════════════════════════════════════════
  if (input.rawText) {
    // Intentar WKT
    const wktResult = parseWKT(input.rawText);
    if (wktResult) {
      sourceFormat = 'WKT';
      corrections.push({
        type: 'WKT_PARSED', field: 'both',
        from: input.rawText, to: `X=${wktResult.x}, Y=${wktResult.y}`,
        pattern: 'WKT_POINT', priority: 'P1'
      });
      input.x = wktResult.x;
      input.y = wktResult.y;
    }
    
    // Intentar GeoJSON
    if (sourceFormat === 'UNKNOWN') {
      const geoJsonResult = parseGeoJSON(input.rawText);
      if (geoJsonResult) {
        sourceFormat = 'GEOJSON';
        // GeoJSON usa lon,lat → necesita transformación
        const utm = transformWGS84toUTM30(geoJsonResult.x, geoJsonResult.y);
        corrections.push({
          type: 'GEOJSON_PARSED', field: 'both',
          from: input.rawText, to: `X=${utm.x.toFixed(2)}, Y=${utm.y.toFixed(2)}`,
          pattern: 'GEOJSON_POINT', priority: 'P1'
        });
        input.x = utm.x;
        input.y = utm.y;
        sourceCRS = 'EPSG:4326';
      }
    }
    
    // Intentar coordenadas etiquetadas
    if (sourceFormat === 'UNKNOWN') {
      const labeledResult = parseLabeledCoordinates(input.rawText);
      if (labeledResult) {
        sourceFormat = 'UTM';
        input.x = labeledResult.x;
        input.y = labeledResult.y;
      }
    }
    
    // Intentar coordenadas pegadas
    if (sourceFormat === 'UNKNOWN') {
      const gluedResult = parseGluedCoordinates(input.rawText);
      if (gluedResult) {
        sourceFormat = 'PEGADA';
        corrections.push({
          type: 'COORDS_SEPARATED', field: 'both',
          from: input.rawText, to: `X=${gluedResult.x}, Y=${gluedResult.y}`,
          pattern: 'GLUED_COORDS', priority: 'P0'
        });
        input.x = gluedResult.x;
        input.y = gluedResult.y;
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 1: Detectar placeholders
  // ═══════════════════════════════════════════════════════════════════════════
  const xPlaceholder = isPlaceholder(input.x);
  const yPlaceholder = isPlaceholder(input.y);
  
  if (xPlaceholder || yPlaceholder) {
    if (xPlaceholder) {
      corrections.push({
        type: 'PLACEHOLDER_DETECTED', field: 'x',
        from: String(input.x), to: 'null',
        pattern: 'PLACEHOLDER', priority: 'P0'
      });
    }
    if (yPlaceholder) {
      corrections.push({
        type: 'PLACEHOLDER_DETECTED', field: 'y',
        from: String(input.y), to: 'null',
        pattern: 'PLACEHOLDER', priority: 'P0'
      });
    }
    
    flags.push({
      type: 'GEOCODING_NEEDED', severity: 'warning',
      message: 'Coordenadas vacías o placeholder detectado'
    });
    
    return {
      x: null, y: null, original, corrections, flags,
      score: 0, confidence: 'CRITICAL', isValid: false,
      sourceFormat
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 2: Intentar parsear como DMS
  // ═══════════════════════════════════════════════════════════════════════════
  const xStr = String(input.x).trim();
  const yStr = String(input.y).trim();
  
  const xDMS = parseDMS(xStr);
  const yDMS = parseDMS(yStr);
  
  if (xDMS && yDMS) {
    sourceFormat = 'DMS';
    // Convertir a UTM
    const utm = transformWGS84toUTM30(xDMS.decimal, yDMS.decimal);
    corrections.push({
      type: 'DMS_CONVERTED', field: 'both',
      from: `${xStr}, ${yStr}`,
      to: `X=${utm.x.toFixed(2)}, Y=${utm.y.toFixed(2)}`,
      pattern: 'DMS_TO_UTM', priority: 'P1'
    });
    input.x = utm.x;
    input.y = utm.y;
    sourceCRS = 'EPSG:4326';
    
    flags.push({
      type: 'FORMAT_DETECTED', severity: 'info',
      message: 'Coordenadas DMS detectadas y convertidas a UTM'
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 3: Intentar parsear como NMEA
  // ═══════════════════════════════════════════════════════════════════════════
  if (sourceFormat === 'UNKNOWN') {
    const xNMEA = parseNMEA(xStr);
    const yNMEA = parseNMEA(yStr);
    
    if (xNMEA !== null && yNMEA !== null) {
      sourceFormat = 'NMEA';
      const utm = transformWGS84toUTM30(xNMEA, yNMEA);
      corrections.push({
        type: 'NMEA_CONVERTED', field: 'both',
        from: `${xStr}, ${yStr}`,
        to: `X=${utm.x.toFixed(2)}, Y=${utm.y.toFixed(2)}`,
        pattern: 'NMEA_TO_UTM', priority: 'P1'
      });
      input.x = utm.x;
      input.y = utm.y;
      sourceCRS = 'EPSG:4326';
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 4: Normalizar formato numérico (separadores)
  // ═══════════════════════════════════════════════════════════════════════════
  let x = normalizeNumber(input.x, corrections, 'x');
  let y = normalizeNumber(input.y, corrections, 'y');
  
  if (x === null || y === null) {
    flags.push({
      type: 'SUSPICIOUS_VALUE', severity: 'error',
      message: 'No se pudo parsear la coordenada como número'
    });
    return {
      x, y, original, corrections, flags,
      score: 0, confidence: 'CRITICAL', isValid: false,
      sourceFormat
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 5: Detectar coordenadas geográficas y convertir
  // ═══════════════════════════════════════════════════════════════════════════
  if (isGeographic(x, y)) {
    sourceFormat = 'DD';
    flags.push({
      type: 'GEOGRAPHIC_COORDS', severity: 'info',
      message: 'Coordenadas geográficas detectadas (WGS84/ETRS89)'
    });
    
    const utm = transformWGS84toUTM30(x, y);
    corrections.push({
      type: 'WGS84_TO_UTM', field: 'both',
      from: `lon=${x}, lat=${y}`,
      to: `X=${utm.x.toFixed(2)}, Y=${utm.y.toFixed(2)}`,
      pattern: 'GEO_TO_UTM', priority: 'P1'
    });
    x = utm.x;
    y = utm.y;
    sourceCRS = 'EPSG:4326';
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 6: Detectar intercambio X↔Y
  // ═══════════════════════════════════════════════════════════════════════════
  if (detectXYSwap(x, y)) {
    const temp = x;
    x = y;
    y = temp;
    corrections.push({
      type: 'XY_SWAPPED', field: 'both',
      from: `X=${original.x}, Y=${original.y}`,
      to: `X=${x}, Y=${y}`,
      pattern: 'XY_SWAP', priority: 'P0'
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 7: Detectar Y truncada
  // ═══════════════════════════════════════════════════════════════════════════
  const yTruncResult = detectAndFixYTruncation(y, input.province);
  if (yTruncResult.wasFixed) {
    corrections.push({
      type: 'Y_TRUNCATED', field: 'y',
      from: String(y), to: String(yTruncResult.fixed),
      pattern: `Y_TRUNC_${yTruncResult.method}`, priority: 'P0'
    });
    y = yTruncResult.fixed;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 8: Detectar coordenadas en kilómetros
  // ═══════════════════════════════════════════════════════════════════════════
  const xKmResult = detectAndFixKilometers(x, 'x', String(input.x));
  if (xKmResult.wasFixed) {
    corrections.push({
      type: 'KM_TO_METERS', field: 'x',
      from: String(x), to: String(xKmResult.fixed),
      pattern: `KM_${xKmResult.method}`, priority: 'P0'
    });
    x = xKmResult.fixed;
  }
  
  const yKmResult = detectAndFixKilometers(y, 'y', String(input.y));
  if (yKmResult.wasFixed) {
    corrections.push({
      type: 'KM_TO_METERS', field: 'y',
      from: String(y), to: String(yKmResult.fixed),
      pattern: `KM_${yKmResult.method}`, priority: 'P0'
    });
    y = yKmResult.fixed;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 9: Detectar X truncada
  // ═══════════════════════════════════════════════════════════════════════════
  const xTruncResult = detectAndFixXTruncation(x);
  if (xTruncResult.wasFixed) {
    corrections.push({
      type: 'X_TRUNCATED', field: 'x',
      from: String(x), to: String(xTruncResult.fixed),
      pattern: `X_TRUNC_${xTruncResult.method}`, priority: 'P0'
    });
    x = xTruncResult.fixed;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 10: Detectar y transformar ED50
  // ═══════════════════════════════════════════════════════════════════════════
  if (mightBeED50(input.documentYear)) {
    flags.push({
      type: 'ED50_DETECTED', severity: 'warning',
      message: `Documento de ${input.documentYear}: posiblemente ED50. Transformación aplicada (~230m).`
    });
    
    const transformed = transformED50toETRS89(x, y);
    corrections.push({
      type: 'ED50_TRANSFORMED', field: 'both',
      from: `X=${x.toFixed(2)}, Y=${y.toFixed(2)}`,
      to: `X=${transformed.x.toFixed(2)}, Y=${transformed.y.toFixed(2)}`,
      pattern: 'ED50_TO_ETRS89', priority: 'P2'
    });
    x = transformed.x;
    y = transformed.y;
    sourceCRS = 'EPSG:23030';
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 11: Motor de heurísticas de rescate
  // ═══════════════════════════════════════════════════════════════════════════
  let heuristicApplied: HeuristicResult | undefined;
  
  if (!isInRange(x, 'x') || !isInRange(y, 'y')) {
    if (!isInRange(x, 'x')) {
      const rescue = runHeuristicRescue(String(input.x), x, 'x');
      if (rescue) {
        corrections.push({
          type: 'HEURISTIC_RESCUE', field: 'x',
          from: String(x), to: String(rescue.correctedValue),
          pattern: rescue.method, priority: 'P1'
        });
        x = rescue.correctedValue;
        heuristicApplied = rescue;
        flags.push({
          type: 'HEURISTIC_APPLIED', severity: 'info',
          message: `Heurística aplicada: ${rescue.hypothesis}`
        });
      }
    }
    
    if (!isInRange(y, 'y')) {
      const rescue = runHeuristicRescue(String(input.y), y, 'y');
      if (rescue) {
        corrections.push({
          type: 'HEURISTIC_RESCUE', field: 'y',
          from: String(y), to: String(rescue.correctedValue),
          pattern: rescue.method, priority: 'P1'
        });
        y = rescue.correctedValue;
        heuristicApplied = rescue;
        flags.push({
          type: 'HEURISTIC_APPLIED', severity: 'info',
          message: `Heurística aplicada: ${rescue.hypothesis}`
        });
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 12: Validar rangos finales y calcular score
  // ═══════════════════════════════════════════════════════════════════════════
  const rangeValid = validateRange(x, y, flags);
  const score = calculateScore(x, y, corrections, flags);
  const confidence = scoreToConfidence(score);
  
  return {
    x, y, original, corrections, flags, score, confidence,
    isValid: rangeValid && score >= 50,
    heuristicApplied,
    sourceFormat: sourceFormat !== 'UNKNOWN' ? sourceFormat : 'UTM',
    sourceCRS
  };
}

// ============================================================================
// FUNCIONES DE DETECCIÓN Y CORRECCIÓN (sin cambios desde v3.0)
// ============================================================================

function normalizeNumber(
  value: string | number, 
  corrections: Correction[], 
  field: 'x' | 'y'
): number | null {
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  let str = String(value).trim();
  
  for (const [pattern, replacement, patternName] of SEPARATOR_PATTERNS) {
    const newStr = str.replace(pattern, replacement);
    if (newStr !== str) {
      corrections.push({
        type: 'SEPARATOR_FIXED', field,
        from: str, to: newStr,
        pattern: patternName, priority: 'P1'
      });
      str = newStr;
    }
  }
  
  str = str.replace(/[^\d.-]/g, '');
  
  const dots = str.match(/\./g);
  if (dots && dots.length > 1) {
    const parts = str.split('.');
    const decimal = parts.pop();
    str = parts.join('') + '.' + decimal;
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function isPlaceholder(value: string | number): boolean {
  if (typeof value === 'number') {
    return value === 0 || isNaN(value);
  }
  const str = String(value).trim();
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(str));
}

function detectXYSwap(x: number, y: number): boolean {
  const xInYRange = x >= 1_000_000 && x <= 5_000_000;
  const yInXRange = y >= 100_000 && y <= 900_000;
  return xInYRange && yInXRange;
}

function detectAndFixYTruncation(
  y: number, 
  province?: Province
): { wasFixed: boolean; fixed: number; method: string } {
  const yStr = Math.floor(Math.abs(y)).toString();
  
  if (yStr.length >= 7 && yStr.startsWith('4')) {
    return { wasFixed: false, fixed: y, method: 'NONE' };
  }
  
  if (yStr.length === 6 && !yStr.startsWith('4')) {
    if (/^[0-3]/.test(yStr)) {
      const fixed = parseFloat('4' + yStr);
      if (isInRange(fixed, 'y')) {
        return { wasFixed: true, fixed, method: 'ADD_4_PREFIX' };
      }
    }
  }
  
  if (yStr.length === 6 && yStr.startsWith('4')) {
    if (!isInRange(y, 'y')) {
      const fixed = y * 10;
      if (isInRange(fixed, 'y')) {
        return { wasFixed: true, fixed, method: 'MULTIPLY_10_Y' };
      }
    }
  }
  
  if (yStr.length === 5) {
    let prefix = '40';
    if (province && PROVINCE_Y_PREFIXES[province]) {
      prefix = PROVINCE_Y_PREFIXES[province][0];
    }
    const fixed = parseFloat(prefix + yStr);
    if (isInRange(fixed, 'y')) {
      return { wasFixed: true, fixed, method: 'ADD_40_PREFIX' };
    }
  }
  
  return { wasFixed: false, fixed: y, method: 'NONE' };
}

function detectAndFixKilometers(
  value: number,
  field: 'x' | 'y',
  originalStr: string
): { wasFixed: boolean; fixed: number; method: string; confidence: number } {
  
  if (field === 'x' && value > 0 && value < 1000) {
    const hasDecimals = originalStr.includes('.') || originalStr.includes(',');
    
    if (hasDecimals) {
      const fixed = Math.round(value * 1000);
      if (isInRange(fixed, 'x')) {
        return { wasFixed: true, fixed, method: 'KM_DECIMAL_TO_M', confidence: 95 };
      }
    } else {
      const fixed = value * 1000;
      if (isInRange(fixed, 'x')) {
        return { wasFixed: true, fixed, method: 'KM_INT_TO_M', confidence: 85 };
      }
    }
  }
  
  if (field === 'y' && value > 3900 && value < 4400) {
    const fixed = value * 1000;
    if (isInRange(fixed, 'y')) {
      return { wasFixed: true, fixed, method: 'Y_KM_TO_M', confidence: 90 };
    }
  }
  
  return { wasFixed: false, fixed: value, method: 'NONE', confidence: 100 };
}

function detectAndFixXTruncation(
  x: number
): { wasFixed: boolean; fixed: number; method: string } {
  const xStr = Math.floor(Math.abs(x)).toString();
  
  if (xStr.length >= 6) {
    return { wasFixed: false, fixed: x, method: 'NONE' };
  }
  
  if (xStr.length === 5) {
    const fixed = x * 10;
    if (isInRange(fixed, 'x')) {
      return { wasFixed: true, fixed, method: 'MULTIPLY_10' };
    }
  }
  
  if (xStr.length === 4) {
    const fixed = x * 100;
    if (isInRange(fixed, 'x')) {
      return { wasFixed: true, fixed, method: 'MULTIPLY_100' };
    }
  }
  
  return { wasFixed: false, fixed: x, method: 'NONE' };
}

function runHeuristicRescue(
  originalValue: string,
  parsedValue: number,
  field: 'x' | 'y'
): HeuristicResult | null {
  
  const heuristics = [
    {
      condition: (v: number, f: 'x' | 'y') => 
        f === 'x' && v > 0 && v < 1000,
      transform: (v: number) => Math.round(v * 1000),
      hypothesis: 'Coordenada X parece estar en kilómetros',
      method: 'HEUR_KM_X',
      confidence: 90
    },
    {
      condition: (_v: number, _f: 'x' | 'y', orig: string) => 
        /^\d{3},\d{3}/.test(orig),
      transform: (_v: number, orig: string) => 
        parseFloat(orig.replace(/,/g, '')),
      hypothesis: 'Coma usada como separador de miles',
      method: 'HEUR_COMMA_THOUSANDS',
      confidence: 88
    },
    {
      condition: (v: number, f: 'x' | 'y') => 
        f === 'x' && v >= 10000 && v < 100000,
      transform: (v: number) => v * 10,
      hypothesis: 'Coordenada X truncada (falta 1 dígito)',
      method: 'HEUR_X_TRUNC',
      confidence: 85
    },
    {
      condition: (v: number, f: 'x' | 'y') => 
        f === 'y' && v >= 100000 && v < 1000000 && !String(Math.floor(v)).startsWith('4'),
      transform: (v: number) => v + 4000000,
      hypothesis: 'Coordenada Y truncada (falta "4" inicial)',
      method: 'HEUR_Y_ADD_4M',
      confidence: 90
    },
    {
      condition: (_v: number, _f: 'x' | 'y', orig: string) => 
        /^\d{3}\.\d{3}$/.test(orig.trim()),
      transform: (_v: number, orig: string) => 
        parseFloat(orig.replace(/\./g, '')),
      hypothesis: 'Punto usado como separador de miles',
      method: 'HEUR_DOT_THOUSANDS',
      confidence: 87
    }
  ];

  for (const h of heuristics) {
    if (h.condition(parsedValue, field, originalValue)) {
      const corrected = h.transform(parsedValue, originalValue);
      
      if (isInRange(corrected, field)) {
        return {
          originalValue,
          correctedValue: corrected,
          hypothesis: h.hypothesis,
          confidence: h.confidence,
          field,
          method: h.method
        };
      }
    }
  }
  
  return null;
}

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

function isInRange(value: number, field: 'x' | 'y'): boolean {
  const bounds = field === 'x' ? ANDALUSIA_BOUNDS.x : ANDALUSIA_BOUNDS.y;
  return value >= bounds.min && value <= bounds.max;
}

function validateRange(x: number, y: number, flags: Flag[]): boolean {
  let valid = true;
  
  if (!isInRange(x, 'x')) {
    flags.push({
      type: 'OUT_OF_RANGE', severity: 'error',
      message: `X=${x.toFixed(2)} fuera de rango (${ANDALUSIA_BOUNDS.x.min}-${ANDALUSIA_BOUNDS.x.max})`
    });
    valid = false;
  }
  
  if (!isInRange(y, 'y')) {
    flags.push({
      type: 'OUT_OF_RANGE', severity: 'error',
      message: `Y=${y.toFixed(2)} fuera de rango (${ANDALUSIA_BOUNDS.y.min}-${ANDALUSIA_BOUNDS.y.max})`
    });
    valid = false;
  }
  
  return valid;
}

function calculateScore(
  x: number, 
  y: number, 
  corrections: Correction[], 
  flags: Flag[]
): number {
  let score = 100;
  
  const p0Corrections = corrections.filter(c => c.priority === 'P0').length;
  const p1Corrections = corrections.filter(c => c.priority === 'P1').length;
  const p2Corrections = corrections.filter(c => c.priority === 'P2').length;
  
  score -= p0Corrections * 10;
  score -= p1Corrections * 5;
  score -= p2Corrections * 3;
  
  const errors = flags.filter(f => f.severity === 'error').length;
  const warnings = flags.filter(f => f.severity === 'warning').length;
  
  score -= errors * 25;
  score -= warnings * 10;
  
  if (x % 1 === 0) score -= 3;
  if (y % 1 === 0) score -= 3;
  
  return Math.max(0, Math.min(100, score));
}

function scoreToConfidence(score: number): ConfidenceLevel {
  if (score >= 76) return 'HIGH';
  if (score >= 51) return 'MEDIUM';
  if (score >= 26) return 'LOW';
  return 'CRITICAL';
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

export function normalizeEncoding(text: string): string {
  let result = text;
  for (const [pattern, replacement] of MOJIBAKE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function normalizeCoordinateBatch(
  inputs: CoordinateInput[],
  onProgress?: (current: number, total: number) => void
): NormalizationResult[] {
  const results: NormalizationResult[] = [];
  
  for (let i = 0; i < inputs.length; i++) {
    results.push(normalizeCoordinate(inputs[i]));
    onProgress?.(i + 1, inputs.length);
  }
  
  return results;
}

export function getBatchStats(results: NormalizationResult[]): {
  total: number;
  valid: number;
  invalid: number;
  avgScore: number;
  correctionsByType: Record<string, number>;
  confidenceDistribution: Record<ConfidenceLevel, number>;
  heuristicsApplied: number;
  formatDistribution: Record<SourceFormat, number>;
} {
  const correctionsByType: Record<string, number> = {};
  const confidenceDistribution: Record<ConfidenceLevel, number> = {
    CRITICAL: 0, LOW: 0, MEDIUM: 0, HIGH: 0
  };
  const formatDistribution: Record<SourceFormat, number> = {
    UTM: 0, DMS: 0, DD: 0, NMEA: 0, WKT: 0, GEOJSON: 0, PEGADA: 0, UNKNOWN: 0
  };
  
  let totalScore = 0;
  let validCount = 0;
  let heuristicsCount = 0;
  
  for (const result of results) {
    totalScore += result.score;
    if (result.isValid) validCount++;
    if (result.heuristicApplied) heuristicsCount++;
    confidenceDistribution[result.confidence]++;
    if (result.sourceFormat) {
      formatDistribution[result.sourceFormat]++;
    }
    
    for (const correction of result.corrections) {
      correctionsByType[correction.type] = (correctionsByType[correction.type] || 0) + 1;
    }
  }
  
  return {
    total: results.length,
    valid: validCount,
    invalid: results.length - validCount,
    avgScore: results.length > 0 ? totalScore / results.length : 0,
    correctionsByType,
    confidenceDistribution,
    heuristicsApplied: heuristicsCount,
    formatDistribution
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  normalizeCoordinate,
  normalizeCoordinateBatch,
  normalizeEncoding,
  getBatchStats,
  // Parsers individuales (para uso directo)
  parseDMS,
  parseNMEA,
  parseWKT,
  parseGeoJSON,
  parseGluedCoordinates,
  parseLabeledCoordinates,
  // Transformaciones
  transformED50toETRS89,
  transformWGS84toUTM30,
  isGeographic,
  mightBeED50,
  // Constantes
  ANDALUSIA_BOUNDS,
  ANDALUSIA_GEOGRAPHIC_BOUNDS,
  PROVINCE_Y_PREFIXES
};
