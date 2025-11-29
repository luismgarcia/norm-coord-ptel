import { useState, useEffect, useCallback } from 'react';
import { Map, CheckCircle2, AlertTriangle, XCircle, ArrowRightLeft, Copy, RefreshCw, FileText, Zap, ChevronDown, Info, Target, Crosshair } from 'lucide-react';

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN PTEL ANDALUCÍA
// ============================================================================

const RANGOS_ANDALUCIA = {
  UTM: { X_MIN: 100000, X_MAX: 620000, Y_MIN: 3980000, Y_MAX: 4290000 },
  GEOGRAFICAS: { LAT_MIN: 36.0, LAT_MAX: 38.75, LON_MIN: -7.55, LON_MAX: -1.60 },
  Y_TRUNCADA: { MIN: 40000, MAX: 300000 },
};

const PLACEHOLDERS_TEXTO = new Set(['indicar', 'pendiente', 'sin datos', 'n/a', 'na', 'n.d.', 'nd', 'por definir', 'desconocido', 'xxx', 'tbd', '-', '--', '---']);
const PLACEHOLDERS_NUMERICOS = new Set([0, 1, -1, 99999, 999999, 9999999, -9999, 12345]);

const EJEMPLOS_COORDENADAS = [
  { nombre: 'Berja (ODS)', x: '504 750´´92', y: '4 077 153´´36', descripcion: 'Espacio + doble tilde' },
  { nombre: 'Berja (DOCX)', x: '506 527 28', y: '4 076 367 83', descripcion: 'Decimales implícitos' },
  { nombre: 'Europeo completo', x: '505.438,13', y: '4.078.875,09', descripcion: 'Punto miles + coma decimal' },
  { nombre: 'Colomera', x: '436780,0', y: '4136578,2', descripcion: 'Coma decimal simple' },
  { nombre: 'Hornos', x: '524.891', y: '4.230.105', descripcion: 'Punto miles sin decimal' },
  { nombre: 'Castril (limpio)', x: '521581.88', y: '4185653.05', descripcion: 'Formato estándar' },
  { nombre: 'Y Truncada', x: '504750', y: '77905', descripcion: 'ERROR P0-1: Falta "4" inicial' },
  { nombre: 'X↔Y Invertidos', x: '4077905', y: '504750', descripcion: 'ERROR P0-2: Intercambiados' },
  { nombre: 'WGS84 Granada', x: '-3.60763', y: '37.17734', descripcion: 'Coordenadas geográficas' },
  { nombre: 'Placeholder', x: 'Indicar', y: 'Pendiente', descripcion: 'Valores vacíos' },
];

// ============================================================================
// FUNCIONES DE NORMALIZACIÓN
// ============================================================================

function esPlaceholder(valor) {
  const v = valor.trim().toLowerCase();
  if (PLACEHOLDERS_TEXTO.has(v) || v === '' || v === 'null') return true;
  const num = parseFloat(v);
  return !isNaN(num) && PLACEHOLDERS_NUMERICOS.has(num);
}

function detectarPatron(valor) {
  const v = valor.trim();
  if (esPlaceholder(v)) return 'PLACEHOLDER';
  if (/Â[´º]/.test(v)) return 'MOJIBAKE';
  if (/^\d{1,3}\s+\d{3}´´\d{1,2}$/.test(v) || /^\d\s+\d{3}\s+\d{3}´´\d{1,2}$/.test(v)) return 'ESPACIO_DOBLE_TILDE';
  if (/^\d{3}\s+\d{3}\s+\d{1,2}$/.test(v) || /^\d\s+\d{3}\s+\d{3}\s+\d{1,2}$/.test(v)) return 'ESPACIO_DECIMAL_IMPLICITO';
  if (/^\d{1,3}(\s+\d{3})+$/.test(v)) return 'ESPACIO_SIN_DECIMAL';
  if (/^\d+´\d+$/.test(v)) return 'TILDE_SIMPLE';
  if (/[''']/.test(v) && /\d+['\']\d+/.test(v)) return 'COMILLAS_TIPOGRAFICAS';
  if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(v)) return 'EUROPEO_COMPLETO';
  if (/^\d+,\d+$/.test(v)) return 'COMA_DECIMAL';
  if (/^\d{1,3}(?:\.\d{3})+$/.test(v)) return 'PUNTO_MILES';
  if (/^-?\d+\.?\d*$/.test(v)) return 'LIMPIO';
  return 'DESCONOCIDO';
}

function normalizarCoordenada(input) {
  const resultado = {
    valorOriginal: input, valorNormalizado: null, exito: false,
    patronDetectado: 'DESCONOCIDO', fasesAplicadas: [], warnings: [], errores: [],
  };

  let valor = input.trim();
  resultado.fasesAplicadas.push('FASE_0_TRIM');

  if (esPlaceholder(valor)) {
    resultado.patronDetectado = 'PLACEHOLDER';
    resultado.warnings.push('Valor placeholder detectado');
    return resultado;
  }

  resultado.patronDetectado = detectarPatron(valor);

  // FASE 1: Corrección Mojibake
  if (/Â/.test(valor)) {
    const antes = valor;
    valor = valor.replace(/Â´/g, '´').replace(/Âº/g, 'º').replace(/Â°/g, '°');
    if (valor !== antes) {
      resultado.fasesAplicadas.push('FASE_1_MOJIBAKE');
      resultado.warnings.push('Mojibake corregido');
    }
  }

  // FASE 2: Normalización caracteres especiales
  const antes2 = valor;
  valor = valor.replace(/´´/g, '.').replace(/´/g, '.').replace(/['']/g, '.').replace(/'/g, '.').replace(/[""]/g, '.');
  if (valor !== antes2) resultado.fasesAplicadas.push('FASE_2_CARACTERES');

  // FASE 3: Espacios y decimales implícitos
  const antes3 = valor;
  const matchDecimal = valor.match(/^(\d{1,3}(?:\s+\d{3})*)\s+(\d{1,2})$/);
  if (matchDecimal && !valor.includes('.')) {
    valor = `${matchDecimal[1].replace(/\s+/g, '')}.${matchDecimal[2]}`;
    resultado.fasesAplicadas.push('FASE_3_DECIMAL_IMPLICITO');
    resultado.warnings.push('Decimales implícitos detectados');
  } else {
    valor = valor.replace(/\s+/g, '');
    if (valor !== antes3.replace(/\s+/g, '')) resultado.fasesAplicadas.push('FASE_3_ESPACIOS');
  }

  // FASE 4: Formato europeo
  if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(valor)) {
    valor = valor.replace(/\./g, '').replace(',', '.');
    resultado.fasesAplicadas.push('FASE_4_EUROPEO');
  } else if (/^\d+,\d+$/.test(valor)) {
    valor = valor.replace(',', '.');
    resultado.fasesAplicadas.push('FASE_4_COMA');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(valor)) {
    valor = valor.replace(/\./g, '');
    resultado.fasesAplicadas.push('FASE_4_PUNTO_MILES');
  }

  // FASE 5: Limpieza y parsing
  valor = valor.replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
  const numero = parseFloat(valor);

  if (isNaN(numero)) {
    resultado.errores.push(`No se pudo convertir: "${valor}"`);
    return resultado;
  }

  resultado.valorNormalizado = numero;
  resultado.exito = true;
  resultado.fasesAplicadas.push('FASE_5_PARSING');
  return resultado;
}

function validarCoordenada(valor) {
  const warnings = [];
  
  if (valor >= RANGOS_ANDALUCIA.UTM.X_MIN && valor <= RANGOS_ANDALUCIA.UTM.X_MAX) {
    return { valido: true, tipo: 'X_UTM', confianza: 'ALTA', warnings };
  }
  
  if (valor >= RANGOS_ANDALUCIA.UTM.Y_MIN && valor <= RANGOS_ANDALUCIA.UTM.Y_MAX) {
    return { valido: true, tipo: 'Y_UTM', confianza: 'ALTA', warnings };
  }
  
  if (valor >= RANGOS_ANDALUCIA.Y_TRUNCADA.MIN && valor <= RANGOS_ANDALUCIA.Y_TRUNCADA.MAX) {
    const corregido = valor + 4000000;
    if (corregido >= RANGOS_ANDALUCIA.UTM.Y_MIN && corregido <= RANGOS_ANDALUCIA.UTM.Y_MAX) {
      warnings.push('P0-1: Y truncada → +4000000');
      return { valido: true, tipo: 'Y_TRUNCADA', confianza: 'MEDIA', warnings, valorCorregido: corregido };
    }
  }
  
  if (valor >= RANGOS_ANDALUCIA.GEOGRAFICAS.LAT_MIN && valor <= RANGOS_ANDALUCIA.GEOGRAFICAS.LAT_MAX) {
    warnings.push('Latitud WGS84 detectada');
    return { valido: true, tipo: 'LATITUD', confianza: 'ALTA', warnings };
  }
  
  if (valor >= RANGOS_ANDALUCIA.GEOGRAFICAS.LON_MIN && valor <= RANGOS_ANDALUCIA.GEOGRAFICAS.LON_MAX) {
    warnings.push('Longitud WGS84 detectada');
    return { valido: true, tipo: 'LONGITUD', confianza: 'ALTA', warnings };
  }
  
  warnings.push('Fuera de rangos Andalucía');
  return { valido: false, tipo: 'DESCONOCIDO', confianza: 'BAJA', warnings };
}

function detectarIntercambio(x, y) {
  const xPareceSiendoY = x >= 2000000 && x <= 5000000;
  const yPareceSiendoX = y >= 100000 && y <= 700000;
  
  if (xPareceSiendoY && yPareceSiendoX) {
    return { intercambiado: true, xCorregida: y, yCorregida: x };
  }
  return { intercambiado: false, xCorregida: x, yCorregida: y };
}

function procesarCoordenadas(xInput, yInput) {
  const normX = normalizarCoordenada(xInput);
  const normY = normalizarCoordenada(yInput);
  
  let x = normX.valorNormalizado;
  let y = normY.valorNormalizado;
  let validX = null, validY = null;
  let intercambio = { intercambiado: false };
  
  if (x !== null) {
    validX = validarCoordenada(x);
    if (validX.valorCorregido) x = validX.valorCorregido;
  }
  
  if (y !== null) {
    validY = validarCoordenada(y);
    if (validY.valorCorregido) y = validY.valorCorregido;
  }
  
  if (x !== null && y !== null) {
    intercambio = detectarIntercambio(x, y);
    if (intercambio.intercambiado) {
      x = intercambio.xCorregida;
      y = intercambio.yCorregida;
      validX = validarCoordenada(x);
      validY = validarCoordenada(y);
    }
  }
  
  let confianza = 'ALTA';
  if (x === null || y === null) confianza = 'CRITICA';
  else if (intercambio.intercambiado || validX?.confianza === 'MEDIA' || validY?.confianza === 'MEDIA') confianza = 'MEDIA';
  else if (validX?.confianza === 'BAJA' || validY?.confianza === 'BAJA') confianza = 'BAJA';
  
  let score = 0;
  if (normX.exito) score += 25;
  if (normY.exito) score += 25;
  if (validX?.valido) score += 25;
  if (validY?.valido) score += 25;
  if (intercambio.intercambiado) score -= 15;
  if (validX?.valorCorregido || validY?.valorCorregido) score -= 10;
  
  return {
    x, y, xOriginal: xInput, yOriginal: yInput,
    normX, normY, validX, validY, intercambio, confianza,
    score: Math.max(0, Math.min(100, score)), epsg: 25830
  };
}

// ============================================================================
// COMPONENTES UI
// ============================================================================

const ConfianzaBadge = ({ nivel }) => {
  const configs = {
    ALTA: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-300', icon: CheckCircle2 },
    MEDIA: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-300', icon: AlertTriangle },
    BAJA: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-300', icon: AlertTriangle },
    CRITICA: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-300', icon: XCircle },
  };
  const config = configs[nivel] || configs.BAJA;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.border} ${config.text}`}>
      <Icon size={12} />
      {nivel}
    </span>
  );
};

const ScoreRing = ({ score }) => {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  
  return (
    <div className="relative w-24 h-24">
      <svg className="transform -rotate-90 w-24 h-24">
        <circle cx="48" cy="48" r="36" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
        <circle cx="48" cy="48" r="36" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[9px] text-slate-400 uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
};

const FaseTag = ({ fase }) => {
  const colores = {
    'FASE_0': 'bg-slate-600/50', 'FASE_1': 'bg-violet-600/50', 'FASE_2': 'bg-blue-600/50',
    'FASE_3': 'bg-cyan-600/50', 'FASE_4': 'bg-emerald-600/50', 'FASE_5': 'bg-green-600/50',
  };
  const prefix = fase.split('_').slice(0, 2).join('_');
  return <span className={`px-2 py-0.5 rounded text-[9px] font-mono ${colores[prefix] || 'bg-slate-600/50'}`}>{fase}</span>;
};

const PatronBadge = ({ patron }) => {
  const colores = {
    'LIMPIO': 'text-emerald-400 bg-emerald-500/20',
    'COMA_DECIMAL': 'text-blue-400 bg-blue-500/20',
    'EUROPEO_COMPLETO': 'text-amber-400 bg-amber-500/20',
    'PUNTO_MILES': 'text-orange-400 bg-orange-500/20',
    'ESPACIO_DOBLE_TILDE': 'text-red-400 bg-red-500/20',
    'ESPACIO_DECIMAL_IMPLICITO': 'text-rose-400 bg-rose-500/20',
    'PLACEHOLDER': 'text-slate-400 bg-slate-500/20',
  };
  return <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${colores[patron] || 'text-gray-400 bg-gray-500/20'}`}>{patron}</span>;
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function PTELNormalizer() {
  const [inputX, setInputX] = useState('');
  const [inputY, setInputY] = useState('');
  const [resultado, setResultado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [showEjemplos, setShowEjemplos] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const procesar = useCallback(() => {
    if (!inputX.trim() || !inputY.trim()) return;
    setIsProcessing(true);
    setTimeout(() => {
      const res = procesarCoordenadas(inputX, inputY);
      setResultado(res);
      setHistorial(prev => [{ ...res, timestamp: new Date().toISOString() }, ...prev].slice(0, 8));
      setIsProcessing(false);
    }, 100);
  }, [inputX, inputY]);

  const cargarEjemplo = (ejemplo) => {
    setInputX(ejemplo.x);
    setInputY(ejemplo.y);
    setShowEjemplos(false);
  };

  const limpiar = () => { setInputX(''); setInputY(''); setResultado(null); };

  const copiarResultado = () => {
    if (!resultado) return;
    const texto = `X: ${resultado.x?.toFixed(2) || 'NULL'}\nY: ${resultado.y?.toFixed(2) || 'NULL'}\nEPSG: 25830`;
    navigator.clipboard.writeText(texto);
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) procesar(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [procesar]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 p-4 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Crosshair className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">PTEL</span>
              <span className="text-slate-300 ml-2">Normalizador</span>
            </h1>
            <p className="text-xs text-slate-500">EPSG:25830 • UTM30 ETRS89 • Andalucía</p>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Panel de entrada */}
          <div className="space-y-4">
            <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={14} className="text-cyan-400" /> Entrada
                </h2>
                <button onClick={() => setShowEjemplos(!showEjemplos)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                  Ejemplos <ChevronDown size={12} className={`transform transition ${showEjemplos ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showEjemplos && (
                <div className="mb-4 p-2 bg-slate-900/60 rounded-lg border border-slate-700/50 max-h-48 overflow-y-auto">
                  {EJEMPLOS_COORDENADAS.map((ej, i) => (
                    <button key={i} onClick={() => cargarEjemplo(ej)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-700/50 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-300">{ej.nombre}</span>
                        <span className="text-[9px] text-slate-500">{ej.descripcion}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">X: {ej.x} | Y: {ej.y}</div>
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">X (Este / Longitud)</label>
                  <input type="text" value={inputX} onChange={(e) => setInputX(e.target.value)}
                    placeholder="ej: 504 750´´92"
                    className="w-full px-3 py-2 bg-slate-900/80 border border-slate-600/50 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">Y (Norte / Latitud)</label>
                  <input type="text" value={inputY} onChange={(e) => setInputY(e.target.value)}
                    placeholder="ej: 4 077 153´´36"
                    className="w-full px-3 py-2 bg-slate-900/80 border border-slate-600/50 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={procesar} disabled={!inputX.trim() || !inputY.trim() || isProcessing}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-500/20 disabled:shadow-none">
                  {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                  Normalizar
                </button>
                <button onClick={limpiar} className="px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Info rangos */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info size={12} className="text-slate-500 mt-0.5" />
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <p><b className="text-slate-400">UTM30 X:</b> 100k - 620k m</p>
                  <p><b className="text-slate-400">UTM30 Y:</b> 3.98M - 4.29M m</p>
                  <p><b className="text-slate-400">WGS84:</b> 36°-38.75° / -7.55°--1.60°</p>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de resultado */}
          <div>
            {resultado ? (
              <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ScoreRing score={resultado.score} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <ConfianzaBadge nivel={resultado.confianza} />
                        <span className="text-[10px] text-slate-500 font-mono">EPSG:{resultado.epsg}</span>
                      </div>
                      {resultado.intercambio.intercambiado && (
                        <p className="text-[10px] text-amber-400 flex items-center gap-1">
                          <ArrowRightLeft size={10} /> Intercambio X↔Y corregido
                        </p>
                      )}
                    </div>
                  </div>
                  <button onClick={copiarResultado} className="p-1.5 hover:bg-slate-700/50 rounded-lg" title="Copiar">
                    <Copy size={14} className="text-slate-400" />
                  </button>
                </div>

                <div className="p-4 grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">X (Este)</div>
                    <div className="font-mono text-xl font-bold text-cyan-400">
                      {resultado.x !== null ? resultado.x.toFixed(2) : '—'}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1 font-mono truncate" title={resultado.xOriginal}>
                      {resultado.xOriginal}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Y (Norte)</div>
                    <div className="font-mono text-xl font-bold text-emerald-400">
                      {resultado.y !== null ? resultado.y.toFixed(2) : '—'}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1 font-mono truncate" title={resultado.yOriginal}>
                      {resultado.yOriginal}
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/30 rounded-lg p-2 border border-slate-700/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400">Norm. X</span>
                        <PatronBadge patron={resultado.normX.patronDetectado} />
                      </div>
                      <div className="flex flex-wrap gap-0.5">
                        {resultado.normX.fasesAplicadas.map((f, i) => <FaseTag key={i} fase={f} />)}
                      </div>
                    </div>
                    <div className="bg-slate-900/30 rounded-lg p-2 border border-slate-700/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400">Norm. Y</span>
                        <PatronBadge patron={resultado.normY.patronDetectado} />
                      </div>
                      <div className="flex flex-wrap gap-0.5">
                        {resultado.normY.fasesAplicadas.map((f, i) => <FaseTag key={i} fase={f} />)}
                      </div>
                    </div>
                  </div>

                  {resultado.x !== null && resultado.y !== null && resultado.validX?.tipo === 'X_UTM' && (
                    <div className="bg-slate-900/30 rounded-lg p-3 border border-slate-700/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Map size={12} className="text-cyan-400" />
                        <span className="text-[10px] text-slate-400">Ubicación Andalucía</span>
                      </div>
                      <div className="relative h-24 bg-slate-800/50 rounded overflow-hidden">
                        <svg viewBox="0 0 400 120" className="absolute inset-0 w-full h-full">
                          <path d="M20,60 Q60,30 120,40 L180,25 Q240,20 300,35 L360,50 Q380,60 370,80 L350,95 Q300,110 220,105 L140,110 Q80,115 40,100 L20,80 Z"
                            fill="rgba(56,189,248,0.1)" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
                          <circle cx={20 + ((resultado.x - 100000) / 520000) * 360}
                            cy={100 - ((resultado.y - 3980000) / 310000) * 75}
                            r="5" fill="#10b981" stroke="#fff" strokeWidth="1.5">
                            <animate attributeName="r" values="5;7;5" dur="1.5s" repeatCount="indefinite" />
                          </circle>
                        </svg>
                        <div className="absolute bottom-1 right-1 text-[8px] text-slate-500 font-mono bg-slate-900/80 px-1 rounded">
                          {resultado.x.toFixed(0)}, {resultado.y.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                <div className="w-16 h-16 rounded-xl bg-slate-700/30 flex items-center justify-center mb-4">
                  <Target size={28} className="text-slate-600" />
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-1">Introduce coordenadas</h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  Detección automática de 52 patrones • Normalización a UTM30 ETRS89
                </p>
                <div className="mt-4 flex flex-wrap gap-1 justify-center">
                  <span className="text-[9px] px-2 py-0.5 bg-slate-700/30 rounded-full text-slate-500">Corrección P0</span>
                  <span className="text-[9px] px-2 py-0.5 bg-slate-700/30 rounded-full text-slate-500">Scoring</span>
                  <span className="text-[9px] px-2 py-0.5 bg-slate-700/30 rounded-full text-slate-500">QGIS</span>
                </div>
              </div>
            )}

            {historial.length > 0 && (
              <div className="mt-3 bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Historial</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {historial.map((h, i) => (
                    <div key={i} onClick={() => { setInputX(h.xOriginal); setInputY(h.yOriginal); setResultado(h); }}
                      className="flex items-center justify-between px-2 py-1 bg-slate-900/30 rounded text-[10px] cursor-pointer hover:bg-slate-700/30">
                      <span className="font-mono text-slate-400 truncate max-w-[100px]">{h.xOriginal}</span>
                      <span className="text-slate-600">→</span>
                      <span className="font-mono text-cyan-400">{h.x?.toFixed(0) || '—'}</span>
                      <span className={`font-bold ${h.score >= 80 ? 'text-emerald-400' : h.score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                        {h.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-6 text-center text-[10px] text-slate-600">
          Sistema PTEL Andalucía • Normalización v2.0 • 786 municipios
        </footer>
      </div>
    </div>
  );
}
