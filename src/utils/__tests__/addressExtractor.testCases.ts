/**
 * F025: Address Extractor - Casos de Test
 * 
 * 63 casos totales: 39 reales (extraídos de documentos PTEL) + 24 sintéticos
 * 
 * Fuentes:
 * - Tíjola (ODT): 13 casos
 * - Colomera (ODT): 10 casos
 * - Berja (DOCX): 9 casos
 * - DBF/ODS: 7 casos
 * - Sintéticos: 24 casos
 * 
 * Fecha: 2025-12-04
 */

export interface AddressTestCase {
  id: string;
  input: string;
  expected: string | null;
  municipality?: string;
  category: 'tijola' | 'colomera' | 'berja' | 'dbf_ods' | 'synthetic';
  problemType: string;
  notes?: string;
}

// ============================================================================
// CASOS REALES - TÍJOLA (13)
// ============================================================================
export const tijolaTestCases: AddressTestCase[] = [
  {
    id: 'TIJ-01',
    input: 'Centro de Salud Tíjola, Plaza Luis Gonzaga, n/ 1, de Tíjola, disponible 24 horas',
    expected: 'Plaza Luis Gonzaga, 1, Tíjola',
    municipality: 'Tíjola',
    category: 'tijola',
    problemType: 'nombre+dir+horario'
  },
  {
    id: 'TIJ-02',
    input: 'Ayuntamiento de Tíjola, despachos municipales, Plaza de España, n/ 1, Tíjola, 950420300- Disponible 24 horas',
    expected: 'Plaza de España, 1, Tíjola',
    municipality: 'Tíjola',
    category: 'tijola',
    problemType: 'nombre+extra+tel+horario'
  },
  {
    id: 'TIJ-03',
    input: 'C/Garcilaso de la Vega, n/ 5, bajo, Tíjola, disponible 24 horas',
    expected: 'Calle Garcilaso de la Vega, 5, Tíjola',
    municipality: 'Tíjola',
    category: 'tijola',
    problemType: 'dir+piso+horario'
  },
  {
    id: 'TIJ-04',
    input: 'Policía Local, C/Garcilaso de la Vega, n/ 5, bajo, Tíjola',
    expected: 'Calle Garcilaso de la Vega, 5, Tíjola',
    municipality: 'Tíjola',
    category: 'tijola',
    problemType: 'nombre+dir+piso'
  },
  {
    id: 'TIJ-05',
    input: 'Consorcio de Bomberos Levante Almeriense, Avda. De la Estación s/n, Albox (Almería)',
    expected: 'Avenida de la Estación, s/n, Albox',
    municipality: 'Albox',
    category: 'tijola',
    problemType: 'nombre+dir+otro_municipio',
    notes: 'Municipio extraído del texto, no Tíjola'
  },
  {
    id: 'TIJ-06',
    input: 'Pabellón Municipal de Deportes, C/ Francisco Quevedo, s/n, Tíjola',
    expected: 'Calle Francisco Quevedo, s/n, Tíjola',
    municipality: 'Tíjola',
    category: 'tijola',
    problemType: 'nombre+dir'
  },
  {
    id: 'TIJ-07',
    input: 'Poligono Industrial Tíjola, s/n, Diponibilidad 24 horas',
    expected: 'Polígono Industrial, s/n, Tíjola',
    municipality: 'Tíjola',
    category: 'tijola',
    problemType: 'poligono+typo'
  },
  {
    id: 'TIJ-08',
    input: 'Carretera 334, frente Cuartel Guardia Civil, Tíjola',
    expected: 'Carretera 334, Tíjola',
    municipality: 'Tíjola',
    category: 'tijola',
    problemType: 'carretera+ref_relativa'
  },
  {
    id: 'TIJ-09',
    input: 'Lugar más próximo donde se localice la emergencia',
    expected: null,
    category: 'tijola',
    problemType: 'no_geocodificable'
  },
  {
    id: 'TIJ-10',
    input: '3,- Cargos Políticos, 3,- Funcionarios de Ayuntamiento Tíjola',
    expected: null,
    category: 'tijola',
    problemType: 'no_geocodificable'
  },
  {
    id: 'TIJ-11',
    input: 'Avda José Antonio, n/ 18, Tíjola',
    expected: 'Avenida José Antonio, 18, Tíjola',
    municipality: 'Tíjola',
    category: 'tijola',
    problemType: 'dir_simple'
  },
  {
    id: 'TIJ-12',
    input: 'C/ Santa María, n/ 1',
    expected: 'Calle Santa María, 1',
    category: 'tijola',
    problemType: 'dir_sin_municipio'
  },
  {
    id: 'TIJ-13',
    input: 'C/ Enriqueta Reche, s7n',
    expected: 'Calle Enriqueta Reche, s/n',
    category: 'tijola',
    problemType: 'typo_sn'
  }
];

// ============================================================================
// CASOS REALES - COLOMERA (10)
// ============================================================================
export const colomeraTestCases: AddressTestCase[] = [
  {
    id: 'COL-01',
    input: 'C/ erillas, 2Colomera',
    expected: 'Calle Erillas, 2, Colomera',
    municipality: 'Colomera',
    category: 'colomera',
    problemType: 'numero_pegado'
  },
  {
    id: 'COL-02',
    input: 'Avd Virgen de la Cabeza, 9. Colomera',
    expected: 'Avenida Virgen de la Cabeza, 9, Colomera',
    municipality: 'Colomera',
    category: 'colomera',
    problemType: 'punto_vs_coma'
  },
  {
    id: 'COL-03',
    input: 'CONSULTORIO MÉDICO DE COLOMERA Y DEL CONSULTORIO AUXILIAR DEL CAURO',
    expected: null,
    category: 'colomera',
    problemType: 'solo_nombre'
  },
  {
    id: 'COL-04',
    input: 'Avd. Benalua C/ Paz 1 C/ Amapola 8',
    expected: null,
    category: 'colomera',
    problemType: 'multiples_direcciones'
  },
  {
    id: 'COL-05',
    input: 'Pol 14- P 146',
    expected: null,
    category: 'colomera',
    problemType: 'parcela_catastral'
  },
  {
    id: 'COL-06',
    input: 'C/ Pilarillo s/n C/ Cuesta de las Fuentes s/n',
    expected: null,
    category: 'colomera',
    problemType: 'multiples_direcciones'
  },
  {
    id: 'COL-07',
    input: 'Calle Iglesia, 1',
    expected: 'Calle Iglesia, 1',
    category: 'colomera',
    problemType: 'direccion_limpia'
  },
  {
    id: 'COL-08',
    input: 'Vereda del Camino Real de Madrid',
    expected: 'Vereda del Camino Real de Madrid',
    category: 'colomera',
    problemType: 'vereda_sin_num'
  },
  {
    id: 'COL-09',
    input: 'Paraje cortijo el chopo',
    expected: 'Paraje Cortijo El Chopo',
    category: 'colomera',
    problemType: 'paraje'
  },
  {
    id: 'COL-10',
    input: 'AV. Benalúa s/n',
    expected: 'Avenida Benalúa, s/n',
    category: 'colomera',
    problemType: 'mayusculas'
  }
];

// ============================================================================
// CASOS REALES - BERJA (9)
// ============================================================================
export const berjaTestCases: AddressTestCase[] = [
  {
    id: 'BER-01',
    input: 'Plaza de la Constitución 1.  Berja 04760',
    expected: 'Plaza de la Constitución, 1, Berja',
    municipality: 'Berja',
    category: 'berja',
    problemType: 'dir+cp'
  },
  {
    id: 'BER-02',
    input: 'C/ Carretera de Adra s/n Berja. Teléfono. 600 10 90 00',
    expected: 'Calle Carretera de Adra, s/n, Berja',
    municipality: 'Berja',
    category: 'berja',
    problemType: 'dir+telefono'
  },
  {
    id: 'BER-03',
    input: 'C/LOS ACTECAS NAVE N.º 11',
    expected: 'Calle Los Aztecas, nave 11',
    category: 'berja',
    problemType: 'nave+typo',
    notes: 'ACTECAS es typo de Aztecas'
  },
  {
    id: 'BER-04',
    input: 'POLIGONO C/ QUINTA AVENIDA S/N',
    expected: 'Polígono, Calle Quinta Avenida, s/n',
    category: 'berja',
    problemType: 'poligono+calle'
  },
  {
    id: 'BER-05',
    input: 'C/ PLAZA DE LA CONSTITUCIÓN N.º 6',
    expected: 'Plaza de la Constitución, 6',
    category: 'berja',
    problemType: 'c_plaza_redundante',
    notes: 'C/ PLAZA redundante - extraer solo Plaza'
  },
  {
    id: 'BER-06',
    input: 'Policía Local Municipal. Jefatura: Plaza de la Constitución 1.  Berja 04760',
    expected: 'Plaza de la Constitución, 1, Berja',
    municipality: 'Berja',
    category: 'berja',
    problemType: 'nombre+jefatura+dir'
  },
  {
    id: 'BER-07',
    input: 'Consultorio Centro de Salud de Berja - URGENCIAS. C/ Carretera de Adra s/n Berja',
    expected: 'Calle Carretera de Adra, s/n, Berja',
    municipality: 'Berja',
    category: 'berja',
    problemType: 'nombre_largo+dir'
  },
  {
    id: 'BER-08',
    input: 'c/ llano Vilches 21',
    expected: 'Calle Llano Vilches, 21',
    category: 'berja',
    problemType: 'minusculas'
  },
  {
    id: 'BER-09',
    input: 'C/ LOS Geranios - 2',
    expected: 'Calle Los Geranios, 2',
    category: 'berja',
    problemType: 'guion_numero'
  }
];

// ============================================================================
// CASOS REALES - DBF/ODS (7)
// ============================================================================
export const dbfOdsTestCases: AddressTestCase[] = [
  {
    id: 'DBF-01',
    input: 'CALLE ESCUELAS NÂº 1',
    expected: 'Calle Escuelas, 1',
    category: 'dbf_ods',
    problemType: 'utf8_corrupto',
    notes: 'NÂº es corrupción UTF-8 de Nº'
  },
  {
    id: 'DBF-02',
    input: 'CUESTA MATUETE S/N',
    expected: 'Cuesta Matuete, s/n',
    category: 'dbf_ods',
    problemType: 'mayusculas'
  },
  {
    id: 'DBF-03',
    input: 'AUTOVIA A-92 DIRECCION GRANADA',
    expected: 'Autovía A-92, dirección Granada',
    category: 'dbf_ods',
    problemType: 'autovia'
  },
  {
    id: 'DBF-04',
    input: 'Moredal, 15',
    expected: 'Moredal, 15',
    category: 'dbf_ods',
    problemType: 'sin_tipo_via'
  },
  {
    id: 'DBF-05',
    input: 'CL. Ramón y Cajal 5.',
    expected: 'Calle Ramón y Cajal, 5',
    category: 'dbf_ods',
    problemType: 'cl_punto'
  },
  {
    id: 'DBF-06',
    input: 'CAMINO CAMPO FUTBOL 7',
    expected: 'Camino Campo Fútbol, 7',
    category: 'dbf_ods',
    problemType: 'camino'
  },
  {
    id: 'DBF-07',
    input: 'CAMINO CAMPO DE FÚTBOL N4',
    expected: 'Camino Campo de Fútbol, 4',
    category: 'dbf_ods',
    problemType: 'n_pegado'
  }
];

// ============================================================================
// CASOS SINTÉTICOS (24)
// Generados a partir de patrones observados en documentos reales
// ============================================================================
export const syntheticTestCases: AddressTestCase[] = [
  // --- Variaciones de orden (7) ---
  {
    id: 'SYN-01',
    input: 'Calle Mayor, 15, Villanueva',
    expected: 'Calle Mayor, 15, Villanueva',
    category: 'synthetic',
    problemType: 'orden_normal'
  },
  {
    id: 'SYN-02',
    input: 'Calle Mayor 15 Villanueva',
    expected: 'Calle Mayor, 15, Villanueva',
    category: 'synthetic',
    problemType: 'orden_sin_comas'
  },
  {
    id: 'SYN-03',
    input: 'C/Mayor, 15, Villanueva',
    expected: 'Calle Mayor, 15, Villanueva',
    category: 'synthetic',
    problemType: 'orden_pegado'
  },
  {
    id: 'SYN-04',
    input: 'Villanueva, Calle Mayor, 15',
    expected: 'Calle Mayor, 15, Villanueva',
    category: 'synthetic',
    problemType: 'municipio_primero'
  },
  {
    id: 'SYN-05',
    input: 'Calle Mayor. 15. Villanueva',
    expected: 'Calle Mayor, 15, Villanueva',
    category: 'synthetic',
    problemType: 'puntos_separadores'
  },
  {
    id: 'SYN-06',
    input: 'Calle Mayor, n/ 15, Villanueva',
    expected: 'Calle Mayor, 15, Villanueva',
    category: 'synthetic',
    problemType: 'formato_n_barra'
  },
  {
    id: 'SYN-07',
    input: 'Calle Mayor, nº 15, Villanueva',
    expected: 'Calle Mayor, 15, Villanueva',
    category: 'synthetic',
    problemType: 'formato_numero_ordinal'
  },

  // --- Variaciones de infraestructura (8) ---
  {
    id: 'SYN-08',
    input: 'Centro de Salud, Calle Real, 1',
    expected: 'Calle Real, 1',
    category: 'synthetic',
    problemType: 'prefijo_centro_salud'
  },
  {
    id: 'SYN-09',
    input: 'Centro de Salud de Villanueva, Calle Real, 1',
    expected: 'Calle Real, 1',
    category: 'synthetic',
    problemType: 'prefijo_centro_salud_municipio'
  },
  {
    id: 'SYN-10',
    input: 'Consultorio Local, Plaza Mayor, s/n',
    expected: 'Plaza Mayor, s/n',
    category: 'synthetic',
    problemType: 'prefijo_consultorio'
  },
  {
    id: 'SYN-11',
    input: 'CEIP San Juan, Avenida de la Paz, 5',
    expected: 'Avenida de la Paz, 5',
    category: 'synthetic',
    problemType: 'prefijo_ceip'
  },
  {
    id: 'SYN-12',
    input: 'Residencia de Mayores Santa Ana, Calle Nueva, 10',
    expected: 'Calle Nueva, 10',
    category: 'synthetic',
    problemType: 'prefijo_residencia'
  },
  {
    id: 'SYN-13',
    input: 'Policía Local, Calle Guardia, 3',
    expected: 'Calle Guardia, 3',
    category: 'synthetic',
    problemType: 'prefijo_policia'
  },
  {
    id: 'SYN-14',
    input: 'Ayuntamiento, Plaza de España, 1',
    expected: 'Plaza de España, 1',
    category: 'synthetic',
    problemType: 'prefijo_ayuntamiento'
  },
  {
    id: 'SYN-15',
    input: 'Ayuntamiento de Villanueva, Plaza de España, 1',
    expected: 'Plaza de España, 1',
    category: 'synthetic',
    problemType: 'prefijo_ayuntamiento_municipio'
  },

  // --- Variaciones de sufijo (9) ---
  {
    id: 'SYN-16',
    input: 'Calle Real, 1, disponible 24 horas',
    expected: 'Calle Real, 1',
    category: 'synthetic',
    problemType: 'sufijo_horario_24h'
  },
  {
    id: 'SYN-17',
    input: 'Calle Real, 1. Disponibilidad 24 horas.',
    expected: 'Calle Real, 1',
    category: 'synthetic',
    problemType: 'sufijo_disponibilidad'
  },
  {
    id: 'SYN-18',
    input: 'Calle Real, 1, 24h',
    expected: 'Calle Real, 1',
    category: 'synthetic',
    problemType: 'sufijo_24h'
  },
  {
    id: 'SYN-19',
    input: 'Calle Real, 1. Tel: 958123456',
    expected: 'Calle Real, 1',
    category: 'synthetic',
    problemType: 'sufijo_telefono'
  },
  {
    id: 'SYN-20',
    input: 'Calle Real, 1, Tlf. 666123456',
    expected: 'Calle Real, 1',
    category: 'synthetic',
    problemType: 'sufijo_tlf'
  },
  {
    id: 'SYN-21',
    input: 'Calle Real, 1, Villanueva (Almería)',
    expected: 'Calle Real, 1, Villanueva',
    category: 'synthetic',
    problemType: 'sufijo_provincia'
  },
  {
    id: 'SYN-22',
    input: 'Calle Real, 1, bajo',
    expected: 'Calle Real, 1',
    category: 'synthetic',
    problemType: 'sufijo_piso'
  },
  {
    id: 'SYN-23',
    input: 'Calle Real, 1, Villanueva, 04760',
    expected: 'Calle Real, 1, Villanueva',
    category: 'synthetic',
    problemType: 'sufijo_cp'
  },
  {
    id: 'SYN-24',
    input: 'Calle Real, 1 - horario L-V 8-15',
    expected: 'Calle Real, 1',
    category: 'synthetic',
    problemType: 'sufijo_horario_lv'
  }
];

// ============================================================================
// EXPORTACIÓN CONSOLIDADA
// ============================================================================

/** Todos los casos de test (63) */
export const allTestCases: AddressTestCase[] = [
  ...tijolaTestCases,
  ...colomeraTestCases,
  ...berjaTestCases,
  ...dbfOdsTestCases,
  ...syntheticTestCases
];

/** Solo casos reales (39) */
export const realTestCases: AddressTestCase[] = [
  ...tijolaTestCases,
  ...colomeraTestCases,
  ...berjaTestCases,
  ...dbfOdsTestCases
];

/** Solo casos que deberían retornar null (no geocodificables) */
export const nullExpectedCases: AddressTestCase[] = 
  allTestCases.filter(tc => tc.expected === null);

/** Casos agrupados por tipo de problema */
export const casesByProblemType = allTestCases.reduce((acc, tc) => {
  if (!acc[tc.problemType]) {
    acc[tc.problemType] = [];
  }
  acc[tc.problemType].push(tc);
  return acc;
}, {} as Record<string, AddressTestCase[]>);
