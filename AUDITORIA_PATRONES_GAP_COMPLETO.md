# 🔍 AUDITORÍA EXHAUSTIVA: Patrones Detectados vs Implementados

**Fecha:** 2025-11-27  
**Documentos auditados:** 8 ficheros de documentación del proyecto  
**Sistema objetivo:** EPSG:25830 (UTM 30N ETRS89)

---

## 📊 RESUMEN EJECUTIVO

| Categoría | Documentados | Implementados | GAP | Prioridad |
|-----------|--------------|---------------|-----|-----------|
| A: UTM válidos | 10 | 10 | 0 | ✅ |
| B: UTM erróneos | 12 | 10 | **2** | 🔴 |
| C: DMS sexagesimales | 8 | 0 | **8** | 🟠 |
| D: NMEA GPS | 4 | 0 | **4** | 🟡 |
| E: Especiales/históricos | 6 | 1 | **5** | 🔴 |
| F: Mixtos/ambiguos | 6 | 2 | **4** | 🟡 |
| G: Compuestos (WKT, JSON) | 4 | 0 | **4** | 🟡 |
| H: Libre/narrativo | 2 | 0 | **2** | ⚪ |
| **TOTAL** | **52** | **23** | **29** | - |

**Cobertura actual: 44.2%** (23 de 52 patrones)

---

## 🔴 PATRONES CRÍTICOS NO IMPLEMENTADOS

### B6: Coordenadas Pegadas (Sin separador)
```
Ejemplo: "4077905504750" → Y=4077905, X=504750
Impacto: Parsing falla completamente
Frecuencia: 3% documentos
Solución documentada:
```
```typescript
function separarCoordenadasPegadas(valor: string): { x: number; y: number } | null {
  const limpio = valor.replace(/[^\d]/g, '');
  
  if (limpio.length === 13) {  // Sin decimales: YYYYYYYXXXXXX
    return {
      y: parseInt(limpio.slice(0, 7)),
      x: parseInt(limpio.slice(7, 13))
    };
  }
  
  if (limpio.length === 14) {  // 1 decimal implícito
    return {
      y: parseInt(limpio.slice(0, 8)) / 10,
      x: parseInt(limpio.slice(8, 14)) / 10
    };
  }
  
  return null;
}
```

### E2: Transformación ED50 → ETRS89
```
Documentación: Taxonomía Exhaustiva, sección 3
Impacto: ~230m de diferencia (X:-110m, Y:-208m)
Aplicación: Documentos con año < 2007
Solución: Rejilla NTv2 IGN oficial
Estado: ⚠️ DOCUMENTADO pero NO implementado
```
```typescript
// Requiere integración con:
// - IGN Rejilla NTv2: http://www.ign.es/web/ign/portal/gds-rejilla-cambio-datum
// - O proj4 con definición:
import proj4 from 'proj4';

proj4.defs('EPSG:23030', '+proj=utm +zone=30 +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs');
proj4.defs('EPSG:25830', '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

function transformarED50aETRS89(x_ed50: number, y_ed50: number): { x: number; y: number } {
  const [x_etrs89, y_etrs89] = proj4('EPSG:23030', 'EPSG:25830', [x_ed50, y_ed50]);
  return { x: x_etrs89, y: y_etrs89 };
}
```

### E5: Referencias Catastrales
```
Ejemplo: "1234567VK1234N"
Solución: Geocodificar vía API Catastro
Endpoint: https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx
Estado: NO implementado
```

---

## 🟠 PATRONES DMS (8 variantes) - CATEGORÍA C

Ninguno implementado. Afecta al **5-10%** de documentos con coordenadas geográficas.

| ID | Patrón | Ejemplo | Regex Propuesto |
|----|--------|---------|-----------------|
| C1 | DMS símbolos correctos | `40°26'46.5"N` | `/(\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)"([NSEW])/` |
| C2 | DMS ordinal español | `40º26'46"N` | `/(\d{1,3})º(\d{1,2})'(\d{1,2})"([NSEW])/` |
| C3 | DMS espacios | `40 26 46 N` | `/(\d{1,3})\s+(\d{1,2})\s+(\d{1,2})\s*([NSEW])/` |
| C4 | DMS guiones | `40-26-46.5` | `/(\d{1,3})-(\d{1,2})-(\d{1,2}(?:\.\d+)?)/` |
| C5 | DMS compacto | `402646N` | `/(\d{2})(\d{2})(\d{2})([NSEW])/` |
| C6 | DMS escape | `40°26'46.5\"` | Normalizar `\"` → `"` |
| C7 | DM minutos decimales | `40°26.775'` | `/(\d{1,3})°(\d{1,2}\.\d+)'/` |
| C8 | DD grados decimales | `40.446194°` | `/(-?\d{1,3}\.\d+)°?/` |

**Función de conversión propuesta:**
```typescript
function dmsADecimal(grados: number, minutos: number, segundos: number, direccion: string): number {
  const decimal = grados + (minutos / 60) + (segundos / 3600);
  return (direccion === 'S' || direccion === 'W') ? -decimal : decimal;
}

function parsearDMS(valor: string): { lat: number; lon: number } | null {
  // Regex maestro para múltiples formatos DMS
  const regexDMS = /(\d{1,3})[°º\s-](\d{1,2})['\s-](\d{1,2}(?:\.\d+)?)["\s]?\s*([NSEW])?/gi;
  
  // ... implementación completa
}
```

---

## 🟡 PATRONES NMEA GPS (4 variantes) - CATEGORÍA D

| ID | Patrón | Ejemplo | Conversión |
|----|--------|---------|------------|
| D1 | NMEA latitud | `3723.383,N` | DD=37, MM=23.383 → 37+(23.383/60) |
| D2 | NMEA longitud | `00559.533,W` | -1×(DDD+(MM/60)) |
| D3 | NMEA compacto | `3723.383N` | Igual D1 sin coma |
| D4 | NMEA sentencia | `$GPGGA,120000,...` | Extraer campos 2,4 |

**Función propuesta:**
```typescript
function parsearNMEA(valor: string): number | null {
  // Formato: DDDMM.MMM o DDMM.MMM
  const match = valor.match(/^(\d{2,3})(\d{2}\.\d+),?([NSEW])?$/);
  if (!match) return null;
  
  const grados = parseInt(match[1]);
  const minutos = parseFloat(match[2]);
  const direccion = match[3] || '';
  
  let decimal = grados + (minutos / 60);
  if (direccion === 'S' || direccion === 'W') decimal = -decimal;
  
  return decimal;
}
```

---

## 🟡 PATRONES COMPUESTOS (4 variantes) - CATEGORÍA G

| ID | Patrón | Ejemplo | Parser Necesario |
|----|--------|---------|------------------|
| G1 | Etiquetado | `X=504750 Y=4077905 H=30` | Regex campos |
| G2 | WKT | `POINT(504750 4077905)` | WKT parser |
| G3 | GeoJSON | `{"type":"Point","coordinates":[...]}` | JSON.parse |
| G4 | GML | `<gml:pos>504750 4077905</gml:pos>` | XML parser |

**Implementación WKT propuesta:**
```typescript
function parsearWKT(wkt: string): { x: number; y: number } | null {
  const match = wkt.match(/POINT\s*\(\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*\)/i);
  if (!match) return null;
  
  return {
    x: parseFloat(match[1]),
    y: parseFloat(match[2])
  };
}

function parsearGeoJSON(json: string): { x: number; y: number } | null {
  try {
    const obj = JSON.parse(json);
    if (obj.type === 'Point' && Array.isArray(obj.coordinates)) {
      return { x: obj.coordinates[0], y: obj.coordinates[1] };
    }
  } catch {}
  return null;
}
```

---

## 🟡 PATRONES AMBIGUOS (4 pendientes) - CATEGORÍA F

| ID | Patrón | Ambigüedad | Heurística Propuesta |
|----|--------|------------|----------------------|
| F1 | `1.234` | ¿Miles o decimal? | Si valor < 1000 → decimal; si no → miles |
| F2 | `1,234` | ¿Miles o decimal? | Contexto configuración regional |
| F5 | `40-26-46` | ¿Fecha o DMS? | Validar si primer valor ∈ [0,180] |
| F6 | `40°26.775` | ¿DMS o DM? | Detectar símbolo segundos presente |

---

## 🆕 PATRONES DETECTADOS EN CORPUS (2025-11-27)

Del análisis de 181 registros de 6 municipios:

### DOUBLE_DOT (Doble punto como decimal)
```
Original: "4 076 464..97"
Esperado: 4076464.97
Origen: Berja (Almería)
Regex: /(\d+)\.\.(\d+)/g
Reemplazo: '$1.$2'
```

### SPANISH_FORMAT_LONG (Punto miles largo)
```
Original: "4.077.905,68"
Esperado: 4077905.68
Regex: /(\d{1,3})\.(\d{3})\.(\d{3}),(\d+)/g
Reemplazo: '$1$2$3.$4'
```

### SPANISH_FORMAT_SHORT (Punto miles corto)
```
Original: "504.352,98"
Esperado: 504352.98
Regex: /(\d{3})\.(\d{3}),(\d+)/g
Reemplazo: '$1$2.$3'
```

---

## 📋 HOJA DE RUTA DE IMPLEMENTACIÓN

### Fase 1 - Crítico (Próxima iteración)
- [ ] B6: Coordenadas pegadas
- [ ] Patrones Berja (DOUBLE_DOT, SPANISH_FORMAT_*)
- [ ] E2: Detección ED50 (flag, sin transformación aún)

### Fase 2 - Importante (2-3 semanas)
- [ ] C1-C8: Parser DMS completo
- [ ] D1-D4: Parser NMEA GPS
- [ ] G2: Parser WKT
- [ ] G3: Parser GeoJSON

### Fase 3 - Complementario (1-2 meses)
- [ ] E2: Transformación ED50→ETRS89 con NTv2
- [ ] E5: Geocodificación referencias catastrales
- [ ] G4: Parser GML
- [ ] H1-H2: Extracción texto libre

---

## 📊 MÉTRICAS DE ÉXITO OBJETIVO

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Cobertura patrones | 44.2% | >85% |
| Tasa extracción correcta | ~75% | >95% |
| Corrección P0 automática | 85% | >95% |
| Falsos positivos | ~5% | <2% |
| Precisión geográfica | ~50m | <25m |

---

*Documento generado por auditoría exhaustiva de documentación PTEL - 2025-11-27*
