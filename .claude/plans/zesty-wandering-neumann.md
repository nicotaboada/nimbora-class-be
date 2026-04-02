# Plan: `/logo-fetcher` Skill

## Context
Nicolas needs a skill that, given a company name, fetches 1-2 logo variations (full logo + icon/symbol) and saves them to a local folder organized by company. These logos are used by the editor as infographic assets for reels and YouTube videos.

## Requirements
- **Input:** Company name (CLI arg), optional `--domain` override
- **Output:** `assets/logos/<company-slug>/` with logo + icon PNG files
- **Sources:** Clearbit first, DuckDuckGo Images as fallback for icon
- **Variations:** Full logo (with text) + icon/symbol only

---

## Implementation Plan

### 1. New skill directory
```
.claude/skills/logo-fetcher/
├── SKILL.md
├── requirements.txt
└── scripts/
    └── logo_fetcher.py
```

### 2. Script flow (`logo_fetcher.py`)

**Step 1 – Resolve company → domain + logo**
Use Clearbit Autocomplete (free, no API key needed):
`GET https://autocomplete.clearbit.com/v1/companies/suggest?query=<name>`
Returns: `{name, domain, logo}` — gets us domain + official logo URL in one call.

**Step 2 – Download full logo (Clearbit)**
`https://logo.clearbit.com/<domain>?size=512`
Saves as `<slug>-logo.png`

**Step 3 – Search for icon/symbol (DuckDuckGo fallback)**
Query: `"<company> logo icon transparent PNG`
Uses `duckduckgo_search` library (no API key required) — `DDGS().images()`
Filters for square-ish images (width ≈ height)
Downloads best match as `<slug>-icon.png`

**Step 4 – Save & report**
Output: `assets/logos/<company-slug>/`
Prints summary table with file paths and sizes
Auto-opens Finder to the output folder (macOS)

**Fallback logic:**
- If Clearbit Autocomplete finds no match → prompt user for domain manually
- If DuckDuckGo icon search fails → save only logo, warn user
- If both fail → clear error with instructions

### 3. CLI interface
```bash
python logo_fetcher.py "Stripe"
python logo_fetcher.py "Stripe" --domain stripe.com
python logo_fetcher.py "OpenAI" --output-dir "~/Google Drive/Logos"
python logo_fetcher.py "Apple" --no-icon     # skip icon search
```

### 4. Output structure
```
assets/logos/
└── stripe/
    ├── stripe-logo.png     (512x512+ full logo with text)
    └── stripe-icon.png     (best match icon/symbol)
```

### 5. SKILL.md frontmatter
```yaml
---
name: logo-fetcher
description: Use when fetching a company logo, downloading brand assets, or saving logo variations for infographics
argument-hint: "\"Company Name\""
disable-model-invocation: true
allowed-tools: Bash(python .claude/skills/logo-fetcher/scripts/logo_fetcher.py *), Read, Glob
---
```

### 6. Dependencies (`requirements.txt`)
```
requests>=2.31.0
duckduckgo-search>=6.0.0
Pillow>=10.0.0
```
- `requests` — HTTP downloads
- `duckduckgo-search` — icon image search (no API key)
- `Pillow` — image validation/metadata check

---

## Files to Create
1. `.claude/skills/logo-fetcher/SKILL.md`
2. `.claude/skills/logo-fetcher/requirements.txt`
3. `.claude/skills/logo-fetcher/scripts/logo_fetcher.py`

## No changes to existing files needed

---

## Verification
1. `pip install -r .claude/skills/logo-fetcher/requirements.txt`
2. `python .claude/skills/logo-fetcher/scripts/logo_fetcher.py "Stripe"`
   - Expect: `assets/logos/stripe/stripe-logo.png` + `assets/logos/stripe/stripe-icon.png`
3. `python .claude/skills/logo-fetcher/scripts/logo_fetcher.py "OpenAI" --no-icon`
   - Expect: only `assets/logos/openai/openai-logo.png`
4. Test fallback: use a lesser-known company name
