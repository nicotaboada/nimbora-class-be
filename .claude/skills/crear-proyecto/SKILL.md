---
name: crear-proyecto
description: "Crea un nuevo proyecto o feature en la Hoja de ruta de desarrollo en Notion, generando la especificación técnica completa con todas las secciones de la plantilla. Usa este skill cuando el usuario quiera crear un proyecto, definir una feature, agregar un elemento a la hoja de ruta, o dicte algo como 'nuevo proyecto', 'crear feature', 'agregar a la hoja de ruta', 'quiero definir un proyecto nuevo'."
argument-hint: "<descripción del proyecto/feature en lenguaje natural, opcionalmente incluyendo prioridad, etiquetas, propietario, fechas>"
---

# Crear Proyecto en Hoja de Ruta de Desarrollo

## Qué hace

Crea un nuevo proyecto/feature en la base de datos "Hoja de ruta de desarrollo" del workspace Nimboclass en Notion. Genera automáticamente el body de la página con la plantilla de especificación técnica completa, pre-completando las secciones que pueda a partir de la descripción del usuario.

## Cómo funciona

1. Recibe el input del usuario describiendo el proyecto/feature
2. Extrae propiedades (nombre, prioridad, etiquetas, etc.)
3. Genera el contenido de la especificación técnica con las 11 secciones de la plantilla
4. Crea la página en Notion con propiedades y body completo
5. Confirma con link al proyecto

## Ejemplos de uso

```
/crear-proyecto sistema de notificaciones push para la app móvil, prioridad alta, etiqueta Función
/crear-proyecto migración de base de datos de MySQL a PostgreSQL, inversión en tecnología
/crear-proyecto rediseño del flujo de checkout para mejorar conversión
/crear-proyecto implementar sistema de roles y permisos para usuarios administradores
```

## Proceso paso a paso

### 1. Parsear el input

Extraer del texto en lenguaje natural:

| Campo | Obligatorio | Default | Ejemplo de extracción |
|-------|-------------|---------|----------------------|
| Nombre del proyecto | Sí | — | "sistema de notificaciones push" |
| Prioridad | No | Media | "prioridad alta" → Alta |
| Etiquetas | No | — | "función" → Función, "inversión en tecnología" → Inversión en tecnología |
| Propietario | No | — | "asignar a María" → buscar persona |
| Fechas | No | — | "del 1 al 30 de abril" → rango |

### 2. Generar el body de la especificación técnica

A partir de la descripción del usuario, generar contenido para las 11 secciones de la plantilla. Pre-completar las que se puedan inferir del input; dejar las demás con placeholders orientativos.

**Secciones de la plantilla:**

#### 1. Resumen
Descripción general del proyecto en 2-3 párrafos. Qué se va a construir y para qué.
→ **Pre-completar** a partir del input del usuario.

#### 2. Contexto
"¿Cuál es el estado de situación actual y por qué estamos haciendo esto?"
→ **Pre-completar** si el usuario dio contexto sobre el problema o necesidad.
→ Si no, usar placeholder: *"Describir el estado actual y la motivación detrás de este proyecto."*

#### 3. Diseño
Decisiones de diseño, wireframes, mockups, arquitectura.
→ Placeholder: *"Documentar las decisiones de diseño y arquitectura del proyecto."*
→ **Si el usuario adjunta imágenes** (screenshots, wireframes, mockups, diagramas): el MCP de Notion no soporta subir imágenes locales. Informar al usuario que debe subirlas manualmente a la sección Diseño en Notion (arrastrando o usando /image → Subir). Listar las imágenes adjuntadas con una descripción de cada una para que el usuario sepa qué subir y en qué orden.

#### 4. Flujo del usuario
Cómo interactúa el usuario con la funcionalidad.
→ **Pre-completar** si se puede inferir del input (ej: "flujo de checkout" → describir pasos del usuario).
→ Si no, placeholder: *"Describir el flujo paso a paso que sigue el usuario."*

#### 5. Esquema del sitio web
Estructura de páginas, rutas, componentes.
→ Placeholder: *"Definir las rutas, páginas y componentes involucrados."*

#### 6. Requisitos
Requisitos funcionales y no funcionales.
→ **Pre-completar** extrayendo requisitos implícitos del input.
→ Formato: lista con requisitos funcionales y no funcionales.

#### 7. Tareas del proyecto
Relación con tareas de desarrollo — se vinculan después.
→ Placeholder: *"Las tareas se crearán y vincularán usando /crear-tarea."*

#### 8. Riesgos
Posibles riesgos y estrategias de mitigación.
→ Placeholder: *"Identificar riesgos técnicos, de negocio y de timeline."*

#### 9. Casos de prueba
Escenarios de testing principales.
→ **Pre-completar** generando casos de prueba a partir de los requisitos funcionales y no funcionales definidos en la sección 6. Usar formato de tabla con columnas: Dado | Cuándo | Entonces | Prioridad. Incluir al menos los escenarios del camino feliz (happy path), casos borde y casos de error más relevantes.

#### 10. Plan de implementación
Fases, milestones, timeline.
→ Placeholder: *"Describir las fases de implementación y sus dependencias."*

#### 11. Medición del éxito
Métricas y KPIs para evaluar si el proyecto cumplió su objetivo.
→ Placeholder: *"Definir las métricas que indican el éxito del proyecto."*

### 3. Crear el proyecto en Notion

Usar la herramienta MCP de Notion para crear una página en la DB "Hoja de ruta de desarrollo" **usando la plantilla predeterminada "Especificación técnica"** (template_id: 210c96f1-2128-82f5-985f-815aab5fc850).

**IMPORTANTE:** Siempre usar la plantilla. No generar el body manualmente. La plantilla incluye bloques especiales (vista inline de tareas, embeds de Miro/Sketch, etc.) que no se pueden recrear con markdown.

**Paso 3a: Crear la página con la plantilla y las propiedades:**
- **template_id**: 210c96f1-2128-82f5-985f-815aab5fc850
- **Nombre del proyecto** (title): nombre extraído
- **Estado** (status): "En curso"
- **Prioridad** (select): prioridad extraída o ninguna
- **Etiquetas** (multi-select): etiquetas extraídas
- **Propietario** (people): persona si se encontró
- **Fechas** (date range): fechas si se mencionaron
- NO incluir "content" — la plantilla lo provee

**Paso 3b: Esperar unos segundos a que la plantilla se aplique, luego hacer fetch de la página para ver el contenido generado por la plantilla.**

**Paso 3c: Actualizar las secciones de la plantilla con el contenido generado usando update_content (search-and-replace sobre el contenido de la plantilla):**
- Resumen (callout)
- Contexto
- Diseño (incluir imágenes si el usuario las adjuntó)
- Flujo del usuario
- Requisitos
- Riesgos
- Casos de prueba
- Plan de implementación
- Medición del éxito

Las secciones que no se pueden inferir del input se dejan con el texto original de la plantilla.

### 4. Confirmar al usuario

Mostrar:
- Nombre del proyecto creado
- Propiedades asignadas
- Secciones pre-completadas vs. pendientes de completar
- Link al proyecto en Notion

### 5. Preguntar si crear subtareas

Después de confirmar la creación del proyecto, preguntar al usuario si quiere que se creen las tareas de desarrollo asociadas. Si acepta:
- Generar las subtareas necesarias a partir de los requisitos y el plan de implementación
- Crear cada tarea en la DB "Tareas de desarrollo" (data source inline: `df1c96f1-2128-83f3-9fdd-07b69ff37804`)
- **IMPORTANTE: Usar siempre template_id `421c96f1-2128-8201-9390-016f272a623a`** (plantilla "Tarea") para que las tareas se creen con el formato correcto
- Al usar template, NO incluir "content" en la creación — la plantilla lo provee
- Sí incluir las propiedades: Nombre, Estado (Pendiente), Prioridad, y Proyecto (URL de la página del proyecto recién creado)
- Vincular las tareas al proyecto recién creado
- Mostrar la lista de tareas creadas con sus links

## Propiedades de la DB "Hoja de ruta de desarrollo"

| Propiedad | Tipo | Opciones |
|-----------|------|----------|
| Nombre del proyecto | Título | — |
| Estado | Select | En curso, etc. |
| Propietario | Persona | — |
| Fechas | Fecha (rango) | — |
| Prioridad | Select | Baja, Media, Alta |
| Etiquetas | Multi-select | Función, Inversión en tecnología |
| Realización | Fórmula/Rollup | Calculado automáticamente |
| Bloqueado por | Relación | → misma DB |
| Bloqueando | Relación | → misma DB |
| Tareas | Relación | → DB Tareas de desarrollo |

## Guidelines

- Siempre crear con estado "En curso" a menos que el usuario indique otro
- Pre-completar al menos Resumen, Contexto y Requisitos a partir del input
- Las secciones que no se pueden inferir deben tener placeholders descriptivos, no quedar vacías
- El nombre del proyecto debe ser descriptivo pero conciso
- Si el input es muy breve para generar contenido útil, hacer preguntas de descubrimiento antes de crear:
  - ¿Cuál es el problema que resuelve?
  - ¿Quién es el usuario afectado?
  - ¿Hay dependencias con otros proyectos?
- Responder en español neutro
- Usar los emojis del template original en los encabezados de sección
