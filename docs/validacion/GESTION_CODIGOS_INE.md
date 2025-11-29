# 📋 Gestión de Códigos INE para Validación de Geocodificación

**Versión:** 1.0.0  
**Fecha:** 28 noviembre 2025  
**Autor:** Proyecto PTEL - Normalizador de Coordenadas  
**Estado:** Documento nuevo

---

## 📌 Resumen

Este documento describe el sistema de gestión de códigos INE (Instituto Nacional de Estadística) utilizado para validar resultados de geocodificación y prevenir errores de desambiguación municipal en el proyecto PTEL.

**Problema resuelto:** CartoCiudad puede confundir municipios con nombres similares en diferentes provincias (ej: Colomera/Granada vs Colomers/Girona), causando errores de hasta 600km en sistemas de emergencias.

**Solución:** Validación post-geocodificación usando el campo `muniCode` (código INE) presente en todas las respuestas de CartoCiudad.

---

## 🎯 Objetivos

1. **Prevenir falsos positivos:** Rechazar geocodificaciones que devuelvan municipios fuera de Andalucía
2. **Validar municipio exacto:** Verificar que el código INE coincide con el municipio esperado
3. **Mantener datos actualizados:** Sincronización anual con fuentes oficiales del INE
4. **Auditoría completa:** Registro de rechazos para análisis y mejora continua

---

## 📊 Estructura de Códigos INE

### Formato de Código INE Municipal

```
Código: PPMMMCCSSNN (11 dígitos completo) o PPMMM (5 dígitos básico)

PP   = Código de provincia (2 dígitos)
MMM  = Código de municipio dentro de provincia (3 dígitos)
CC   = Entidad colectiva (2 dígitos, solo Almería)
SS   = Entidad singular (2 dígitos)
NN   = Núcleo o diseminado (2 dígitos)
```

### Códigos de Provincia de Andalucía

| Código | Provincia | Nº Municipios |
|--------|-----------|---------------|
| 04 | Almería | 103 |
| 11 | Cádiz | 45 |
| 14 | Córdoba | 77 |
| 18 | Granada | 174 |
| 21 | Huelva | 79 |
| 23 | Jaén | 97 |
| 29 | Málaga | 103 |
| 41 | Sevilla | 106 |
| **Total** | **Andalucía** | **786** |

### Ejemplos de Códigos INE

| Municipio | Provincia | Código INE |
|-----------|-----------|------------|
| Colomera | Granada | 18051 |
| Granada | Granada | 18087 |
| Sevilla | Sevilla | 41091 |
| Almería | Almería | 04013 |
| Málaga | Málaga | 29067 |

---

## 💾 Almacenamiento Local

### Estrategia de Almacenamiento

| Componente | Ubicación | Tamaño | Actualización |
|------------|-----------|--------|---------------|
| Tabla INE principal | localStorage | ~50KB | Anual |
| Versión datos | localStorage | ~20 bytes | Con datos |
| Log rechazos | localStorage | ~20KB | Continuo |
| Fallback embebido | Bundle JS | ~50KB | Con deploy |

### Estructura de Datos

```typescript
// Clave: ptel_codigos_ine
interface TablaCodiosINE {
  version: string;           // "2025-01-01"
  generado: string;          // ISO timestamp
  fuente: string;            // "INE API"
  total: number;             // 786
  provincias: Record<string, string>;  // { "18": "Granada", ... }
  municipios: Record<string, string>;  // { "colomera": "18051", ... }
}
```

---

## 🌐 Fuentes de Datos Oficiales

### 1. INE - Descarga Excel (Recomendada para actualización anual)

**URL:** https://www.ine.es/daco/daco42/codmun/

**Archivos disponibles:**
- `diccionario25.xlsx` - Diccionario de municipios 2025 (~300KB)
- `codmun25.xlsx` - Códigos y nombres (~100KB)

**Actualización:** 1 de enero de cada año

### 2. INE - API JSON (Tiempo real)

**URL:** https://servicios.ine.es/wstempus/js/ES/VALORES_VARIABLE/19

**Características:**
- Paginación: 500 registros por página
- Formato JSON
- Incluye todos los municipios de España (~8000)

### 3. IECA - Nomenclátor Andalucía (Regional)

**URL:** https://www.juntadeandalucia.es/institutodeestadisticaycartografia/dega/nomenclator-de-entidades-y-nucleos-de-poblacion-de-andalucia

**Características:**
- Solo Andalucía (786 municipios)
- Incluye entidades singulares, núcleos y diseminados
- Datos demográficos asociados

---

## ✅ Validación de Integridad

### Tests Unitarios

```typescript
describe('INE Validator', () => {
  
  describe('esAndalucia', () => {
    test('códigos andaluces devuelven true', () => {
      expect(esAndalucia('18051')).toBe(true);  // Granada
      expect(esAndalucia('41091')).toBe(true);  // Sevilla
      expect(esAndalucia('04013')).toBe(true);  // Almería
    });
    
    test('códigos no andaluces devuelven false', () => {
      expect(esAndalucia('17055')).toBe(false); // Girona
      expect(esAndalucia('28079')).toBe(false); // Madrid
      expect(esAndalucia('08019')).toBe(false); // Barcelona
    });
  });
  
  describe('getCodigoINE', () => {
    test('encuentra Colomera en Granada', () => {
      expect(getCodigoINE('Colomera', 'Granada')).toBe('18051');
    });
    
    test('normaliza tildes y mayúsculas', () => {
      expect(getCodigoINE('MÁLAGA', 'Málaga')).toBe('29067');
      expect(getCodigoINE('almería', 'almería')).toBe('04013');
    });
  });
  
});
```

---

## 🔗 Referencias

- **INE - Códigos municipios:** https://www.ine.es/daco/daco42/codmun/
- **INE - API WSTEMPUS:** https://www.ine.es/dyngs/DataLab/manual.html?cid=1259945947375
- **IECA - Nomenclátor Andalucía:** https://www.juntadeandalucia.es/ieca/nomenclator
- **CartoCiudad - Documentación:** https://www.cartociudad.es/geocoder/
- **Bug CartoCiudad reportado:** cartociudad@transportes.gob.es

---

## 📝 Historial de Cambios

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0.0 | 28 Nov 2025 | Documento inicial |