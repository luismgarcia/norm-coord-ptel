/**
 * XLSX Exporter - Normalizador de Coordenadas PTEL
 * Exportación Excel con múltiples pestañas por tipología
 * 
 * @version 1.0.0
 * @date 2025-11-24
 */

import ExcelJS from 'exceljs';
import type { CoordinateData } from '@/types';
import type { ClassificationResult } from '@/types/infrastructure';

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

interface ExportRecord {
  id: number;
  nombre: string;
  tipologia: string;
  tipoOriginal: string;
  direccion: string;
  municipio: string;
  provincia: string;
  telefono: string;
  email: string;
  observaciones: string;
  xInicial: number | null;
  yInicial: number | null;
  sistemaInicial: string;
  xUtm30: number | null;
  yUtm30: number | null;
  lonWgs84: number | null;
  latWgs84: number | null;
  score: number;
  confianza: string;
  fuentes: string;
  numFuentes: number;
  geocodificado: string;
  alertas: string;
}

interface ExportMetadata {
  sourceFile: string;
  timestamp: Date;
  municipality?: string;
  province?: string;
  sourceSystem?: string;
}

interface ExportStats {
  total: number;
  byTipologia: Record<string, number>;
  byConfianza: Record<string, number>;
  byFuentes: Record<string, number>;
  geolocalizados: number;
  sinGeolocalizar: number;
  scorePromedio: number;
  alertasTotales: number;
  limites: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

// Columnas en orden especificado
const COLUMN_ORDER = [
  { key: 'id', header: 'ID', width: 8 },
  { key: 'nombre', header: 'NOMBRE', width: 35 },
  { key: 'tipologia', header: 'TIPOLOGIA', width: 15 },
  { key: 'tipoOriginal', header: 'TIPO_ORIGINAL', width: 20 },
  { key: 'direccion', header: 'DIRECCION', width: 40 },
  { key: 'municipio', header: 'MUNICIPIO', width: 20 },
  { key: 'provincia', header: 'PROVINCIA', width: 15 },
  { key: 'telefono', header: 'TELEFONO', width: 15 },
  { key: 'email', header: 'EMAIL', width: 30 },
  { key: 'observaciones', header: 'OBSERVACIONES', width: 40 },
  { key: 'xInicial', header: 'X_INICIAL', width: 15 },
  { key: 'yInicial', header: 'Y_INICIAL', width: 15 },
  { key: 'sistemaInicial', header: 'SISTEMA_INICIAL', width: 15 },
  { key: 'xUtm30', header: 'X_UTM30', width: 15 },
  { key: 'yUtm30', header: 'Y_UTM30', width: 15 },
  { key: 'lonWgs84', header: 'LON_WGS84', width: 12 },
  { key: 'latWgs84', header: 'LAT_WGS84', width: 12 },
  { key: 'score', header: 'SCORE', width: 10 },
  { key: 'confianza', header: 'CONFIANZA', width: 12 },
  { key: 'fuentes', header: 'FUENTES', width: 40 },
  { key: 'numFuentes', header: 'NUM_FUENTES', width: 12 },
  { key: 'geocodificado', header: 'GEOCODIFICADO', width: 15 },
  { key: 'alertas', header: 'ALERTAS', width: 50 },
];

// Configuración de tipologías para pestañas
const TIPOLOGIA_SHEETS = [
  { name: 'General', filter: null, color: 'E3F2FD' },
  { name: 'Sanitario', filter: ['SANITARIO'], color: 'FFEBEE' },
  { name: 'Educativo', filter: ['EDUCATIVO'], color: 'E3F2FD' },
  { name: 'Cultural', filter: ['CULTURAL'], color: 'F3E5F5' },
  { name: 'Seguridad', filter: ['POLICIAL', 'BOMBEROS', 'EMERGENCIAS'], color: 'E8EAF6' },
  { name: 'Religioso', filter: ['RELIGIOSO'], color: 'FFF8E1' },
  { name: 'Deportivo', filter: ['DEPORTIVO'], color: 'E8F5E9' },
  { name: 'Municipal', filter: ['MUNICIPAL', 'SOCIAL'], color: 'ECEFF1' },
  { name: 'Otros', filter: ['GENERICO'], color: 'F5F5F5' },
  { name: 'Sin_Geolocalizar', filter: 'failed', color: 'FFCDD2' },
  { name: 'Resumen', filter: 'summary', color: 'FFFFFF' },
];

// Colores para niveles de confianza
const CONFIANZA_COLORS: Record<string, string> = {
  'ALTA': 'C8E6C9',    // Verde claro
  'MEDIA': 'FFF9C4',   // Amarillo claro
  'BAJA': 'FFE0B2',    // Naranja claro
  'NULA': 'FFCDD2',    // Rojo claro
};

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Exporta datos a formato XLSX con múltiples pestañas
 */
export async function exportToXLSX(
  data: CoordinateData[],
  classifications: ClassificationResult[],
  metadata: ExportMetadata
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  
  // Configurar metadatos del workbook
  workbook.creator = 'Normalizador PTEL';
  workbook.created = metadata.timestamp;
  workbook.modified = metadata.timestamp;
  
  // Preparar datos para exportación
  const exportData = prepareExportData(data, classifications, metadata);
  
  // Calcular estadísticas
  const stats = calculateStats(exportData);
  
  // Crear pestañas
  for (const sheetConfig of TIPOLOGIA_SHEETS) {
    if (sheetConfig.filter === 'summary') {
      createSummarySheet(workbook, exportData, stats, metadata);
    } else if (sheetConfig.filter === 'failed') {
      const failedRecords = exportData.filter(r => 
        r.geocodificado === 'No' || r.score < 40
      );
      if (failedRecords.length > 0 || true) { // Siempre crear la pestaña
        createDataSheet(workbook, sheetConfig.name, failedRecords, sheetConfig.color);
      }
    } else if (sheetConfig.filter === null) {
      // Pestaña General con todos los datos
      createDataSheet(workbook, sheetConfig.name, exportData, sheetConfig.color);
    } else {
      // Pestañas por tipología
      const filteredRecords = exportData.filter(r => 
        sheetConfig.filter!.includes(r.tipologia)
      );
      if (filteredRecords.length > 0) {
        createDataSheet(workbook, sheetConfig.name, filteredRecords, sheetConfig.color);
      }
    }
  }
  
  // Generar blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * Prepara los datos para exportación con todas las columnas necesarias
 */
function prepareExportData(
  data: CoordinateData[],
  classifications: ClassificationResult[],
  metadata: ExportMetadata
): ExportRecord[] {
  return data.map((coord, index) => {
    const classification = classifications[index] || { type: 'GENERICO', confidence: 0 };
    
    // Determinar fuentes
    const fuentes: string[] = [];
    if (coord.x && coord.y) fuentes.push('Original');
    if (coord.geocodedBy) fuentes.push(coord.geocodedBy);
    if (coord.confirmedBy) fuentes.push(...coord.confirmedBy);
    
    const fuentesUnicas = [...new Set(fuentes)];
    
    // Calcular confianza basada en score
    const score = coord.score || 0;
    let confianza = 'NULA';
    if (score >= 80) confianza = 'ALTA';
    else if (score >= 60) confianza = 'MEDIA';
    else if (score >= 40) confianza = 'BAJA';
    
    // Construir alertas
    const alertas = coord.alerts?.join(' | ') || '';
    
    return {
      id: index + 1,
      nombre: coord.name || coord.originalData?.NOMBRE || coord.originalData?.nombre || '-',
      tipologia: classification.type,
      tipoOriginal: coord.originalData?.TIPO || coord.originalData?.tipo || '-',
      direccion: coord.originalData?.DIRECCION || coord.originalData?.direccion || '-',
      municipio: coord.municipality || metadata.municipality || '-',
      provincia: coord.province || metadata.province || '-',
      telefono: coord.originalData?.TELEFONO || coord.originalData?.telefono || '-',
      email: coord.originalData?.EMAIL || coord.originalData?.email || '-',
      observaciones: coord.originalData?.OBSERVACIONES || coord.originalData?.observaciones || '-',
      xInicial: coord.originalX ?? null,
      yInicial: coord.originalY ?? null,
      sistemaInicial: coord.detectedSystem || metadata.sourceSystem || '-',
      xUtm30: coord.x ?? null,
      yUtm30: coord.y ?? null,
      lonWgs84: coord.lon ?? null,
      latWgs84: coord.lat ?? null,
      score: score,
      confianza: confianza,
      fuentes: fuentesUnicas.join(', ') || '-',
      numFuentes: fuentesUnicas.length,
      geocodificado: (coord.x && coord.y && score >= 40) ? 'Sí' : 'No',
      alertas: alertas || '-',
    };
  });
}

/**
 * Calcula estadísticas de los datos exportados
 */
function calculateStats(data: ExportRecord[]): ExportStats {
  const byTipologia: Record<string, number> = {};
  const byConfianza: Record<string, number> = { ALTA: 0, MEDIA: 0, BAJA: 0, NULA: 0 };
  const byFuentes: Record<string, number> = {};
  let totalScore = 0;
  let alertasCount = 0;
  let geolocalizados = 0;
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  data.forEach(record => {
    // Por tipología
    byTipologia[record.tipologia] = (byTipologia[record.tipologia] || 0) + 1;
    
    // Por confianza
    byConfianza[record.confianza] = (byConfianza[record.confianza] || 0) + 1;
    
    // Por fuentes
    const numFuentes = `${record.numFuentes} fuente${record.numFuentes !== 1 ? 's' : ''}`;
    byFuentes[numFuentes] = (byFuentes[numFuentes] || 0) + 1;
    
    // Score
    totalScore += record.score;
    
    // Alertas
    if (record.alertas !== '-') {
      alertasCount += record.alertas.split(' | ').length;
    }
    
    // Geolocalización
    if (record.geocodificado === 'Sí') {
      geolocalizados++;
    }
    
    // Límites
    if (record.xUtm30 !== null) {
      minX = Math.min(minX, record.xUtm30);
      maxX = Math.max(maxX, record.xUtm30);
    }
    if (record.yUtm30 !== null) {
      minY = Math.min(minY, record.yUtm30);
      maxY = Math.max(maxY, record.yUtm30);
    }
  });
  
  return {
    total: data.length,
    byTipologia,
    byConfianza,
    byFuentes,
    geolocalizados,
    sinGeolocalizar: data.length - geolocalizados,
    scorePromedio: data.length > 0 ? totalScore / data.length : 0,
    alertasTotales: alertasCount,
    limites: {
      minX: minX === Infinity ? 0 : minX,
      maxX: maxX === -Infinity ? 0 : maxX,
      minY: minY === Infinity ? 0 : minY,
      maxY: maxY === -Infinity ? 0 : maxY,
    },
  };
}

/**
 * Crea una pestaña de datos con formato
 */
function createDataSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  data: ExportRecord[],
  tabColor: string
): void {
  const sheet = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: tabColor } }
  });
  
  // Configurar columnas
  sheet.columns = COLUMN_ORDER.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));
  
  // Estilo de cabecera
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1565C0' }
    };
    cell.font = { color: { argb: 'FFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: '000000' } }
    };
  });
  headerRow.height = 25;
  
  // Añadir datos
  data.forEach((record, index) => {
    const row = sheet.addRow({
      id: record.id,
      nombre: record.nombre,
      tipologia: record.tipologia,
      tipoOriginal: record.tipoOriginal,
      direccion: record.direccion,
      municipio: record.municipio,
      provincia: record.provincia,
      telefono: record.telefono,
      email: record.email,
      observaciones: record.observaciones,
      xInicial: record.xInicial,
      yInicial: record.yInicial,
      sistemaInicial: record.sistemaInicial,
      xUtm30: record.xUtm30,
      yUtm30: record.yUtm30,
      lonWgs84: record.lonWgs84,
      latWgs84: record.latWgs84,
      score: record.score,
      confianza: record.confianza,
      fuentes: record.fuentes,
      numFuentes: record.numFuentes,
      geocodificado: record.geocodificado,
      alertas: record.alertas,
    });
    
    // Alternar colores de fila
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F5F5F5' }
        };
      });
    }
    
    // Color de celda de confianza según nivel
    const confianzaCell = row.getCell('confianza');
    const confianzaColor = CONFIANZA_COLORS[record.confianza];
    if (confianzaColor) {
      confianzaCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: confianzaColor }
      };
    }
    
    // Formato numérico para coordenadas
    row.getCell('xInicial').numFmt = '#,##0.00';
    row.getCell('yInicial').numFmt = '#,##0.00';
    row.getCell('xUtm30').numFmt = '#,##0.00';
    row.getCell('yUtm30').numFmt = '#,##0.00';
    row.getCell('lonWgs84').numFmt = '0.000000';
    row.getCell('latWgs84').numFmt = '0.000000';
  });
  
  // Congelar primera fila
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  
  // Añadir filtros
  sheet.autoFilter = {
    from: 'A1',
    to: `W${data.length + 1}`
  };
}

/**
 * Crea la pestaña de resumen con estadísticas
 */
function createSummarySheet(
  workbook: ExcelJS.Workbook,
  data: ExportRecord[],
  stats: ExportStats,
  metadata: ExportMetadata
): void {
  const sheet = workbook.addWorksheet('Resumen', {
    properties: { tabColor: { argb: 'FFFFFF' } }
  });
  
  sheet.columns = [
    { width: 40 },
    { width: 20 },
    { width: 15 },
  ];
  
  let row = 1;
  
  // Función helper para añadir sección
  const addSection = (title: string) => {
    row++;
    const titleRow = sheet.getRow(row);
    titleRow.getCell(1).value = title;
    titleRow.getCell(1).font = { bold: true, size: 14 };
    titleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E3F2FD' }
    };
    sheet.mergeCells(`A${row}:C${row}`);
    row++;
    
    // Línea separadora
    const sepRow = sheet.getRow(row);
    sepRow.getCell(1).value = '═'.repeat(50);
    sheet.mergeCells(`A${row}:C${row}`);
    row++;
  };
  
  const addLine = (label: string, value: string | number, extra?: string) => {
    const dataRow = sheet.getRow(row);
    dataRow.getCell(1).value = label;
    dataRow.getCell(2).value = value;
    if (extra) dataRow.getCell(3).value = extra;
    row++;
  };
  
  // SECCIÓN 1: Información General
  addSection('📋 RESUMEN DE CONVERSIÓN');
  addLine('Fecha de generación:', metadata.timestamp.toLocaleString('es-ES'));
  addLine('Archivo origen:', metadata.sourceFile);
  addLine('Sistema origen:', metadata.sourceSystem || 'Auto-detectado');
  addLine('Sistema destino:', 'EPSG:25830 (UTM30 ETRS89)');
  if (metadata.municipality) addLine('Municipio:', metadata.municipality);
  if (metadata.province) addLine('Provincia:', metadata.province);
  
  // SECCIÓN 2: Distribución por Tipología
  addSection('📊 DISTRIBUCIÓN POR TIPOLOGÍA');
  const tipologiaEmojis: Record<string, string> = {
    'SANITARIO': '🏥',
    'EDUCATIVO': '🎓',
    'CULTURAL': '🏛️',
    'POLICIAL': '🚔',
    'BOMBEROS': '🚒',
    'EMERGENCIAS': '🚑',
    'RELIGIOSO': '⛪',
    'DEPORTIVO': '🏟️',
    'MUNICIPAL': '🏛️',
    'SOCIAL': '🤝',
    'GENERICO': '📍',
  };
  
  Object.entries(stats.byTipologia).forEach(([tipo, count]) => {
    const emoji = tipologiaEmojis[tipo] || '📍';
    const pct = ((count / stats.total) * 100).toFixed(1);
    addLine(`${emoji} ${tipo}`, count, `${pct}%`);
  });
  addLine('TOTAL', stats.total, '100%');
  
  // SECCIÓN 3: Resultado Geolocalización
  addSection('🗺️ RESULTADO GEOLOCALIZACIÓN');
  const pctGeo = ((stats.geolocalizados / stats.total) * 100).toFixed(1);
  const pctSinGeo = ((stats.sinGeolocalizar / stats.total) * 100).toFixed(1);
  addLine('✅ Geolocalizados:', stats.geolocalizados, `${pctGeo}%`);
  addLine('❌ Sin geolocalizar:', stats.sinGeolocalizar, `${pctSinGeo}%`);
  
  // SECCIÓN 4: Niveles de Confianza
  addSection('📈 NIVELES DE CONFIANZA');
  addLine('🟢 ALTA (80-100):', stats.byConfianza['ALTA'] || 0);
  addLine('🟡 MEDIA (60-79):', stats.byConfianza['MEDIA'] || 0);
  addLine('🟠 BAJA (40-59):', stats.byConfianza['BAJA'] || 0);
  addLine('🔴 NULA (0-39):', stats.byConfianza['NULA'] || 0);
  addLine('Score promedio:', `${stats.scorePromedio.toFixed(1)}/100`);
  
  // SECCIÓN 5: Fuentes Utilizadas
  addSection('📚 FUENTES DE DATOS');
  Object.entries(stats.byFuentes).forEach(([fuente, count]) => {
    addLine(fuente, count);
  });
  
  // SECCIÓN 6: Alertas
  addSection('⚠️ ALERTAS DETECTADAS');
  addLine('Total alertas:', stats.alertasTotales);
  
  // SECCIÓN 7: Límites Geográficos
  addSection('🌍 LÍMITES GEOGRÁFICOS');
  addLine('Min X (UTM30):', `${stats.limites.minX.toFixed(2)} m`);
  addLine('Max X (UTM30):', `${stats.limites.maxX.toFixed(2)} m`);
  addLine('Min Y (UTM30):', `${stats.limites.minY.toFixed(2)} m`);
  addLine('Max Y (UTM30):', `${stats.limites.maxY.toFixed(2)} m`);
  
  const centroideX = (stats.limites.minX + stats.limites.maxX) / 2;
  const centroideY = (stats.limites.minY + stats.limites.maxY) / 2;
  addLine('Centroide X:', `${centroideX.toFixed(2)} m`);
  addLine('Centroide Y:', `${centroideY.toFixed(2)} m`);
}

/**
 * Genera el nombre del archivo de salida
 */
export function generateOutputFilename(sourceFile: string): string {
  const baseName = sourceFile.replace(/\.[^/.]+$/, ''); // Quitar extensión
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${baseName}_PTEL_UTM30_${date}.xlsx`;
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  exportToXLSX,
  generateOutputFilename,
};
