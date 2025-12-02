/**
 * Tests para PatternLearningStore
 * 
 * Usa fake-indexeddb para mockear IndexedDB en Node.js
 * 
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock IndexedDB antes de importar el módulo
import 'fake-indexeddb/auto';

import {
  getDatabase,
  saveLearnedPattern,
  getPattern,
  getAllPatterns,
  getStablePatterns,
  updatePatternUsage,
  deletePattern,
  saveDocumentProfile,
  getDocumentProfile,
  getMunicipioStats,
  getLearningStats,
  clearMemoryCache,
  exportLearningData,
  importLearningData,
  type DocumentProfile
} from '../PatternLearningStore';

import type { LearnedPattern } from '../learnedPatterns';

// ============================================================================
// DATOS DE PRUEBA
// ============================================================================

const crearPatronPrueba = (overrides: Partial<LearnedPattern> = {}): LearnedPattern => ({
  id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  name: 'Patrón de prueba',
  description: 'Patrón creado para tests',
  field: 'x',
  condition: { type: 'range', minValue: 100000, maxValue: 700000 },
  transform: { type: 'multiply', factor: 1 },
  confidence: 80,
  uses: 0,
  successes: 0,
  failures: 0,
  source: 'user',
  firstSeen: new Date().toISOString(),
  lastUsed: new Date().toISOString(),
  municipalities: ['Colomera'],
  isStable: false,
  version: '1.0.0',
  ...overrides
});

const crearPerfilPrueba = (overrides: Partial<DocumentProfile> = {}): DocumentProfile => ({
  id: `doc_${Date.now()}`,
  filename: 'test_document.odt',
  municipio: 'Colomera',
  provincia: 'Granada',
  fechaAnalisis: new Date().toISOString(),
  patronesPredominantes: [
    { patron: 'EUROPEO_COMPLETO', frecuencia: 50, porcentaje: 60, exitoso: true },
    { patron: 'COMA_DECIMAL', frecuencia: 30, porcentaje: 36, exitoso: true }
  ],
  formatoDecimal: 'coma',
  formatoMiles: 'punto',
  tieneCorrupcionUTF8: false,
  tieneCoordenadasDMS: false,
  tieneCoordenadasNMEA: false,
  porcentajeExito: 85,
  totalRegistros: 100,
  registrosConCoordenadas: 85,
  confianzaPerfil: 'alta',
  ...overrides
});

// ============================================================================
// TESTS
// ============================================================================

describe('PatternLearningStore', () => {
  
  beforeEach(async () => {
    // Limpiar cache antes de cada test
    clearMemoryCache();
    
    // Limpiar base de datos
    const db = await getDatabase();
    await db.patterns.clear();
    await db.profiles.clear();
    await db.municipioStats.clear();
    await db.events.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Tests de conexión
  // --------------------------------------------------------------------------
  
  describe('getDatabase', () => {
    it('debe devolver una instancia de la base de datos', async () => {
      const db = await getDatabase();
      expect(db).toBeDefined();
      expect(db.name).toBe('PTELLearningDB');
    });

    it('debe devolver la misma instancia en llamadas sucesivas', async () => {
      const db1 = await getDatabase();
      const db2 = await getDatabase();
      expect(db1).toBe(db2);
    });
  });

  // --------------------------------------------------------------------------
  // Tests de patrones
  // --------------------------------------------------------------------------

  describe('Gestión de patrones', () => {
    
    it('debe guardar y recuperar un patrón', async () => {
      const patron = crearPatronPrueba({ name: 'Test guardar' });
      
      await saveLearnedPattern(patron);
      const recuperado = await getPattern(patron.id);
      
      expect(recuperado).toBeDefined();
      expect(recuperado?.name).toBe('Test guardar');
      expect(recuperado?.municipalities).toContain('Colomera');
    });

    it('debe recuperar todos los patrones', async () => {
      const patron1 = crearPatronPrueba({ id: 'p1', name: 'Patrón 1' });
      const patron2 = crearPatronPrueba({ id: 'p2', name: 'Patrón 2' });
      
      await saveLearnedPattern(patron1);
      await saveLearnedPattern(patron2);
      
      const todos = await getAllPatterns();
      expect(todos.length).toBe(2);
    });

    it('debe recuperar solo patrones estables', async () => {
      const estable = crearPatronPrueba({ id: 'estable', isStable: true });
      const inestable = crearPatronPrueba({ id: 'inestable', isStable: false });
      
      await saveLearnedPattern(estable);
      await saveLearnedPattern(inestable);
      
      const estables = await getStablePatterns();
      expect(estables.length).toBe(1);
      expect(estables[0].id).toBe('estable');
    });

    it('debe eliminar un patrón', async () => {
      const patron = crearPatronPrueba({ id: 'a_eliminar' });
      
      await saveLearnedPattern(patron);
      expect(await getPattern('a_eliminar')).toBeDefined();
      
      await deletePattern('a_eliminar');
      expect(await getPattern('a_eliminar')).toBeUndefined();
    });

    it('debe actualizar estadísticas de uso correctamente', async () => {
      const patron = crearPatronPrueba({ 
        id: 'stats_test',
        uses: 5,
        successes: 4,
        failures: 1
      });
      
      await saveLearnedPattern(patron);
      
      // Simular uso exitoso
      await updatePatternUsage('stats_test', true, 'Berja');
      
      const actualizado = await getPattern('stats_test');
      expect(actualizado?.uses).toBe(6);
      expect(actualizado?.successes).toBe(5);
      expect(actualizado?.municipalities).toContain('Berja');
    });

    it('debe marcar patrón como estable tras suficientes usos exitosos', async () => {
      const patron = crearPatronPrueba({ 
        id: 'estabilidad_test',
        uses: 9,
        successes: 9,
        failures: 0,
        isStable: false
      });
      
      await saveLearnedPattern(patron);
      
      // Un uso más exitoso debería marcarlo como estable (10 usos, 100% éxito)
      await updatePatternUsage('estabilidad_test', true);
      
      const actualizado = await getPattern('estabilidad_test');
      expect(actualizado?.isStable).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Tests de perfiles de documento
  // --------------------------------------------------------------------------

  describe('Perfiles de documento', () => {
    
    it('debe guardar y recuperar un perfil', async () => {
      const perfil = crearPerfilPrueba({ id: 'perfil_test' });
      
      await saveDocumentProfile(perfil);
      const recuperado = await getDocumentProfile('perfil_test');
      
      expect(recuperado).toBeDefined();
      expect(recuperado?.municipio).toBe('Colomera');
      expect(recuperado?.porcentajeExito).toBe(85);
    });

    it('debe actualizar estadísticas del municipio al guardar perfil', async () => {
      const perfil = crearPerfilPrueba({ 
        municipio: 'Castril',
        provincia: 'Granada',
        porcentajeExito: 75
      });
      
      await saveDocumentProfile(perfil);
      
      const stats = await getMunicipioStats('Castril', 'Granada');
      expect(stats).toBeDefined();
      expect(stats?.documentosProcesados).toBe(1);
      expect(stats?.tasaExitoPromedio).toBe(75);
    });
  });

  // --------------------------------------------------------------------------
  // Tests de exportación/importación
  // --------------------------------------------------------------------------

  describe('Exportación e importación', () => {
    
    it('debe exportar todos los datos', async () => {
      const patron = crearPatronPrueba({ id: 'export_test' });
      const perfil = crearPerfilPrueba({ id: 'export_profile' });
      
      await saveLearnedPattern(patron);
      await saveDocumentProfile(perfil);
      
      const exportado = await exportLearningData();
      
      expect(exportado.version).toBe('1.0.0');
      expect(exportado.patterns.length).toBe(1);
      expect(exportado.profiles.length).toBe(1);
    });

    it('debe importar datos en modo merge', async () => {
      // Patrón existente
      const existente = crearPatronPrueba({ id: 'existente', name: 'Original' });
      await saveLearnedPattern(existente);
      
      // Datos a importar
      const datosImportar = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        patterns: [
          crearPatronPrueba({ id: 'existente', name: 'Nuevo nombre' }),
          crearPatronPrueba({ id: 'nuevo', name: 'Patrón nuevo' })
        ],
        profiles: [],
        municipioStats: []
      };
      
      const resultado = await importLearningData(datosImportar, 'merge');
      
      // En modo merge, el existente no se sobreescribe
      expect(resultado.imported).toBe(1); // Solo el nuevo
      expect(resultado.skipped).toBe(1);  // El existente
      
      const original = await getPattern('existente');
      expect(original?.name).toBe('Original'); // No cambió
    });

    it('debe importar datos en modo replace', async () => {
      const existente = crearPatronPrueba({ id: 'a_reemplazar', name: 'Original' });
      await saveLearnedPattern(existente);
      
      const datosImportar = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        patterns: [
          crearPatronPrueba({ id: 'nuevo_unico', name: 'Único' })
        ],
        profiles: [],
        municipioStats: []
      };
      
      await importLearningData(datosImportar, 'replace');
      
      const todos = await getAllPatterns();
      expect(todos.length).toBe(1);
      expect(todos[0].name).toBe('Único');
    });
  });

  // --------------------------------------------------------------------------
  // Tests de estadísticas
  // --------------------------------------------------------------------------

  describe('Estadísticas del sistema', () => {
    
    it('debe calcular estadísticas correctamente', async () => {
      const patron1 = crearPatronPrueba({ id: 's1', isStable: true });
      const patron2 = crearPatronPrueba({ id: 's2', isStable: false });
      const perfil = crearPerfilPrueba();
      
      await saveLearnedPattern(patron1);
      await saveLearnedPattern(patron2);
      await saveDocumentProfile(perfil);
      
      const stats = await getLearningStats();
      
      expect(stats.totalPatterns).toBe(2);
      expect(stats.stablePatterns).toBe(1);
      expect(stats.totalProfiles).toBe(1);
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
    });
  });

  // --------------------------------------------------------------------------
  // Tests de cache
  // --------------------------------------------------------------------------

  describe('Cache en memoria', () => {
    
    it('debe usar cache para lecturas repetidas', async () => {
      const patron = crearPatronPrueba({ id: 'cache_test' });
      await saveLearnedPattern(patron);
      
      // Primera lectura (desde IndexedDB)
      const lectura1 = await getPattern('cache_test');
      
      // Segunda lectura (debería venir del cache)
      const lectura2 = await getPattern('cache_test');
      
      expect(lectura1).toEqual(lectura2);
    });

    it('debe limpiar cache correctamente', async () => {
      const patron = crearPatronPrueba({ id: 'clear_cache_test' });
      await saveLearnedPattern(patron);
      
      // Cargar en cache
      await getPattern('clear_cache_test');
      
      // Limpiar cache
      clearMemoryCache();
      
      const stats = await getLearningStats();
      expect(stats.cacheSize).toBe(0);
    });
  });
});
