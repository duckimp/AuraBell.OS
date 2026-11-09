---
name: BellSchool OS
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3f4945'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6f7975'
  outline-variant: '#bfc9c3'
  surface-tint: '#216a57'
  primary: '#004335'
  on-primary: '#ffffff'
  primary-container: '#0d5c4a'
  on-primary-container: '#8cd2bb'
  inverse-primary: '#8fd4bd'
  secondary: '#446277'
  on-secondary: '#ffffff'
  secondary-container: '#c5e4fc'
  on-secondary-container: '#48667b'
  tertiary: '#5c2f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#7d4200'
  on-tertiary-container: '#ffb477'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#aaf1d9'
  primary-fixed-dim: '#8fd4bd'
  on-primary-fixed: '#002018'
  on-primary-fixed-variant: '#005140'
  secondary-fixed: '#c8e6ff'
  secondary-fixed-dim: '#accae3'
  on-secondary-fixed: '#001e2e'
  on-secondary-fixed-variant: '#2c4a5e'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.005em
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-time:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system establishes an elevated, modern utility framework engineered specifically for mission-critical institutional operations and acoustic scheduling. It balances high-density administrative controls with an approachable, calm, and reassuring digital environment. School administrators, facilities teams, and IT staff require clarity under high-pressure scenarios (such as class transition shifts, bell overrides, and emergency broadcast triggers). The UI evokes architectural precision, dependability, and tactile modernism without corporate stiffness.

The aesthetic blends **Modern Utility** and **Elevated Minimalism**: crisp high-contrast cards, quiet slate framing, soft atmospheric shadows, and rich deep-emerald focal points. Micro-copy and data tables prioritize legible scanning, avoiding unnecessary ornamentation while retaining warm, geometric character.

## Colors

The palette is engineered around an authoritative, calming deep emerald primary (`#0D5C4A`), paired with a balancing slate-navy secondary (`#2C4A5E`) for secondary actions and audio visualization tracks. A rich amber tertiary (`#D97706`) governs cautionary bell states and alert intervals.

### Palette Roles
- **Canvas Base (`#F8FAFC`)**: A pale slate-tinted off-white reducing eye fatigue across prolonged desktop monitoring shifts.
- **Card Surface (`#FFFFFF`)**: Pure crisp white elevated over the canvas to create clear visual compartmentalization.
- **Subtle Boundaries (`#E2E8F0` to `#CBD5E1`)**: Low-contrast architectural structural lines framing tabular matrices, controls, and split panes.
- **Primary Accent (`#0D5C4A`)**: The anchor of operational status, primary buttons, active schedule tags, and confirmation states.
- **Secondary Slate/Blue (`#2C4A5E`)**: Used for muted controls, inactive tabs, track scrubbers, and passive metrics.
- **Status Semantics**:
  - Operational / Active Bell: Emerald Green (`#0D5C4A`)
  - Standby / Pending Sync: Slate Blue (`#475569`)
  - Warning / Manual Override: Warm Amber (`#D97706`)
  - Alarm / System Fault: Crimson (`#BE123C`)

## Typography

Typography establishes an intentional cadence between bold structural announcements and high-density, legible data tracking. 

- **Headlines (`Plus Jakarta Sans`)**: Delivers friendly, geometric precision. The open counters and clean geometric terminals maintain clarity in high-visibility widgets like the next-bell countdown, current zone overview, and panel headers.
- **Body & Micro-Copy (`Manrope`)**: Provides technical balance, neutral vertical stress, and exceptional tabular numeric rendering.
- **Time & Clock Elements (`code-time`)**: Uses tabular digits (`font-variant-numeric: tabular-nums`) within `Manrope` to eliminate jitter across real-time clock countdowns, audio scrubbing tracks, and automated period schedules.

## Layout & Spacing

The layout is built for responsive desktop orchestration. It follows a multi-pane split layout framework suited for multi-monitor workstations, facilities displays, and compact operational laptops.

### Grid & Canvas Structure
- **Persistent Operations Sidebar**: A fixed `260px` primary navigation rail, collapsible to `72px` icon-only mode for compact screens.
- **Primary Content Canvas**: A 12-column fluid grid system with `1.5rem` gutters and minimum `2rem` outer margins. 
- **Inspector / Live Bell Queue Drawer**: A dynamic `360px` right-hand drawer that docks cleanly during sound calibration and real-time monitoring.

### Responsive Breakpoints
- **Compact Desktop (<1280px)**: Right inspector shifts into an overlay modal; sidebar condenses to an icon-only strip.
- **Standard Desktop (1280px – 1680px)**: 12-column split with continuous multi-panel access (navigation, schedule matrix, audio inspector).
- **Ultrawide & Control Room (>1680px)**: Pinned multi-zone monitoring with extended matrix views.

## Elevation & Depth

Visual hierarchy avoids heavy pseudo-3D skeuomorphism in favor of soft, layered physical planes defined by subtle slate-tinted ambient occlusion and clean low-contrast perimeter borders.

### Surface Tiers
- **Level 0 (Canvas Base)**: `#F8FAFC` flat backdrop.
- **Level 1 (Card & Module Layer)**: `#FFFFFF` surface bounded by a continuous `1px` border of `#E2E8F0`. Shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Interactive Floating Elements & Active Audio Player)**: Pure white surface with subtle green-tinted depth: `0 4px 6px -1px rgba(13, 92, 74, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modals, Overlays, and Emergency Bell Triggers)**: High-prominence layered shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)`, edged with `#CBD5E1`.

## Shapes

The design system incorporates geometric roundedness category `2`, prioritizing `rounded-xl` (`1.5rem` / `24px`) for primary dashboard containers, timetable cards, and control panels, while utilizing `rounded-lg` (`1rem` / `16px`) for audio controls and buttons.

### Curvature Hierarchy
- **Primary Cards & Containers**: `rounded-xl` (1.5rem) providing soft, inviting architecture that modernizes technical software.
- **Interactive Controls (Buttons, Inputs, Audio Strips)**: `rounded-lg` (0.75rem to 1rem) maintaining tactile clarity without turning into soft pills.
- **Status Pills, Toggles & Zone Tags**: Complete pill radii (`9999px`) to immediately distinguish system indicators from clickable actionable surfaces.

## Components

### Buttons
- **Primary Action**: Solid `#0D5C4A` fill, `#FFFFFF` text, `rounded-lg`, subtle inset highlight. On hover: `#094436` with a slight forward translation.
- **Secondary Action**: `#FFFFFF` background, `1px` border in `#CBD5E1`, text `#2C4A5E`. Hover fills with `#F1F5F9`.
- **Destructive / Emergency Stop**: `#BE123C` fill, `#FFFFFF` bold text, high-visibility focus ring for immediate manual intervention.

### Status Badges
- Semi-transparent tinted backgrounds (`12%` opacity) paired with high-contrast text and a centered `6px` pulsating indicator dot.
- Active Bell Schedule: Emerald tint (`#ECFDF5` background, `#0D5C4A` text).
- Muted Zone / Weekend Mode: Slate tint (`#F1F5F9` background, `#475569` text).
- Override Triggered: Amber tint (`#FFFBEB` background, `#B45309` text).

### Toggle Switches (Zone & Bell Automation)
- Container: Width `44px`, height `24px`, fully rounded pill (`9999px`). Off-state: `#CBD5E1`. On-state: `#0D5C4A`.
- Thumb: Pure white `20px` circle with subtle ambient drop shadow (`0 2px 4px rgba(0,0,0,0.15)`), transitioning with a crisp cubic bezier curve.

### Tabular Timetable Grid
- Alternating row styling: Clean white (`#FFFFFF`) to soft slate-50 (`#F8FAFC`) on hover.
- Border dividing lines: Single `1px` continuous rule using `#E2E8F0`.
- Cells format time values with monospace tabular alignment, highlighting the next imminent bell ring in an emerald pill container.

### Audio Player & Zone Chime Calibration
- Compact horizontal deck with integrated waveform scrubber:
  - Track background: `#E2E8F0` with elapsed progress highlighted in `#0D5C4A`.
  - Scrub thumb: High-contrast white marker with an emerald halo focus ring.
  - Controls: Crisp Lucide icon buttons (`Play`, `Pause`, `Volume-2`, `Rotate-Ccw`) enclosed within slate-100 hover bounds.
- Chime selector: Dropdown input with integrated audio preview triggers and file duration metadata.