# Plan: Refactor content-trend-analyzer skill

## Context

El script actual (`content_trend_analyzer.py`) tiene 3 problemas principales:
1. Solo parsea reportes de YouTube en formato **markdown** (pero los más recientes son **HTML**)
2. No parsea correctamente el HTML de Instagram (los data-attributes existen pero no los usa)
3. El output es markdown — el usuario quiere **HTML visual** con cards
4. El análisis es genérico (patrones globales), no video-a-video

El objetivo es refactorizar el script para que analice cada video/reel individualmente, lo asocie con un pilar, genere una idea específica (concepto + título), y renderice todo en un HTML visual con cards.

---

## Cambios Requeridos

### 1. Parser YouTube HTML (reemplazar parser markdown actual)

**Archivo:** `parse_youtube_report()` en `content_trend_analyzer.py`

Parsear `.video-card` dentro de `.channel-section`:
- **Channel name**: texto de `.channel-title` (strip ` (N videos)` suffix y el emoji)
- **Title**: texto del `<a>` dentro de `.video-info h3`
- **URL**: `href` del `<a>` dentro de `.video-info h3`
- **Thumbnail**: `src` del `<img>` dentro de `.video-thumbnail` (URL externa de YouTube)
- **Video ID**: del thumbnail src `img.youtube.com/vi/{ID}/...`
- **Priority**: sufijo de clase `.priority-badge` (high/medium/small)
- **Metrics**: del par label/value en `.meta-item` → Views, Likes, Comments, Engagement, Published

### 2. Parser Instagram HTML (reemplazar parser actual)

**Archivo:** `parse_instagram_report()` en `content_trend_analyzer.py`

Parsear `.post-card[data-account][data-type][data-date]`:
- **Account**: `data-account` attribute
- **Type**: `data-type` (reel/photo/carousel)
- **Date**: `data-date` (YYYY-MM-DD)
- **Caption**: texto del `<p style="color:#555">` (preview truncada)
- **URL**: `href` del link "Ver en Instagram"
- **Metrics**: `.meta-item` pairs → Likes, Comments, Views (o `—`), Engagement
- **Thumbnail**: OMITIR (son base64 multi-MB — no incluir en análisis)
- **Priority**: extraer de `.channel-title` → badge text del `.channel-section` padre

### 3. Análisis con Claude (refactorizar `analyze_with_claude`)

Enviar todos los items en UNA llamada a Claude con:
- Content strategy completa
- Lista de todos los videos/reels (título, canal/cuenta, plataforma, métricas key)
- Pedir por cada item: pillar (1/2/3), concepto (1-2 líneas), título sugerido, score (1-10)

Prompt structure:
```
Para cada video/reel, responde con JSON array:
[
  {
    "id": "yt_0" | "ig_0",  // índice único para matching
    "pillar": 1|2|3,
    "concept": "...",  // 1-2 líneas explicando el ángulo adaptado a Nicolas
    "title": "...",    // título listo para video/reel de Nicolas
    "score": 8         // 1-10 basado en brand fit + trend strength
  }
]
```

Fallback sin ANTHROPIC_API_KEY: asignar pillar basado en keywords, score fijo = 7, concept/title genérico.

### 4. HTML Report Generator (reemplazar `generate_markdown_report`)

**Nuevo método:** `generate_html_report()`

**Estructura del HTML:**

```
<header>
  Summary stats: N videos YouTube + N reels Instagram analizados

<section class="pillar-priority">  ← Pillar 2 & 3 PRIMERO (destacado)
  Header con badge amarillo/rojo "HIGH PRIORITY"
  Grid de cards (3 columnas)

<section class="pillar-1">        ← Pillar 1 SEGUNDO
  Header con badge gris
  Grid de cards (3-4 columnas, cards más pequeños)
```

**Card design por video:**
```
┌─────────────────────────┐
│ [thumbnail 16:9]        │
│ PILLAR 2  9/10          │
│ Marc Lou  YouTube       │
│ "How I scaled to 10k"   │ ← título original
│ ─────────────────────── │
│ 💡 Concepto:            │
│ "Cómo escalé mi SaaS    │
│  sin contratar..."      │
│ 🎬 Título sugerido:     │
│ "Cómo escalar de 0 a    │
│  4,000 usuarios solo"   │
│ ─────────────────────── │
│ 👁 12,345  ❤ 890  💬 45│
│ [→ Ver video original]  │
└─────────────────────────┘
```

Para Instagram: mismo layout pero sin thumbnail (mostrar icono + tipo de post).

**Filtros:** botones en el header para filtrar por plataforma (YouTube / Instagram / Todos).

### 5. Output path (reemplazar `save_report`)

- Guardar como `reports/weekly/YYYY-MM-DD-content-opportunities.html`
- Ya no genera markdown ni JSON (simplificar)
- Auto-abrir en browser con `webbrowser.open()`

---

## Archivos a Modificar

| Archivo | Cambio |
|---|---|
| `.claude/skills/content-trend-analyzer/scripts/content_trend_analyzer.py` | Refactorizar completo: parsers, análisis, HTML output |
| `.claude/skills/content-trend-analyzer/SKILL.md` | Actualizar doc: output es HTML, no markdown |

---

## Flujo de Ejecución (nuevo)

```
1. load_content_strategy()           → lee context/content_strategy.md
2. find_latest_reports()             → encuentra HTML más reciente de cada plataforma
3. parse_youtube_report(html_path)   → extrae N videos con métricas
4. parse_instagram_report(html_path) → extrae N reels/posts con métricas
5. analyze_with_claude(all_items)    → 1 llamada Claude → pillar + concepto + título + score por item
6. generate_html_report()            → HTML visual con cards, P2/P3 arriba, P1 abajo
7. save_html_report()                → reports/weekly/YYYY-MM-DD-content-opportunities.html
8. webbrowser.open(path)             → auto-abrir en browser
```

---

## Verificación

```bash
cd "/Users/nicolastaboada/Desktop/Nicolas Taboada/creacion-contenido"
source venv/bin/activate
python .claude/skills/content-trend-analyzer/scripts/content_trend_analyzer.py

# Verificar:
# - Encuentra reportes YouTube e Instagram más recientes
# - Parsea correctamente los videos/posts
# - Claude clasifica cada uno en pilar 1/2/3
# - Genera HTML con cards visuales
# - P2 y P3 están en sección "HIGH PRIORITY" arriba
# - Auto-abre en browser
```
