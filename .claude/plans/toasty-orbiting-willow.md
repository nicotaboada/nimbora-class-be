# Plan: Web Personal - Nico Taboada

## Context
Crear un sitio web personal minimalista desde cero para Nico Taboada (Indie Hacker / Builder). Inspirado en el template "Rivers" de Framer (limpio, tipografía fuerte, mucho white space) y la web de G. Bascuñana (newsletter + dark footer). El sitio debe ser simple pero con personalidad.

## Tech Stack
- **Next.js 15** (App Router)
- **Tailwind CSS v4**
- **TypeScript**
- **Font**: Inter (clean, moderna, similar a las inspiraciones)

## Estructura del Sitio (Single Page)

### 1. Hero Section
- Nombre grande "Nico Taboada" en tipografía bold
- Tagline corto: "I build products and share the process"
- Links a redes sociales como iconos (X, LinkedIn, YouTube, Instagram)
- Estilo minimalista como Rivers/Chris Raroque

### 2. Projects Section
- Heading "Projects"
- Grid de cards con: nombre del proyecto, descripción corta, link
- Cards minimalistas con borde sutil, hover effect
- Datos hardcodeados por ahora (fácil de editar)

### 3. Newsletter Section
- Estilo similar a Bascuñana: heading + descripción + form
- Input de email + botón "Subscribe"
- Fondo diferenciado (gris claro) para separar visualmente
- Integración con formulario (inicialmente solo UI, se puede conectar a ConvertKit/Buttondown después)

### 4. Contact / Footer Section
- "Let's Connect" heading (similar a Rivers)
- Email de contacto
- Links a redes sociales
- Copyright

## Archivos a Crear

```
nico-web/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout, fonts, metadata
│   │   ├── page.tsx            # Home page con todas las secciones
│   │   └── globals.css         # Tailwind imports + custom styles
│   └── components/
│       ├── Hero.tsx
│       ├── Projects.tsx
│       ├── Newsletter.tsx
│       └── Footer.tsx
└── public/
    └── (placeholder para favicon, etc)
```

## Pasos de Implementación

1. **Setup proyecto**: `npx create-next-app@latest` con TypeScript + Tailwind + App Router
2. **Layout + Globals**: Configurar font Inter, colores base, metadata
3. **Hero component**: Nombre, tagline, social links con iconos SVG inline
4. **Projects component**: Grid de project cards con datos placeholder
5. **Newsletter component**: Form con input email + botón subscribe
6. **Footer component**: Contacto, links, copyright
7. **Page.tsx**: Componer todas las secciones
8. **Responsive**: Asegurar que se vea bien en mobile y desktop
9. **Polish**: Animaciones sutiles de hover, transiciones suaves

## Diseño Visual
- **Background**: Blanco (#fff)
- **Text**: Negro/gris oscuro
- **Accent**: Negro (#000) para botones y CTAs - ultra minimalista
- **Spacing**: Generoso, mucho padding entre secciones
- **Cards**: Fondo gris claro (#f5f5f5), bordes redondeados
- **Newsletter section**: Fondo gris claro para diferenciarse
- **Projects**: Placeholders editables (3-4 proyecto de ejemplo)

## Verificación
1. Correr `npm run dev` y verificar en browser
2. Revisar responsiveness en mobile/tablet/desktop
3. Verificar todos los links y hover states
4. Testear el form de newsletter (UI)
