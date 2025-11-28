# 📋 Gestión de Códigos INE para Validación de Geocodificación

**Versión:** 1.0.0  
**Fecha:** 28 noviembre 2025  
**Autor:** Proyecto PTEL - Normalizador de Coordenadas

---

## 📌 Resumen

Sistema de validación post-geocodificación usando códigos INE (Instituto Nacional de Estadística) para prevenir errores de desambiguación municipal.

**Problema resuelto:** CartoCiudad puede confundir municipios con nombres similares en diferentes provincias (ej: Colomera/Granada vs Colomers/Girona), causando errores de hasta 600km.

**Solución:** Validar el campo `muniCode` (código INE) presente en todas las respuestas de CartoCiudad.

---

## 🎯 Funcionamiento

```
1. Usuario busca: "consultorio Colomera"
2. CartoCiudad devuelve: { muni: 'Colomers', muniCode: '17055' }
3. Validación: ¿17055 está en Andalucía? → NO (17 = Girona)
4. Resultado: RECHAZADO → Fallback a WFS IECA
```

---

## 📊 Códigos de Provincia Andaluza

| Código | Provincia | Municipios |
|--------|-----------|------------|
| 04 | Almería | 103 |
| 11 | Cádiz | 45 |
| 14 | Córdoba | 77 |
| 18 | Granada | 174 |
| 21 | Huelva | 79 |
| 23 | Jaén | 97 |
| 29 | Málaga | 103 |
| 41 | Sevilla | 106 |
| **Total** | **Andalucía** | **786** |

---

## 💾 Almacenamiento

| Ubicación | Clave | Tamaño |
|-----------|-------|--------|
| localStorage | `ptel_codigos_ine` | ~50KB |
| localStorage | `ptel_ine_version` | ~20 bytes |
| localStorage | `ptel_rechazos_geocoding` | ~20KB |

---

## 🔧 Uso

```typescript
import { validarResultadoCartoCiudad, esAndalucia } from './ineValidator';
import { getCodigoINE } from '../data/codigosINE';

// Obtener código INE esperado
const codigoINE = getCodigoINE('Colomera', 'Granada'); // → '18051'

// Validar resultado de CartoCiudad
const validacion = validarResultadoCartoCiudad(
  response,      // Respuesta de CartoCiudad
  'Colomera',    // Municipio esperado
  'Granada',     // Provincia esperada
  codigoINE      // Código INE esperado
);

if (!validacion.valido) {
  console.warn('Rechazado:', validacion.error);
  // → Fallback a siguiente fuente
}
```

---

## 📊 Estadísticas de Rechazos

```typescript
import { getEstadisticasRechazos, exportarRechazosCSV } from './rejectionLogger';

const stats = getEstadisticasRechazos();
console.log(`Total rechazos: ${stats.total}`);
console.log(`Fuera de Andalucía: ${stats.porMotivo.fuera_andalucia}`);

// Exportar para análisis
const csv = exportarRechazosCSV();
```

---

## 🔄 Actualización Anual

Los datos INE se actualizan el 1 de enero de cada año.

**Fuentes oficiales:**
- INE Excel: https://www.ine.es/daco/daco42/codmun/
- INE API: https://servicios.ine.es/wstempus/js/ES/VALORES_VARIABLE/19

---

## 📁 Archivos

| Archivo | Descripción |
|---------|-------------|
| `src/services/geocoding/ineValidator.ts` | Validación por código INE |
| `src/services/geocoding/rejectionLogger.ts` | Logging de rechazos |
| `src/data/codigosINE.ts` | Tabla de 786 municipios |

---

## ✅ Beneficios

- Previene errores de 600km en geocodificación
- Overhead mínimo (~2ms por validación)
- Auditoría completa de rechazos
- Defensa en profundidad contra bugs de APIs externas
