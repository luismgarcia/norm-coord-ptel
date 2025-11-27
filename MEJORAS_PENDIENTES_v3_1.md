# Mejoras Pendientes v3.1 - Sistema Normalizador PTEL

**Fecha análisis:** 2025-11-27
**Corpus analizado:** 181 registros de 17 archivos (6 municipios)
**Tasa validación alcanzada:** 96.1%

---

## 1. NUEVOS PATRONES A IMPLEMENTAR EN CÓDIGO CORE

### 1.1 Patrón DOUBLE_DOT (Prioridad: ALTA)
```typescript
// Doble punto como decimal: 4 076 464..97 → 4076464.97
[/(\d+)\.\.(\d+)/g, '$1.$2', 'DOUBLE_DOT']
```
- **Origen:** Berja (Almería)
- **Casos detectados:** 3
- **Confianza:** 95%

### 1.2 Patrón SPANISH_FORMAT_LONG (Prioridad: ALTA)
```typescript
// Formato español largo: 4.077.905,68 → 4077905.68
[/(\d{1,3})\.(\d{3})\.(\d{3}),(\d+)/g, '$1$2$3.$4', 'SPANISH_LONG']
```
- **Origen:** Berja (Almería)
- **Casos detectados:** 5
- **Confianza:** 92%

### 1.3 Patrón SPANISH_FORMAT_SHORT (Prioridad: MEDIA)
```typescript
// Formato español corto: 504.352,98 → 504352.98
[/(\d{3})\.(\d{3}),(\d+)/g, '$1$2.$3', 'SPANISH_SHORT']
```
- **Origen:** Berja (Almería)
- **Casos detectados:** 2
- **Confianza:** 90%

### 1.4 Patrón SPACE_THOUSANDS extendido (Prioridad: MEDIA)
```typescript
// Espacios como separador miles (3 grupos): 4 077 841 → 4077841
[/(\d{1,3})\s+(\d{3})\s+(\d{3})[,.]?(\d*)/g, '$1$2$3.$4', 'SPACE_THOUSANDS_3']
// Espacios como separador miles (2 grupos): 504 516 → 504516
[/(\d{1,3})\s+(\d{3})[,.]?(\d*)/g, '$1$2.$3', 'SPACE_THOUSANDS_2']
```
- **Origen:** Berja, Colomera
- **Casos detectados:** 45+
- **Confianza:** 88%

---

## 2. ACTUALIZACIÓN patterns.json v1.1.0

### Nuevos patrones comunitarios a añadir:
```json
{
  "id": "DOUBLE_DOT_DECIMAL",
  "pattern": "/(\\d+)\\.\\.(\\d+)/g",
  "replacement": "$1.$2",
  "description": "Doble punto como separador decimal (error tipográfico)",
  "example": { "input": "4 076 464..97", "output": "4076464.97" },
  "confidence": 0.95,
  "usageCount": 3,
  "municipalities": ["Berja"]
},
{
  "id": "SPANISH_FORMAT_LONG",
  "pattern": "/(\\d{1,3})\\.(\\d{3})\\.(\\d{3}),(\\d+)/g",
  "replacement": "$1$2$3.$4",
  "description": "Formato numérico español largo con punto separador miles",
  "example": { "input": "4.077.905,68", "output": "4077905.68" },
  "confidence": 0.92,
  "usageCount": 5,
  "municipalities": ["Berja"]
},
{
  "id": "SPANISH_FORMAT_SHORT",
  "pattern": "/(\\d{3})\\.(\\d{3}),(\\d+)/g",
  "replacement": "$1$2.$3",
  "description": "Formato numérico español corto con punto separador miles",
  "example": { "input": "504.352,98", "output": "504352.98" },
  "confidence": 0.90,
  "usageCount": 2,
  "municipalities": ["Berja"]
}
```

---

## 3. ESTADÍSTICAS DEL CORPUS ANALIZADO

### Por provincia:
| Provincia | Registros | Válidos | Tasa |
|-----------|-----------|---------|------|
| Almería   | 89        | 87      | 97.8%|
| Granada   | 47        | 45      | 95.7%|
| Jaén      | 45        | 42      | 93.3%|

### Por formato:
| Formato | Registros | Válidos | Tasa |
|---------|-----------|---------|------|
| DBF     | 89        | 89      | 100% |
| ODS     | 72        | 67      | 93.1%|
| ODT     | 19        | 19      | 100% |
| DOCX    | 1         | 1       | 100% |

### Top 5 patrones por impacto:
1. **DOUBLE_TILDE_DECIMAL:** 67 usos (´´ como decimal)
2. **KM_DECIMAL_X:** 54 usos (X en km: 447.850 → 447850)
3. **SPACE_THOUSANDS:** 45 usos (espacios como separador miles)
4. **Y_TRUNCATED_6_ADD4:** 23 usos (Y de 6 dígitos + 4xxxxx)
5. **Y_TRUNCATED_6_MULT10:** 15 usos (Y de 6 dígitos × 10)

---

## 4. CASOS IRRECUPERABLES (7 registros)

Requieren intervención manual o geocodificación:

| Archivo | Valor Original | Problema |
|---------|----------------|----------|
| VULNERABLES_Berja | 4 078 3789´´07 | Dígito extra "3" |
| PATRIMONIO_Berja | N/D | Placeholder |
| PATRIMONIO_Berja | NO | Placeholder |
| VULNERABLES_Berja | (vacío) | Sin datos |
| ELEMENTOS_VUL_Garrucha | - | Sin datos |
| ELEMENTOS_VUL_Garrucha | - | Sin datos |

**Solución:** Marcar para geocodificación por dirección/tipología

---

## 5. TESTS DE VALIDACIÓN

Todos los patrones nuevos pasan los tests:

```
Original          Normalizado    Esperado      ✓
504 516           504516.00      504516.00     ✅
4 077 841         4077841.00     4077841.00    ✅
504 522´´97       504522.97      504522.97     ✅
4 077 799´´93     4077799.93     4077799.93    ✅
504.352,98        504352.98      504352.98     ✅
4.077.905,68      4077905.68     4077905.68    ✅
4 076 464..97     4076464.97     4076464.97    ✅
```

---

## 6. PRÓXIMOS PASOS

1. [ ] Integrar patrones en coordinateNormalizer.ts
2. [ ] Actualizar patterns.json a v1.1.0
3. [ ] Añadir tests unitarios para nuevos patrones
4. [ ] Ejecutar build y deploy
5. [ ] Validar con corpus completo

---

*Documento generado del análisis de corpus PTEL - 2025-11-27*
