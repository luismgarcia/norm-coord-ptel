/**
 * F025: Address Extractor - Snapshot Tests
 * 
 * Captura la salida completa de extractStreetAddress para los 63 casos.
 * Detecta cambios inesperados en transformaciones F025.
 * 
 * @created 2025-12-05
 * @session S1.4
 * @author MapWizard (Claude)
 */

import { describe, it, expect } from 'vitest';
import { extractStreetAddress } from '../addressExtractor';
import { 
  allTestCases, 
  tijolaTestCases, 
  colomeraTestCases, 
  berjaTestCases,
  dbfOdsTestCases,
  syntheticTestCases 
} from './addressExtractor.testCases';

// ============================================================================
// TIPOS PARA SNAPSHOTS
// ============================================================================

interface SnapshotOutput {
  id: string;
  input: string;
  municipality?: string;
  result: {
    address: string | null;
    confidence: number;
    reason?: string;
    transformations?: string[];
  };
}

// ============================================================================
// HELPER: Ejecutar caso y generar snapshot output
// ============================================================================

function runCase(tc: typeof allTestCases[0]): SnapshotOutput {
  const result = extractStreetAddress(tc.input, tc.municipality);
  return {
    id: tc.id,
    input: tc.input,
    municipality: tc.municipality,
    result: {
      address: result.address,
      confidence: result.confidence,
      reason: result.reason,
      transformations: result.transformations,
    },
  };
}

// ============================================================================
// SNAPSHOT TESTS - INDIVIDUALES POR CATEGORÍA
// ============================================================================

describe('AddressExtractor Snapshots - Tíjola (13)', () => {
  tijolaTestCases.forEach((tc) => {
    it(`[${tc.id}] ${tc.problemType}`, () => {
      const output = runCase(tc);
      expect(output).toMatchSnapshot();
    });
  });
});

describe('AddressExtractor Snapshots - Colomera (10)', () => {
  colomeraTestCases.forEach((tc) => {
    it(`[${tc.id}] ${tc.problemType}`, () => {
      const output = runCase(tc);
      expect(output).toMatchSnapshot();
    });
  });
});

describe('AddressExtractor Snapshots - Berja (9)', () => {
  berjaTestCases.forEach((tc) => {
    it(`[${tc.id}] ${tc.problemType}`, () => {
      const output = runCase(tc);
      expect(output).toMatchSnapshot();
    });
  });
});

describe('AddressExtractor Snapshots - DBF/ODS (7)', () => {
  dbfOdsTestCases.forEach((tc) => {
    it(`[${tc.id}] ${tc.problemType}`, () => {
      const output = runCase(tc);
      expect(output).toMatchSnapshot();
    });
  });
});

describe('AddressExtractor Snapshots - Sintéticos (24)', () => {
  syntheticTestCases.forEach((tc) => {
    it(`[${tc.id}] ${tc.problemType}`, () => {
      const output = runCase(tc);
      expect(output).toMatchSnapshot();
    });
  });
});

// ============================================================================
// SNAPSHOT CONSOLIDADO - TODOS LOS CASOS
// ============================================================================

describe('AddressExtractor Snapshots - Consolidado', () => {
  it('snapshot completo de los 63 casos', () => {
    const allOutputs = allTestCases.map(runCase);
    expect(allOutputs).toMatchSnapshot();
  });
});

// ============================================================================
// SNAPSHOT POR TIPO DE PROBLEMA
// ============================================================================

describe('AddressExtractor Snapshots - Por Tipo de Problema', () => {
  // Agrupar casos por problemType
  const byProblemType = allTestCases.reduce((acc, tc) => {
    if (!acc[tc.problemType]) {
      acc[tc.problemType] = [];
    }
    acc[tc.problemType].push(tc);
    return acc;
  }, {} as Record<string, typeof allTestCases>);

  Object.entries(byProblemType).forEach(([problemType, cases]) => {
    it(`problemType: ${problemType} (${cases.length} casos)`, () => {
      const outputs = cases.map(runCase);
      expect(outputs).toMatchSnapshot();
    });
  });
});

// ============================================================================
// TESTS DE REGRESIÓN ESPECÍFICOS
// ============================================================================

describe('AddressExtractor Regresión - Casos Críticos', () => {
  
  it('regresión: transformaciones F025 Step 7 (puntuación)', () => {
    // Casos que dependen específicamente del paso 7
    const step7Cases = [
      'COL-01', // número pegado
      'COL-02', // punto vs coma
      'BER-01', // dir+cp
      'SYN-04', // municipio_primero
      'SYN-05', // puntos_separadores
    ];
    
    const outputs = allTestCases
      .filter(tc => step7Cases.includes(tc.id))
      .map(runCase);
    
    expect(outputs).toMatchSnapshot();
  });

  it('regresión: casos NO geocodificables', () => {
    const nullCases = allTestCases.filter(tc => tc.expected === null);
    const outputs = nullCases.map(runCase);
    expect(outputs).toMatchSnapshot();
  });

  it('regresión: expansión de abreviaturas (C/ → Calle)', () => {
    const abbrevCases = allTestCases.filter(tc => 
      tc.input.includes('C/') || 
      tc.input.includes('Avda') || 
      tc.input.includes('Avd') ||
      tc.input.includes('Pza') ||
      tc.input.includes('AV.')
    );
    const outputs = abbrevCases.map(runCase);
    expect(outputs).toMatchSnapshot();
  });

  it('regresión: prefijos de infraestructura', () => {
    const prefixCases = allTestCases.filter(tc =>
      tc.input.includes('Centro de Salud') ||
      tc.input.includes('Ayuntamiento') ||
      tc.input.includes('CEIP') ||
      tc.input.includes('Policía') ||
      tc.input.includes('Consultorio')
    );
    const outputs = prefixCases.map(runCase);
    expect(outputs).toMatchSnapshot();
  });

  it('regresión: sufijos (horarios, teléfonos, CP)', () => {
    const suffixCases = allTestCases.filter(tc =>
      tc.input.includes('24 horas') ||
      tc.input.includes('Tel') ||
      tc.input.includes('04760') ||
      tc.input.includes('(Almería)')
    );
    const outputs = suffixCases.map(runCase);
    expect(outputs).toMatchSnapshot();
  });

  it('regresión: normalización UTF-8/OCR', () => {
    const utf8Cases = allTestCases.filter(tc =>
      tc.input.includes('NÂº') ||
      tc.input.includes('N.º') ||
      tc.input.includes('n/')
    );
    const outputs = utf8Cases.map(runCase);
    expect(outputs).toMatchSnapshot();
  });

  it('regresión: formato s/n y números', () => {
    const snCases = allTestCases.filter(tc =>
      tc.input.includes('s/n') ||
      tc.input.includes('S/N') ||
      tc.input.includes('s7n') ||
      tc.input.includes('N4')
    );
    const outputs = snCases.map(runCase);
    expect(outputs).toMatchSnapshot();
  });
});

// ============================================================================
// ESTADÍSTICAS DE SNAPSHOT
// ============================================================================

describe('AddressExtractor Stats', () => {
  it('estadísticas de resultados', () => {
    const outputs = allTestCases.map(runCase);
    
    const stats = {
      total: outputs.length,
      geocodificables: outputs.filter(o => o.result.address !== null).length,
      noGeocodificables: outputs.filter(o => o.result.address === null).length,
      confianzaAlta: outputs.filter(o => o.result.confidence >= 80).length,
      confianzaMedia: outputs.filter(o => o.result.confidence >= 50 && o.result.confidence < 80).length,
      confianzaBaja: outputs.filter(o => o.result.confidence > 0 && o.result.confidence < 50).length,
      sinConfianza: outputs.filter(o => o.result.confidence === 0).length,
      transformacionesPromedio: outputs
        .filter(o => o.result.transformations)
        .reduce((sum, o) => sum + (o.result.transformations?.length || 0), 0) / 
        outputs.filter(o => o.result.transformations).length,
    };
    
    expect(stats).toMatchSnapshot();
  });
});
