/**
 * wfsResponses.ts
 * 
 * Respuestas mock para servicios WFS y APIs externas.
 * Evita timeouts de red en tests y garantiza resultados deterministas.
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

// ============================================================================
// RESPUESTAS WFS ISE (Inventario de Sedes y Equipamientos)
// ============================================================================

export const WFS_ISE_HEALTH_COLOMERA = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'g12_01_CentroSalud.1234',
      geometry: {
        type: 'Point',
        coordinates: [436865, 4136333]
      },
      properties: {
        nica: '18051001',
        nombre: 'Consultorio Médico de Colomera',
        direccion: 'C/ Real, 1',
        municipio: 'Colomera',
        provincia: 'Granada',
        cod_mun: '18051',
        tipo: 'Consultorio Local'
      }
    }
  ],
  totalFeatures: 1,
  numberMatched: 1,
  numberReturned: 1
};

export const WFS_ISE_HEALTH_BERJA = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'g12_01_CentroSalud.5678',
      geometry: {
        type: 'Point',
        coordinates: [507891, 4073456]
      },
      properties: {
        nica: '04029001',
        nombre: 'Centro de Salud de Berja',
        direccion: 'Avda. Constitución, 15',
        municipio: 'Berja',
        provincia: 'Almería',
        cod_mun: '04029',
        tipo: 'Centro de Salud'
      }
    },
    {
      type: 'Feature',
      id: 'g12_01_CentroSalud.5679',
      geometry: {
        type: 'Point',
        coordinates: [508123, 4073789]
      },
      properties: {
        nica: '04029002',
        nombre: 'Consultorio de Alcaudique',
        direccion: 'Pl. del Pueblo, s/n',
        municipio: 'Berja',
        provincia: 'Almería',
        cod_mun: '04029',
        tipo: 'Consultorio Local'
      }
    }
  ],
  totalFeatures: 2,
  numberMatched: 2,
  numberReturned: 2
};

export const WFS_ISE_SECURITY_COLOMERA = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'g12_07_GuardiaCivil.123',
      geometry: {
        type: 'Point',
        coordinates: [436900, 4136400]
      },
      properties: {
        nombre: 'Puesto de la Guardia Civil de Colomera',
        direccion: 'C/ Mayor, 5',
        municipio: 'Colomera',
        provincia: 'Granada',
        cod_mun: '18051',
        tipo: 'Guardia Civil'
      }
    }
  ],
  totalFeatures: 1,
  numberMatched: 1,
  numberReturned: 1
};

export const WFS_ISE_SECURITY_GRANADA = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'g12_07_PoliciaNacional.1',
      geometry: {
        type: 'Point',
        coordinates: [446789, 4114567]
      },
      properties: {
        nombre: 'Comisaría de Policía Nacional',
        direccion: 'Plaza de los Campos, 6',
        municipio: 'Granada',
        provincia: 'Granada',
        cod_mun: '18087',
        tipo: 'Policía Nacional'
      }
    },
    {
      type: 'Feature',
      id: 'g12_08_Juzgado.1',
      geometry: {
        type: 'Point',
        coordinates: [446500, 4114800]
      },
      properties: {
        nombre: 'Audiencia Provincial de Granada',
        direccion: 'Plaza Nueva, 1',
        municipio: 'Granada',
        provincia: 'Granada',
        cod_mun: '18087',
        tipo: 'Audiencia'
      }
    },
    {
      type: 'Feature',
      id: 'g12_07_GuardiaCivil.2',
      geometry: {
        type: 'Point',
        coordinates: [447000, 4114200]
      },
      properties: {
        nombre: 'Comandancia de la Guardia Civil',
        direccion: 'C/ Duquesa, 21',
        municipio: 'Granada',
        provincia: 'Granada',
        cod_mun: '18087',
        tipo: 'Guardia Civil'
      }
    }
  ],
  totalFeatures: 3,
  numberMatched: 3,
  numberReturned: 3
};

// ============================================================================
// RESPUESTAS OVERPASS API (OpenStreetMap)
// ============================================================================

export const OVERPASS_COLOMERA = {
  version: 0.6,
  generator: 'Overpass API mock',
  elements: [
    {
      type: 'node',
      id: 12345678,
      lat: 37.3567,
      lon: -3.7123,
      tags: {
        name: 'Cuartel de la Guardia Civil',
        amenity: 'police',
        operator: 'Guardia Civil'
      }
    }
  ]
};

export const OVERPASS_GRANADA = {
  version: 0.6,
  generator: 'Overpass API mock',
  elements: [
    {
      type: 'node',
      id: 23456789,
      lat: 37.1773,
      lon: -3.5986,
      tags: {
        name: 'Comisaría de Policía Nacional',
        amenity: 'police',
        operator: 'Policía Nacional'
      }
    },
    {
      type: 'node',
      id: 34567890,
      lat: 37.1756,
      lon: -3.5989,
      tags: {
        name: 'Parque de Bomberos',
        amenity: 'fire_station'
      }
    }
  ]
};

// ============================================================================
// RESPUESTAS WFS EDUCATION (DERA g12_03)
// ============================================================================

export const WFS_EDUCATION_COLOMERA = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'g12_03_CentroEducativo.123',
      geometry: {
        type: 'Point',
        coordinates: [436850, 4136350]
      },
      properties: {
        codigo: '18001234',
        nombre: 'CEIP San Sebastián',
        direccion: 'C/ Escuelas, 1',
        municipio: 'Colomera',
        provincia: 'Granada',
        cod_mun: '18051',
        naturaleza: 'Público',
        tipo: 'CEIP'
      }
    }
  ],
  totalFeatures: 1,
  numberMatched: 1,
  numberReturned: 1
};

// ============================================================================
// RESPUESTAS WFS ENERGY (DERA g09)
// ============================================================================

export const WFS_ENERGY_MALAGA = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'g09_01_Electrica.1',
      geometry: {
        type: 'Point',
        coordinates: [370000, 4070000]
      },
      properties: {
        nombre: 'Parque Eólico Sierra de Ronda',
        potencia: 50,
        municipio: 'Ronda',
        provincia: 'Málaga',
        cod_mun: '29084',
        tipo: 'Eólica'
      }
    },
    {
      type: 'Feature',
      id: 'g09_02_Solar.1',
      geometry: {
        type: 'Point',
        coordinates: [375000, 4065000]
      },
      properties: {
        nombre: 'Planta Fotovoltaica El Cortijo',
        potencia: 25,
        municipio: 'Antequera',
        provincia: 'Málaga',
        cod_mun: '29015',
        tipo: 'Fotovoltaica'
      }
    }
  ],
  totalFeatures: 2,
  numberMatched: 2,
  numberReturned: 2
};

// ============================================================================
// RESPUESTAS NGA (Nomenclátor Geográfico de Andalucía)
// ============================================================================

export const NGA_COLOMERA = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'NGA.12345',
      geometry: {
        type: 'Point',
        coordinates: [436865, 4136333]
      },
      properties: {
        nombre: 'Colomera',
        tipo: 'Núcleo de Población',
        municipio: 'Colomera',
        provincia: 'Granada',
        cod_mun: '18051'
      }
    },
    {
      type: 'Feature',
      id: 'NGA.12346',
      geometry: {
        type: 'Point',
        coordinates: [437200, 4137500]
      },
      properties: {
        nombre: 'Pantano de Colomera',
        tipo: 'Embalse',
        municipio: 'Colomera',
        provincia: 'Granada',
        cod_mun: '18051'
      }
    }
  ],
  totalFeatures: 2,
  numberMatched: 2,
  numberReturned: 2
};

// ============================================================================
// RESPUESTAS IAID (Deportivas)
// ============================================================================

export const IAID_COLOMERA = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'g12_06_Deportivo.1',
      geometry: {
        type: 'Point',
        coordinates: [436800, 4136200]
      },
      properties: {
        nombre: 'Pista Polideportiva Municipal',
        direccion: 'C/ Deportes, s/n',
        municipio: 'Colomera',
        provincia: 'Granada',
        cod_mun: '18051',
        tipo: 'Pista Polideportiva'
      }
    }
  ],
  totalFeatures: 1,
  numberMatched: 1,
  numberReturned: 1
};

// ============================================================================
// RESPUESTAS HERITAGE (IAPH - Patrimonio)
// ============================================================================

export const HERITAGE_COLOMERA = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'BIC.1',
      geometry: {
        type: 'Point',
        coordinates: [436870, 4136340]
      },
      properties: {
        denominacion: 'Iglesia de la Encarnación',
        tipologia: 'Iglesia',
        municipio: 'Colomera',
        provincia: 'Granada',
        cod_mun: '18051',
        proteccion: 'BIC'
      }
    }
  ],
  totalFeatures: 1,
  numberMatched: 1,
  numberReturned: 1
};

// ============================================================================
// RESPUESTA VACÍA (para municipios sin resultados)
// ============================================================================

export const WFS_EMPTY_RESPONSE = {
  type: 'FeatureCollection',
  features: [],
  totalFeatures: 0,
  numberMatched: 0,
  numberReturned: 0
};

export const OVERPASS_EMPTY_RESPONSE = {
  version: 0.6,
  generator: 'Overpass API mock',
  elements: []
};

// ============================================================================
// HELPERS PARA SELECCIONAR RESPUESTA SEGÚN URL
// ============================================================================

export function getMockResponseForUrl(url: string): object | null {
  const urlLower = url.toLowerCase();
  
  // WFS Health
  if (urlLower.includes('g12_01') || urlLower.includes('g12_02')) {
    if (urlLower.includes('colomera')) return WFS_ISE_HEALTH_COLOMERA;
    if (urlLower.includes('berja')) return WFS_ISE_HEALTH_BERJA;
    return WFS_EMPTY_RESPONSE;
  }
  
  // WFS Security
  if (urlLower.includes('g12_07') || urlLower.includes('g12_08')) {
    if (urlLower.includes('colomera')) return WFS_ISE_SECURITY_COLOMERA;
    if (urlLower.includes('granada') && !urlLower.includes('colomera')) return WFS_ISE_SECURITY_GRANADA;
    return WFS_EMPTY_RESPONSE;
  }
  
  // WFS Education
  if (urlLower.includes('g12_03')) {
    if (urlLower.includes('colomera')) return WFS_EDUCATION_COLOMERA;
    return WFS_EMPTY_RESPONSE;
  }
  
  // WFS Energy
  if (urlLower.includes('g09')) {
    if (urlLower.includes('malaga') || urlLower.includes('ronda') || urlLower.includes('antequera')) {
      return WFS_ENERGY_MALAGA;
    }
    return WFS_EMPTY_RESPONSE;
  }
  
  // NGA
  if (urlLower.includes('nga') || urlLower.includes('nomenclator')) {
    if (urlLower.includes('colomera')) return NGA_COLOMERA;
    return WFS_EMPTY_RESPONSE;
  }
  
  // IAID (Deportivo)
  if (urlLower.includes('g12_06')) {
    if (urlLower.includes('colomera')) return IAID_COLOMERA;
    return WFS_EMPTY_RESPONSE;
  }
  
  // Heritage
  if (urlLower.includes('iaph') || urlLower.includes('patrimonio')) {
    if (urlLower.includes('colomera')) return HERITAGE_COLOMERA;
    return WFS_EMPTY_RESPONSE;
  }
  
  // Overpass API
  if (urlLower.includes('overpass')) {
    if (urlLower.includes('colomera')) return OVERPASS_COLOMERA;
    if (urlLower.includes('granada')) return OVERPASS_GRANADA;
    return OVERPASS_EMPTY_RESPONSE;
  }
  
  // WFS genérico - verificar disponibilidad
  if (urlLower.includes('getcapabilities')) {
    return { 
      available: true, 
      responseTime: 50,
      // GetCapabilities mock básico
      WFS_Capabilities: {
        version: '2.0.0',
        FeatureTypeList: {
          FeatureType: [{ Name: 'mock:layer', Title: 'Mock Layer' }]
        }
      }
    };
  }
  
  // Cualquier otra consulta WFS devuelve FeatureCollection vacía
  // Esto evita timeouts - el servicio "responde" pero sin datos
  if (urlLower.includes('wfs') || urlLower.includes('getfeature')) {
    return WFS_EMPTY_RESPONSE;
  }
  
  // Cualquier consulta Overpass no específicamente mockeada
  if (urlLower.includes('overpass-api') || urlLower.includes('lz4.overpass-api')) {
    return OVERPASS_EMPTY_RESPONSE;
  }
  
  // Default: respuesta vacía en vez de null (evita 404 y reintentos)
  return WFS_EMPTY_RESPONSE;
}
