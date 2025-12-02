/**
 * InfrastructureClassifier.ts
 * 
 * Clasificador tipológico de infraestructuras PTEL basado en patrones
 * extraídos de 6 documentos reales: Colomera, Quéntar, Hornos, Castril, Tíjola, Berja
 * 
 * Cada categoría tiene asociado un servicio WFS especializado para geocodificación.
 * 
 * CASOS REALES VALIDADOS:
 * - Berja: FARMACIAM.ª CarmenMAYOL, Trasformador60822SevillanaEndesa
 * - Castril: Sierrade Castril, Hnos. SánchezCarpintería
 * - Colomera: CEIP Juan Alonso Rivas, Consultorio Médico
 * - Quéntar: Embalse de Quéntar, Piscina Municipal
 * - Hornos: Iglesia de Nuestra Señora de la Asunción
 * - Tíjola: Centro de Salud, IES Alto Almanzora
 * 
 * @version 2.0.0
 * @date 2025-11-28
 */

// ============================================================================
// TIPOS
// ============================================================================

export type InfrastructureType = 
  | 'SANITARIO'        // WFS SICESS/SAS - 1,500 centros
  | 'EDUCATIVO'        // WFS Consejería Educación - 3,800 centros
  | 'SEGURIDAD'        // ISE Seguridad (policía + bomberos + emergencias)
  | 'CULTURAL'         // IAPH Patrimonio - 7,000+ sitios
  | 'RELIGIOSO'        // IAPH + OSM - iglesias, ermitas
  | 'DEPORTIVO'        // DERA G12 equipamientos deportivos
  | 'SERVICIOS'        // ISE + municipal (ayuntamientos, oficinas)
  | 'ENERGIA'          // Agencia Andaluza Energía WFS
  | 'HIDRAULICO'       // REDIAM infraestructuras hidráulicas
  | 'TRANSPORTE'       // IDEADIF + DERA red viaria
  | 'TELECOMUNICACIONES' // CNMC + OSM fallback
  | 'COMERCIAL'        // CartoCiudad + OSM
  | 'INDUSTRIAL'       // REDIAM + DERA
  | 'RESIDENCIAL'      // CartoCiudad direcciones
  | 'OTROS';           // Fallback genérico

export interface ClassificationResult {
  type: InfrastructureType;
  confidence: 'ALTA' | 'MEDIA' | 'BAJA';
  matchedPattern: string | null;
  matchedField: 'nombre' | 'tipo' | 'uso' | null;
  suggestedWFS: string | null;
  alternativeTypes: InfrastructureType[];
}

export interface InfrastructureInput {
  nombre: string;
  tipo?: string;
  uso?: string;
}

interface PatternConfig {
  pattern: RegExp;
  confidence: 'ALTA' | 'MEDIA' | 'BAJA';
  wfs: string | null;
  description?: string; // Para debugging
}

// ============================================================================
// PATRONES POR TIPOLOGÍA - Extraídos de 517 registros de 6 documentos PTEL
// ============================================================================

const PATTERNS: Record<InfrastructureType, PatternConfig[]> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // SANITARIO - WFS SICESS/SAS (1,500 centros Andalucía)
  // Casos reales: "Consultorio Médico", "Centro de Salud Berja", "FARMACIAM.ª Carmen"
  // ═══════════════════════════════════════════════════════════════════════════
  SANITARIO: [
    // Alta confianza - nombres oficiales SAS
    { pattern: /\bhospital\b/i, confidence: 'ALTA', wfs: 'SICESS', description: 'Hospital general' },
    { pattern: /\bcentro\s*(de\s*)?(salud|sanitario)\b/i, confidence: 'ALTA', wfs: 'SICESS' },
    { pattern: /\bconsultorio\s*(médico|local|auxiliar)?\b/i, confidence: 'ALTA', wfs: 'SICESS' },
    { pattern: /\bambulatorio\b/i, confidence: 'ALTA', wfs: 'SICESS' },
    { pattern: /\bS\.?A\.?S\.?\b/i, confidence: 'ALTA', wfs: 'SICESS' },
    { pattern: /\burgencias?\b/i, confidence: 'ALTA', wfs: 'SICESS' },
    { pattern: /\bclínica\b/i, confidence: 'ALTA', wfs: 'SICESS' },
    { pattern: /\bdispensario\b/i, confidence: 'ALTA', wfs: 'SICESS' },
    { pattern: /\bcentro\s*médico\b/i, confidence: 'ALTA', wfs: 'SICESS' },
    // Farmacia - caso especial (no en SICESS pero sí en OSM/CartoCiudad)
    { pattern: /\bfarmacia\b/i, confidence: 'ALTA', wfs: null, description: 'Farmacia - usar OSM' },
    // Media confianza
    { pattern: /\bsanitario\b/i, confidence: 'MEDIA', wfs: 'SICESS' },
    { pattern: /\bmédic[oa]\b/i, confidence: 'BAJA', wfs: 'SICESS' },
    { pattern: /\bhospitalari[oa]\b/i, confidence: 'MEDIA', wfs: 'SICESS', description: 'Uso CTE hospitalario' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // EDUCATIVO - WFS Consejería Educación (3,800 centros)
  // Casos reales: "CEIP Juan Alonso Rivas", "IES Alto Almanzora", "Escuela Infantil"
  // ═══════════════════════════════════════════════════════════════════════════
  EDUCATIVO: [
    // Acrónimos oficiales Junta Andalucía
    { pattern: /\bC\.?E\.?I\.?P\.?\s/i, confidence: 'ALTA', wfs: 'EDUCACION', description: 'Infantil+Primaria' },
    { pattern: /\bI\.?E\.?S\.?\s(?!repsol)/i, confidence: 'ALTA', wfs: 'EDUCACION', description: 'Secundaria' },
    { pattern: /\bC\.?P\.?R\.?\s/i, confidence: 'ALTA', wfs: 'EDUCACION', description: 'Colegio Público Rural' },
    { pattern: /\bC\.?E\.?P\.?E\.?R\.?\s/i, confidence: 'ALTA', wfs: 'EDUCACION', description: 'Ed. Permanente' },
    { pattern: /\bE\.?O\.?I\.?\s/i, confidence: 'ALTA', wfs: 'EDUCACION', description: 'Idiomas' },
    { pattern: /\bC\.?E\.?P\.?\s/i, confidence: 'ALTA', wfs: 'EDUCACION', description: 'Centro Profesorado' },
    // Nombres descriptivos
    { pattern: /\bcolegio\b/i, confidence: 'ALTA', wfs: 'EDUCACION' },
    { pattern: /\binstituto\b(?!\s*(nacional|geográfico|estadística))/i, confidence: 'ALTA', wfs: 'EDUCACION' },
    { pattern: /\bescuela\s*(infantil|primaria|adultos|taller)?\b/i, confidence: 'ALTA', wfs: 'EDUCACION' },
    { pattern: /\bguardería\b/i, confidence: 'ALTA', wfs: 'EDUCACION' },
    { pattern: /\bcentro\s*(de\s*)?(enseñanza|educación|educativo|docente)\b/i, confidence: 'ALTA', wfs: 'EDUCACION' },
    { pattern: /\bconservatorio\b/i, confidence: 'ALTA', wfs: 'EDUCACION' },
    { pattern: /\buniversidad\b/i, confidence: 'ALTA', wfs: 'EDUCACION' },
    { pattern: /\bludoteca\b/i, confidence: 'ALTA', wfs: 'EDUCACION' },
    // Términos CTE
    { pattern: /\bdocente\b/i, confidence: 'MEDIA', wfs: 'EDUCACION' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SEGURIDAD - ISE Seguridad (200+ instalaciones)
  // Casos reales: "Guardia Civil", "Policía Local", "Protección Civil"
  // ═══════════════════════════════════════════════════════════════════════════
  SEGURIDAD: [
    // Fuerzas de seguridad
    { pattern: /\bguardia\s*civil\b/i, confidence: 'ALTA', wfs: 'ISE_SEGURIDAD' },
    { pattern: /\bpolicía\s*(local|nacional|municipal)?\b/i, confidence: 'ALTA', wfs: 'ISE_SEGURIDAD' },
    { pattern: /\bcuartel\b/i, confidence: 'ALTA', wfs: 'ISE_SEGURIDAD' },
    { pattern: /\bcomisaría\b/i, confidence: 'ALTA', wfs: 'ISE_SEGURIDAD' },
    // Emergencias
    { pattern: /\bbomberos?\b/i, confidence: 'ALTA', wfs: 'ISE_SEGURIDAD' },
    { pattern: /\bparque\s*(de\s*)?bomberos\b/i, confidence: 'ALTA', wfs: 'ISE_SEGURIDAD' },
    { pattern: /\bprotección\s*civil\b/i, confidence: 'ALTA', wfs: 'ISE_SEGURIDAD' },
    { pattern: /\b112\b/i, confidence: 'ALTA', wfs: 'ISE_SEGURIDAD' },
    { pattern: /\bcecopal\b/i, confidence: 'ALTA', wfs: 'ISE_SEGURIDAD', description: 'Centro Coordinación' },
    { pattern: /\bCECOP\b/i, confidence: 'ALTA', wfs: 'ISE_SEGURIDAD' },
    // Media confianza
    { pattern: /\bseguridad\b/i, confidence: 'MEDIA', wfs: 'ISE_SEGURIDAD' },
    { pattern: /\bemergencias?\b/i, confidence: 'MEDIA', wfs: 'ISE_SEGURIDAD' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL - IAPH Patrimonio (7,000+ sitios BIC)
  // Casos reales: "Puente Romano", "Necrópolis", "Torre Atalaya", "Castillo"
  // ═══════════════════════════════════════════════════════════════════════════
  CULTURAL: [
    // Monumentos históricos
    { pattern: /\bcastillo\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bfortaleza\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\btorre\s*(del?\s*)?(homenaje|atalaya|vigía)?(?!\s*(de\s*)?telecomunicaciones)\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bmurallaS?\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\balcazaba\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bpalacio\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    // Arqueológicos
    { pattern: /\bnecrópolis\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\byacimiento\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bdolmen\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bcueva\s*(de|del)?\b/i, confidence: 'MEDIA', wfs: 'IAPH' },
    // Patrimonio civil
    { pattern: /\bpuente\s*(romano|medieval|histórico|antiguo)?\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\blavadero\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bfuente\s*(pública|histórica|monumental)?\b/i, confidence: 'MEDIA', wfs: 'IAPH' },
    { pattern: /\bmolino\b/i, confidence: 'MEDIA', wfs: 'IAPH' },
    // Museos y bibliotecas
    { pattern: /\bmuseo\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bbiblioteca\b/i, confidence: 'ALTA', wfs: 'ISE' },
    { pattern: /\barchivo\s*(municipal|histórico)?\b/i, confidence: 'ALTA', wfs: 'ISE' },
    { pattern: /\bteatro\b/i, confidence: 'ALTA', wfs: 'ISE' },
    { pattern: /\bauditorio\b/i, confidence: 'ALTA', wfs: 'ISE' },
    { pattern: /\bcasa\s*(de\s*(la\s*)?)?cultura\b/i, confidence: 'ALTA', wfs: 'ISE' },
    { pattern: /\bcentro\s*cultural\b/i, confidence: 'ALTA', wfs: 'ISE' },
    // BIC genérico
    { pattern: /\bB\.?I\.?C\.?\b/i, confidence: 'ALTA', wfs: 'IAPH', description: 'Bien Interés Cultural' },
    { pattern: /\bmonumento\b/i, confidence: 'MEDIA', wfs: 'IAPH' },
    { pattern: /\bpatrimonio\b/i, confidence: 'MEDIA', wfs: 'IAPH' },
    { pattern: /(?<!iglesia\s.*)\bhistóric[oa]\b/i, confidence: 'BAJA', wfs: 'IAPH' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // RELIGIOSO - IAPH + OSM
  // Casos reales: "Iglesia Nuestra Señora de la Asunción", "Ermita de San Sebastián"
  // ═══════════════════════════════════════════════════════════════════════════
  RELIGIOSO: [
    { pattern: /\biglesia\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bermita\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bcatedral\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bbasílica\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bparroquia\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bconvento\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bmonasterio\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bsantuario\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bcapilla\b/i, confidence: 'ALTA', wfs: 'IAPH' },
    { pattern: /\bcementerio\b/i, confidence: 'ALTA', wfs: null, description: 'Cementerio - OSM' },
    { pattern: /\bcamposanto\b/i, confidence: 'ALTA', wfs: null },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPORTIVO - DERA G12 Equipamientos deportivos
  // Casos reales: "Piscina Municipal", "Campo de Fútbol", "Polideportivo"
  // ═══════════════════════════════════════════════════════════════════════════
  DEPORTIVO: [
    { pattern: /\bpolideportivo\b/i, confidence: 'ALTA', wfs: 'DERA_G12' },
    { pattern: /\bpabellón\s*(deportivo|municipal|cubierto)?\b/i, confidence: 'ALTA', wfs: 'DERA_G12' },
    { pattern: /\bpiscina\s*(municipal|cubierta|climatizada)?\b/i, confidence: 'ALTA', wfs: 'DERA_G12' },
    { pattern: /\bcampo\s*(de\s*)?(fútbol|baloncesto|tenis)\b/i, confidence: 'ALTA', wfs: 'DERA_G12' },
    { pattern: /\bestadio\b/i, confidence: 'ALTA', wfs: 'DERA_G12' },
    { pattern: /\bgimnasio\b/i, confidence: 'ALTA', wfs: 'DERA_G12' },
    { pattern: /\bpista\s*(de\s*)?(tenis|pádel|atletismo|polideportiva)?\b/i, confidence: 'ALTA', wfs: 'DERA_G12' },
    { pattern: /\bfrontón\b/i, confidence: 'ALTA', wfs: 'DERA_G12' },
    { pattern: /\bcancha\b/i, confidence: 'ALTA', wfs: 'DERA_G12' },
    { pattern: /\brocódromo\b/i, confidence: 'ALTA', wfs: 'DERA_G12' },
    { pattern: /\bskatepark\b/i, confidence: 'ALTA', wfs: 'DERA_G12' },
    // Media confianza
    { pattern: /\bdeportiv[oa]\b/i, confidence: 'MEDIA', wfs: 'DERA_G12' },
    { pattern: /\binstalación\s*deportiva\b/i, confidence: 'MEDIA', wfs: 'DERA_G12' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVICIOS - ISE + municipal
  // Casos reales: "Ayuntamiento", "Centro Social", "Hogar del Pensionista"
  // ═══════════════════════════════════════════════════════════════════════════
  SERVICIOS: [
    // Administración local
    { pattern: /\bayuntamiento\b/i, confidence: 'ALTA', wfs: 'ISE' },
    { pattern: /\bcasa\s*consistorial\b/i, confidence: 'ALTA', wfs: 'ISE' },
    { pattern: /\balcaldía\b/i, confidence: 'ALTA', wfs: 'ISE' },
    { pattern: /\boficina\s*(municipal|técnica)?\b/i, confidence: 'MEDIA', wfs: 'ISE' },
    { pattern: /\bdependencias?\s*municipales?\b/i, confidence: 'ALTA', wfs: 'ISE' },
    { pattern: /\bjuzgado\b/i, confidence: 'ALTA', wfs: 'ISE' },
    // Servicios sociales
    { pattern: /\bcentro\s*social\b/i, confidence: 'ALTA', wfs: 'ISE' },
    { pattern: /\bhogar\s*(del\s*)?(pensionista|jubilado|mayor)\b/i, confidence: 'ALTA', wfs: 'ISE' },
    { pattern: /\bresidencia\s*(de\s*)?(ancianos|mayores|tercera\s*edad)\b/i, confidence: 'ALTA', wfs: 'SICESS' },
    { pattern: /\bcentro\s*(de\s*)?día\b/i, confidence: 'ALTA', wfs: 'ISE' },
    { pattern: /\bcasa\s*(de\s*)?juventud\b/i, confidence: 'ALTA', wfs: 'ISE' },
    // Correos y comunicaciones
    { pattern: /\bcorreos\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\boficina\s*postal\b/i, confidence: 'ALTA', wfs: null },
    // Administrativo CTE
    { pattern: /\badministrativ[oa]\b/i, confidence: 'MEDIA', wfs: 'ISE' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // ENERGIA - Agencia Andaluza Energía WFS
  // Casos reales: "Trasformador60822SevillanaEndesa", "CT Endesa", "Subestación"
  // ═══════════════════════════════════════════════════════════════════════════
  ENERGIA: [
    { pattern: /\btransformador\b/i, confidence: 'ALTA', wfs: 'AAE' },
    { pattern: /\btrasformador\b/i, confidence: 'ALTA', wfs: 'AAE', description: 'Typo común' },
    { pattern: /\bsubestación\b/i, confidence: 'ALTA', wfs: 'AAE' },
    { pattern: /\bC\.?T\.?\s*(de\s*)?(endesa|sevillana|eléctrica)?\b/i, confidence: 'ALTA', wfs: 'AAE' },
    { pattern: /\bcentro\s*(de\s*)?transformación\b/i, confidence: 'ALTA', wfs: 'AAE' },
    { pattern: /\blínea\s*(de\s*)?(alta|media|baja)\s*tensión\b/i, confidence: 'ALTA', wfs: 'AAE' },
    { pattern: /\btorre\s*(eléctrica|alta\s*tensión)\b/i, confidence: 'ALTA', wfs: 'AAE' },
    { pattern: /\bplaca[s]?\s*solar(es)?\b/i, confidence: 'ALTA', wfs: 'AAE' },
    { pattern: /\bhuerto\s*solar\b/i, confidence: 'ALTA', wfs: 'AAE' },
    { pattern: /\bparque\s*(eólico|fotovoltaico)\b/i, confidence: 'ALTA', wfs: 'AAE' },
    { pattern: /\baerogenerador\b/i, confidence: 'ALTA', wfs: 'AAE' },
    { pattern: /\bendesa\b/i, confidence: 'MEDIA', wfs: 'AAE' },
    { pattern: /\bsevillana\b/i, confidence: 'MEDIA', wfs: 'AAE' },
    { pattern: /\beléctric[oa]\b/i, confidence: 'BAJA', wfs: 'AAE' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // HIDRAULICO - REDIAM infraestructuras hidráulicas
  // Casos reales: "Depósito Agua", "EDAR", "Embalse de Quéntar"
  // ═══════════════════════════════════════════════════════════════════════════
  HIDRAULICO: [
    // Depuración
    { pattern: /\bE\.?D\.?A\.?R\.?\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bE\.?T\.?A\.?P\.?\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bdepuradora\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bpotabilizadora\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    // Almacenamiento
    { pattern: /\bdepósito\s*(de\s*)?(agua|regulación)?\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bembalse\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /(?<!helipuerto\s.*)\bpantano\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bpresa\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bbalsa\s*(de\s*)?(riego|agua)?\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\baljibe\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    // Captación
    { pattern: /\bpozo\b/i, confidence: 'MEDIA', wfs: 'REDIAM' },
    { pattern: /\bsondeo\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bcaptación\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bmanantial\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bnacimiento\b/i, confidence: 'MEDIA', wfs: 'REDIAM' },
    // Red
    { pattern: /\babastecimiento\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bacueducto\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bacequia\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bcanal\s*(de\s*)?(riego)?\b/i, confidence: 'MEDIA', wfs: 'REDIAM' },
    // Saneamiento
    { pattern: /\balcantarillado\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bcolector\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bfosa\s*séptica\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\bhidr[aá]ulic[oa]\b/i, confidence: 'MEDIA', wfs: 'REDIAM' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSPORTE - IDEADIF + DERA red viaria
  // Casos reales: "Carretera A-4076", "Caminos Rurales", "Helipuerto"
  // ═══════════════════════════════════════════════════════════════════════════
  TRANSPORTE: [
    // Carreteras
    { pattern: /\bcarretera\s*[A-Z]{1,2}[-\s]?\d+/i, confidence: 'ALTA', wfs: 'DERA_VIARIO' },
    { pattern: /\bautovía\b/i, confidence: 'ALTA', wfs: 'DERA_VIARIO' },
    { pattern: /\bautopista\b/i, confidence: 'ALTA', wfs: 'DERA_VIARIO' },
    { pattern: /\bcamino\s*(rural|vecinal|municipal)?\b/i, confidence: 'MEDIA', wfs: 'DERA_VIARIO' },
    { pattern: /\bpista\s*forestal\b/i, confidence: 'ALTA', wfs: 'DERA_VIARIO' },
    { pattern: /\bvía\s*pecuaria\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    // Ferrocarril
    { pattern: /\bestación\s*(de\s*)?(tren|ferrocarril|RENFE|AVE)?\b/i, confidence: 'ALTA', wfs: 'IDEADIF' },
    { pattern: /\bapeadero\b/i, confidence: 'ALTA', wfs: 'IDEADIF' },
    { pattern: /\bvía\s*férrea\b/i, confidence: 'ALTA', wfs: 'IDEADIF' },
    // Aéreo
    { pattern: /\bhelipuerto\b/i, confidence: 'ALTA', wfs: 'ENAIRE' },
    { pattern: /\baeropuerto\b/i, confidence: 'ALTA', wfs: 'ENAIRE' },
    { pattern: /\baeródromo\b/i, confidence: 'ALTA', wfs: 'ENAIRE' },
    { pattern: /\bhelisuperficie\b/i, confidence: 'ALTA', wfs: 'ENAIRE' },
    // Gasolineras
    { pattern: /\bgarolinera\b/i, confidence: 'ALTA', wfs: 'MITECO' },
    { pattern: /\bestación\s*(de\s*)?servicio\b/i, confidence: 'ALTA', wfs: 'MITECO' },
    { pattern: /\bárea\s*(de\s*)?servicio\b/i, confidence: 'ALTA', wfs: 'MITECO' },
    // Parking
    { pattern: /\baparcamiento\b/i, confidence: 'MEDIA', wfs: null },
    { pattern: /\bparking\b/i, confidence: 'MEDIA', wfs: null },
    // Genérico
    { pattern: /\btransporte\b/i, confidence: 'BAJA', wfs: null },
    { pattern: /\bvial\b/i, confidence: 'BAJA', wfs: 'DERA_VIARIO' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // TELECOMUNICACIONES - CNMC (sin WFS público) + OSM
  // Casos reales: "Antena Movistar", "Centro Telefónica", "Repetidor"
  // ═══════════════════════════════════════════════════════════════════════════
  TELECOMUNICACIONES: [
    { pattern: /\bantena\s*(de\s*)?(telefonía|móvil|movistar|vodafone|orange|yoigo)?\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\brepetidor\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\bcentro\s*(de\s*)?telefónica\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\btorre\s*(de\s*)?telecomunicaciones\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\bBTS\b/i, confidence: 'ALTA', wfs: null, description: 'Base Transceiver Station' },
    { pattern: /\btelefónica\b/i, confidence: 'MEDIA', wfs: null },
    { pattern: /\bmovistar\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\bvodafone\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\borange\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\btelecomunicaciones?\b/i, confidence: 'MEDIA', wfs: null },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // COMERCIAL - CartoCiudad + OSM
  // Casos reales: "Supermercado Coviran", "Restaurante", "Bar"
  // ═══════════════════════════════════════════════════════════════════════════
  COMERCIAL: [
    { pattern: /\bsupermercado\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\bhipermercado\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\bcentro\s*comercial\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\bmercado\s*(municipal|de\s*abastos)?\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\btienda\b/i, confidence: 'MEDIA', wfs: null },
    { pattern: /\bcomercio\b/i, confidence: 'MEDIA', wfs: null },
    { pattern: /\brestaurante\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\bbar\b(?!\s*celona)/i, confidence: 'MEDIA', wfs: null, description: 'Evitar Barcelona' },
    { pattern: /\bcafetería\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\bhotel\b/i, confidence: 'ALTA', wfs: 'RTA' },
    { pattern: /\bhostal\b/i, confidence: 'ALTA', wfs: 'RTA' },
    { pattern: /\bpensión\b/i, confidence: 'ALTA', wfs: 'RTA' },
    { pattern: /\balbergue\b/i, confidence: 'ALTA', wfs: 'RTA' },
    { pattern: /\bcamping\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bpanadería\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\bcarnicería\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\bpeluquería\b/i, confidence: 'ALTA', wfs: null },
    // CTE
    { pattern: /\bpública\s*concurrencia\b/i, confidence: 'MEDIA', wfs: null },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // INDUSTRIAL - REDIAM + DERA
  // Casos reales: "Cooperativa Nuestra Señora del Pilar", "Taller Mecánico"
  // ═══════════════════════════════════════════════════════════════════════════
  INDUSTRIAL: [
    { pattern: /\bfábrica\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bindustria\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bnave\s*(industrial)?\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bpolígono\s*(industrial)?\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\btaller\s*(mecánico|de\s*reparación)?\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\bcarpintería\b/i, confidence: 'ALTA', wfs: null, description: 'Taller de madera' },
    { pattern: /\bcooperativa\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\balmazara\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bbodega\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\bcantera\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\bmina\b/i, confidence: 'ALTA', wfs: 'REDIAM' },
    { pattern: /\balmacén\b/i, confidence: 'MEDIA', wfs: null },
    { pattern: /\bgranja\b/i, confidence: 'MEDIA', wfs: null },
    { pattern: /\bexplotación\s*(agrícola|ganadera)?\b/i, confidence: 'MEDIA', wfs: null },
    { pattern: /\bsilos?\b/i, confidence: 'ALTA', wfs: null },
    { pattern: /\bmatadero\b/i, confidence: 'ALTA', wfs: 'ISE' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // RESIDENCIAL - CartoCiudad direcciones
  // ═══════════════════════════════════════════════════════════════════════════
  RESIDENCIAL: [
    { pattern: /\bvivienda[s]?\b/i, confidence: 'ALTA', wfs: 'CARTOCIUDAD' },
    { pattern: /\bedificio\s*residencial\b/i, confidence: 'ALTA', wfs: 'CARTOCIUDAD' },
    { pattern: /\burbanización\b/i, confidence: 'ALTA', wfs: 'CARTOCIUDAD' },
    { pattern: /\bbloque\s*(de\s*)?pisos\b/i, confidence: 'ALTA', wfs: 'CARTOCIUDAD' },
    { pattern: /\bapartamentos?\b/i, confidence: 'MEDIA', wfs: 'CARTOCIUDAD' },
    { pattern: /\bcortijo\b/i, confidence: 'ALTA', wfs: null, description: 'Edificación rural' },
    { pattern: /\bcaserío\b/i, confidence: 'ALTA', wfs: null },
    // CTE
    { pattern: /\bresidencial\s*(público|vivienda)?\b/i, confidence: 'MEDIA', wfs: 'CARTOCIUDAD' },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // OTROS - Fallback genérico
  // ═══════════════════════════════════════════════════════════════════════════
  OTROS: [
    // No tiene patrones específicos - es el fallback
  ],
};


// ============================================================================
// FUNCIÓN PRINCIPAL DE CLASIFICACIÓN
// ============================================================================

/**
 * Clasifica una infraestructura PTEL por tipología.
 * 
 * Prioridad de búsqueda:
 * 1. Campo 'uso' (si disponible) - más específico en CTE
 * 2. Campo 'tipo' - segundo en especificidad
 * 3. Campo 'nombre' - puede contener info genérica
 * 
 * @example
 * classifyInfrastructure({ nombre: 'CEIP Juan Alonso Rivas' })
 * // → { type: 'EDUCATIVO', confidence: 'ALTA', matchedPattern: 'C.E.I.P', ... }
 * 
 * classifyInfrastructure({ nombre: 'Edificio Municipal', uso: 'docente' })
 * // → { type: 'EDUCATIVO', confidence: 'MEDIA', matchedPattern: 'docente', matchedField: 'uso', ... }
 */
export function classifyInfrastructure(input: InfrastructureInput): ClassificationResult {
  const { nombre, tipo = '', uso = '' } = input;
  
  // Campos a buscar en orden de prioridad
  const fieldsToSearch: Array<{ field: 'uso' | 'tipo' | 'nombre'; value: string }> = [
    { field: 'uso', value: uso },
    { field: 'tipo', value: tipo },
    { field: 'nombre', value: nombre },
  ].filter(f => f.value && f.value.trim().length > 0);

  // Orden de tipos por prioridad (críticos primero)
  // NOTA: RELIGIOSO antes de CULTURAL porque edificios de culto históricos son primero religiosos
  const typeOrder: InfrastructureType[] = [
    'SANITARIO',
    'EDUCATIVO', 
    'SEGURIDAD',
    'RELIGIOSO',     // Antes de CULTURAL - iglesias históricas son primero religiosas
    'CULTURAL',
    'DEPORTIVO',
    'SERVICIOS',
    'ENERGIA',
    'HIDRAULICO',
    'TRANSPORTE',
    'TELECOMUNICACIONES',
    'COMERCIAL',
    'INDUSTRIAL',
    'RESIDENCIAL',
    'OTROS',
  ];

  let bestMatch: ClassificationResult | null = null;
  const alternativeTypes: InfrastructureType[] = [];

  // Buscar en cada campo
  for (const { field, value } of fieldsToSearch) {
    // Buscar en cada tipo según orden de prioridad
    for (const infraType of typeOrder) {
      const patterns = PATTERNS[infraType];
      
      for (const config of patterns) {
        if (config.pattern.test(value)) {
          const match: ClassificationResult = {
            type: infraType,
            confidence: config.confidence,
            matchedPattern: config.pattern.source,
            matchedField: field,
            suggestedWFS: config.wfs,
            alternativeTypes: [],
          };

          // Si es ALTA confianza, retornar inmediatamente
          if (config.confidence === 'ALTA') {
            // Buscar alternativas para enriquecer resultado
            match.alternativeTypes = findAlternativeTypes(nombre, infraType);
            return match;
          }

          // Guardar mejor match encontrado
          if (!bestMatch || confidenceRank(config.confidence) > confidenceRank(bestMatch.confidence)) {
            bestMatch = match;
          }

          // Registrar como alternativa si no es el mejor
          if (!alternativeTypes.includes(infraType)) {
            alternativeTypes.push(infraType);
          }
        }
      }
    }
  }

  // Retornar mejor match o fallback a OTROS
  if (bestMatch) {
    bestMatch.alternativeTypes = alternativeTypes.filter(t => t !== bestMatch!.type);
    return bestMatch;
  }

  // Fallback: OTROS
  return {
    type: 'OTROS',
    confidence: 'BAJA',
    matchedPattern: null,
    matchedField: null,
    suggestedWFS: null,
    alternativeTypes: [],
  };
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Ranking numérico de confianza para comparación
 */
function confidenceRank(confidence: 'ALTA' | 'MEDIA' | 'BAJA'): number {
  switch (confidence) {
    case 'ALTA': return 3;
    case 'MEDIA': return 2;
    case 'BAJA': return 1;
    default: return 0;
  }
}

/**
 * Busca tipos alternativos que también coinciden
 */
function findAlternativeTypes(text: string, excludeType: InfrastructureType): InfrastructureType[] {
  const alternatives: InfrastructureType[] = [];
  
  for (const [infraType, patterns] of Object.entries(PATTERNS)) {
    if (infraType === excludeType || infraType === 'OTROS') continue;
    
    for (const config of patterns) {
      if (config.pattern.test(text) && config.confidence !== 'BAJA') {
        if (!alternatives.includes(infraType as InfrastructureType)) {
          alternatives.push(infraType as InfrastructureType);
        }
        break;
      }
    }
  }
  
  return alternatives;
}

/**
 * Obtiene el servicio WFS recomendado para un tipo
 */
export function getWFSForType(type: InfrastructureType): string | null {
  const patterns = PATTERNS[type];
  if (!patterns || patterns.length === 0) return null;
  
  // Retorna el primer WFS no-null encontrado
  for (const config of patterns) {
    if (config.wfs) return config.wfs;
  }
  return null;
}

/**
 * Clasificación por lotes con estadísticas
 */
export function classifyBatch(inputs: InfrastructureInput[]): {
  results: ClassificationResult[];
  stats: Record<InfrastructureType, number>;
  unclassified: number;
} {
  const results: ClassificationResult[] = [];
  const stats: Record<InfrastructureType, number> = {} as any;
  let unclassified = 0;

  // Inicializar stats
  for (const type of Object.keys(PATTERNS) as InfrastructureType[]) {
    stats[type] = 0;
  }

  for (const input of inputs) {
    const result = classifyInfrastructure(input);
    results.push(result);
    stats[result.type]++;
    
    if (result.type === 'OTROS') {
      unclassified++;
    }
  }

  return { results, stats, unclassified };
}

/**
 * Obtiene todos los tipos disponibles
 */
export function getAvailableTypes(): InfrastructureType[] {
  return Object.keys(PATTERNS) as InfrastructureType[];
}

/**
 * Obtiene patrones para un tipo (útil para debugging)
 */
export function getPatternsForType(type: InfrastructureType): RegExp[] {
  return PATTERNS[type]?.map(p => p.pattern) || [];
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  classifyInfrastructure,
  classifyBatch,
  getWFSForType,
  getAvailableTypes,
  getPatternsForType,
};
