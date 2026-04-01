---
name: feature-start
description: "Orquesta todo el workflow de desarrollo: brainstorm → plan → Notion (roadmap + wiki) → git branch → implementación. Guía paso a paso garantizando que cada fase esté completa antes de pasar a la siguiente."
argument-hint: "<nombre de la feature o breve descripción>"
---

# Feature Start — Workflow Orquestado

## Repositorios

- **Frontend (Web)**: `/Users/nicolastaboada/Desktop/Proyectos SaaS/nimbora-class/web`
- **Backend**: `/Users/nicolastaboada/Desktop/Proyectos SaaS/nimbora-class/be`

Ambos usan este skill pero desde sus respectivos directorios.

## Qué hace

Guía completo de desarrollo desde la idea hasta lista para implementar. Orquesta skills existentes y pasos manuales en el orden correcto, garantizando que:
- El plan esté aprobado antes de crear Notion
- Notion esté creado antes del branch
- El branch exista antes de implementar

## Flujo paso a paso

### 1️⃣ Brainstorm (Conversacional)

**Preguntar al usuario:**
```
¿Ya hiciste brainstorm con IA sobre esta feature?
[SÍ] → Continuar
[NO] → Iniciar brainstorm ahora
```

Si el usuario dice que NO, ayudarlo a pensar:
- ¿Cuál es el problema que resuelve?
- ¿Quién se beneficia?
- ¿Tiene dependencias?
- ¿Impacto estimado?

Cuando esté listo: "Perfecto, vamos al siguiente paso."

---

### 2️⃣ Plan con /plan mode

**Automático:**
```
He entendido la feature. Vamos a crear el plan técnico detallado.

Presioná /plan para entrar a modo planificación.
Yo voy a:
- Explorar la codebase
- Entender patrones existentes
- Diseñar la implementación
- Generar un plan detallado

Cuando termines y apruebes el plan, continúamos.
```

**Esperar:**
- Usuario entra `/plan`
- Agente crea el plan
- Usuario sale con `ExitPlanMode` (aprobación implícita)

**Validar:**
```
✅ Plan aprobado y guardado en: .claude/plans/[nombre-aleatorio].md

Próximo paso: crear la hoja de ruta en Notion.
```

---

### 3️⃣ Crear en Notion (Automático + Manual)

**Ejecutar en orden:**

**3a. Crear Proyecto en Hoja de Ruta**
```
/crear-proyecto [Nombre de Feature]

[copiar el argumento del usuario]
Prioridad: [detectar de conversación o preguntar]
Etiquetas: Función [+ otras según contexto]

El skill /crear-proyecto automáticamente:
- Detecta el plan creado en .claude/plans/
- Lo vincula en sección "Plan"
- Crea la especificación técnica completa
```

**3b. Crear página en Wiki → Funcionalidades**
- Ya hecho por /crear-proyecto (copia el plan)

**3c. Preguntar si crear tareas**
```
¿Trabajas en equipo en esta feature?
[SÍ] → Crear tareas en Notion (BE-1, BE-2, ..., FE-1, FE-2, ...)
[NO] → Saltar (solo tienes plan + hoja de ruta)
```

**Resultado:**
```
✅ Hoja de Ruta creada: [link]
✅ Plan en Wiki: [link]
✅ Especificación técnica completada
✅ Tareas creadas (si aplica): [links]

Ready para Git.
```

---

### 4️⃣ Crear Feature Branch (Git)

**Automático + Validación:**

```
Voy a crear el branch de feature.

Nombre propuesto: feature/[nombre-en-kebab-case]

¿Está bien? [SÍ/CAMBIAR]
```

Si usuario dice CAMBIAR:
```
Propone el nombre exacto que prefieras:
```

**Ejecutar:**
```bash
git checkout -b feature/[nombre-en-kebab-case]
git push -u origin feature/[nombre-en-kebab-case]
```

**Validar:**
```
✅ Branch creado: feature/[nombre-en-kebab-case]
✅ Pusheado a origin

Ready para implementar.
```

---

### 5️⃣ Summary + Próximos pasos

```
🎉 Feature lista para implementar:

📋 Plan: .claude/plans/[nombre].md
📊 Hoja de Ruta: [link Notion]
📄 Especificación: [link Notion]
📚 Wiki: [link Notion]
🔀 Branch: feature/[nombre]

Próximos pasos:
1. Lee el plan
2. Implementa BE-1, BE-2, ... (en ese orden)
3. Crea commits atómicos
4. Cuando termines, abre PR para revisión

¿Vamos con BE-1?
```

---

### 6️⃣ Documentación (Post-Implementación)

**Después de completar la feature e integrar los cambios:**

**6a. Crear documentación técnica en `/docs` (Frontend)**
```
/docs/features/[nombre-feature]/
  ├── README.md          — Visión general + cómo usar
  ├── architecture.md    — Decisiones de arquitectura
  ├── components.md      — Componentes creados
  ├── types.md           — Types e interfaces
  └── graphql.md         — Queries y mutations
```

**6b. Dividir y copiar planes por repositorio**

El plan general (`.claude/plans/[nombre-aleatorio].md`) se divide en dos:

**Frontend (`/web`):**
```
/docs/plans/[nombre-feature]-frontend.md
```
Contiene solo: FE-1 a FE-N (tipos, componentes, página, GraphQL queries/mutations)

**Backend (`/be`):**
```
/docs/plans/[nombre-feature]-backend.md
```
Contiene solo: BE-1 a BE-N (schema Prisma, entities, DTOs, service, resolver, module)

Cada repositorio tiene SOLO su plan, no el plan general.

**6c. Actualizar `CLAUDE.md` en cada repositorio**

**En `/web/CLAUDE.md`:**
```markdown
## Plans — Frontend

- [Plan - [nombre-feature]](/docs/plans/[nombre-feature]-frontend.md) — Especificación técnica (FE)
```

**En `/be/CLAUDE.md`:**
```markdown
## Plans — Backend

- [Plan - [nombre-feature]](/docs/plans/[nombre-feature]-backend.md) — Especificación técnica (BE)
```

**Resultado:**
```
✅ Documentación técnica en /web/docs/features/[nombre-feature]/
✅ Plan frontend en /web/docs/plans/[nombre-feature]-frontend.md
✅ Plan backend en /be/docs/plans/[nombre-feature]-backend.md
✅ CLAUDE.md actualizado en ambos repos
✅ Feature completa, documentada y dividida por repo
```

---

## Configuración de Skills Orquestadas

Este skill orquesta:
- **Step 1-2**: Conversación + `/plan` (usuario interactúa, no automático)
- **Step 3**: `/crear-proyecto` (automático) + decisión humana (¿tareas?)
- **Step 4**: Git commands (Bash, automático)
- **Step 5**: Summary (resumen automático)
- **Step 6**: Documentación (post-implementación, manual del usuario)

## Puntos de decisión humana

- **Brainstorm completo?** → Usuario decide
- **Plan aprobado?** → Usuario sale de /plan
- **¿Equipo o solo?** → Usuario decide si crear tareas
- **¿Nombre de branch OK?** → Usuario valida

## Ejemplo de ejecución

```
Usuario: /feature-start [nombre-feature]

[Step 1] Skill: ¿Ya hiciste brainstorm?
Usuario: No, arrancamos de cero
[Skill ayuda a pensar]

[Step 2] Skill: /plan mode para crear el plan
Usuario: (entra /plan)
[Agente planifica]
Usuario: ExitPlanMode (aprueba)
✅ Plan guardado: .claude/plans/[nombre-aleatorio].md

[Step 3] Skill: /crear-proyecto "[nombre-feature]"
[Automático: Notion + Wiki creados]
Skill: ¿Equipo?
Usuario: No, solo yo

[Step 4] Skill: Branch: feature/[nombre-en-kebab-case]?
Usuario: SÍ
[Git branch creado]

[Step 5] Skill: ✅ Feature lista para implementar

[Step 6] Skill: (post-implementación)
Crear documentación técnica en /web/docs/features/[nombre-feature]/
Dividir plan general en dos:
  → /web/docs/plans/[nombre-feature]-frontend.md
  → /be/docs/plans/[nombre-feature]-backend.md
Actualizar CLAUDE.md en ambos repos
```

---

## Notas

- No es una mega-skill que automatiza TODO
- Es un **conductor** que guía el flujo completo (6 pasos)
- Respeta decisiones humanas en puntos críticos
- Reutiliza skills existentes (`/crear-proyecto`, `/plan`)
- Garantiza que cada paso esté completo antes del siguiente
- El step 6 (documentación) es responsabilidad del usuario post-implementación:
  - Crear `.md` con arquitectura y decisiones técnicas en `/web/docs/features/[nombre-feature]/`
  - **Dividir el plan general en dos:**
    - Plan frontend → `/web/docs/plans/[nombre-feature]-frontend.md` (solo FE-1 a FE-N)
    - Plan backend → `/be/docs/plans/[nombre-feature]-backend.md` (solo BE-1 a BE-N)
  - Actualizar sección "Plans" en CLAUDE.md de ambos repos con referencias a cada plan
  - **Ventaja**: Cada repo tiene su documentación independiente, sin duplicación innecesaria
