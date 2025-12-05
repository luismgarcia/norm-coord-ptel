/**
 * Fixture: Datos representativos de documentos PTEL
 * 
 * Simula el resultado del parsing de documentos ODT/Excel de diferentes
 * municipios andaluces con sus patrones de coordenadas característicos.
 * 
 * Municipios representados:
 * - Tíjola (Almería) - Formato europeo con puntos miles
 * - Colomera (Granada) - Coma decimal simple
 * - Berja (Almería) - Espacio + doble tilde (UTF-8 corrupto)
 * - Hornos (Jaén) - Punto miles sin decimales
 * 
 * @module __tests__/e2e/fixtures/ptelData
 * @session S1.2 - Test E2E flujo completo
 */

import type { ExtractedInfrastructure } from '../../../types/processing';

/**
 * Estructura que simula un documento PTEL parseado
 */
export interface ParsedPTELDocument {
  municipio: string;
  provincia: string;
  codigoINE: string;
  fechaDocumento?: string;
  tablas: PTELTableData[];
}

export interface PTELTableData {
  seccion: string;
  filas: PTELRow[];
}

export interface PTELRow {
  nombre: string;
  direccion?: string;
  coordX?: string;
  coordY?: string;
  tipo?: string;
  observaciones?: string;
}

// ============================================================================
// FIXTURE: TÍJOLA (ALMERÍA)
// Patrones: Coma decimal, direcciones complejas con ruido
// ============================================================================

export const DOCUMENT_TIJOLA: ParsedPTELDocument = {
  municipio: 'Tíjola',
  provincia: 'Almería',
  codigoINE: '04090',
  fechaDocumento: '2024-01-15',
  tablas: [
    {
      seccion: 'CENTROS SANITARIOS',
      filas: [
        {
          nombre: 'Centro de Salud Tíjola',
          direccion: 'Plaza Luis Gonzaga, n/ 1, de Tíjola, disponible 24 horas',
          coordX: '549.123,45',
          coordY: '4.137.890,12',
          tipo: 'SANITARIO',
        },
        {
          nombre: 'Farmacia Municipal',
          direccion: 'C/ Mayor, 15, Tíjola',
          coordX: '549.089,00',
          coordY: '4.137.765,50',
          tipo: 'SANITARIO',
        },
      ],
    },
    {
      seccion: 'CENTROS EDUCATIVOS',
      filas: [
        {
          nombre: 'CEIP San José',
          direccion: 'Avda. de la Constitución, s/n',
          coordX: '549.200,00',
          coordY: '4.137.950,00',
          tipo: 'EDUCATIVO',
        },
        {
          nombre: 'IES Alto Almanzora',
          direccion: 'Ctra. de Purchena, km 1',
          coordX: '', // Sin coordenadas - requiere geocodificación
          coordY: '',
          tipo: 'EDUCATIVO',
        },
      ],
    },
    {
      seccion: 'SERVICIOS DE EMERGENCIA',
      filas: [
        {
          nombre: 'Policía Local',
          direccion: 'C/Garcilaso de la Vega, n/ 5, bajo, Tíjola',
          coordX: '549.150,00',
          coordY: '4.137.820,00',
          tipo: 'SEGURIDAD',
        },
      ],
    },
  ],
};

// ============================================================================
// FIXTURE: COLOMERA (GRANADA)
// Patrones: Coma decimal simple, valores enteros
// ============================================================================

export const DOCUMENT_COLOMERA: ParsedPTELDocument = {
  municipio: 'Colomera',
  provincia: 'Granada',
  codigoINE: '18054',
  fechaDocumento: '2023-11-20',
  tablas: [
    {
      seccion: 'INFRAESTRUCTURAS MUNICIPALES',
      filas: [
        {
          nombre: 'Ayuntamiento de Colomera',
          direccion: 'Plaza de España, 1',
          coordX: '436780,0',
          coordY: '4136578,2',
          tipo: 'ADMINISTRATIVO',
        },
        {
          nombre: 'Centro Cultural',
          direccion: 'C/ Real, 25',
          coordX: '436850,5',
          coordY: '4136590,0',
          tipo: 'CULTURAL',
        },
      ],
    },
    {
      seccion: 'PATRIMONIO',
      filas: [
        {
          nombre: 'Iglesia de la Encarnación',
          direccion: 'Plaza de la Iglesia',
          coordX: '436795,0',
          coordY: '4136600,0',
          tipo: 'PATRIMONIO',
        },
      ],
    },
  ],
};

// ============================================================================
// FIXTURE: BERJA (ALMERÍA)
// Patrones: Espacio + doble tilde (UTF-8 corrupto), valores con espacios
// ============================================================================

export const DOCUMENT_BERJA: ParsedPTELDocument = {
  municipio: 'Berja',
  provincia: 'Almería',
  codigoINE: '04028',
  fechaDocumento: '2024-02-10',
  tablas: [
    {
      seccion: 'CENTROS SANITARIOS',
      filas: [
        {
          nombre: 'Centro de Salud Berja',
          direccion: 'Avda. de Almería, s/n',
          coordX: '504 750´´92', // Patrón Berja: espacio + doble tilde
          coordY: '4 077 153´´36',
          tipo: 'SANITARIO',
        },
        {
          nombre: 'Consultorio Los Cerrillos',
          direccion: 'C/ Principal, 1, Los Cerrillos',
          coordX: '506 320´´45',
          coordY: '4 078 200´´00',
          tipo: 'SANITARIO',
        },
      ],
    },
    {
      seccion: 'INSTALACIONES DEPORTIVAS',
      filas: [
        {
          nombre: 'Polideportivo Municipal',
          direccion: 'C/ del Deporte, s/n',
          coordX: '504 890´´00',
          coordY: '4 077 050´´00',
          tipo: 'DEPORTIVO',
        },
      ],
    },
  ],
};

// ============================================================================
// FIXTURE: HORNOS (JAÉN)
// Patrones: Punto miles sin decimal, coordenadas en header separados
// ============================================================================

export const DOCUMENT_HORNOS: ParsedPTELDocument = {
  municipio: 'Hornos',
  provincia: 'Jaén',
  codigoINE: '23044',
  fechaDocumento: '2023-09-05',
  tablas: [
    {
      seccion: 'PATRIMONIO HISTÓRICO',
      filas: [
        {
          nombre: 'Castillo de Hornos',
          direccion: 'Cerro del Castillo',
          coordX: '524.891', // Patrón Hornos: punto miles
          coordY: '4.229.920',
          tipo: 'PATRIMONIO',
        },
        {
          nombre: 'Iglesia de Nuestra Señora',
          direccion: 'Plaza de la Iglesia, 1',
          coordX: '524.750',
          coordY: '4.229.850',
          tipo: 'PATRIMONIO',
        },
      ],
    },
    {
      seccion: 'SERVICIOS ESENCIALES',
      filas: [
        {
          nombre: 'Consultorio Médico',
          direccion: 'C/ Real, 12',
          coordX: '524.800',
          coordY: '4.229.900',
          tipo: 'SANITARIO',
        },
      ],
    },
  ],
};

// ============================================================================
// FIXTURE: DOCUMENTO CON ERRORES (para test de resiliencia)
// ============================================================================

export const DOCUMENT_CON_ERRORES: ParsedPTELDocument = {
  municipio: 'TestMunicipio',
  provincia: 'TestProvincia',
  codigoINE: '99999',
  tablas: [
    {
      seccion: 'DATOS PROBLEMÁTICOS',
      filas: [
        // Sin coordenadas
        {
          nombre: 'Infraestructura sin coords',
          direccion: 'Calle desconocida',
          coordX: '',
          coordY: '',
          tipo: 'DESCONOCIDO',
        },
        // Coordenadas placeholder
        {
          nombre: 'Placeholder XXXX',
          direccion: 'Dirección pendiente',
          coordX: 'XXXX',
          coordY: 'YYYY',
          tipo: 'PENDIENTE',
        },
        // Coordenadas parciales
        {
          nombre: 'Solo X presente',
          direccion: 'Calle parcial',
          coordX: '500000,0',
          coordY: '',
          tipo: 'INCOMPLETO',
        },
        // Coordenadas fuera de rango Andalucía
        {
          nombre: 'Fuera de rango',
          direccion: 'Fuera de Andalucía',
          coordX: '50000,0', // Fuera de rango X Andalucía (X_MIN=100000)
          coordY: '3900000,0', // Fuera de rango Y Andalucía (Y_MIN=3980000)
          tipo: 'INVALIDO',
        },
        // Texto no numérico
        {
          nombre: 'Texto en coords',
          direccion: 'Ver mapa adjunto',
          coordX: 'Ver mapa',
          coordY: 'Anexo II',
          tipo: 'TEXTO',
        },
      ],
    },
  ],
};

// ============================================================================
// COLECCIÓN DE TODOS LOS DOCUMENTOS
// ============================================================================

export const ALL_TEST_DOCUMENTS: ParsedPTELDocument[] = [
  DOCUMENT_TIJOLA,
  DOCUMENT_COLOMERA,
  DOCUMENT_BERJA,
  DOCUMENT_HORNOS,
];

// ============================================================================
// RESULTADOS ESPERADOS (para validación de tests)
// ============================================================================

export interface ExpectedResult {
  municipio: string;
  totalInfraestructuras: number;
  conCoordenadas: number;
  sinCoordenadas: number;
  coordenadasValidas: number;
  requierenGeocodificacion: number;
}

export const EXPECTED_RESULTS: Record<string, ExpectedResult> = {
  'Tíjola': {
    municipio: 'Tíjola',
    totalInfraestructuras: 5,
    conCoordenadas: 4,
    sinCoordenadas: 1,
    coordenadasValidas: 4,
    requierenGeocodificacion: 1,
  },
  'Colomera': {
    municipio: 'Colomera',
    totalInfraestructuras: 3,
    conCoordenadas: 3,
    sinCoordenadas: 0,
    coordenadasValidas: 3,
    requierenGeocodificacion: 0,
  },
  'Berja': {
    municipio: 'Berja',
    totalInfraestructuras: 3,
    conCoordenadas: 3,
    sinCoordenadas: 0,
    coordenadasValidas: 3,
    requierenGeocodificacion: 0,
  },
  'Hornos': {
    municipio: 'Hornos',
    totalInfraestructuras: 3,
    conCoordenadas: 3,
    sinCoordenadas: 0,
    coordenadasValidas: 3,
    requierenGeocodificacion: 0,
  },
};

// ============================================================================
// HELPERS PARA TESTS
// ============================================================================

/**
 * Convierte un documento PTEL parseado a lista plana de infraestructuras
 */
export function flattenDocument(doc: ParsedPTELDocument): PTELRow[] {
  return doc.tablas.flatMap(tabla => tabla.filas);
}

/**
 * Cuenta infraestructuras con coordenadas válidas (no vacías, no placeholder)
 */
export function countWithCoordinates(rows: PTELRow[]): number {
  return rows.filter(row => 
    row.coordX && 
    row.coordY && 
    row.coordX.trim() !== '' && 
    row.coordY.trim() !== '' &&
    !isPlaceholder(row.coordX) &&
    !isPlaceholder(row.coordY)
  ).length;
}

/**
 * Detecta si un valor es placeholder
 */
function isPlaceholder(value: string): boolean {
  const placeholders = ['XXXX', 'YYYY', '0000', '----', 'N/A', 'n/a', 'Ver mapa', 'Anexo'];
  return placeholders.some(p => value.includes(p));
}

/**
 * Extrae solo infraestructuras que requieren geocodificación
 */
export function extractForGeocoding(rows: PTELRow[]): PTELRow[] {
  return rows.filter(row => 
    (!row.coordX || row.coordX.trim() === '' || isPlaceholder(row.coordX)) &&
    row.direccion && 
    row.direccion.trim() !== ''
  );
}
