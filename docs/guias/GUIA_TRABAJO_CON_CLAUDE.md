# Guía de Trabajo con Claude para el Proyecto PTEL

## Para quién es esta guía

Luis García, técnico municipal de Granada, trabajando en el proyecto PTEL de normalización de coordenadas UTM para 786 municipios de Andalucía. Sin experiencia previa en programación, trabajando desde 2-3 ordenadores diferentes, con Claude implementando el código directamente en GitHub.

---

## El problema que resolvemos

Claude "pierde el hilo" entre sesiones porque:
1. Cada conversación nueva empieza sin memoria del trabajo anterior
2. Los archivos de estado (`.ptel/`) no siempre están actualizados
3. No hay un protocolo claro de qué decirle a Claude al empezar/terminar

Esta guía establece **protocolos concretos** para mantener la continuidad.

---

## Estructura de archivos de estado

El proyecto ya tiene la estructura correcta en GitHub:

```
.ptel/
├── PTEL_ESTADO_SESION.json   ← Estado actual del proyecto
├── PTEL_FEATURES.json        ← Lista de funcionalidades y su estado
├── claude-progress.txt       ← Log de progreso entre sesiones
├── handoff.json              ← Información para la próxima sesión
├── PTEL_ROLES.md             ← Definición de roles especializados
└── PROMPTS_RAPIDOS.md        ← Comandos frecuentes
```

**Regla fundamental**: Estos archivos son la "memoria" de Claude. Si no están actualizados, Claude no sabe dónde estamos.

---

## Protocolo de INICIO de sesión

### Opción A: Inicio rápido (sesiones cortas)

Copia y pega este mensaje al empezar:

```
Retomamos el proyecto PTEL. Lee los archivos de estado en GitHub:
- .ptel/PTEL_ESTADO_SESION.json
- .ptel/PTEL_FEATURES.json
- .ptel/claude-progress.txt

Dime en qué punto estamos y qué deberíamos hacer hoy.
```

### Opción B: Inicio con contexto específico

Si sabes en qué quieres trabajar:

```
Retomamos PTEL. Hoy quiero trabajar en [ÁREA: geocodificación / validación / exportación / UI / etc.].

Lee los archivos .ptel/ de GitHub y confirma el estado actual de esa área antes de empezar.
```

### Opción C: Inicio con rol específico

Si quieres activar un rol especializado:

```
Retomamos PTEL con rol [DataMaster / MapWizard / DesignCraft].

Lee .ptel/PTEL_ROLES.md y los archivos de estado. Actúa según ese rol para la sesión de hoy.
```

### Lo que Claude debe hacer al inicio

1. Leer los archivos de estado de GitHub
2. Reportar un resumen de:
   - Última sesión (qué se hizo)
   - Estado actual (en qué punto estamos)
   - Próximas prioridades (qué toca hacer)
3. Proponer un plan concreto para la sesión

**Si Claude no hace esto automáticamente, pídelo explícitamente.**

---

## Protocolo de CIERRE de sesión

### Cuándo cerrar

- Cuando termines de trabajar por el día
- Cuando cambies de ordenador
- Cuando la conversación se esté haciendo muy larga (>30-40 mensajes)
- Antes de cambiar de tema/área completamente

### Mensaje de cierre

Copia y pega:

```
Vamos a cerrar la sesión. Necesito que:

1. Actualices .ptel/PTEL_ESTADO_SESION.json con el estado actual
2. Actualices .ptel/claude-progress.txt con lo que hicimos hoy
3. Actualices .ptel/PTEL_FEATURES.json si completamos alguna funcionalidad
4. Hagas commit a GitHub con un mensaje descriptivo

Resume qué queda pendiente para la próxima sesión.
```

### Lo que Claude debe hacer al cerrar

1. Actualizar los 3-4 archivos de estado en GitHub
2. Hacer commit con mensaje tipo: `session: [fecha] - [resumen de lo hecho]`
3. Proporcionar un resumen claro de:
   - Lo completado
   - Lo que quedó a medias
   - Prioridades para la próxima sesión

---

## Protocolo de CAMBIO DE ÁREA

El proyecto tiene 5 áreas principales:
1. **Normalización** - Conversión de formatos de coordenadas
2. **Geocodificación** - Obtener coordenadas de direcciones/nombres
3. **Validación** - Verificar coordenadas con códigos INE
4. **Exportación** - Generar archivos Excel/CSV
5. **UI** - Interfaz de usuario React

### Cuándo cambiar de área

- Cuando completes una tarea significativa en el área actual
- Cuando te bloquees y necesites avanzar en otra cosa
- Por decisión consciente de prioridades

### Mensaje para cambiar de área

```
Vamos a cambiar de [ÁREA ACTUAL] a [NUEVA ÁREA].

Antes de cambiar:
1. Documenta el estado actual de [ÁREA ACTUAL] en los archivos .ptel/
2. Lee el contexto de [NUEVA ÁREA] 
3. Propón qué hacer en [NUEVA ÁREA]
```

---

## Cómo pedir trabajo a Claude

### ❌ Evitar (demasiado vago):

- "Mejora el código"
- "Arregla los bugs"
- "Haz que funcione mejor"
- "Continúa con el proyecto"

### ✅ Preferir (específico y acotado):

- "Implementa la función de validación de código INE para el municipio de Colomera"
- "Añade manejo de errores cuando CartoCiudad no devuelve resultados"
- "Crea un test para verificar que las coordenadas de Berja se normalizan correctamente"
- "Revisa el geocodificador de centros sanitarios y dime si hay algún problema"

### Plantilla para peticiones

```
[ÁREA]: geocodificación
[TAREA]: Implementar cliente WFS para centros educativos
[CONTEXTO]: Ya tenemos el cliente de centros sanitarios funcionando
[CRITERIO DE ÉXITO]: Que pueda buscar colegios por nombre y municipio y devolver coordenadas UTM
[RESTRICCIONES]: Usar la misma estructura que WFSHealthGeocoder.ts
```

---

## Roles especializados

### DataMaster (Geodesia y validación)
**Activar cuando trabajes en:**
- Normalización de coordenadas
- Validación de rangos UTM
- Códigos INE y desambiguación
- Calidad de datos

**Prompt de activación:**
```
Activa rol DataMaster. Vamos a trabajar en [tarea de datos/validación].
```

### MapWizard (React/TypeScript/APIs)
**Activar cuando trabajes en:**
- Implementación de geocodificadores
- Integración con APIs (CartoCiudad, WFS, etc.)
- Lógica de negocio TypeScript
- Sistema de caché

**Prompt de activación:**
```
Activa rol MapWizard. Vamos a trabajar en [tarea de código/APIs].
```

### DesignCraft (UI/UX)
**Activar cuando trabajes en:**
- Componentes React visuales
- Estilos y diseño
- Experiencia de usuario
- Accesibilidad

**Prompt de activación:**
```
Activa rol DesignCraft. Vamos a trabajar en [tarea de interfaz].
```

---

## Qué hacer cuando Claude "se pierde"

### Síntomas de pérdida de contexto:
- Claude pregunta cosas que ya discutimos
- Propone soluciones que ya descartamos
- No recuerda decisiones anteriores
- Repite trabajo ya hecho

### Solución inmediata:

```
Parece que has perdido contexto. Lee estos archivos de GitHub ahora:
1. CLAUDE.md (contexto general)
2. .ptel/PTEL_ESTADO_SESION.json (estado actual)
3. .ptel/claude-progress.txt (historial reciente)

Luego confirma qué entiendes del estado del proyecto.
```

### Si la conversación es muy larga:

```
Esta conversación se ha extendido mucho. Hagamos un resumen:

1. Resume los puntos clave de lo que hemos discutido
2. Lista las decisiones tomadas
3. Indica qué quedó pendiente

Luego actualiza los archivos .ptel/ y empezamos conversación nueva.
```

---

## Flujo de trabajo recomendado para una sesión típica

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INICIO (2-3 minutos)                                     │
│    → Mensaje de inicio con contexto                         │
│    → Claude lee archivos .ptel/ y reporta estado            │
│    → Acordar qué hacer en la sesión                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. TRABAJO (tiempo variable)                                │
│    → Peticiones específicas y acotadas                      │
│    → Claude implementa en GitHub                            │
│    → Verificar que funciona antes de seguir                 │
│    → Si cambias de área, usar protocolo de cambio           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CIERRE (5 minutos)                                       │
│    → Mensaje de cierre                                      │
│    → Claude actualiza archivos .ptel/ en GitHub             │
│    → Commit con resumen de sesión                           │
│    → Confirmar próximas prioridades                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Checklist de sesión

### Al empezar ☐
- [ ] Envié mensaje de inicio con contexto
- [ ] Claude leyó los archivos .ptel/
- [ ] Tengo claro qué vamos a hacer hoy
- [ ] Acordamos el área/rol de trabajo

### Durante ☐
- [ ] Mis peticiones son específicas y acotadas
- [ ] Verifico el código antes de pasar a otra cosa
- [ ] Si cambio de área, uso el protocolo de cambio
- [ ] Si Claude se pierde, le pido que relea contexto

### Al cerrar ☐
- [ ] Envié mensaje de cierre
- [ ] Claude actualizó .ptel/PTEL_ESTADO_SESION.json
- [ ] Claude actualizó .ptel/claude-progress.txt
- [ ] Hay commit en GitHub con resumen de sesión
- [ ] Sé qué toca hacer en la próxima sesión

---

## Mensajes de emergencia

### "No entiendo dónde estamos"
```
Para. Lee CLAUDE.md y todos los archivos en .ptel/ de GitHub. 
Dame un resumen completo del estado del proyecto antes de continuar.
```

### "Esto no es lo que pedí"
```
Eso no es correcto. Lo que necesito es [descripción clara].
El contexto es [explicación]. 
¿Puedes intentarlo de nuevo?
```

### "Necesito que recuerdes esto"
```
IMPORTANTE para futuras sesiones: [información crítica].
Añade esto a .ptel/claude-progress.txt para no olvidarlo.
```

### "Vamos a empezar de cero en esta área"
```
Olvida lo que hemos intentado en [ÁREA]. Vamos a replantear desde cero.
Lee la documentación relevante y propón un enfoque nuevo.
```

---

## Resumen de una página

| Momento | Acción | Mensaje clave |
|---------|--------|---------------|
| **Inicio** | Dar contexto | "Retomamos PTEL. Lee .ptel/ y dime dónde estamos" |
| **Trabajo** | Ser específico | "[ÁREA] + [TAREA] + [CRITERIO DE ÉXITO]" |
| **Bloqueo** | Recargar contexto | "Lee CLAUDE.md y .ptel/, has perdido contexto" |
| **Cambio área** | Documentar antes | "Documenta [ACTUAL], luego cambiamos a [NUEVA]" |
| **Cierre** | Actualizar estado | "Actualiza .ptel/, commit a GitHub, resume pendientes" |

---

*Última actualización: 2025-11-29*
*Versión: 1.0*