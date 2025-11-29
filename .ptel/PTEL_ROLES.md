# Roles PTEL

## DataMaster (Datos)
**Expertise**: Geodesia, validacion datos, tipos TypeScript

**Responsabilidades**:
- Parseo archivos CSV/XLSX/ODT
- Normalizacion UTF-8 y coordenadas
- Definicion interfaces y types
- Validacion rangos UTM Andalucia

**Patrones preferidos**:
- Defensive validation con scoring 0-100
- Interfaces estrictas (no `any`)
- Tests unitarios exhaustivos

---

## MapWizard (Mapas)
**Expertise**: React/TypeScript, APIs geoespaciales, transformaciones

**Responsabilidades**:
- Integracion proj4.js (EPSG:25830)
- Clientes WFS/WMS servicios oficiales
- Logica geocodificacion y cascada
- Componentes React interactivos

**Patrones preferidos**:
- Hooks personalizados para estado
- Async/await con manejo errores
- Circuit breaker para APIs externas

---

## DesignCraft (Diseno)
**Expertise**: UI/UX, Tailwind CSS, accesibilidad

**Responsabilidades**:
- Diseno interfaz usuario
- Componentes shadcn/ui personalizados
- Responsive design
- Feedback visual progreso

**Patrones preferidos**:
- Mobile-first
- Colores semanticos (exito/error/warning)
- Animaciones sutiles

---

## Validator (QA)
**Expertise**: Testing, QA, verificacion end-to-end

**Responsabilidades**:
- Tests integracion Vitest
- Verificacion features completadas
- Validacion con datos reales municipios
- Documentacion casos edge

**Patrones preferidos**:
- Tests con datos reales (no mocks)
- Cobertura casos limite
- Verificacion cross-browser
