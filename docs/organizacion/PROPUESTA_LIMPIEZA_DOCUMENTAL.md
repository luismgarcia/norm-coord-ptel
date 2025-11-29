# Propuesta de Reorganización Documental PTEL

> Documento generado: 2025-11-29
> Estado: Fase 1 pendiente de ejecución por usuario

## Diagnóstico actual

### Inventario

| Ubicación | Archivos | Tamaño total | Problema |
|-----------|----------|--------------|----------|
| **Project Knowledge** | 64 archivos | ~1.8 MB (sin PDF) | Duplicados, versiones obsoletas, código mezclado con docs |
| **GitHub docs/** | 16 archivos + 8 subdirs | ~200 KB | Parcialmente actualizado |
| **GitHub raíz** | 24 archivos .md | ~280 KB | Mezcla de docs operativos y técnicos |

### Problemas detectados

1. **Duplicados con nombres casi idénticos** (3 grupos, ~6 archivos)
2. **Código fuente en Project Knowledge** (6 archivos .ts/.jsx ya en GitHub)
3. **Documentos PATCH fragmentados** (7 archivos)
4. **Análisis de opciones descartadas** (5 archivos: AWS, Mantine, MCP)
5. **Documentación duplicada** entre Project Knowledge y GitHub

---

## Estructura objetivo

### Project Knowledge (solo referencia estable)

~10-12 documentos:
- Contexto proyecto PTEL
- Taxonomía coordenadas (versión final)
- APIs geocodificación Andalucía
- Códigos INE Andalucía
- Nomenclátor NGA
- Especificación UTM ETRS89
- Guía trabajo con Claude
- Ejemplo documento PTEL (PDF Colomera)

### GitHub (documentación operativa versionada)

```
norm-coord-ptel/
├── CLAUDE.md
├── README.md
├── CHANGELOG.md
├── .ptel/                    ← Estado del proyecto
├── docs/
│   ├── INDICE.md
│   ├── arquitectura/
│   ├── desarrollo/
│   ├── tecnico/
│   ├── guias/
│   └── organizacion/         ← Este documento
└── src/
```

---

## Plan de ejecución

### Fase 1: Limpieza Project Knowledge ⭐ ACTUAL

**Responsable**: Usuario (Claude no puede eliminar)

37 archivos a eliminar:
- 6 archivos código (.ts, .jsx)
- 5 duplicados
- 5 análisis descartados
- 7 patches fragmentados
- 8 docs redundantes con GitHub
- 4 índices/resúmenes obsoletos
- 2 reportes redundantes

**Resultado**: De 64 → ~27 archivos

### Fase 2: Consolidación

**Responsable**: Claude

- Consolidar docs TAXONOMIA → 1 maestro
- Consolidar docs RECURSOS/APIs → 1 maestro
- Consolidar docs GEOCODIFICACION → 1 maestro

**Resultado**: De ~27 → 10-12 archivos

### Fase 3: Reorganización GitHub

**Responsable**: Claude

- Crear estructura docs/ propuesta
- Mover/renombrar documentos
- Actualizar índices y referencias

---

## Beneficios esperados

| Métrica | Antes | Después |
|---------|-------|--------|
| Archivos en Project Knowledge | 64 | 10-12 |
| Tiempo para encontrar info | Alto | Bajo |
| Duplicados | Muchos | Cero |
| Contexto inicial para Claude | Confuso | Claro |
