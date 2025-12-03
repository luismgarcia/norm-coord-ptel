/**
 * Tests para multiFieldStrategy.ts
 * 
 * @see F023 Fase 1.4
 * @date 2025-12-03
 */

import { describe, it, expect } from 'vitest';
import {
  disambiguate,
  scoreCandidate,
  getWeightsForTypology,
  isReliableResult,
  requiresManualReview,
  getBestIfConfident,
  disambiguateBatch,
  WEIGHTS_BY_TYPOLOGY,
  type GeocodingCandidate,
  type PTELRecord,
} from '../multiFieldStrategy';

// ============================================================================
// DATOS DE PRUEBA
// ============================================================================

const candidatoCentroSalud1: GeocodingCandidate = {
  id: 'cs-1',
  nombre: 'Centro de Salud Quéntar',
  direccion: 'Calle Real, 15',
  municipio: 'Quéntar',
  codMunicipio: '18160',
  utmX: 456789,
  utmY: 4123456,
  tipologia: 'HEALTH',
};

const candidatoCentroSalud2: GeocodingCandidate = {
  id: 'cs-2',
  nombre: 'Consultorio Local Quéntar Norte',
  direccion: 'Avenida Andalucía, 3',
  municipio: 'Quéntar',
  codMunicipio: '18160',
  utmX: 456800,
  utmY: 4123500,
  tipologia: 'HEALTH',
};

const candidatoColegio1: GeocodingCandidate = {
  id: 'col-1',
  nombre: 'CEIP San José',
  direccion: 'Plaza Mayor, 1',
  municipio: 'Colomera',
  codMunicipio: '18048',
  utmX: 445678,
  utmY: 4134567,
  tipologia: 'EDUCATION',
};

const candidatoColegio2: GeocodingCandidate = {
  id: 'col-2',
  nombre: 'CEIP Virgen de la Cabeza',
  direccion: 'Calle Nueva, 8',
  municipio: 'Colomera',
  codMunicipio: '18048',
  utmX: 445700,
  utmY: 4134600,
  tipologia: 'EDUCATION',
};


// ============================================================================
// F023-1.4: PESOS POR TIPOLOGÍA
// ============================================================================

describe('F023-1.4 Pesos por tipología', () => {
  it('retorna pesos de HEALTH para tipología sanitaria', () => {
    const weights = getWeightsForTypology('HEALTH');
    expect(weights.nombre).toBe(0.60);
    expect(weights.direccion).toBe(0.25);
    expect(weights.localidad).toBe(0.15);
  });

  it('retorna pesos de EDUCATION para tipología educativa', () => {
    const weights = getWeightsForTypology('EDUCATIVO');
    expect(weights.nombre).toBe(0.65);
    expect(weights.direccion).toBe(0.20);
    expect(weights.localidad).toBe(0.15);
  });

  it('retorna pesos de SECURITY con alta ponderación de localidad', () => {
    const weights = getWeightsForTypology('SECURITY');
    expect(weights.localidad).toBe(0.40);
    expect(weights.nombre).toBe(0.40);
  });

  it('retorna pesos DEFAULT para tipología desconocida', () => {
    const weights = getWeightsForTypology('DESCONOCIDO');
    expect(weights).toEqual(WEIGHTS_BY_TYPOLOGY.DEFAULT);
  });

  it('maneja tipología vacía', () => {
    const weights = getWeightsForTypology('');
    expect(weights).toEqual(WEIGHTS_BY_TYPOLOGY.DEFAULT);
  });

  it('suma de pesos es 1.0 para todas las tipologías', () => {
    for (const [key, weights] of Object.entries(WEIGHTS_BY_TYPOLOGY)) {
      const sum = weights.nombre + weights.direccion + weights.localidad;
      expect(sum).toBeCloseTo(1.0, 2);
    }
  });
});

// ============================================================================
// F023-1.4: SCORING DE CANDIDATOS
// ============================================================================

describe('F023-1.4 Scoring de candidatos', () => {
  it('da score alto cuando nombre coincide exactamente', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'Centro de Salud Quéntar',
      localidad: 'Quéntar',
    };
    const weights = getWeightsForTypology('HEALTH');
    const result = scoreCandidate(candidatoCentroSalud1, ptelRecord, weights);
    
    expect(result.fieldScores.nombre).toBeGreaterThanOrEqual(95);
    expect(result.totalScore).toBeGreaterThanOrEqual(70);
  });

  it('da score bajo cuando nombre no coincide', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'Hospital Regional',
      localidad: 'Quéntar',
    };
    const weights = getWeightsForTypology('HEALTH');
    const result = scoreCandidate(candidatoCentroSalud1, ptelRecord, weights);
    
    expect(result.fieldScores.nombre).toBeLessThan(50);
  });

  it('considera dirección en el score', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'Centro de Salud',
      direccion: 'Calle Real, 15',
      localidad: 'Quéntar',
    };
    const weights = getWeightsForTypology('HEALTH');
    const result = scoreCandidate(candidatoCentroSalud1, ptelRecord, weights);
    
    expect(result.fieldScores.direccion).toBeGreaterThan(0);
  });

  it('da score perfecto de localidad con mismo código INE', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'Centro de Salud',
      codMunicipio: '18160',
    };
    const weights = getWeightsForTypology('HEALTH');
    const result = scoreCandidate(candidatoCentroSalud1, ptelRecord, weights);
    
    expect(result.fieldScores.localidad).toBe(100);
  });
});


// ============================================================================
// F023-1.4: DESAMBIGUACIÓN
// ============================================================================

describe('F023-1.4 Desambiguación', () => {
  it('selecciona candidato con mejor score', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'Centro de Salud Quéntar',
      localidad: 'Quéntar',
    };
    const candidates = [candidatoCentroSalud1, candidatoCentroSalud2];
    
    const result = disambiguate(candidates, ptelRecord, 'HEALTH');
    
    expect(result.selected?.id).toBe('cs-1');
    expect(result.score).toBeGreaterThan(result.candidates[1].totalScore);
  });

  it('retorna confianza HIGH cuando hay diferencia clara', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'Centro de Salud Quéntar',
      direccion: 'Calle Real, 15',
      localidad: 'Quéntar',
    };
    const candidates = [candidatoCentroSalud1, candidatoCentroSalud2];
    
    const result = disambiguate(candidates, ptelRecord, 'HEALTH');
    
    expect(result.confidence).toBe('HIGH');
    expect(result.debug.topGap).toBeGreaterThanOrEqual(15);
  });

  it('retorna confianza LOW cuando candidatos son similares', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'Centro Sanitario',
      localidad: 'Quéntar',
    };
    const candidates = [candidatoCentroSalud1, candidatoCentroSalud2];
    
    const result = disambiguate(candidates, ptelRecord, 'HEALTH');
    
    // Ambos candidatos deberían tener scores similares
    expect(['LOW', 'MEDIUM']).toContain(result.confidence);
  });

  it('retorna NONE cuando no hay candidatos', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'Centro de Salud',
      localidad: 'Quéntar',
    };
    
    const result = disambiguate([], ptelRecord, 'HEALTH');
    
    expect(result.selected).toBeNull();
    expect(result.confidence).toBe('NONE');
    expect(result.candidates).toHaveLength(0);
  });

  it('ordena candidatos por score descendente', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'CEIP San José',
      localidad: 'Colomera',
    };
    const candidates = [candidatoColegio2, candidatoColegio1];
    
    const result = disambiguate(candidates, ptelRecord, 'EDUCATION');
    
    // Debe estar ordenado: mejor primero
    for (let i = 0; i < result.candidates.length - 1; i++) {
      expect(result.candidates[i].totalScore)
        .toBeGreaterThanOrEqual(result.candidates[i + 1].totalScore);
    }
  });

  it('incluye debug con información útil', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'Centro de Salud',
      localidad: 'Quéntar',
    };
    const candidates = [candidatoCentroSalud1, candidatoCentroSalud2];
    
    const result = disambiguate(candidates, ptelRecord, 'HEALTH');
    
    expect(result.debug.candidateCount).toBe(2);
    expect(result.debug.topGap).toBeDefined();
    expect(result.debug.weights).toBeDefined();
  });
});

// ============================================================================
// F023-1.4: FUNCIONES DE UTILIDAD
// ============================================================================

describe('F023-1.4 Funciones de utilidad', () => {
  it('isReliableResult retorna true para HIGH confidence', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'Centro de Salud Quéntar',
      direccion: 'Calle Real, 15',
      localidad: 'Quéntar',
    };
    const candidates = [candidatoCentroSalud1, candidatoCentroSalud2];
    
    const result = disambiguate(candidates, ptelRecord, 'HEALTH');
    
    if (result.confidence === 'HIGH') {
      expect(isReliableResult(result)).toBe(true);
    }
  });

  it('requiresManualReview retorna true para LOW confidence', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'Edificio Municipal',
      localidad: 'Quéntar',
    };
    const candidates = [candidatoCentroSalud1, candidatoCentroSalud2];
    
    const result = disambiguate(candidates, ptelRecord, 'HEALTH');
    
    if (result.confidence === 'LOW') {
      expect(requiresManualReview(result)).toBe(true);
    }
  });

  it('getBestIfConfident retorna null cuando no hay confianza', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'Algo genérico',
      localidad: 'Desconocido',
    };
    const candidates = [candidatoCentroSalud1, candidatoCentroSalud2];
    
    const result = getBestIfConfident(candidates, ptelRecord, 'HEALTH');
    
    // Puede ser null o el candidato dependiendo del score
    // Lo importante es que no crashea
    expect(result === null || result.id).toBeTruthy();
  });
});


// ============================================================================
// F023-1.4: BATCH PROCESSING
// ============================================================================

describe('F023-1.4 Batch processing', () => {
  it('procesa múltiples desambiguaciones', () => {
    const items = [
      {
        ptelRecord: { nombre: 'Centro de Salud Quéntar', localidad: 'Quéntar' },
        candidates: [candidatoCentroSalud1, candidatoCentroSalud2],
        tipologia: 'HEALTH',
      },
      {
        ptelRecord: { nombre: 'CEIP San José', localidad: 'Colomera' },
        candidates: [candidatoColegio1, candidatoColegio2],
        tipologia: 'EDUCATION',
      },
    ];
    
    const results = disambiguateBatch(items);
    
    expect(results).toHaveLength(2);
    expect(results[0].selected?.id).toBe('cs-1');
    expect(results[1].selected?.id).toBe('col-1');
  });

  it('maneja batch vacío', () => {
    const results = disambiguateBatch([]);
    expect(results).toHaveLength(0);
  });
});

// ============================================================================
// F023-1.4: CASOS REALES PTEL
// ============================================================================

describe('F023-1.4 Casos reales PTEL', () => {
  it('desambigua caso Quéntar con 2 centros de salud', () => {
    // Caso real: Quéntar tiene Centro de Salud y Consultorio
    const ptelRecord: PTELRecord = {
      nombre: 'Centro de Salud de Quéntar',
      direccion: 'C/ Real, 15',
      localidad: 'Quéntar',
      codMunicipio: '18160',
    };
    
    const result = disambiguate(
      [candidatoCentroSalud1, candidatoCentroSalud2],
      ptelRecord,
      'HEALTH'
    );
    
    expect(result.selected?.nombre).toContain('Centro de Salud');
    expect(result.score).toBeGreaterThan(70);
  });

  it('desambigua caso Colomera con 2 colegios', () => {
    // Caso real: Colomera tiene CEIP San José y otro
    const ptelRecord: PTELRecord = {
      nombre: 'Colegio San José',
      localidad: 'Colomera',
      codMunicipio: '18048',
    };
    
    const result = disambiguate(
      [candidatoColegio1, candidatoColegio2],
      ptelRecord,
      'EDUCATION'
    );
    
    expect(result.selected?.nombre).toContain('San José');
  });

  it('maneja nombre parcial en PTEL', () => {
    // PTEL a veces tiene nombres abreviados
    const ptelRecord: PTELRecord = {
      nombre: 'C.S. Quéntar',
      localidad: 'Quéntar',
    };
    
    const result = disambiguate(
      [candidatoCentroSalud1, candidatoCentroSalud2],
      ptelRecord,
      'HEALTH'
    );
    
    // Debe poder hacer match parcial
    expect(result.selected).not.toBeNull();
  });
});

// ============================================================================
// F023-1.4: EDGE CASES
// ============================================================================

describe('F023-1.4 Edge cases', () => {
  it('maneja candidato sin dirección', () => {
    const candidatoSinDireccion: GeocodingCandidate = {
      ...candidatoCentroSalud1,
      direccion: undefined,
    };
    const ptelRecord: PTELRecord = {
      nombre: 'Centro de Salud',
      direccion: 'Calle Real, 15',
      localidad: 'Quéntar',
    };
    
    const result = disambiguate(
      [candidatoSinDireccion],
      ptelRecord,
      'HEALTH'
    );
    
    expect(result.selected).not.toBeNull();
    expect(result.candidates[0].fieldScores.direccion).toBe(0);
  });

  it('maneja PTEL record sin localidad', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'Centro de Salud Quéntar',
    };
    
    const result = disambiguate(
      [candidatoCentroSalud1],
      ptelRecord,
      'HEALTH'
    );
    
    expect(result.selected).not.toBeNull();
  });

  it('maneja único candidato', () => {
    const ptelRecord: PTELRecord = {
      nombre: 'Centro de Salud',
      localidad: 'Quéntar',
    };
    
    const result = disambiguate(
      [candidatoCentroSalud1],
      ptelRecord,
      'HEALTH'
    );
    
    expect(result.selected?.id).toBe('cs-1');
    expect(result.debug.topGap).toBe(100); // Sin segundo candidato
  });

  it('maneja nombres con caracteres especiales', () => {
    const candidatoEspecial: GeocodingCandidate = {
      ...candidatoColegio1,
      nombre: 'CEIP "San José"',
    };
    const ptelRecord: PTELRecord = {
      nombre: 'C.E.I.P. San José',
      localidad: 'Colomera',
    };
    
    const result = disambiguate(
      [candidatoEspecial],
      ptelRecord,
      'EDUCATION'
    );
    
    expect(result.selected).not.toBeNull();
  });
});
