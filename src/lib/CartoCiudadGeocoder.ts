/**
 * CartoCiudadGeocoder.ts - Geocodificador con validación de desambiguación
 * 
 * PROBLEMA RESUELTO: Los parámetros provincia_filter y municipio_filter
 * NO funcionan en el endpoint /find de CartoCiudad. Este módulo implementa
 * validación post-geocodificación usando código INE para rechazar resultados
 * de municipios incorrectos.
 * 
 * @version 2.0.0
 * @date 2025-11-28
 */

// ============================================================================
// CÓDIGOS INE DE PROVINCIAS ANDALUZAS
// ============================================================================

export const PROVINCIAS_ANDALUCIA: Record<string, string> = {
  '04': 'Almería',
  '11': 'Cádiz',
  '14': 'Córdoba',
  '18': 'Granada',
  '21': 'Huelva',
  '23': 'Jaén',
  '29': 'Málaga',
  '41': 'Sevilla'
};

// ============================================================================
// CÓDIGOS INE DE MUNICIPIOS DE GRANADA (COMPLETO)
// ============================================================================

export const CODIGOS_INE_GRANADA: Record<string, string> = {
  "Agrón": "18001",
  "Alamedilla": "18002",
  "Albolote": "18003",
  "Albondón": "18004",
  "Albuñán": "18005",
  "Albuñol": "18006",
  "Albuñuelas": "18007",
  "Aldeire": "18008",
  "Alfacar": "18009",
  "Algarinejo": "18010",
  "Alhama de Granada": "18011",
  "Alhendín": "18012",
  "Alicún de Ortega": "18013",
  "Almegíjar": "18014",
  "Almuñécar": "18015",
  "Alpujarra de la Sierra": "18016",
  "Alquife": "18017",
  "Arenas del Rey": "18018",
  "Armilla": "18019",
  "Atarfe": "18020",
  "Baza": "18021",
  "Beas de Granada": "18022",
  "Beas de Guadix": "18023",
  "Benalúa": "18024",
  "Benalúa de las Villas": "18025",
  "Benamaurel": "18026",
  "Bérchules": "18027",
  "Bubión": "18028",
  "Busquístar": "18029",
  "Cacín": "18030",
  "Cádiar": "18031",
  "Cájar": "18032",
  "Calicasas": "18033",
  "Campotéjar": "18034",
  "Caniles": "18035",
  "Cáñar": "18036",
  "Capileira": "18037",
  "Carataunas": "18038",
  "Cástaras": "18039",
  "Castilléjar": "18040",
  "Castril": "18041",
  "Cenes de la Vega": "18042",
  "Chauchina": "18043",
  "Chimeneas": "18044",
  "Churriana de la Vega": "18045",
  "Cijuela": "18046",
  "Cogollos de Guadix": "18047",
  "Cogollos de la Vega": "18048",
  "Colomera": "18051",
  "Cortes de Baza": "18052",
  "Cortes y Graena": "18053",
  "Cúllar": "18054",
  "Cúllar Vega": "18055",
  "Darro": "18056",
  "Dehesas de Guadix": "18057",
  "Deifontes": "18059",
  "Diezma": "18060",
  "Dílar": "18061",
  "Dólar": "18062",
  "Dúdar": "18063",
  "Dúrcal": "18064",
  "Escúzar": "18065",
  "Ferreira": "18066",
  "Fonelas": "18067",
  "Freila": "18068",
  "Fuente Vaqueros": "18069",
  "Galera": "18071",
  "Gobernador": "18072",
  "Gójar": "18073",
  "Gor": "18074",
  "Gorafe": "18075",
  "Granada": "18087",
  "Guadahortuna": "18076",
  "Guadix": "18089",
  "Gualchos": "18078",
  "Güejar Sierra": "18079",
  "Güevéjar": "18080",
  "Huélago": "18081",
  "Huéneja": "18082",
  "Huéscar": "18083",
  "Huétor de Santillán": "18084",
  "Huétor Tájar": "18085",
  "Huétor Vega": "18086",
  "Íllora": "18088",
  "Ítrabo": "18090",
  "Iznalloz": "18091",
  "Jayena": "18092",
  "Jerez del Marquesado": "18093",
  "Jete": "18094",
  "Jun": "18095",
  "Juviles": "18096",
  "La Calahorra": "18034",
  "La Peza": "18151",
  "La Taha": "18905",
  "La Zubia": "18193",
  "Láchar": "18097",
  "Lanjarón": "18098",
  "Lanteira": "18099",
  "Lecrín": "18100",
  "Lentegí": "18101",
  "Lobras": "18102",
  "Loja": "18103",
  "Lugros": "18104",
  "Lújar": "18105",
  "Maracena": "18106",
  "Marchal": "18107",
  "Moclín": "18108",
  "Molvízar": "18109",
  "Monachil": "18110",
  "Montefrío": "18111",
  "Montejícar": "18112",
  "Montillana": "18113",
  "Moraleda de Zafayona": "18114",
  "Morelábor": "18115",
  "Motril": "18116",
  "Murtas": "18117",
  "Nevada": "18906",
  "Nigüelas": "18118",
  "Nívar": "18119",
  "Ogíjares": "18120",
  "Orce": "18121",
  "Órgiva": "18122",
  "Otívar": "18123",
  "Otura": "18124",
  "Padul": "18125",
  "Pampaneira": "18126",
  "Pedro Martínez": "18127",
  "Peligros": "18128",
  "Pinos Genil": "18129",
  "Pinos Puente": "18130",
  "Píñar": "18131",
  "Polícar": "18132",
  "Polopos": "18133",
  "Pórtugos": "18134",
  "Puebla de Don Fadrique": "18135",
  "Pulianas": "18136",
  "Purullena": "18137",
  "Quéntar": "18138",
  "Rubite": "18139",
  "Salar": "18140",
  "Salobreña": "18141",
  "Santa Cruz del Comercio": "18142",
  "Santa Fe": "18143",
  "Soportújar": "18144",
  "Sorvilán": "18145",
  "Torre-Cardela": "18146",
  "Torvizcón": "18147",
  "Trevélez": "18148",
  "Turón": "18149",
  "Ugíjar": "18150",
  "Válor": "18152",
  "Valle del Zalabí": "18907",
  "Vélez de Benaudalla": "18153",
  "Ventas de Huelma": "18154",
  "Villamena": "18908",
  "Villanueva de las Torres": "18155",
  "Villanueva Mesía": "18156",
  "Víznar": "18157",
  "Zafarraya": "18158",
  "Zagra": "18909",
  "Zújar": "18159"
};

// ============================================================================
// TIPOS
// ============================================================================

export interface CartoCiudadResponse {
  id: string;
  province: string;
  provinceCode: string;
  comunidadAutonoma: string;
  comunidadAutonomaCode: string;
  muni: string;
  muniCode: string;
  type: string;
  address: string;
  postalCode: string;
  lat: number;
  lng: number;
  state: number;
  stateMsg: string;
  tip_via?: string;
  portalNumber?: number;
}

export interface GeocodingResult {
  x: number;
  y: number;
  confidence: number;
  source: string;
  municipio: string;
  codigoINE: string;
  crs: 'EPSG:4326' | 'EPSG:25830';
  validado: boolean;
  advertencia?: string;
}

export interface ValidationResult {
  valido: boolean;
  error?: string;
  advertencia?: string;
}

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * Normaliza un string para comparación (sin tildes, minúsculas)
 */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Obtiene el código INE de un municipio por nombre y provincia
 */
export function getCodigoINE(municipio: string, provincia: string): string | null {
  // Tablas por provincia (expandir según necesidad)
  const tablas: Record<string, Record<string, string>> = {
    'Granada': CODIGOS_INE_GRANADA,
    // Añadir más provincias aquí
  };
  
  const tabla = tablas[provincia];
  if (!tabla) return null;
  
  // Búsqueda exacta
  if (tabla[municipio]) return tabla[municipio];
  
  // Búsqueda normalizada
  const municipioNorm = normalizar(municipio);
  
  for (const [nombre, codigo] of Object.entries(tabla)) {
    if (normalizar(nombre) === municipioNorm) {
      return codigo;
    }
  }
  
  return null;
}

/**
 * Verifica si un código INE pertenece a Andalucía
 */
export function esAndalucia(codigoINE: string): boolean {
  if (!codigoINE || codigoINE.length < 2) return false;
  const codigoProvincia = codigoINE.substring(0, 2);
  return codigoProvincia in PROVINCIAS_ANDALUCIA;
}

/**
 * Valida que el resultado de geocodificación corresponde al municipio esperado
 */
export function validarResultado(
  response: CartoCiudadResponse,
  municipioEsperado: string,
  provinciaEsperada: string
): ValidationResult {
  
  const muniCode = response.muniCode;
  
  // 1. Verificar que hay código INE
  if (!muniCode) {
    return { valido: false, error: 'Respuesta sin código INE (muniCode)' };
  }
  
  // 2. Verificar que está en Andalucía
  if (!esAndalucia(muniCode)) {
    const provinciaReal = PROVINCIAS_ANDALUCIA[muniCode.substring(0, 2)] || 'Desconocida';
    return { 
      valido: false, 
      error: `Resultado fuera de Andalucía: ${response.muni} (${response.province})`,
    };
  }
  
  // 3. Verificar provincia específica
  const provEsperadaNorm = normalizar(provinciaEsperada);
  const provObtenidaNorm = normalizar(response.province || '');
  
  if (!provObtenidaNorm.includes(provEsperadaNorm) &&
      !provEsperadaNorm.includes(provObtenidaNorm)) {
    return {
      valido: false,
      error: `Provincia incorrecta: esperaba "${provinciaEsperada}", obtuvo "${response.province}"`
    };
  }
  
  // 4. Verificar código INE específico si se conoce
  const codigoEsperado = getCodigoINE(municipioEsperado, provinciaEsperada);
  
  if (codigoEsperado) {
    if (muniCode !== codigoEsperado) {
      // Verificar si es una pedanía (mismo código base)
      if (muniCode.substring(0, 5) === codigoEsperado.substring(0, 5)) {
        return { 
          valido: true, 
          advertencia: `Posible pedanía de ${municipioEsperado}` 
        };
      }
      
      return {
        valido: false,
        error: `Código INE incorrecto: esperaba ${codigoEsperado} (${municipioEsperado}), obtuvo ${muniCode} (${response.muni})`
      };
    }
  }
  
  // 5. Verificar nombre de municipio como fallback
  const muniEsperadoNorm = normalizar(municipioEsperado);
  const muniObtenidoNorm = normalizar(response.muni || '');
  
  // Aceptar si uno contiene al otro (para variaciones como "Colomera" / "Colomera, pedanía de...")
  if (!muniObtenidoNorm.includes(muniEsperadoNorm) && 
      !muniEsperadoNorm.includes(muniObtenidoNorm)) {
    // Solo advertir si no tenemos código INE para verificar
    if (!codigoEsperado) {
      return {
        valido: true,
        advertencia: `Nombre de municipio diferente: "${municipioEsperado}" vs "${response.muni}"`
      };
    }
  }
  
  return { valido: true };
}

// ============================================================================
// GEOCODIFICADOR PRINCIPAL
// ============================================================================

/**
 * Calcula confianza basada en el campo state de CartoCiudad
 */
function calcularConfianza(state: number): number {
  const map: Record<number, number> = {
    0: 50,  // Sin coincidencia exacta
    1: 95,  // Portal exacto
    2: 88,  // Portal aproximado
    3: 75,  // Calle
    4: 60,  // Municipio
    5: 45,  // Aproximado
    10: 30  // Fallback administrativo
  };
  return map[state] ?? 40;
}

/**
 * Geocodifica una dirección con validación de municipio
 * 
 * @param direccion - Dirección a geocodificar
 * @param municipio - Municipio esperado
 * @param provincia - Provincia esperada
 * @returns Resultado de geocodificación o null si falla validación
 */
export async function geocodificarConValidacion(
  direccion: string,
  municipio: string,
  provincia: string
): Promise<GeocodingResult | null> {
  
  // Construir query con contexto geográfico completo
  const query = `${direccion}, ${municipio}, ${provincia}, España`;
  
  const url = new URL('https://www.cartociudad.es/geocoder/api/geocoder/findJsonp');
  url.searchParams.set('q', query);
  url.searchParams.set('autocancel', 'true');
  
  try {
    const response = await fetch(url.toString());
    let text = await response.text();
    
    // Extraer JSON del JSONP
    if (text.startsWith('callback(')) {
      text = text.slice(9, -1);
    }
    
    const data: CartoCiudadResponse = JSON.parse(text);
    
    // Validar resultado
    const validacion = validarResultado(data, municipio, provincia);
    
    if (!validacion.valido) {
      console.warn(`[CartoCiudad] ❌ Resultado rechazado para "${direccion}":`, validacion.error);
      return null;
    }
    
    if (validacion.advertencia) {
      console.info(`[CartoCiudad] ⚠️ ${validacion.advertencia}`);
    }
    
    return {
      x: data.lng,
      y: data.lat,
      confidence: calcularConfianza(data.state),
      source: 'cartociudad:validado',
      municipio: data.muni,
      codigoINE: data.muniCode,
      crs: 'EPSG:4326',
      validado: true,
      advertencia: validacion.advertencia
    };
    
  } catch (error) {
    console.error('[CartoCiudad] Error:', error);
    return null;
  }
}

/**
 * Flujo alternativo: usar /candidates con filtro + validación
 * Más lento pero más preciso cuando hay ambigüedad
 */
export async function geocodificarConCandidatos(
  direccion: string,
  municipio: string,
  provincia: string
): Promise<GeocodingResult | null> {
  
  const query = `${direccion} ${municipio}`;
  
  const url = new URL('https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp');
  url.searchParams.set('q', query);
  url.searchParams.set('municipio_filter', municipio);
  url.searchParams.set('provincia_filter', provincia);
  url.searchParams.set('limit', '5');
  
  try {
    const response = await fetch(url.toString());
    let text = await response.text();
    
    if (text.startsWith('callback(')) {
      text = text.slice(9, -1);
    }
    
    const candidates = JSON.parse(text);
    
    if (!Array.isArray(candidates) || candidates.length === 0) {
      console.warn(`[CartoCiudad] Sin candidatos para "${direccion}" en ${municipio}`);
      return null;
    }
    
    // Tomar el mejor candidato
    const best = candidates[0];
    
    // Validar
    const validacion = validarResultado(best as CartoCiudadResponse, municipio, provincia);
    
    if (!validacion.valido) {
      console.warn(`[CartoCiudad] Candidato rechazado:`, validacion.error);
      return null;
    }
    
    // Los candidatos pueden tener lat/lng directamente
    if (best.lat && best.lng) {
      return {
        x: best.lng,
        y: best.lat,
        confidence: 85,
        source: 'cartociudad:candidates',
        municipio: best.muni,
        codigoINE: best.muniCode,
        crs: 'EPSG:4326',
        validado: true
      };
    }
    
    // Si no tiene coords, usar /find con el resultado validado
    return geocodificarConValidacion(best.address || direccion, municipio, provincia);
    
  } catch (error) {
    console.error('[CartoCiudad] Error en candidates:', error);
    return null;
  }
}

// ============================================================================
// EXPORTS PARA TESTING
// ============================================================================

export const __testing = {
  normalizar,
  calcularConfianza
};
