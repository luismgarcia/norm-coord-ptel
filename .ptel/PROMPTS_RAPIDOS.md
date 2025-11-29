# Prompts Rapidos PTEL

## INICIO DE SESION

Copia y pega esto al comenzar una nueva conversacion:

```
INICIO SESION PTEL

Por favor:
1. Lee los archivos de estado del proyecto:
   - .ptel/PTEL_ESTADO_SESION.json
   - .ptel/PTEL_FEATURES.json
   - .ptel/handoff.json
2. Muestra el resumen del estado actual
3. Identifica la siguiente tarea prioritaria (passes: false)
4. Pregunta que rol debo activar: DataMaster / MapWizard / DesignCraft / Validator
```

---

## ACTIVACION DE ROL

### DataMaster (Datos)
```
Activa rol DATAMASTER

Expertise: Geodesia, validacion, tipos TypeScript
- Parseo CSV/XLSX/ODT
- Normalizacion UTF-8
- Interfaces estrictas (no any)
- Tests con datos reales

Lee .ptel/PTEL_ROLES.md para mas contexto.
```

### MapWizard (Mapas)
```
Activa rol MAPWIZARD

Expertise: React/TypeScript, APIs geoespaciales
- proj4.js EPSG:25830
- Clientes WFS/WMS
- Logica geocodificacion
- Hooks personalizados

Lee .ptel/PTEL_ROLES.md para mas contexto.
```

### DesignCraft (Diseno)
```
Activa rol DESIGNCRAFT

Expertise: UI/UX, Tailwind CSS
- Componentes shadcn/ui
- Responsive mobile-first
- Feedback visual
- Accesibilidad

Lee .ptel/PTEL_ROLES.md para mas contexto.
```

### Validator (QA)
```
Activa rol VALIDATOR

Expertise: Testing, QA end-to-end
- Tests Vitest integracion
- Datos reales municipios
- Casos edge
- Verificacion cross-browser

Lee .ptel/PTEL_ROLES.md para mas contexto.
```

---

## CIERRE DE SESION

Copia y pega esto ANTES de cerrar la conversacion:

```
CIERRE SESION PTEL

Por favor:
1. Resume lo que hicimos esta sesion
2. Actualiza .ptel/PTEL_ESTADO_SESION.json con:
   - Fecha actual
   - Rol usado
   - Resumen de cambios
   - Archivos modificados
   - Proxima prioridad
3. Anade entrada al final de .ptel/claude-progress.txt
4. Si completamos una feature, marca passes: true en PTEL_FEATURES.json
5. Actualiza .ptel/handoff.json para el proximo turno
6. Haz commit con mensaje descriptivo
```

---

## VERIFICACION RAPIDA

Para comprobar el estado sin iniciar trabajo:

```
ESTADO PTEL

Muestra:
- Version actual
- Fase y progreso
- Features completadas vs pendientes
- Ultima sesion y siguiente prioridad
```
