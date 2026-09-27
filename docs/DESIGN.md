---
version: alpha
name: IKS-design-system
description: >
  A warm, editorial interface built on a disciplined 60/30/10 color system:
  a soft paper surface, confident near-black type, and a single electric blue
  reserved for action. The visual language should feel calm, spacious,
  editorial, and quietly premium. Use real alumni, activity, map, and
  architectural imagery whenever available. Avoid multi-hue brand decoration,
  saturated color washes, generic SaaS gloss, neon gradients, and busy ornament
  that competes with the content.

colors:
  # 60% — Dominant background & surfaces
  paper: "#f7f4ed"
  paper-raised: "#fffdf7"
  paper-sunken: "#ece7da"
  # 30% — Typography & secondary surfaces
  ink: "#111111"
  ink-soft: "#2b2b2b"
  ink-muted: "#5e5a55"
  ink-faint: "#8a8580"
  ink-surface: "#111111"
  on-ink: "#f7f4ed"
  hairline: "rgba(17, 17, 17, 0.12)"
  hairline-strong: "rgba(17, 17, 17, 0.24)"
  hairline-inverse: "rgba(247, 244, 237, 0.16)"
  scrim: "rgba(17, 17, 17, 0.55)"
  # 10% — CTAs, links & visual emphasis
  accent: "#5b7cff"
  accent-strong: "#3f61f0"
  accent-soft: "#e7ebff"
  accent-muted: "rgba(91, 124, 255, 0.16)"
  on-accent: "#ffffff"

typography:
  hero-display:
    fontFamily: "var(--font-pp-neue), var(--font-instrument-sans), system-ui, sans-serif"
    fontSize: 112px
    fontWeight: 400
    lineHeight: 0.88
    letterSpacing: -0.04em
  section-title:
    fontFamily: "var(--font-display), Georgia, serif"
    fontSize: 56px
    fontWeight: 300
    lineHeight: 0.98
    letterSpacing: 0
  card-title:
    fontFamily: "var(--font-display), Georgia, serif"
    fontSize: 28px
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: 0
  body:
    fontFamily: "var(--font-sans), system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: 0
  body-strong:
    fontFamily: "var(--font-sans), system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 650
    lineHeight: 1.45
    letterSpacing: 0
  eyebrow:
    fontFamily: "var(--font-sans), system-ui, sans-serif"
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.28em
    textTransform: uppercase
  javanese-mark:
    fontFamily: "var(--font-javanese), 'Noto Sans Javanese', serif"
    fontSize: 144px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 0
  nav-link:
    fontFamily: "var(--font-pp-neue), var(--font-instrument-sans), system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 0

rounded:
  xs: 6px
  sm: 10px
  md: 12px
  lg: 16px
  xl: 24px
  pill: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 18px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 88px
  section-lg: 112px

components:
  page-light-band:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
  page-subtle-band:
    backgroundColor: "{colors.paper-sunken}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
  page-dark-band:
    backgroundColor: "{colors.ink-surface}"
    textColor: "{colors.on-ink}"
    borderColor: "{colors.hairline-inverse}"
  page-black-band:
    backgroundColor: "{colors.ink-surface}"
    textColor: "{colors.on-ink}"
    borderColor: "{colors.hairline-inverse}"
  card:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.lg}"
    shadow: "0 18px 44px -30px rgba(17, 17, 17, 0.18)"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline-strong}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.pill}"
    padding: "12px 22px"
  input:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline-strong}"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
  metric-card:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.lg}"
    padding: "24px"

layout:
  maxWidth: 1180px
  contentWidth: 760px
  gridGap: 24px
  heroMinHeight: "calc(100svh - 24px)"
  sectionPaddingDesktop: "88px 24px"
  sectionPaddingMobile: "64px 18px"

imagery:
  hero:
    direction: >
      Use real or generated campus/gate architecture as the first-viewport signal.
      Favor bright daylight, blue sky, clean air, stone, white, or paper-toned
      building surfaces, fresh greenery as environmental context only, and subtle
      regional ornament. The hero should feel clear and optimistic, not dark or
      moody. Text must remain HTML, never baked into generated imagery.
  alumni:
    direction: >
      Treat people as members of a living network, not stock-photo decoration.
      Prefer candid activity, portraits, events, maps, and professional context.
  ornament:
    direction: >
      Use Javanese or regional marks as quiet oversized background typography or
      carved-material accents. Keep opacity low and never let ornament compete
      with headlines, CTAs, maps, or alumni data.

motion:
  rhythm: "slow, precise, observant"
  easing: "cubic-bezier(0.22, 0.61, 0.36, 1)"
  duration-fast: "200ms"
  duration-medium: "400ms"
  duration-slow: "900ms"
  rules:
    - Prefer reveal, parallax, magnetic hover, and subtle 3D depth over bounce.
    - Preserve prefers-reduced-motion fallbacks.
    - Do not block scrolling on mobile or coarse pointer devices.
    - 3D scenes must lazy-load and provide accessible fallbacks.

rules:
  do:
    - Keep the world map and alumni statistics legible and central.
    - Let headlines feel editorial, spacious, and confident.
    - Use paper (#F7F4ED) as the default surface for almost every section, targeting roughly 60% of visible area.
    - Use ink (#111111) for all typography and for secondary surfaces such as dark bands, footer, and image scrims, targeting roughly 30%.
    - Use accent blue (#5B7CFF) only for primary CTAs, links, focus rings, active states, and small visual emphasis, targeting roughly 10%; keep generous space around it.
    - Use accent-soft and accent-muted only as tints of the accent for hover, highlight, and background emphasis.
    - Derive every border, hairline, divider, and hover state from rgba of ink or accent; introduce no other hue.
    - Keep cards crisp, useful, and sparse; use them for repeated items only.
    - Keep Indonesian copy clear, warm, and community-centered.
  avoid:
    - Using yellow, brick red, or green in any form, including as contextual, status, or section accents.
    - Introducing any hue outside the three core colors; tints and rgba of paper, ink, and accent are the only allowed variations.
    - Using blues other than the accent tokens (no legacy SaaS blues such as #347ff2, #0c8de4, or #2563eb).
    - Washing large surfaces in accent blue; it should create focus, not glare.
    - Purple-blue SaaS gradients, neon accents, glassmorphism for its own sake.
    - Nested cards, decorative blobs, and bokeh/orb backgrounds.
    - Overly dark hero images that hide the campus/gate identity.
    - Generic stock-like alumni imagery.
    - Adding readable words into generated images or videos.
---

## Color Hierarchy (60 / 30 / 10)

The system is built on exactly three colors, distributed by area rather than by
brand association.

**Paper (#F7F4ED) — 60%.** The dominant surface. Almost every page background,
section band, card, input, and panel is paper. If a screen reads as calm and
spacious, paper is doing its job. Use `paper-raised` (#FFFDF7) for surfaces that
must lift slightly off the page, and `paper-sunken` (#ECE7DA) for recessed bands
and wells.

**Ink (#111111) — 30%.** All typography, from headlines to captions, is ink.
Ink also carries secondary surfaces: the footer, dark editorial bands, image
scrims, and data moments. Use `ink-muted` (#5E5A55) and `ink-faint` (#8A8580)
for secondary and tertiary copy so hierarchy survives without new hues.

**Accent Blue (#5B7CFF) — 10%.** The only color of action. Primary CTAs, links,
focus rings, active states, and small emphasis moments. It should feel scarce:
if blue covers more than a small fraction of the viewport, it has lost its
purpose. `accent-strong` (#3F61F0) handles hover and pressed states, while
`accent-soft` (#E7EBFF) and `accent-muted` provide tinted emphasis surfaces.

Every border, hairline, divider, hover, and focus treatment is derived from
rgba of ink or accent — for example `rgba(17, 17, 17, 0.12)` for hairlines and
`rgba(91, 124, 255, 0.16)` for accent fills. These derived values are the only
permitted variation; they are not additional colors.

**Retired from this system.** UI Logo Yellow, UI Building Brick Red, and Campus
Green — along with their supporting families (sky, daylight, cloud, stone, lawn,
emerald, and muted gold) — are no longer part of the identity. The legacy accent
blues `#347FF2`, `#0C8DE4`, and `#2563EB` are also replaced by the single accent
token `#5B7CFF`. Do not reintroduce these hues, including as contextual or
status colors.

The hexadecimal values are working digital tokens. If authoritative brand assets
supply new values, calibrate the tokens while preserving these three semantic
roles and the 60/30/10 distribution — never by adding a fourth hue.

# IKASADA Design Notes

The IKASADA website should feel like a polished alumni archive that is still
alive: rooted in place, culture, education, and professional connection. The
strongest visual signals are the campus/gate imagery, alumni distribution, event
rhythm, and warm Indonesian editorial copy.

For new screens, begin from the paper-first 60/30/10 system rather than adding a
new palette. Refine spacing, hierarchy, and imagery before introducing a new
visual world. Use visual drama only when it clarifies belonging, memory,
geography, or alumni momentum.

## Active Hero Direction: Alumni Network

The active hero no longer uses the UI campus images or building GLB. Its focal
visual is a restrained React Three Fiber alumni network: small profile nodes,
thin connections, and a quiet orbit that communicates belonging and movement.
Use public alumni data only through the existing public endpoint, retaining only
photo URL and cohort year for the hero. Show `Angkatan {year}` on hover, focus,
or tap. Use a generic Phosphor avatar when a photo is unavailable.

The graph may auto-rotate very slowly and accept drag rotation on capable
devices. Pause auto-rotation while the user hovers or drags. Reduced motion,
Save-Data, WebGL failure, and API failure must render a static accessible graph
fallback with the same approximate footprint.

The hero copy is:

- Headline: `Tumbuh Bersama`
- Description: `Ruang silaturahmi, jejaring, dan kontribusi antar alumni.`
- Single scroll CTA: `Cari`, targeting `#alumni`

## Augen-Inspired Public Navigation

The public navbar is a small centered floating surface with a paper fill
(`#F7F4ED`), approximately 10px radius, ink hairline border, near-zero shadow,
lightweight typography, and restrained show/hide motion. Accent blue (`#5B7CFF`)
marks the active item only. Keep only `Beranda`, `Kegiatan`, and
`Direktori Alumni`. Do not expose Portal Pengurus in the public navbar; the admin
remains reachable directly at `/admin`.

PP Neue Montreal is self-hosted through `next/font/local` from the supplied
files in `src/app/fonts/`. Use its Book face at 400 for body and navigation,
Medium at 500 for controls, and Bold at 700 only where emphasis is essential.
`--font-sans`, `--font-display`, hero, and navbar all resolve to PP Neue
Montreal first; Instrument Sans remains only as a resilient system fallback.
