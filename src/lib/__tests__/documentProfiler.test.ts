/**
 * Tests para documentProfiler
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';

import {
  analizarDocumento,
  analizarDocumentoRapido,
  sugerirEstrategia,
  type AnalysisInput,
  type RegistroCoordenas
} from '../documentProfiler';

// Helpers
const crearRegistro = (x: string, y: string, nombre = 'Test'): RegistroCoordenas => ({
  id: `reg_${Math.random().toString(36).substr(2, 5)}`,
  xOriginal: x,
  yOriginal: y,
  nombre,
  tipo: 'Infraestructura'
});

const crearInput = (registros: RegistroCoordenas[]): AnalysisInput => ({
  filename: 'test.odt',
  municipio: 'Colomera',
  provincia: 'Granada',
  registros
});

// Datasets
const EUROPEO = [
  crearRegistro('472.345,67', '4.123.456,78', 'Centro'),
  crearRegistro('472.123,45', '4.123.789,12', 'Colegio'),
];

const INTERNACIONAL = [
  crearRegistro('472345.67', '4123456.78', 'Centro'),
];

const CORRUPCION = [
  crearRegistro('472345,67Âº', '4123456,78', 'Centro'),
];

const DMS = [
  crearRegistro("37°10'25\"N", "3°45'30\"W", 'Centro'),
];

const INCOMPLETO = [
  crearRegistro('472345,67', '4123456,78', 'Centro'),
  crearRegistro('', '', 'Vacio1'),
  crearRegistro('', '', 'Vacio2'),
  crearRegistro('S/C', 'S/C', 'Placeholder'),
];

describe('documentProfiler', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('analizarDocumentoRapido', () => {
    it('detecta formato europeo', () => {
      const r = analizarDocumentoRapido(crearInput(EUROPEO));
      expect(r.formatoDetectado).toBe('europeo');
      expect(r.porcentajeCompletitud).toBe(100);
    });

    it('detecta formato internacional', () => {
      const r = analizarDocumentoRapido(crearInput(INTERNACIONAL));
      expect(r.formatoDetectado).toBe('internacional');
    });

    it('detecta problemas por corrupcion', () => {
      const r = analizarDocumentoRapido(crearInput(CORRUPCION));
      expect(r.tieneProblemas).toBe(true);
    });

    it('calcula completitud', () => {
      const r = analizarDocumentoRapido(crearInput(INCOMPLETO));
      expect(r.porcentajeCompletitud).toBe(25);
    });
  });

  describe('analizarDocumento', () => {
    it('genera perfil europeo', async () => {
      const r = await analizarDocumento(crearInput(EUROPEO));
      expect(r.profile.formatoDecimal).toBe('coma');
      expect(r.profile.municipio).toBe('Colomera');
    });

    it('detecta corrupcion UTF-8', async () => {
      const r = await analizarDocumento(crearInput(CORRUPCION));
      expect(r.profile.tieneCorrupcionUTF8).toBe(true);
    });

    it('detecta DMS', async () => {
      const r = await analizarDocumento(crearInput(DMS));
      expect(r.profile.tieneCoordenadasDMS).toBe(true);
    });

    it('genera recomendaciones para incompletos', async () => {
      const r = await analizarDocumento(crearInput(INCOMPLETO));
      expect(r.recomendaciones.length).toBeGreaterThan(0);
    });
  });

  describe('sugerirEstrategia', () => {
    it('ESTANDAR para limpios', async () => {
      const a = await analizarDocumento(crearInput(EUROPEO));
      const e = sugerirEstrategia(a.profile);
      expect(e.estrategia).toBe('ESTANDAR');
    });

    it('DEFENSIVA para corrupcion', async () => {
      const a = await analizarDocumento(crearInput(CORRUPCION));
      const e = sugerirEstrategia(a.profile);
      expect(e.estrategia).toBe('DEFENSIVA');
    });

    it('GEOCODIFICACION para incompletos', async () => {
      const a = await analizarDocumento(crearInput(INCOMPLETO));
      const e = sugerirEstrategia(a.profile);
      expect(e.estrategia).toBe('GEOCODIFICACION_INTENSIVA');
    });
  });

  describe('Edge cases', () => {
    it('maneja documento vacio', async () => {
      const r = await analizarDocumento(crearInput([]));
      expect(r.profile.totalRegistros).toBe(0);
    });
  });
});
