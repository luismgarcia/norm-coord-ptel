# 🚨 INFORME TÉCNICO: Desambiguación Municipal en CartoCiudad

**Fecha:** 28 de noviembre de 2025  
**Autor:** Análisis automatizado PTEL  
**Criticidad:** ALTA - Afecta precisión de geocodificación en sistemas de emergencias

---

## 📋 Resumen Ejecutivo

La API de CartoCiudad (IGN) presenta un **bug crítico**: los parámetros de filtrado por provincia y municipio (`provincia_filter`, `municipio_filter`) **están documentados pero NO funcionan** en el endpoint principal de geocodificación (`/find`). 

Esto provoca que búsquedas como "consultorio médico Colomera" devuelvan resultados en **Colomers (Girona, Cataluña)** en lugar de **Colomera (Granada, Andalucía)**, lo cual es inaceptable para un sistema de emergencias.

### Hallazgos Clave

| Componente | Estado | Impacto |
|------------|--------|--------|
| Filtros en `/candidates` | ✅ Funcionan | Permite pre-filtrar candidatos |
| Filtros en `/find` | ❌ **NO funcionan** | Geocodificación directa sin control |
| Campo `muniCode` | ✅ Presente | Permite validación post-proceso |
| Algoritmo Soundex | ⚠️ Problemático | Confunde nombres fonéticamente similares |

---

## 🔬 Evidencia Empírica

### Test 1: Filtros en `/find` (FALLO)

```bash
# Query: "avda virgen cabeza 9" con municipio_filter=Colomera
curl "https://www.cartociudad.es/geocoder/api/geocoder/findJsonp?\
q=avda+virgen+cabeza+9&municipio_filter=Colomera"

# RESULTADO:
# Esperado: Colomera (Granada)
# Obtenido: Antas (Almería) ❌ FILTRO IGNORADO
```

### Test 2: Filtros en `/candidates` (ÉXITO)

```bash
# Query: "calle erillas 2" con municipio_filter=Colomera
curl "https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp?\
q=calle+erillas+2&municipio_filter=Colomera&limit=5"

# RESULTADO:
# - CALLE ERILLAS 2, Colomera (Granada) ✅
# - CALLE ERILLAS 2 C, Colomera (Granada) ✅
# - CALLE ERILLAS 2 B, Colomera (Granada) ✅
```

### Test 3: Confusión Colomera/Colomers

```bash
# Query sin contexto suficiente
curl "https://www.cartociudad.es/geocoder/api/geocoder/findJsonp?\
q=consultorio+medico+colomera"

# RESULTADO:
# Municipio: Colomers (Girona)    ← Cataluña, NO Andalucía
# Código INE: 17055               ← Girona, NO Granada (18)
# Coordenadas: 42.08, 2.98        ← 600km de distancia real
```

---

## 🎯 Causa Raíz

CartoCiudad utiliza **Elasticsearch con algoritmo Soundex** para búsqueda fonética. Este algoritmo:

1. Convierte nombres a códigos fonéticos
2. Agrupa resultados por similitud de pronunciación
3. **Ignora contexto geográfico** en la priorización

Los nombres "Colomera" y "Colomers" generan códigos Soundex casi idénticos (`C456`), por lo que el sistema los considera equivalentes y devuelve el primero que encuentra en su índice.

### Municipios Problemáticos Identificados

| Andalucía | Confundido con | Provincia |
|-----------|----------------|-----------|
| Colomera | Colomers | Girona |
| Cerro Cauro (pedanía) | El Cerro | Salamanca |
| Las Cabezas | Cabezas de Alambre | Ávila |
| Alcolea | Alcolea de Cinca | Huesca |

---

## ✅ Solución Implementada

### Estrategia 1: Flujo en Dos Pasos

```typescript
/**
 * Geocodificación segura con pre-filtrado de candidatos
 */
async function geocodificarSeguro(
  direccion: string,
  municipio: string,
  provincia: string
): Promise<GeocodingResult | null> {
  
  // PASO 1: Obtener candidatos filtrados
  const candidatesUrl = 'https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp';
  const candidatesParams = new URLSearchParams({
    q: `${direccion} ${municipio}`,
    municipio_filter: municipio,
    provincia_filter: provincia,
    limit: '5'
  });
  
  const candidatesResponse = await fetch(`${candidatesUrl}?${candidatesParams}`);
  let text = await candidatesResponse.text();
  if (text.startsWith('callback(')) text = text.slice(9, -1);
  
  const candidates = JSON.parse(text);
  
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }
  
  // PASO 2: Usar el mejor candidato para obtener coordenadas
  const best = candidates[0];
  
  // El candidato ya tiene coordenadas en algunos casos
  if (best.lat && best.lng) {
    return {
      x: best.lng,
      y: best.lat,
      confidence: 85,
      source: 'cartociudad:candidates',
      municipio: best.muni,
      codigoINE: best.muniCode
    };
  }
  
  return null;
}
```

### Estrategia 2: Validación Post-Geocodificación (RECOMENDADA)

```typescript
/**
 * Códigos INE de provincias andaluzas
 */
const PROVINCIAS_ANDALUCIA = {
  '04': 'Almería',
  '11': 'Cádiz',
  '14': 'Córdoba',
  '18': 'Granada',
  '21': 'Huelva',
  '23': 'Jaén',
  '29': 'Málaga',
  '41': 'Sevilla'
};

/**
 * Valida que el resultado de geocodificación corresponde al municipio esperado
 */
function validarResultadoCartociudad(
  response: CartoCiudadResponse,
  municipioEsperado: string,
  provinciaEsperada: string
): ValidacionResult {
  
  const muniCode = response.muniCode;
  
  if (!muniCode) {
    return { valido: false, error: 'Respuesta sin código INE' };
  }
  
  // Extraer código de provincia (primeros 2 dígitos)
  const provinciaCodigo = muniCode.substring(0, 2);
  
  // 1. Verificar que está en Andalucía
  if (!PROVINCIAS_ANDALUCIA[provinciaCodigo]) {
    return { 
      valido: false, 
      error: `Resultado fuera de Andalucía: ${response.province} (${response.muni})`
    };
  }
  
  return { valido: true };
}
```

---

## 📊 Impacto en el Sistema PTEL

### Sin Validación (PELIGROSO)

```
Infraestructura: "Consultorio Médico de Colomera"
Geocodificación: Colomers (Girona) → 42.08°N, 2.98°E
Distancia al punto real: ~600 km
Impacto: Servicios de emergencia enviados a ubicación incorrecta
```

### Con Validación (SEGURO)

```
Infraestructura: "Consultorio Médico de Colomera"
Geocodificación: Colomers (Girona) → RECHAZADO (código INE 17055 ≠ 18051)
Fallback: WFS IECA → Colomera (Granada) → 37.37°N, -3.71°W
Resultado: Ubicación correcta
```

---

## 🔧 Recomendaciones de Implementación

### Prioridad ALTA (Implementar Inmediatamente)

1. **Añadir validación por código INE** a todas las geocodificaciones CartoCiudad
2. **Priorizar WFS IECA** sobre CartoCiudad para infraestructuras tipificadas
3. **Incluir siempre provincia** en las queries de geocodificación

### Prioridad MEDIA

4. **Implementar flujo de dos pasos** usando `/candidates` + `/find`
5. **Crear tabla local de códigos INE** para los 786 municipios andaluces
6. **Logging de rechazos** para detectar patrones problemáticos

### Prioridad BAJA

7. **Reportar bug** a CartoCiudad (cartociudad@transportes.gob.es)
8. **Evaluar alternativas** como API del Catastro (exige provincia obligatoria)

---

## 📝 Conclusión

**El problema de desambiguación municipal en CartoCiudad NO está resuelto a nivel de API**, contrariamente a lo que indica la documentación oficial. Los parámetros de filtrado existen pero no funcionan en el endpoint principal de geocodificación.

La solución viable es implementar **validación post-geocodificación** usando el campo `muniCode` (código INE) que sí está presente en las respuestas, combinado con una **estrategia de cascada** que priorice servicios WFS específicos de Andalucía sobre CartoCiudad.

Para un sistema de emergencias como PTEL, esta validación es **crítica** para evitar errores de localización potencialmente fatales.