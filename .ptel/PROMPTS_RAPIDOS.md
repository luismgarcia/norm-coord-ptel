# Prompts Rápidos PTEL

## INICIO DE SESIÓN

Copia y pega esto al comenzar una nueva conversación:

```
INICIO SESIÓN PTEL

Por favor:
1. Lee los archivos de estado del proyecto:
   - .ptel/PTEL_ESTADO_SESION.json
   - .ptel/PTEL_FEATURES.json
   - .ptel/handoff.json
2. Muestra el resumen del estado actual
3. Identifica la siguiente tarea prioritaria (passes: false)
4. Pregunta qué rol debo activar: DataMaster / MapWizard / DesignCraft / GitMaster
```

---

## SINCRONIZACIÓN MULTI-DISPOSITIVO

**Reglas de oro** (ver SYNC_MULTI_DEVICE.md para detalles):

| Momento | Comando |
|---------|---------|
| Al EMPEZAR | `git pull` → `npm install` → `npm test` |
| Al TERMINAR | `git add .` → `git commit` → `git push` |

⚠️ **Nunca** subir `node_modules/` ni `dist/`

---

## ACTIVACIÓN DE ROL

### DataMaster (Datos y Geodesia)
```
Activa rol DATAMASTER

Expertise: Geodesia, validación, tipos TypeScript
- Parseo CSV/XLSX/ODT
- Normalización UTF-8 y coordenadas
- Interfaces estrictas (no any)
- Tests con datos reales

Lee .ptel/PTEL_ROLES.md para más contexto.
```

### MapWizard (APIs y Código)
```
Activa rol MAPWIZARD

Expertise: React/TypeScript, APIs geoespaciales
- proj4.js EPSG:25830
- Clientes WFS/WMS
- Lógica geocodificación
- Hooks personalizados

Lee .ptel/PTEL_ROLES.md para más contexto.
```

### DesignCraft (Diseño UI/UX)
```
Activa rol DESIGNCRAFT

Expertise: UI/UX, Tailwind CSS
- Componentes shadcn/ui
- Responsive mobile-first
- Feedback visual
- Accesibilidad

Lee .ptel/PTEL_ROLES.md para más contexto.
```

### GitMaster (Git/GitHub/CI-CD)
```
Activa rol GITMASTER

Expertise: Git, GitHub, sincronización, CI/CD
- Sincronización multi-dispositivo
- Resolución conflictos Git
- Migración código entre repos
- Verificación estado repositorio
- Gestión commits y releases

Lee .ptel/PTEL_ROLES.md para más contexto.
```

---

## CIERRE DE SESIÓN

Copia y pega esto ANTES de cerrar la conversación:

```
CIERRE SESIÓN PTEL

Por favor:
1. Resume lo que hicimos esta sesión
2. Actualiza .ptel/PTEL_ESTADO_SESION.json con:
   - Fecha actual
   - Rol usado
   - Resumen de cambios
   - Archivos modificados
   - Próxima prioridad
3. Añade entrada al final de .ptel/claude-progress.txt
4. Si completamos una feature, marca passes: true en PTEL_FEATURES.json
5. Actualiza .ptel/handoff.json para el próximo turno
6. Haz commit con mensaje descriptivo
7. Haz git push para sincronizar con GitHub
```

---

## VERIFICACIÓN RÁPIDA

Para comprobar el estado sin iniciar trabajo:

```
ESTADO PTEL

Muestra:
- Versión actual
- Fase y progreso
- Features completadas vs pendientes
- Última sesión y siguiente prioridad
- Estado sincronización GitHub ↔ Local
```

---

## EMERGENCIAS

### Si Claude pierde contexto:
```
Lee CLAUDE.md y todos los archivos en .ptel/ de GitHub.
Dame resumen completo antes de continuar.
```

### Si los tests fallan:
```
npm test falla con este error: [pegar error]
Corrige antes de continuar. No hacer commit hasta que pasen.
```
