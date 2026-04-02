# Plan: Ajustes al Script del Tech Stack

## Context
El usuario revisó manualmente el script generado y lo adaptó con su voz y contenido real. Pide feedback sobre ajustes finales antes de filmar.

## Ajustes confirmados

### 1. Hook — sin cambios
El usuario lo va a leer con sus propias palabras, no necesita ser perfecto en el script.

### 2. Whisper Flow — reescribir sección
- Aclarar que es una herramienta de **dictado por voz**
- El punto clave: "ya no tipeo los prompts, los dicto"
- Mantener el insight: "el 80% de los problemas con IA es que no sabés bien qué pedirle"

### 3. Nombre del tool de diseño — es Subframe
Unificar a **Subframe** en todo el script (título de sección y contenido).

### 4. Apollo — agregar 1 línea explicativa
"Apollo es una librería de GraphQL que se pone sobre Node — básicamente define cómo tu frontend habla con el backend." Rápido, accesible.

### 5. Trigger.dev — uso concreto
El usuario lo usa para **background jobs**. Agregar: "lo uso para todo lo que tiene que correr en background — trabajos que no pueden bloquear la respuesta al usuario."

### 6. Transición a Mobbin
Agregar una línea de entrada antes de Mobbin: "Y cuando necesito inspiración de UI antes de diseñar con Subframe, uso Mobbin..."

### 7. MercadoPago — contextualizar
Agregar: "En LATAM MercadoPago es el standard — por eso no uso Stripe."

## Archivos a modificar
- `scripts/drafts/2026-03-29-mi-tech-stack-para-programar.md` — reemplazar el cuerpo del script con la versión del usuario + los ajustes arriba

## Verificación
- Leer el script en voz alta y verificar que fluye natural
- Confirmar nombre del tool de diseño con el usuario antes de escribir
