# Design System Strategy: The Aero-Spatial Horizon

## 1. Overview & Creative North Star
This design system is built for the "Aero-Spatial Horizon"—a concept where high-precision telemetry meets editorial sophistication. In the context of drone component inventory, we move beyond the cluttered, utilitarian nature of traditional ERPs. Instead, we embrace a "Flight Deck" philosophy: high-density information presented through a lens of atmospheric depth, expansive breathing room, and tactile layering.

By rejecting the "boxed-in" layout of standard SaaS platforms, this system uses intentional asymmetry and tonal shifts to guide the user's eye. We are not just building a database; we are creating a command center that feels as advanced as the hardware it tracks.

## 2. Colors & Atmospheric Depth
The color palette is anchored in the deep reaches of the stratosphere. We use `surface` and `surface-container` tiers to define logic and hierarchy rather than lines.

### The Color Tokens
- **Primary Deep Aviation:** `#1E3A8A` (Integrated via `primary` and `primary_container` tokens). Use this for high-importance actions and brand moments.
- **Atmospheric Background:** `#060e20` (`surface`).
- **Accents:** `#e0e3e5` (`secondary`) for functional highlights and `#dee5ff` (`on_surface`) for high-readability text.

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. Structural definition must be achieved through **Tonal Separation**:
- Place a `surface-container-low` module on top of a `surface` background to create a "recessed" area.
- Use `surface-container-highest` for primary interactive cards to create a "lifted" appearance.

### The Glass & Gradient Rule
To provide "soul" to the technical interface, primary CTAs and header summaries must utilize a **Signature Gradient**:
- **Gradient Path:** `primary` (#93aaff) to `primary_container` (#849df2) at a 135-degree angle.
- **Glassmorphism:** Floating panels (like side-modals or tooltips) should use the `surface_bright` token at 70% opacity with a `24px` backdrop-blur. This mimics a cockpit HUD, allowing the background data to softly bleed through.

## 3. Typography: The Precision Scale
We use **Manrope** for its geometric clarity and modern technical feel. The hierarchy is designed to feel editorial—large, bold headers contrasting with tight, technical labels.

- **Display-LG (3.5rem):** Reserved for high-level inventory totals or critical telemetry. Letter spacing: `-0.02em`.
- **Headline-SM (1.5rem):** Section titles. Use `on_surface` color with a medium weight.
- **Body-MD (0.875rem):** The workhorse for all data. Letter spacing: `+0.01em` for readability.
- **Label-SM (0.6875rem):** Used for "metadata" (e.g., SKU numbers, weight specs). Must be uppercase with `+0.05em` tracking to maintain a technical "blueprint" aesthetic.

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "web 2.0." This system uses **Ambient Occlusion** and **Nesting**.

### The Layering Principle
Hierarchy is established by "stacking" the surface containers:
1. **Level 0 (Base):** `surface` (#060e20)
2. **Level 1 (Sections):** `surface-container-low` (#091328)
3. **Level 2 (Cards):** `surface-container-highest` (#192540)
4. **Level 3 (Interactive/Hover):** `surface_bright` (#1f2b49)

### Ambient Shadows
For floating elements (Modals, Dropdowns), use a shadow that mimics natural light:
- **Shadow Token:** `0px 24px 48px rgba(0, 0, 0, 0.4)`
- **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline_variant` at **15% opacity**. It should be felt, not seen.

## 5. Components

### Buttons
- **Primary:** Gradient background (`primary` to `primary_container`), `xl` (1.5rem) corner radius. No border.
- **Secondary:** `surface-container-highest` background with a `Ghost Border`. Text in `on_surface`.
- **Tertiary:** No background. Text in `primary`. High-contrast hover state with a subtle `primary_dim` underglow.

### Cards & Lists
- **Rule:** Forbid divider lines. 
- **Application:** Use vertical spacing (`1.5rem` to `2rem`) to separate list items. For complex data tables, use alternating row tints using `surface-container-low` and `surface-container-lowest`.
- **Roundedness:** Use `lg` (1rem) for standard cards and `xl` (1.5rem) for hero dashboard widgets.

### Input Fields
- **Resting State:** `surface-container-high` background, `md` corner radius.
- **Focus State:** 2px solid `primary_dim`. The background should shift to `surface_bright`.
- **Error State:** Use `error` (#ff6e84) only for the label and a subtle `error_container` glow around the input.

### Inventory Chips
- **Status Chips:** High-saturation, low-opacity backgrounds (e.g., `error_container` at 20% for "Out of Stock").
- **Shape:** Always `full` (pill-shaped) to contrast against the `lg` roundedness of cards.

## 6. Do's and Don'ts

### Do:
- **Use Negative Space:** Embrace large margins (minimum 32px) between major dashboard modules to reduce cognitive load.
- **Layer with Purpose:** Ensure that an "inner" card is always visually "lighter" or "higher" in the surface tier than its parent container.
- **Tone-on-Tone:** Use `on_surface_variant` for secondary information to maintain a sophisticated, low-contrast visual rhythm.

### Don't:
- **Don't use 1px Borders:** Never use a solid border to separate the sidebar from the main content; use a `surface` to `surface-container-low` shift instead.
- **Don't use Pure White:** Avoid `#FFFFFF` for backgrounds. Use `secondary` (#e0e3e5) for accents and `on_surface` (#dee5ff) for text to prevent eye strain in dark mode.
- **Don't Over-Shadow:** Shadows are for floating elements only. Never put a shadow on a card that is "resting" on the background.