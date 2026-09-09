---
name: Moonlight Identity
colors:
  surface: '#131316'
  surface-dim: '#131316'
  surface-bright: '#39393c'
  surface-container-lowest: '#0e0e11'
  surface-container-low: '#1b1b1e'
  surface-container: '#1f1f22'
  surface-container-high: '#2a2a2d'
  surface-container-highest: '#353438'
  on-surface: '#e4e1e6'
  on-surface-variant: '#c4c7c4'
  inverse-surface: '#e4e1e6'
  inverse-on-surface: '#303033'
  outline: '#8e918f'
  outline-variant: '#444845'
  surface-tint: '#c7c6c5'
  primary: '#ffffff'
  on-primary: '#2f3130'
  primary-container: '#e3e2e0'
  on-primary-container: '#646463'
  inverse-primary: '#5e5e5d'
  secondary: '#c3c7cc'
  on-secondary: '#2c3135'
  secondary-container: '#454a4e'
  on-secondary-container: '#b5b9be'
  tertiary: '#ffffff'
  on-tertiary: '#283238'
  tertiary-container: '#dae4ed'
  on-tertiary-container: '#5c666d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e3e2e0'
  primary-fixed-dim: '#c7c6c5'
  on-primary-fixed: '#1a1c1b'
  on-primary-fixed-variant: '#464746'
  secondary-fixed: '#dfe3e8'
  secondary-fixed-dim: '#c3c7cc'
  on-secondary-fixed: '#171c20'
  on-secondary-fixed-variant: '#43474b'
  tertiary-fixed: '#dae4ed'
  tertiary-fixed-dim: '#bec8d0'
  on-tertiary-fixed: '#131d23'
  on-tertiary-fixed-variant: '#3e484f'
  background: '#131316'
  on-background: '#e4e1e6'
  surface-variant: '#353438'
  canvas-outer: '#EFEEEC'
  obsidian-base: '#0A0A0C'
  obsidian-elevated: '#18181B'
  obsidian-bubble: '#1E1D1C'
  hairline-on-dark: '#2A2A2E'
  hairline-on-light: '#DEDCD8'
  text-on-dark-primary: '#F5F4F1'
  text-on-dark-secondary: '#9A9A9F'
  text-on-light-primary: '#151415'
  text-on-light-secondary: '#8A8884'
  state-success: '#8FAE97'
  state-error: '#C77B6E'
typography:
  headline-xl:
    fontFamily: Playfair Display
    fontSize: 44px
    fontWeight: '400'
    lineHeight: 52px
    letterSpacing: 0.12em
  headline-xl-mobile:
    fontFamily: Playfair Display
    fontSize: 30px
    fontWeight: '400'
    lineHeight: 38px
    letterSpacing: 0.08em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: 0.08em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0.06em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 30px
    letterSpacing: 0.05em
  subline-editorial:
    fontFamily: Playfair Display
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0.02em
  label-caps-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.12em
  label-caps-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.14em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  data-tabular:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4rem
  card-margin-desktop: 3.5rem
  card-margin-mobile: 1rem
  card-padding-desktop: 3rem
  card-padding-mobile: 1.5rem
---

## Brand & Style

This design system embodies a nocturnal, quiet luxury retreat atmosphere centered on celestial contemplation, solitude, and architectural intimacy. It departs from typical travel marketplaces by using structural figure-ground inversion: a tactile, warm paper-toned outer field (`#EFEEEC`) that frames deep floating obsidian monolithic cards (`#0A0A0C` to `#121215`). 

The visual style blends **Minimalism** with **Atmospheric Skeuomorphism**:
- Surfaces are anchored in deep dark stone and tactile light paper, punctuated by precise physical hairlines.
- Depth is achieved not through heavy drop shadows, but through directional cool-white light bleed (`#DCE6EF`), replicating moonlight casting sideways across an architectural slab.
- Emotional tone: deliberate, slow, solemn, and high-end horological. Every interaction feels as measured as an astronomical observation instrument.

## Colors

The palette governs two distinct spatial domains: the **outer canvas** and the **monolithic obsidian card**.

### Spatial Surface Rules
1. **Outer Canvas:** Rendered exclusively in warm paper white (`#EFEEEC`). Typography directly on this surface uses `#151415` with muted metadata in `#8A8884` and hairlines in `#DEDCD8`.
2. **Obsidian Card:** Operates as a floating night-sky sanctuary. The base card utilizes a subtle vertical gradient from `#0A0A0C` (top) to `#121215` (bottom). Elevated interactive surfaces and nested panels sit at `#18181B`.
3. **Chromatic Discipline:** Avoid pure saturated colors, absolute `#000000`, and clinical `#FFFFFF`. The only cool hues permitted are the lunar accents (`#DCE6EF` and `#C9CDD2`). All neutrals are infused with faint warm earth tones.
4. **Hierarchy by Luminance:** Hierarchy and focus are communicated through luminance rather than saturated color shifts. Selected states, primary buttons, and critical inputs transition from muted stone (`#9A9A9F`) to moonlit ivory (`#F5F4F1` / `#F7F6F4`).

## Typography

Typographic execution centers on a high-contrast editorial pairing:

- **Display Serif (`Playfair Display`):** Reserved for dramatic moments, lunar status declarations, and primary card titling. Major titles are tracked out with all-caps styling (`0.08em` to `0.12em`). Editorial sublines drop tracking and switch to delicate italic sentence or title casing.
- **System Sans (`Inter`):** Drives all functional UI, controls, technical data, and form labels.
- **Form and Navigation Labels:** Always uppercase, medium-weight (`500`), with prominent tracking (`0.12em`–`0.14em`) to mirror luxury horological engraving.
- **Tabular Figures:** All numeric metrics (lunar percentages, moonrise timestamps, currency prices, and OTP codes) must enable `tabular-nums` for strict alignment.

## Layout & Spacing

The layout model utilizes a **Fixed Centered Island** structure inside an expansive fluid canvas:

1. **Outer Viewport Canvas:** Employs dynamic inset margins (`card-margin-desktop: 3.5rem`, shrinking to `1rem` on mobile). The central obsidian monolith floats freely and never clings to the viewport borders on desktop screens.
2. **Two-Column Asymmetric Grid (Desktop):** Inside the obsidian container, a two-column layout divides the experiential/narrative moon visual (left column, ~45% width) and the functional form or stay selector (right column, ~55% width).
3. **Responsive Reflow (Mobile):** At screen widths under `840px`, the grid collapses to a single stacked column. The photoreal lunar visual reduces from `230px` to `140px`, repositioning at the top center with its ambient bloom casting downward into the form.
4. **Spacing Rhythm:** Built strictly on an 8px base rhythm (4px for micro-hairline insets). Form rows rely on direct stacked verticality: labels sit immediately above hairline inputs with zero bottom margin, separated by `space-xl` (32px) between fields.

## Elevation & Depth

Elevation is rendered via **atmospheric light emissions** and **tonal obsidian layering** rather than standard diffuse drop shadows:

1. **Card Foundation Shadow:** The floating obsidian card casts a soft, tactile ambient shade onto the warm `#EFEEEC` paper canvas: `0 24px 48px -12px rgba(10, 10, 12, 0.12), 0 4px 16px rgba(10, 10, 12, 0.04)`.
2. **Lunar Glow Bleed:** Behind the photoreal moon graphic sits an off-center radial bloom (`#DCE6EF` fading to `transparent` at 25%–40% opacity) blurred across 32px.
3. **Eastward Directional Light Cast:** Interactive moon assets cast three asymmetric light fields toward the right-hand panel:
   - *Tight Cast:* `14px 4px 20px rgba(225, 240, 255, 0.45)`
   - *Medium Cast:* `32px 8px 45px rgba(175, 215, 255, 0.30)`
   - *Diffuse Cast:* `70px 16px 90px rgba(120, 170, 235, 0.18)`
4. **Hairline Structuring:** Layer boundaries use 1px solid hairline strokes (`#2A2A2E` inside dark cards, `#DEDCD8` across the light canvas). Elevated floating dialogs and confirmations use an emphasized near-white hairline (`#F5F4F1` at 60% opacity) to command visual authority over surrounding dark surfaces.

## Shapes

The shape system pairs expansive, grounded card geometries with razor-sharp horizontal details and pill-shaped interactive elements:

- **Monolith Container:** Large architectural corners calibrated to `28px` (`rounded-xl`), presenting the feeling of a polished obsidian tablet.
- **Pill Philosophy (Interactive Elements):** All interactive buttons, primary CTAs, segmented toggle frames, active status indicators, and input composer capsules use full pill boundaries (`9999px` / `rounded-full`).
- **Data & Calendar Tiles:** Discrete astronomical information (calendar days, phase boxes) uses compact `8px` rounded rectangles with low-contrast borders.
- **Hairline Geometry:** Form fields strip all outer enclosure boxes, relying purely on a continuous bottom hairline rule.

## Components

### Primary CTA Buttons
- **Structure:** Pill-shaped (`rounded-full`), height `46px`, padding `0 28px`.
- **Styling:** Solid ivory background (`#F7F6F4`) with deep near-black text (`#0A0A0C`). Typography is `label-caps-md` (Inter, 600, uppercase, `+0.12em` letter spacing).
- **Interaction:** On hover, a subtle trailing directional arrow (`→`) translates `4px` eastward. The background softens to `#EFEEEC`.
- **Secondary / Social Auth:** Pill-shaped outline buttons with a transparent fill, 1px `#2A2A2E` hairline border, and `#F5F4F1` typography.

### Input Fields
- **Structure:** Bottom-hairline only. No background fill, no rounded container box. Height `44px`.
- **Rest State:** 1px bottom border in `#2A2A2E`. Label placed above in `label-caps-sm` using `#9A9A9F`. Input placeholder text in `#9A9A9F` at 40% opacity.
- **Focus State:** Bottom border illuminates to crisp `#F5F4F1`. Label transitions to `#F5F4F1`.
- **Trailing Action Icons:** Subtle monochromatic glyphs (`@`, eye toggle, `#`) aligned to the bottom right in `#9A9A9F`.

### Segmented Controls & Chips
- **Track:** Recessed obsidian pill (`#18181B`) with 1px `#2A2A2E` border.
- **Active Pill:** Floating `#F7F6F4` fill with dark `#0A0A0C` text and gentle transition animation.
- **Inactive Pill:** Transparent fill with `#9A9A9F` text, brightening to `#F5F4F1` on hover.

### Selection Controls (Checkboxes & Radios)
- **Checkboxes:** 18px rounded squares (`4px` radius) with a 1px `#2A2A2E` hairline stroke. Checked state fills with `#F7F6F4` and a precise dark glyph.
- **Radio Buttons:** 18px concentric circle. Selected state displays an inner `#F7F6F4` disc surrounded by an obsidian ring and outer illuminated hairline.

### Floating Lunar Cards & Chat Bubbles
- **Surface Cards:** `#0A0A0C` to `#121215` vertical gradient, `28px` border radius, encased in a 1px `#2A2A2E` hairline stroke.
- **Incoming Message Bubble:** Elevated dark container (`#18181B`), `16px` border radius, paired with a small circular Lumen AI moon glyph.
- **Outgoing Message Bubble:** Warm charcoal container (`#1E1D1C`), aligned right.
- **Confirmation Highlight Card:** Inset card wrapped in a high-luminance near-white hairline border (`#F5F4F1` at 70% opacity) with moonstone accent copy (`#C9CDD2`).

### Lunar Phase Tracker
- **Display:** Greyscale textured moon graphic paired with tabular data indicators (`data-tabular`) displaying current illumination percentage, moonrise time, and astrological positioning in `#C9CDD2`.