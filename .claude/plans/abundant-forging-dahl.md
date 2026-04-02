# Plan: Mover skills de Notion al proyecto nimbora-class

## Contexto

Las skills `crear-tarea` y `crear-proyecto` están en `~/Desktop/Agent Project Management/project-management/.claude/skills/` y solo funcionan desde ese directorio. El usuario quiere usarlas desde su proyecto de código **nimbora-class** donde trabaja día a día, ya que las skills son específicas de ese proyecto de Notion.

## Pasos

### 1. Crear carpeta de skills en nimbora-class

```
~/Desktop/Proyectos SaaS/nimbora-class/be/.claude/skills/
├── crear-tarea/SKILL.md
└── crear-proyecto/SKILL.md
```

La carpeta `.claude/` ya existe (tiene `settings.local.json`), solo falta crear `skills/`.

### 2. Copiar las skills (sin cambios de contenido)

Las skills ya están hardcodeadas para Nimboclass con los IDs correctos de data sources y templates. No necesitan modificación — se mueven tal cual.

- **Origen**: `~/Desktop/Agent Project Management/project-management/.claude/skills/crear-tarea/SKILL.md`
- **Destino**: `~/Desktop/Proyectos SaaS/nimbora-class/be/.claude/skills/crear-tarea/SKILL.md`

- **Origen**: `~/Desktop/Agent Project Management/project-management/.claude/skills/crear-proyecto/SKILL.md`
- **Destino**: `~/Desktop/Proyectos SaaS/nimbora-class/be/.claude/skills/crear-proyecto/SKILL.md`

### 3. Eliminar las skills del proyecto project-management

Borrar:
- `~/Desktop/Agent Project Management/project-management/.claude/skills/crear-tarea/SKILL.md`
- `~/Desktop/Agent Project Management/project-management/.claude/skills/crear-proyecto/SKILL.md`

### 4. Verificar que el MCP de Notion es accesible desde nimbora-class

El MCP de Notion está configurado a nivel `~/.claude.json` con scope en `~/Desktop`, así que nimbora-class (que está en `~/Desktop/Proyectos SaaS/nimbora-class/be/`) ya tiene acceso.

## Verificación

Abrir Claude Code desde nimbora-class:
```bash
cd ~/Desktop/Proyectos\ SaaS/nimbora-class/be && claude
```

Probar:
```
/crear-tarea agregar validación de formularios en el registro, prioridad alta
```

## Archivos a modificar

| Acción | Archivo |
|--------|---------|
| Crear | `~/Desktop/Proyectos SaaS/nimbora-class/be/.claude/skills/crear-tarea/SKILL.md` |
| Crear | `~/Desktop/Proyectos SaaS/nimbora-class/be/.claude/skills/crear-proyecto/SKILL.md` |
| Eliminar | `~/Desktop/Agent Project Management/project-management/.claude/skills/crear-tarea/SKILL.md` |
| Eliminar | `~/Desktop/Agent Project Management/project-management/.claude/skills/crear-proyecto/SKILL.md` |
