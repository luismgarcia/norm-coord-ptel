/**
 * Generador de claves de cache hash
 * Crea keys únicas y consistentes para entradas de geocodificación
 */

/**
 * Normaliza un string para hashing consistente
 * - Convierte a minúsculas
 * - Elimina acentos
 * - Elimina caracteres especiales
 * - Reduce espacios múltiples
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^a-z0-9\s]/g, '') // Solo alfanuméricos y espacios
    .replace(/\s+/g, ' ') // Espacios únicos
    .trim();
}

/**
 * Genera hash simple pero efectivo (no criptográfico)
 * Basado en algoritmo djb2
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash).toString(36);
}

/**
 * Genera una clave de cache única basada en:
 * - Nombre de la infraestructura
 * - Municipio
 * - Tipo de infraestructura
 * 
 * @param name - Nombre de la infraestructura
 * @param municipio - Nombre del municipio
 * @param tipo - Tipo de infraestructura (opcional)
 * @returns Key hash única para cache
 * 
 * @example
 * generateCacheKey('Centro Salud Granada Norte', 'Granada', 'SANITARIO')
 * // => 'ptel_a8f3k2_sanitario'
 */
export function generateCacheKey(
  name: string,
  municipio: string,
  tipo?: string
): string {
  const normalizedName = normalizeString(name);
  const normalizedMunicipio = normalizeString(municipio);
  const normalizedTipo = tipo ? normalizeString(tipo) : '';
  
  // Combinar componentes con separador
  const combined = `${normalizedName}|${normalizedMunicipio}|${normalizedTipo}`;
  
  // Generar hash
  const hash = simpleHash(combined);
  
  // Formato final: ptel_{hash}_{tipo}
  const tipoSuffix = normalizedTipo ? `_${normalizedTipo}` : '';
  return `ptel_${hash}${tipoSuffix}`;
}
