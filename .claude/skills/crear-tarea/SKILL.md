---
name: crear-tarea
description: "Crea una tarea de desarrollo en Notion. Usa este skill cuando el usuario quiera crear una tarea, agregar un ticket, registrar una tarea pendiente, o dicte algo como 'crear tarea', 'nueva tarea', 'agregar tarea', 'tengo que hacer X'."
argument-hint: "<descripción de la tarea en lenguaje natural, opcionalmente incluyendo prioridad, sprint, responsable, fecha límite y proyecto>"
---

# Crear Tarea de Desarrollo en Notion

## Qué hace

Crea una nueva tarea en la base de datos "Tareas de desarrollo" del workspace Nimboclass en Notion. Recibe una descripción en lenguaje natural (puede ser dictada por voz) y extrae automáticamente las propiedades relevantes.

## Cómo funciona

1. Recibe el input del usuario en lenguaje natural
2. Extrae las propiedades de la tarea del texto
3. Usa las herramientas MCP de Notion para crear la página en la base de datos correcta
4. Confirma la creación con un link a la tarea

## Ejemplos de uso

```
/crear-tarea agregar autenticación OAuth al backend, prioridad alta, para el sprint 2
/crear-tarea corregir el bug de carga de imágenes en el perfil
/crear-tarea implementar endpoint de notificaciones, fecha límite 15 de abril, prioridad media
/crear-tarea refactorizar el servicio de pagos para soportar MXN
```

## Proceso paso a paso

### 1. Parsear el input

Extraer del texto en lenguaje natural:

| Campo | Obligatorio | Default | Ejemplo de extracción |
|-------|-------------|---------|----------------------|
| Nombre | Sí | — | "agregar autenticación OAuth al backend" |
| Prioridad | No | Media | "prioridad alta" → Alta |
| Sprint | No | — | "sprint 2" → buscar "Sprint 2" en DB Sprints |
| Responsable | No | — | "asignar a Juan" → buscar persona |
| Fecha límite | No | — | "para el 15 de abril" → 2026-04-15 |
| Proyecto | No | — | "proyecto Reforma de búsqueda" → buscar en Hoja de ruta |

### 2. Buscar relaciones (si aplica)

Si el usuario mencionó un sprint:
- Buscar en la DB "Sprints" el sprint por nombre
- Si dice "sprint actual" o "current", buscar el que tiene estado "Current"

Si el usuario mencionó un proyecto:
- Buscar en la DB "Hoja de ruta de desarrollo" por nombre

### 3. Crear la tarea en Notion

Usar la herramienta MCP de Notion para crear una página en la DB "Tareas de desarrollo".

**Data source:** `df1c96f1-2128-83f3-9fdd-07b69ff37804` (inline, vinculado a proyectos)

**IMPORTANTE: Usar siempre template_id `421c96f1-2128-8201-9390-016f272a623a`** (plantilla "Tarea") para que la tarea se cree con el formato/estructura correcta. Al usar template, NO incluir "content" — la plantilla lo provee.

Propiedades a setear:
- **Nombre** (title): el nombre extraído
- **Estado** (status): "Pendiente"
- **Prioridad** (select): la prioridad extraída o "Media" por defecto
- **Sprint** (relation): ID del sprint si se encontró
- **Responsable** (people): persona si se encontró
- **Fecha límite** (date): fecha si se encontró
- **Proyecto** (relation): URL de la página del proyecto si se indicó

### 4. Confirmar al usuario

Mostrar:
- Nombre de la tarea creada
- Propiedades asignadas
- Link a la tarea en Notion

## Propiedades de la DB "Tareas de desarrollo"

| Propiedad | Tipo | Opciones |
|-----------|------|----------|
| ID de la tarea | Nº (auto) | — |
| Nombre | Título | — |
| Estado | Status | Pendiente, En desarrollo, Listo para QA, En QA, Esperando lanzamiento, Lanzado, Archivado |
| Responsable | Persona | — |
| Fecha límite | Fecha | — |
| Prioridad | Select | Baja, Media, Alta |
| Sprint | Relación | → DB Sprints |
| PR de GitHub | URL | — |

## Guidelines

- Siempre crear la tarea con estado "Pendiente" a menos que el usuario indique otro estado
- Si el usuario no menciona prioridad, usar "Media"
- Si el input es ambiguo, preguntar al usuario antes de crear
- Convertir fechas relativas a absolutas (ej: "mañana" → fecha real)
- El nombre de la tarea debe ser conciso y descriptivo (máximo ~80 caracteres)
- Responder en español neutro
