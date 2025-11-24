# 📚 Índice de Documentación PTEL
## Sistema de Normalización de Coordenadas para Andalucía

**Versión**: 0.4.0  
**Última actualización**: 24 noviembre 2025

---

## 🎯 Documentos Principales

### Planificación y Estrategia

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [PLAN_MAESTRO_PTEL_DESARROLLO_2025.md](PLAN_MAESTRO_PTEL_DESARROLLO_2025.md) | Plan maestro completo del proyecto | Decisores, Técnicos |
| [ROADMAP_TECNICO_PTEL_DEFINITIVO.md](ROADMAP_TECNICO_PTEL_DEFINITIVO.md) | Roadmap técnico por fases | Desarrolladores |

### Arquitectura y Desarrollo

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [ARQUITECTURA_COMPONENTES.md](ARQUITECTURA_COMPONENTES.md) | Estructura de componentes React/TS | Desarrolladores |
| [GUIA_CONFIGURACION_VITE_TYPESCRIPT.md](GUIA_CONFIGURACION_VITE_TYPESCRIPT.md) | Configuración del entorno | Desarrolladores |
| [DISEÑO_UI_SPARK.md](DISEÑO_UI_SPARK.md) | Especificaciones de interfaz UI | Diseñadores, Desarrolladores |

### APIs y Recursos

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [RECURSOS_API_GEOCODIFICACION.md](RECURSOS_API_GEOCODIFICACION.md) | Catálogo de APIs de geocodificación | Desarrolladores, Integradores |

### Soporte y Operaciones

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [FAQ_TECNICO.md](FAQ_TECNICO.md) | Preguntas frecuentes técnicas | Usuarios, Soporte |

---

## 📂 Documentación en Raíz del Proyecto

| Archivo | Descripción |
|---------|-------------|
| [README.md](../README.md) | Introducción y quickstart |
| [CHANGELOG.md](../CHANGELOG.md) | Historial de cambios |
| [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) | Documentación de APIs internas |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Guía de contribución |
| [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) | Guía de despliegue |
| [MONITORING.md](../MONITORING.md) | Sistema de monitorización |
| [RUNBOOKS.md](../RUNBOOKS.md) | Procedimientos operacionales |
| [SECURITY.md](../SECURITY.md) | Políticas de seguridad |

---

## 🔗 Recursos Externos

### APIs Oficiales

| Servicio | URL | Uso |
|----------|-----|-----|
| CartoCiudad | https://www.cartociudad.es/geocoder/api/ | Geocodificación |
| CDAU | https://www.callejerodeandalucia.es/servicios/cdau/wfs | Callejero |
| IDE Andalucía | https://www.ideandalucia.es/ | Datos espaciales |
| DERA | https://www.ideandalucia.es/services/DERA_g12_servicios/wfs | Servicios |
| IAPH | https://www.iaph.es/ide/localizador/wfs | Patrimonio |
| ISE | https://www.ideandalucia.es/services/ise/wfs | Equipamientos |

### Documentación Técnica

| Recurso | URL |
|---------|-----|
| proj4js | http://proj4js.org/ |
| Leaflet | https://leafletjs.com/reference.html |
| shadcn/ui | https://ui.shadcn.com/ |
| Vite | https://vitejs.dev/ |

---

## 📖 Guías de Lectura por Rol

### Para Desarrolladores

1. **Inicio rápido**: README.md → GUIA_CONFIGURACION_VITE_TYPESCRIPT.md
2. **Arquitectura**: ARQUITECTURA_COMPONENTES.md → DISEÑO_UI_SPARK.md
3. **APIs**: RECURSOS_API_GEOCODIFICACION.md → API_DOCUMENTATION.md
4. **Roadmap**: ROADMAP_TECNICO_PTEL_DEFINITIVO.md

### Para Operadores

1. **Despliegue**: DEPLOYMENT_GUIDE.md
2. **Monitorización**: MONITORING.md
3. **Procedimientos**: RUNBOOKS.md
4. **Troubleshooting**: FAQ_TECNICO.md

### Para Decisores

1. **Visión general**: README.md
2. **Plan estratégico**: PLAN_MAESTRO_PTEL_DESARROLLO_2025.md
3. **Métricas**: ROADMAP_TECNICO_PTEL_DEFINITIVO.md (sección KPIs)

---

## 🏗️ Estructura del Proyecto

```
norm-coord-ptel/
├── docs/                    # Documentación
│   ├── PLAN_MAESTRO_PTEL_DESARROLLO_2025.md
│   ├── ROADMAP_TECNICO_PTEL_DEFINITIVO.md
│   ├── ARQUITECTURA_COMPONENTES.md
│   ├── GUIA_CONFIGURACION_VITE_TYPESCRIPT.md
│   ├── DISEÑO_UI_SPARK.md
│   ├── RECURSOS_API_GEOCODIFICACION.md
│   ├── FAQ_TECNICO.md
│   └── INDICE_DOCUMENTACION.md
├── src/
│   ├── components/          # Componentes React
│   ├── services/            # Lógica de negocio
│   ├── hooks/               # Hooks personalizados
│   ├── utils/               # Utilidades
│   ├── types/               # Tipos TypeScript
│   └── App.tsx              # Componente principal
├── scripts/
│   └── fix-utf8-docs.js     # Script normalización UTF-8
└── public/                  # Assets estáticos
```

---

## 📊 Estado de la Documentación

| Documento | Estado | Última Revisión |
|-----------|--------|-----------------|
| PLAN_MAESTRO | ✅ Actualizado | 24 Nov 2025 |
| ROADMAP_TECNICO | ✅ Actualizado | 24 Nov 2025 |
| ARQUITECTURA | ✅ Actualizado | 24 Nov 2025 |
| GUIA_VITE_TS | ✅ Actualizado | 24 Nov 2025 |
| DISEÑO_UI | ✅ Actualizado | 24 Nov 2025 |
| RECURSOS_API | ✅ Actualizado | 24 Nov 2025 |
| FAQ_TECNICO | ✅ Actualizado | 24 Nov 2025 |

---

## 🔄 Historial de Cambios Documentación

### 24 Noviembre 2025
- Sincronización completa desde Project Knowledge de Claude
- Normalización UTF-8 de todos los documentos
- Actualización de versiones y fechas
- Creación de índice unificado

### 15 Noviembre 2025
- Creación inicial de documentación técnica
- Definición de arquitectura browser-first
- Documentación de APIs de geocodificación

---

**Mantenedor**: Luis - Técnico Municipal Granada  
**Contacto**: A través de issues en GitHub
