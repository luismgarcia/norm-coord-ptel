# 📚 ÍNDICE DE DOCUMENTACIÓN PTEL

Sistema de Normalización y Geocodificación de Coordenadas para Municipios Andaluces

**Versión**: 0.4.0  
**Última actualización**: 24 Noviembre 2025

---

## 📋 Documentación Principal

### Planificación
| Documento | Descripción | Ubicación |
|-----------|-------------|-----------|
| **PLAN_MAESTRO_PTEL_DESARROLLO_2025.md** | Plan de trabajo completo con fases y timeline | `/docs/` |
| **ROADMAP_EJECUTIVO_PTEL_2025.md** | Visión ejecutiva del roadmap | `/` |
| **CHANGELOG.md** | Historial de cambios por versión | `/` |

### Arquitectura
| Documento | Descripción | Ubicación |
|-----------|-------------|-----------|
| **ARQUITECTURA_COMPONENTES.md** | Diagramas y estructura de componentes | `/` |
| **API_DOCUMENTATION.md** | Documentación de APIs y servicios | `/` |
| **CASOS_DE_USO_Y_WORKFLOWS.md** | Flujos de trabajo y casos de uso | `/` |

### Operaciones
| Documento | Descripción | Ubicación |
|-----------|-------------|-----------|
| **DEPLOYMENT_GUIDE.md** | Guía de despliegue y configuración | `/` |
| **MONITORING.md** | Monitorización y alertas | `/` |
| **RUNBOOKS.md** | Procedimientos operativos | `/` |
| **SECURITY.md** | Políticas de seguridad | `/` |

### Desarrollo
| Documento | Descripción | Ubicación |
|-----------|-------------|-----------|
| **CONTRIBUTING.md** | Guía de contribución al proyecto | `/` |
| **FAQ_TECNICO.md** | Preguntas frecuentes técnicas | `/` |
| **README.md** | Documentación principal del proyecto | `/` |

---

## 🗂️ Estructura del Proyecto

```
norm-coord-ptel/
├── docs/                    # Documentación extendida
│   └── PLAN_MAESTRO_*.md
├── scripts/                 # Scripts de utilidad
│   └── fix-utf8-docs.js    # Normalizador UTF-8
├── src/
│   ├── components/         # Componentes React
│   │   ├── ui/            # shadcn/ui components
│   │   ├── NormalizationPanel.tsx
│   │   └── ThemeSwitch.tsx
│   ├── lib/               # Librerías core
│   │   ├── coordinateNormalizer.ts  # Normalizador v2.0
│   │   ├── coordinateUtils.ts       # Utilidades coords
│   │   └── fileParser.ts            # Parsers archivos
│   ├── services/          # Servicios externos
│   │   ├── geocoding/     # Geocodificadores WFS
│   │   └── classification/ # Clasificador tipologías
│   └── types/             # Tipos TypeScript
├── *.md                   # Documentación raíz
└── package.json
```

---

## 📖 Guía de Lectura Recomendada

### Para Nuevos Desarrolladores
1. README.md - Visión general y setup
2. CONTRIBUTING.md - Cómo contribuir
3. ARQUITECTURA_COMPONENTES.md - Entender la estructura
4. FAQ_TECNICO.md - Respuestas a dudas comunes

### Para Operadores
1. DEPLOYMENT_GUIDE.md - Cómo desplegar
2. MONITORING.md - Qué monitorizar
3. RUNBOOKS.md - Procedimientos
4. SECURITY.md - Consideraciones de seguridad

### Para Decisores
1. README.md - Resumen ejecutivo
2. ROADMAP_EJECUTIVO_PTEL_2025.md - Timeline y costes
3. PLAN_MAESTRO_PTEL_DESARROLLO_2025.md - Plan detallado

---

## 🔗 Enlaces Útiles

### APIs Oficiales Españolas
- [CartoCiudad](https://www.cartociudad.es/geocoder/api/geocoder)
- [CDAU](https://www.callejerodeandalucia.es/)
- [IECA WFS](https://www.ideandalucia.es/services)
- [IAPH Patrimonio](https://www.iaph.es/web/)

### Recursos Técnicos
- [proj4js](https://proj4js.org/)
- [Leaflet](https://leafletjs.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vite](https://vitejs.dev/)

---

**Mantenedor**: Luis García (Técnico Municipal Granada)  
**Contacto**: Via GitHub Issues
