/**
 * Tipos de infraestructuras críticas según PTEL (Planes Territoriales de Emergencias Locales)
 * 
 * Basado en análisis de 786 municipios andaluces y Decreto 197/2024
 * @module types/infrastructure
 */

/**
 * Categorías principales de infraestructuras PTEL
 */
export enum InfrastructureType {
  /** Centros de salud, hospitales, consultorios, ambulatorios (1,500+ en Andalucía) */
  HEALTH = 'SANITARIO',
  
  /** Colegios, institutos, escuelas, guarderías (3,800+ en Andalucía) */
  EDUCATION = 'EDUCATIVO',
  
  /** Comisarías, cuarteles Guardia Civil, policía local (200+ en Andalucía) */
  POLICE = 'POLICIAL',
  
  /** Parques de bomberos (86 en Andalucía según IECA) */
  FIRE = 'BOMBEROS',
  
  /** Museos, bibliotecas, centros culturales, teatros (7,000+ vía IAPH) */
  CULTURAL = 'CULTURAL',
  
  /** Iglesias, ermitas, parroquias, conventos (1,500+ lugares culto) */
  RELIGIOUS = 'RELIGIOSO',
  
  /** Polideportivos, pabellones, campos de fútbol */
  SPORTS = 'DEPORTIVO',
  
  /** Ayuntamientos, oficinas municipales, centros administrativos */
  MUNICIPAL = 'MUNICIPAL',
  
  /** Centros sociales, residencias, centros de día */
  SOCIAL = 'SOCIAL',
  
  /** Gasolineras, estaciones de servicio */
  FUEL = 'COMBUSTIBLE',
  
  /** Centros de protección civil, 112 */
  EMERGENCY = 'EMERGENCIAS',
  
  /** Infraestructura no categorizada - usa geocodificación genérica */
  GENERIC = 'GENERICO'
}

/**
 * Niveles de confianza para clasificación tipológica
 */
export enum ClassificationConfidence {
  /** Match exacto con patrón específico (ej: "Centro de Salud") */
  HIGH = 'ALTA',
  
  /** Match parcial o palabras clave secundarias (ej: "consultorio") */
  MEDIUM = 'MEDIA',
  
  /** Match débil o ambiguo */
  LOW = 'BAJA',
  
  /** No se pudo clasificar - categoría GENERIC */
  NONE = 'NULA'
}

/**
 * Resultado de clasificación tipológica
 */
export interface ClassificationResult {
  /** Tipo de infraestructura detectado */
  type: InfrastructureType;
  
  /** Nivel de confianza en la clasificación */
  confidence: ClassificationConfidence;
  
  /** Patrón regex que hizo match (para debugging) */
  matchedPattern?: string;
  
  /** Palabras clave que activaron la clasificación */
  keywords: string[];
}

/**
 * Resultado de geocodificación especializada
 */
export interface GeocodingResult {
  /** Coordenada X (Este) en EPSG:25830 */
  x: number;
  
  /** Coordenada Y (Norte) en EPSG:25830 */
  y: number;
  
  /** Nivel de confianza 0-100 */
  confidence: number;
  
  /** Fuente de datos que proporcionó las coordenadas */
  source: string;
  
  /** Nombre exacto encontrado en la base de datos especializada */
  matchedName: string;
  
  /** Score de fuzzy matching (0-1) */
  fuzzyScore: number;
  
  /** Dirección completa si está disponible */
  address?: string;
  
  /** Municipio geocodificado */
  municipality: string;
  
  /** Provincia geocodificada */
  province: string;
}

/**
 * Configuración para geocodificación especializada
 */
export interface SpecializedGeocoderConfig {
  /** Endpoint del servicio WFS */
  wfsEndpoint: string;
  
  /** Nombre de la capa WFS */
  layerName: string;
  
  /** Umbral mínimo de fuzzy matching (0-1) */
  fuzzyThreshold: number;
  
  /** Timeout para peticiones WFS en ms */
  timeout: number;
  
  /** Sistema de coordenadas de salida */
  outputSRS: string;
}

/**
 * Configuración para el clasificador tipológico
 */
export interface ClassifierConfig {
  /** Usar clasificación estricta (solo HIGH confidence) */
  strictMode: boolean;
  
  /** Ignorar acentos y mayúsculas en matching */
  caseSensitive: boolean;
}
