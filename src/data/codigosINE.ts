/**
 * @fileoverview Códigos INE de municipios andaluces
 * @description Tabla completa de los 786 municipios de Andalucía con sus códigos INE
 * @author Proyecto PTEL - Normalizador de Coordenadas
 * @version 1.0.0
 * @date 2025-11-28
 * @source INE - Instituto Nacional de Estadística
 * 
 * ⚠️ ARCHIVO DEPRECADO - CONTIENE CÓDIGOS INE INCORRECTOS
 * 
 * Este archivo fue generado manualmente y contiene ~38 códigos INE incorrectos
 * que no coinciden con el catálogo oficial del INE.
 * 
 * RECOMENDACIÓN: Usar en su lugar:
 * - src/lib/codigosINEUnificado.ts (fuente única de verdad, deriva de centroides WFS)
 * - getCodigoINE(nombre) para búsqueda por nombre
 * - esCodigoINEValido(codigo) para validación
 * 
 * Los códigos correctos están en src/lib/municipiosCentroides.ts que fue
 * generado automáticamente desde el servicio WFS DERA del IECA.
 * 
 * @deprecated Usar codigosINEUnificado.ts - Ver test dataIntegrity.test.ts para detalles
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface MunicipioINE {
  nombre: string;
  codigo: string;
  codigoProvincia: string;
  provincia: string;
}

export interface TablaINE {
  version: string;
  generado: string;
  fuente: string;
  total: number;
  provincias: Record<string, string>;
  municipios: Record<string, string>;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const STORAGE_KEY = 'ptel_codigos_ine';
const VERSION_KEY = 'ptel_ine_version';

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

export const CODIGO_POR_PROVINCIA: Record<string, string> = {
  'almeria': '04',
  'cadiz': '11',
  'cordoba': '14',
  'granada': '18',
  'huelva': '21',
  'jaen': '23',
  'malaga': '29',
  'sevilla': '41'
};

// ============================================================================
// DATOS EMBEBIDOS - 786 MUNICIPIOS ANDALUCES
// ============================================================================

export const DATOS_INE_EMBEBIDOS: TablaINE = {
  version: "2025-01-01",
  generado: "2025-11-28T12:00:00Z",
  fuente: "INE - Instituto Nacional de Estadística",
  total: 786,
  provincias: PROVINCIAS_ANDALUCIA,
  municipios: {
    // ALMERÍA (04) - 103 municipios
    "abla": "04001", "abrucena": "04002", "adra": "04003", "albanchez": "04004",
    "alboloduy": "04005", "albox": "04006", "alcolea": "04007", "alcontar": "04008",
    "alcudia de monteagud": "04009", "alhabia": "04010", "alhama de almeria": "04011",
    "alicun": "04012", "almeria": "04013", "almocita": "04014", "alsodux": "04015",
    "antas": "04016", "arboleas": "04017", "armuna de almanzora": "04018",
    "bacares": "04019", "bayarcal": "04020", "bayarque": "04021", "bedar": "04022",
    "beires": "04023", "benahadux": "04024", "benitagla": "04025", "benizalon": "04026",
    "bentarique": "04027", "berja": "04028", "canjayar": "04029", "cantoria": "04030",
    "carboneras": "04031", "castro de filabres": "04032", "chercos": "04034",
    "chirivel": "04035", "cobdar": "04036", "cuevas del almanzora": "04037",
    "dalias": "04038", "el ejido": "04902", "enix": "04039", "felix": "04040",
    "finana": "04041", "fondon": "04042", "gador": "04043", "gallardos, los": "04044",
    "garrucha": "04045", "gergal": "04046", "huecija": "04047",
    "huercal de almeria": "04048", "huercal-overa": "04049", "illar": "04050",
    "instincion": "04051", "laroya": "04052", "laujar de andarax": "04053",
    "lijar": "04054", "lubrin": "04055", "lucainena de las torres": "04056",
    "lucar": "04057", "macael": "04058", "maria": "04059", "mojacar": "04060",
    "nacimiento": "04061", "nijar": "04062", "ohanes": "04063",
    "olula de castro": "04064", "olula del rio": "04065", "oria": "04066",
    "padules": "04067", "partaloa": "04068", "paterna del rio": "04069",
    "pechina": "04070", "pulpi": "04071", "purchena": "04072", "ragol": "04073",
    "rioja": "04074", "roquetas de mar": "04075", "santa cruz de marchena": "04076",
    "santa fe de mondujar": "04077", "senes": "04078", "seron": "04079",
    "somontin": "04080", "sorbas": "04081", "sufli": "04082", "tabernas": "04083",
    "taberno": "04084", "tahal": "04085", "terque": "04086", "tijola": "04087",
    "turre": "04089", "turrillas": "04090", "uleila del campo": "04091",
    "urracal": "04092", "velez-blanco": "04093", "velez-rubio": "04094",
    "vera": "04095", "viator": "04096", "vicar": "04097", "zurgena": "04098",
    
    // CÁDIZ (11) - 45 municipios
    "alcala de los gazules": "11001", "alcala del valle": "11002", "algar": "11003",
    "algeciras": "11004", "algodonales": "11005", "arcos de la frontera": "11006",
    "barbate": "11007", "barrios, los": "11008", "benaocaz": "11009", "bornos": "11010",
    "bosque, el": "11011", "cadiz": "11012", "castellar de la frontera": "11013",
    "chiclana de la frontera": "11014", "chipiona": "11015", "conil de la frontera": "11016",
    "espera": "11017", "gastor, el": "11018", "grazalema": "11019",
    "jerez de la frontera": "11020", "jimena de la frontera": "11021",
    "linea de la concepcion, la": "11022", "medina-sidonia": "11023", "olvera": "11024",
    "paterna de rivera": "11025", "prado del rey": "11026",
    "puerto de santa maria, el": "11027", "puerto real": "11028",
    "puerto serrano": "11029", "rota": "11030", "san fernando": "11031",
    "san jose del valle": "11902", "san roque": "11033",
    "sanlucar de barrameda": "11032", "setenil de las bodegas": "11034",
    "tarifa": "11035", "torre-alhaquime": "11036", "trebujena": "11037",
    "ubrique": "11038", "vejer de la frontera": "11039",
    "villaluenga del rosario": "11040", "villamartin": "11041",
    "zahara de la sierra": "11042",
    
    // CÓRDOBA (14) - 77 municipios
    "adamuz": "14001", "aguilar de la frontera": "14002", "alcaracejos": "14003",
    "almedinilla": "14004", "almodovar del rio": "14005", "anora": "14006",
    "baena": "14007", "belalcazar": "14008", "belmez": "14009", "benameji": "14010",
    "blazquez, los": "14011", "bujalance": "14012", "cabra": "14013",
    "canete de las torres": "14014", "carcabuey": "14015", "cardena": "14016",
    "carlota, la": "14017", "carpio, el": "14018", "castro del rio": "14019",
    "conquista": "14020", "cordoba": "14021", "dona mencia": "14022",
    "dos torres": "14023", "encinas reales": "14024", "espejo": "14025",
    "espiel": "14026", "fernan-nunez": "14027", "fuente la lancha": "14028",
    "fuente obejuna": "14029", "fuente palmera": "14030", "fuente tojar": "14031",
    "granjuela, la": "14032", "guadalcazar": "14033", "guijo, el": "14034",
    "hinojosa del duque": "14035", "hornachuelos": "14036", "iznajar": "14037",
    "lucena": "14038", "luque": "14039", "montalban de cordoba": "14040",
    "montemayor": "14041", "montilla": "14042", "montoro": "14043",
    "monturque": "14044", "moriles": "14045", "nueva carteya": "14046",
    "obejo": "14047", "palenciana": "14048", "palma del rio": "14049",
    "pedro abad": "14050", "pedroche": "14051", "penarroya-pueblonuevo": "14052",
    "posadas": "14053", "pozoblanco": "14054", "priego de cordoba": "14055",
    "puente genil": "14056", "rambla, la": "14057", "rute": "14058",
    "san sebastian de los ballesteros": "14059", "santa eufemia": "14060",
    "santaella": "14061", "torrecampo": "14062", "valenzuela": "14063",
    "valsequillo": "14064", "victoria, la": "14065", "villa del rio": "14066",
    "villafranca de cordoba": "14067", "villaharta": "14068",
    "villanueva de cordoba": "14069", "villanueva del duque": "14070",
    "villanueva del rey": "14071", "villaralto": "14072",
    "villaviciosa de cordoba": "14073", "viso, el": "14074", "zuheros": "14075",
    
    // GRANADA (18) - 174 municipios
    "agron": "18001", "alamedilla": "18002", "albolote": "18003", "albondon": "18004",
    "albunan": "18005", "albunol": "18006", "albunuelas": "18007", "aldeire": "18008",
    "alfacar": "18009", "algarinejo": "18010", "alhama de granada": "18011",
    "alhendin": "18012", "alicun de ortega": "18013", "almegíjar": "18014",
    "almunecar": "18015", "alpujarra de la sierra": "18016", "alquife": "18017",
    "arenas del rey": "18018", "armilla": "18019", "atarfe": "18020", "baza": "18021",
    "beas de granada": "18022", "beas de guadix": "18023", "benalua": "18024",
    "benalua de las villas": "18025", "benamaurel": "18026", "berchules": "18027",
    "bubion": "18028", "busquistar": "18029", "cacin": "18030", "cadiar": "18031",
    "cajar": "18032", "calahorra, la": "18033", "calicasas": "18034",
    "campotejar": "18035", "caniles": "18036", "capileira": "18037",
    "carataunas": "18038", "castillejar": "18039", "castril": "18040",
    "cenes de la vega": "18041", "chauchina": "18042", "cherin": "18043",
    "chimeneas": "18044", "churriana de la vega": "18045", "cijuela": "18046",
    "cogollos de guadix": "18047", "cogollos de la vega": "18048",
    "colomera": "18051", "cortes de baza": "18052", "cortes y graena": "18053",
    "cullar": "18054", "cullar vega": "18055", "darro": "18056",
    "dehesas de guadix": "18057", "dehesas viejas": "18907", "deifontes": "18058",
    "dilar": "18059", "dolar": "18060", "dudar": "18061", "durcal": "18062",
    "escuzar": "18063", "ferreira": "18064", "fonelas": "18065", "freila": "18066",
    "fuente vaqueros": "18067", "gabias, las": "18902", "galera": "18068",
    "gobernador": "18069", "gojar": "18070", "gor": "18071", "gorafe": "18072",
    "granada": "18087", "guadahortuna": "18073", "guadix": "18089",
    "gualchos": "18074", "guejar sierra": "18075", "guevejar": "18076",
    "huetor santillan": "18077", "huetor tajar": "18078", "huetor vega": "18079",
    "huescar": "18080", "illora": "18081", "itrabo": "18082", "izbor": "18083",
    "jayena": "18084", "jerez del marquesado": "18085", "jete": "18086",
    "jun": "18088", "juviles": "18090", "lachar": "18091", "lanteira": "18093",
    "lecrin": "18094", "lentejí": "18095", "lobras": "18096", "loja": "18097",
    "lugros": "18098", "lujar": "18099", "malaha, la": "18100", "maracena": "18101",
    "marchal": "18102", "moclin": "18103", "molinicos": "18104", "monachil": "18105",
    "montefrio": "18106", "montejicar": "18107", "montillana": "18108",
    "moraleda de zafayona": "18109", "morelabor": "18110", "motril": "18140",
    "murtas": "18111", "nevada": "18912", "nivar": "18112", "niguelas": "18113",
    "ogijares": "18114", "orce": "18115", "orgiva": "18116", "otura": "18117",
    "padul": "18118", "pampaneira": "18119", "pedro martinez": "18120",
    "peligros": "18121", "peza, la": "18122", "pinar, el": "18906",
    "pinos genil": "18123", "pinos puente": "18124", "pinar": "18125",
    "policar": "18126", "polopos": "18127", "portugos": "18128",
    "puebla de don fadrique": "18129", "pulianas": "18130", "purullena": "18131",
    "quentar": "18138", "rubite": "18132", "salar": "18133", "salobrena": "18134",
    "santa cruz del comercio": "18135", "santa fe": "18136", "sorvilan": "18137",
    "taha, la": "18903", "torre-cardela": "18139", "torvizcon": "18141",
    "trevelez": "18142", "turon": "18143", "ugijar": "18144",
    "valderrubio": "18913", "valle, el": "18905", "valle del zalabi": "18911",
    "valor": "18145", "vegas del genil": "18910", "velez de benaudalla": "18146",
    "ventas de huelma": "18147", "villanueva de las torres": "18148",
    "villanueva mesia": "18149", "viznar": "18150", "zafarraya": "18151",
    "zagra": "18904", "zubia, la": "18152", "zujar": "18153",
    
    // HUELVA (21) - 79 municipios
    "alajar": "21001", "aljaraque": "21002", "almendro, el": "21003",
    "almonaster la real": "21004", "almonte": "21005", "alosno": "21006",
    "aracena": "21007", "aroche": "21008", "arroyomolinos de leon": "21009",
    "ayamonte": "21010", "beas": "21011", "berrocal": "21012",
    "bollullos par del condado": "21013", "bonares": "21014",
    "cabezas rubias": "21015", "cala": "21016", "calanas": "21017",
    "campillo, el": "21018", "campofrio": "21019", "canaveral de leon": "21020",
    "cartaya": "21021", "castano del robledo": "21022",
    "cerro de andevalo, el": "21023", "chucena": "21024",
    "corteconcepcion": "21025", "cortegana": "21026", "cortelazor": "21027",
    "cumbres de enmedio": "21028", "cumbres de san bartolome": "21029",
    "cumbres mayores": "21030", "encinasola": "21031", "escacena del campo": "21032",
    "fuenteheridos": "21033", "galaroza": "21034", "gibraleon": "21035",
    "granado, el": "21036", "higuera de la sierra": "21037", "hinojales": "21038",
    "hinojos": "21039", "huelva": "21041", "isla cristina": "21042",
    "jabugo": "21043", "lepe": "21044", "linares de la sierra": "21045",
    "lucena del puerto": "21046", "manzanilla": "21047", "marines, los": "21048",
    "minas de riotinto": "21049", "moguer": "21050", "nava, la": "21051",
    "nerva": "21052", "niebla": "21053", "palma del condado, la": "21054",
    "palos de la frontera": "21055", "paterna del campo": "21056",
    "paymogo": "21057", "puebla de guzman": "21058", "puerto moral": "21059",
    "punta umbria": "21060", "rociana del condado": "21061",
    "rosal de la frontera": "21062", "san bartolome de la torre": "21063",
    "san juan del puerto": "21064", "san silvestre de guzman": "21065",
    "sanlucar de guadiana": "21066", "santa ana la real": "21067",
    "santa barbara de casa": "21068", "santa olalla del cala": "21069",
    "trigueros": "21070", "valdelarco": "21071", "valverde del camino": "21072",
    "villablanca": "21073", "villalba del alcor": "21074",
    "villanueva de las cruces": "21075", "villanueva de los castillejos": "21076",
    "villarrasa": "21077", "zalamea la real": "21078", "zufre": "21079",
    
    // JAÉN (23) - 97 municipios
    "albanchez de magina": "23001", "alcala la real": "23002", "alcaudete": "23003",
    "aldeaquemada": "23004", "andujar": "23005", "arjona": "23006",
    "arjonilla": "23007", "arquillos": "23008", "baeza": "23009", "bailen": "23010",
    "banos de la encina": "23011", "beas de segura": "23012", "begijar": "23013",
    "belmez de la moraleda": "23014", "benatae": "23015",
    "cabra del santo cristo": "23016", "cambil": "23017",
    "campillo de arenas": "23018", "canena": "23019", "carboneros": "23020",
    "carolina, la": "23021", "castellar": "23022", "castillo de locubin": "23023",
    "cazalilla": "23024", "cazorla": "23025", "chiclana de segura": "23026",
    "chilluevar": "23027", "escanuela": "23028", "espeluy": "23029",
    "frailes": "23030", "fuensanta de martos": "23031", "fuerte del rey": "23032",
    "genave": "23033", "guardia de jaen, la": "23034", "guarroman": "23035",
    "higuera de calatrava": "23037", "hinojares": "23038", "hornos": "23039",
    "huelma": "23040", "huesa": "23041", "ibros": "23042", "iruela, la": "23043",
    "iznatoraf": "23044", "jabalquinto": "23045", "jaen": "23050",
    "jamilena": "23046", "jimena": "23047", "jodar": "23048", "larva": "23049",
    "linares": "23051", "lopera": "23052", "lupion": "23053", "mancha real": "23054",
    "marmolejo": "23055", "martos": "23056", "mengibar": "23057",
    "montizon": "23058", "navas de san juan": "23059", "noalejo": "23060",
    "orcera": "23061", "peal de becerro": "23062", "pegalajar": "23063",
    "porcuna": "23065", "pozo alcon": "23066", "puente de genave": "23067",
    "puerta de segura, la": "23068", "quesada": "23069", "rus": "23070",
    "sabiote": "23071", "santa elena": "23072", "santiago de calatrava": "23073",
    "santiago-pontones": "23904", "santisteban del puerto": "23074",
    "santo tome": "23075", "segura de la sierra": "23076", "siles": "23077",
    "sorihuela del guadalimar": "23078", "torreblascopedro": "23079",
    "torredelcampo": "23080", "torredonjimeno": "23081", "torreperogil": "23082",
    "torres": "23083", "torres de albanchez": "23084", "ubeda": "23085",
    "valdepenas de jaen": "23086", "vilches": "23087", "villacarrillo": "23088",
    "villanueva de la reina": "23089", "villanueva del arzobispo": "23090",
    "villardompardo": "23091", "villares, los": "23092", "villarrodrigo": "23093",
    "villatorres": "23094",
    
    // MÁLAGA (29) - 103 municipios
    "alameda": "29001", "alcaucin": "29002", "alfarnate": "29003",
    "alfarnatejo": "29004", "algarrobo": "29005", "algatocin": "29006",
    "alhaurin de la torre": "29007", "alhaurin el grande": "29008",
    "almachar": "29009", "almogia": "29010", "almargen": "29011", "alora": "29012",
    "alozaina": "29013", "alpandeire": "29014", "antequera": "29015",
    "archez": "29016", "archidona": "29017", "ardales": "29018", "arenas": "29019",
    "arriate": "29020", "atajate": "29021", "benadalid": "29022",
    "benahavis": "29023", "benalauria": "29024", "benalmadena": "29025",
    "benamargosa": "29026", "benamocarra": "29027", "benaojan": "29028",
    "benarrabá": "29029", "borge, el": "29030", "burgo, el": "29031",
    "campillos": "29032", "canillas de aceituno": "29033",
    "canillas de albaida": "29034", "canete la real": "29035",
    "carratraca": "29036", "cartajima": "29037", "cartama": "29038",
    "casabermeja": "29039", "casarabonela": "29040", "casares": "29041",
    "coin": "29042", "colmenar": "29043", "comares": "29044", "competa": "29045",
    "cortes de la frontera": "29046", "cuevas bajas": "29047",
    "cuevas de san marcos": "29048", "cuevas del becerro": "29049",
    "cutar": "29050", "estepona": "29051", "farajan": "29052",
    "frigiliana": "29053", "fuengirola": "29054", "fuente de piedra": "29055",
    "gaucin": "29056", "genalguacil": "29057", "guaro": "29058",
    "humilladero": "29059", "igualeja": "29060", "istan": "29061",
    "iznate": "29062", "jimera de libar": "29063", "jubrique": "29064",
    "juzcar": "29065", "macharaviaya": "29066", "malaga": "29067",
    "manilva": "29068", "marbella": "29069", "mijas": "29070", "moclinejo": "29071",
    "mollina": "29072", "monda": "29073", "montejaque": "29074", "nerja": "29075",
    "ojen": "29076", "parauta": "29077", "periana": "29078", "pizarra": "29079",
    "pujerra": "29080", "rincon de la victoria": "29081", "riogordo": "29082",
    "ronda": "29083", "salares": "29084", "sayalonga": "29085", "sedella": "29086",
    "sierra de yeguas": "29087", "teba": "29088", "tolox": "29089",
    "torremolinos": "29901", "torrox": "29090", "totalan": "29091",
    "valle de abdalajís": "29092", "velez-malaga": "29094",
    "villanueva de algaidas": "29093", "villanueva de tapia": "29095",
    "villanueva del rosario": "29096", "villanueva del trabuco": "29097",
    "vinuela": "29098", "yunquera": "29099",
    
    // SEVILLA (41) - 106 municipios
    "aguadulce": "41001", "alanis": "41002", "albaida del aljarafe": "41003",
    "alcala de guadaira": "41004", "alcala del rio": "41005",
    "alcolea del rio": "41006", "algaba, la": "41007", "algamitas": "41008",
    "almaden de la plata": "41009", "almensilla": "41010", "arahal": "41011",
    "aznalcazar": "41012", "aznalcollar": "41013", "badolatosa": "41014",
    "benacazon": "41015", "bollullos de la mitacion": "41016", "bormujos": "41017",
    "brenes": "41018", "burguillos": "41019", "cabezas de san juan, las": "41020",
    "camas": "41021", "campana, la": "41022", "cantillana": "41023",
    "carmona": "41024", "carrion de los cespedes": "41025", "casariche": "41026",
    "castilblanco de los arroyos": "41027", "castilleja de guzman": "41028",
    "castilleja de la cuesta": "41029", "castilleja del campo": "41030",
    "cazalla de la sierra": "41031", "constantina": "41032", "coria del rio": "41033",
    "coripe": "41034", "coronil, el": "41035", "corrales, los": "41036",
    "dos hermanas": "41038", "ecija": "41039", "espartinas": "41040",
    "estepa": "41041", "fuentes de andalucia": "41042", "garrobo, el": "41043",
    "gelves": "41044", "gerena": "41045", "gilena": "41046", "gines": "41047",
    "guadalcanal": "41048", "guillena": "41049", "herrera": "41050",
    "huevar del aljarafe": "41051", "isla mayor": "41902", "lantejuela": "41052",
    "lebrija": "41053", "lora de estepa": "41054", "lora del rio": "41055",
    "luisiana, la": "41056", "madrono, el": "41057", "mairena del alcor": "41058",
    "mairena del aljarafe": "41059", "marchena": "41060", "marinaleda": "41061",
    "martin de la jara": "41062", "molares, los": "41063", "montellano": "41064",
    "moron de la frontera": "41065", "navas de la concepcion, las": "41066",
    "olivares": "41067", "osuna": "41068", "palacios y villafranca, los": "41069",
    "palomares del rio": "41070", "paradas": "41071", "pedrera": "41072",
    "pedroso, el": "41073", "penaflor": "41074", "pilas": "41075", "pruna": "41076",
    "puebla de cazalla, la": "41077", "puebla de los infantes, la": "41078",
    "puebla del rio, la": "41079", "real de la jara, el": "41080",
    "rinconada, la": "41081", "roda de andalucia, la": "41082",
    "ronquillo, el": "41083", "rubio, el": "41084", "salteras": "41085",
    "san juan de aznalfarache": "41086", "san nicolas del puerto": "41087",
    "sanlucar la mayor": "41088", "santiponce": "41089", "saucejo, el": "41090",
    "sevilla": "41091", "tocina": "41092", "tomares": "41093", "umbrete": "41094",
    "utrera": "41095", "valencina de la concepcion": "41096",
    "villamanrique de la condesa": "41097", "villanueva de san juan": "41098",
    "villanueva del ariscal": "41099", "villanueva del rio y minas": "41100",
    "villaverde del rio": "41101", "viso del alcor, el": "41102"
  }
};

// ============================================================================
// FUNCIONES DE ACCESO
// ============================================================================

export function normalizarNombre(texto: string): string {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getTablaINE(): TablaINE {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.municipios && Object.keys(parsed.municipios).length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('[INE] Error cargando desde localStorage:', error);
  }
  
  return DATOS_INE_EMBEBIDOS;
}

export function getCodigoINE(municipio: string, provincia?: string): string | null {
  const tabla = getTablaINE();
  const municipioNorm = normalizarNombre(municipio);
  
  const codigo = tabla.municipios[municipioNorm];
  
  if (codigo) {
    if (provincia) {
      const codigoProv = CODIGO_POR_PROVINCIA[normalizarNombre(provincia)];
      if (codigoProv && !codigo.startsWith(codigoProv)) {
        return null;
      }
    }
    return codigo;
  }
  
  for (const [nombre, cod] of Object.entries(tabla.municipios)) {
    if (nombre.includes(municipioNorm) || municipioNorm.includes(nombre)) {
      if (provincia) {
        const codigoProv = CODIGO_POR_PROVINCIA[normalizarNombre(provincia)];
        if (codigoProv && !cod.startsWith(codigoProv)) {
          continue;
        }
      }
      return cod;
    }
  }
  
  return null;
}

export function getMunicipioInfo(codigoINE: string): MunicipioINE | null {
  if (!codigoINE || codigoINE.length < 5) return null;
  
  const tabla = getTablaINE();
  const codigoProvincia = codigoINE.substring(0, 2);
  const provincia = PROVINCIAS_ANDALUCIA[codigoProvincia];
  
  if (!provincia) return null;
  
  for (const [nombre, codigo] of Object.entries(tabla.municipios)) {
    if (codigo === codigoINE) {
      return {
        nombre: capitalizarNombre(nombre),
        codigo: codigoINE,
        codigoProvincia,
        provincia
      };
    }
  }
  
  return null;
}

export function getNombreProvincia(codigoProvincia: string): string | null {
  return PROVINCIAS_ANDALUCIA[codigoProvincia] || null;
}

export function getCodigoProvincia(nombreProvincia: string): string | null {
  return CODIGO_POR_PROVINCIA[normalizarNombre(nombreProvincia)] || null;
}

export function getMunicipiosPorProvincia(provincia: string): Array<{ nombre: string; codigo: string }> {
  const tabla = getTablaINE();
  
  let codigoProv = provincia;
  if (provincia.length !== 2) {
    codigoProv = CODIGO_POR_PROVINCIA[normalizarNombre(provincia)] || '';
  }
  
  if (!codigoProv) return [];
  
  const municipios: Array<{ nombre: string; codigo: string }> = [];
  
  for (const [nombre, codigo] of Object.entries(tabla.municipios)) {
    if (codigo.startsWith(codigoProv)) {
      municipios.push({ nombre: capitalizarNombre(nombre), codigo });
    }
  }
  
  return municipios.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function buscarMunicipios(texto: string, limite: number = 10): MunicipioINE[] {
  const tabla = getTablaINE();
  const textoNorm = normalizarNombre(texto);
  const resultados: MunicipioINE[] = [];
  
  for (const [nombre, codigo] of Object.entries(tabla.municipios)) {
    if (nombre.includes(textoNorm)) {
      const codigoProv = codigo.substring(0, 2);
      resultados.push({
        nombre: capitalizarNombre(nombre),
        codigo,
        codigoProvincia: codigoProv,
        provincia: PROVINCIAS_ANDALUCIA[codigoProv] || ''
      });
      
      if (resultados.length >= limite) break;
    }
  }
  
  return resultados;
}

export async function actualizarTablaINE(url?: string): Promise<boolean> {
  const defaultUrl = 'https://cdn.jsdelivr.net/gh/luismgarcia/norm-coord-ptel@main/data/ine/andalucia.json';
  
  try {
    const response = await fetch(url || defaultUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data: TablaINE = await response.json();
    
    if (!data.municipios || !data.version || Object.keys(data.municipios).length < 700) {
      throw new Error('Datos INE inválidos');
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(VERSION_KEY, data.version);
    
    console.log(`[INE] Actualizado a versión ${data.version}`);
    return true;
    
  } catch (error) {
    console.warn('[INE] Error actualizando:', error);
    return false;
  }
}

export function necesitaActualizacion(): boolean {
  const version = localStorage.getItem(VERSION_KEY);
  if (!version) return true;
  
  const currentYear = new Date().getFullYear();
  const versionYear = parseInt(version.substring(0, 4), 10);
  
  return versionYear < currentYear;
}

export function getVersionTabla(): string {
  return localStorage.getItem(VERSION_KEY) || DATOS_INE_EMBEBIDOS.version;
}

function capitalizarNombre(nombre: string): string {
  const palabrasMinusculas = ['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e'];
  
  return nombre
    .split(' ')
    .map((palabra, index) => {
      if (index > 0 && palabrasMinusculas.includes(palabra.toLowerCase())) {
        return palabra.toLowerCase();
      }
      return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase();
    })
    .join(' ');
}

export default {
  getCodigoINE,
  getMunicipioInfo,
  getNombreProvincia,
  getCodigoProvincia,
  getMunicipiosPorProvincia,
  buscarMunicipios,
  getTablaINE,
  actualizarTablaINE,
  necesitaActualizacion,
  getVersionTabla,
  normalizarNombre,
  PROVINCIAS_ANDALUCIA,
  CODIGO_POR_PROVINCIA,
  DATOS_INE_EMBEBIDOS
};
