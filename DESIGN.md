# CARS24 Growth Operator Dashboard - Design System & Specification

## 1. Design Philosophy

The dashboard is designed to provide instant clarity on growth operations metrics across multiple funnel stages (Sell, Buy, Finance, Services) and geographic regions. The interface prioritizes **information density with visual breathing room**, using a light, modern aesthetic that reduces cognitive load while maintaining professional credibility.

Key principles:
- **Clarity first**: Color, typography, and layout guide the eye to actionable insights
- **Modern professionalism**: Clean lines, subtle shadows, refined typography
- **Data-driven design**: Numbers and trends are the focal point; decoration is minimal
- **Scannable hierarchy**: Information is organized by importance and relationship
- **Consistent interaction patterns**: All interactive elements behave predictably

---

## 2. Color System

### Primary Palette
- **Background**: `#ffffff` (pure white)
- **Text Primary**: `#1d1d1f` (near-black, softer than pure black)
- **Text Secondary**: `#666666` (mid-gray for meta information)
- **Text Tertiary**: `#999999` (light gray for hints and disabled states)
- **Border Default**: `#e5e5e7` (subtle light gray)
- **Border Subtle**: `#f5f5f5` (barely visible borders)

### Severity Color Palette
- **Healthy/OK**: `#27ae60` (forest green)
  - Text: `#27ae60`
  - Background: `#d5f4e6`
  - Border: `#27ae6015` (opacity variant)
- **Warning**: `#f39c12` (amber)
  - Text: `#f39c12`
  - Background: `#fef5e7`
  - Border: `#f39c1230`
- **Critical**: `#e74c3c` (coral red)
  - Text: `#e74c3c`
  - Background: `#fadbd8`
  - Border: `#e74c3c30`

### Funnel-Specific Colors
- **SELL**: `#ff6b35` (vibrant orange - primary accent)
  - Background: `#fff3e0`
  - Light variant: `#ffe8cc`
- **BUY**: `#0077be` (ocean blue)
  - Background: `#e0f7ff`
  - Light variant: `#cceeff`
- **FINANCE**: `#27ae60` (forest green)
  - Background: `#d5f4e6`
  - Light variant: `#c0ead8`
- **SERVICES**: `#8e44ad` (royal purple)
  - Background: `#f5e6ff`
  - Light variant: `#e8d4ff`

### Neutral Palette
- **Surface Light**: `#f9f9fb` (off-white, used for empty states and hover backgrounds)
- **Divider**: `#e5e5e7` (standard border color)

---

## 3. Typography System

### Font Family
- **Primary Font**: Satoshi (custom typeface)
  - Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif`
- **Monospace Font**: IBM Plex Mono (for numbers, metrics, code-like data)
  - Used for: currency values, percentages, performance metrics

### Type Scale

#### Display/Page Titles
- **Font Size**: 24px
- **Font Weight**: 700 (bold)
- **Line Height**: 1.3
- **Color**: `#1d1d1f`
- **Usage**: Page headers (e.g., "Live Feed", "Funnel Health", "Geographic Performance")

#### Section Headers
- **Font Size**: 16px
- **Font Weight**: 700
- **Line Height**: 1.4
- **Color**: `#1d1d1f`
- **Usage**: Card titles, section headings

#### Card Titles
- **Font Size**: 13px
- **Font Weight**: 600
- **Line Height**: 1.4
- **Color**: `#1d1d1f`
- **Usage**: Campaign names, city names in cards

#### Body Text
- **Font Size**: 12px
- **Font Weight**: 400
- **Line Height**: 1.5
- **Color**: `#666666`
- **Usage**: Descriptions, secondary information

#### Labels & Captions
- **Font Size**: 11px
- **Font Weight**: 500
- **Line Height**: 1.4
- **Color**: `#666666`
- **Text Transform**: Uppercase (for category labels)
- **Letter Spacing**: 0.5px
- **Usage**: Metric labels (e.g., "Spend", "CPL"), category labels

#### Metric Values
- **Font Size**: 13-16px (varies by context)
- **Font Weight**: 600-700
- **Font Family**: IBM Plex Mono
- **Line Height**: 1.3
- **Color**: Context-dependent (severity color or funnel color)
- **Usage**: Numbers, currency, percentages

---

## 4. Spacing & Layout System

### Base Unit
- **1 unit = 2px** (all spacing is expressed as multiples of 2px)

### Spacing Scale
- **2px**: `2px` (micro-spacing between elements)
- **4px**: `4px` (tight spacing)
- **6px**: `6px` (compact spacing)
- **8px**: `8px` (small spacing between components)
- **12px**: `12px` (standard spacing between cards/sections)
- **16px**: `16px` (medium spacing, card padding)
- **18px**: `18px` (card padding variant)
- **20px**: `20px` (large spacing)
- **24px**: `24px` (extra large spacing between major sections)
- **32px**: `32px` (page-level spacing)

### Card Specifications
- **Padding**: 14-18px (varies by card type)
- **Border Radius**: 10-12px
- **Border**: 1px solid `#e5e5e7`
- **Background**: `#ffffff`
- **Shadow**: `0 1px 3px rgba(0,0,0,0.08)` (default)
- **Shadow on Hover**: `0 4px 12px rgba(0,0,0,0.12)` (elevated)

### Page Layout
- **Max Width**: Full width (no container constraint)
- **Sidebar Width**: 240px (fixed left sidebar)
- **Content Area**: Remaining width
- **Content Padding**: 24px horizontal, 32px top
- **Grid Gap**: 24px (between sections)

---

## 5. Component Specifications

### 5.1 SeverityBadge Component

**Compact Variant** (used in card headers):
- Padding: `4px 8px`
- Border Radius: `12px`
- Font Size: `11px`
- Font Weight: `600`
- Gap: `4px`
- Dot size: `6px`
- No text label

**Full Variant** (used in detail views):
- Padding: `6px 12px`
- Border Radius: `12px`
- Font Size: `12px`
- Font Weight: `600`
- Gap: `6px`
- Dot size: `8px`
- Shows label: "Healthy", "Warning", or "Critical"

**Pulse Animation**:
- `pulse-ok`: opacity 1 → 0.6 → 1 (2s loop)
- `pulse-warning`: opacity 1 → 0.7 → 1 (2s loop)
- `pulse-critical`: adds box-shadow glow effect (0 0 8px → 0 0 16px)

---

### 5.2 GeoCard Component

Card for geographic performance (city-level data).

**Layout**:
- Header row: City name + Active campaigns count (left), Severity badge (right)
- Divider line with severity color at 15% opacity
- Data grid: 2 columns (CMA Avg, Dominant Funnel)

**Styling**:
- Border: 1px solid severity color at 30% opacity
- Border Radius: 12px
- Padding: 18px
- Background: `#ffffff` (default), severity color background on hover

**Hover States**:
- Background changes to severity background color
- Border opacity increases to 50%
- Box shadow elevates to `0 4px 12px rgba(0,0,0,0.12)`
- Cursor becomes pointer
- Transition: all 0.2s ease

**Content**:
- **City Name**: 14px, weight 700, color `#1d1d1f`
- **Active Campaigns**: 12px, weight 500, color `#999999`
- **CMA Label**: 11px, weight 500, color `#666666`, uppercase
- **CMA Value**: 13px, weight 700, monospace, color = severity color, formatted with ₹ symbol and locale formatting
- **Dominant Funnel Label**: 11px, weight 500, color `#666666`, uppercase
- **Dominant Funnel Value**: 13px, weight 700, monospace, color `#ff6b35`, uppercase

---

### 5.3 CampaignCard Component

Horizontal card displaying individual campaign metrics.

**Layout**:
- Grid columns: `1fr 70px 70px 70px 60px`
- Flex alignment: items-center
- Gap: 12px

**Styling**:
- Padding: 14px 16px
- Border: 1px solid `#e5e5e7`
- Border Radius: 10px
- Background: `#ffffff` (default), `#f9f9fb` (hover)

**Hover States**:
- Background: `#f9f9fb`
- Border color: `#ff6b3530` (orange with transparency)
- Box shadow: `0 2px 8px rgba(0,0,0,0.08)`
- Cursor becomes pointer
- Transition: all 0.2s ease

**Content**:
- **Campaign Name + Geo** (column 1):
  - Name: 13px, weight 600, color `#1d1d1f`
  - Geo: 11px, weight 400, color `#999999`
  - Ellipsis for overflow text
- **Spend** (column 2):
  - Label: 11px, weight 500, color `#666666`
  - Value: 12px, weight 600, monospace, color `#1d1d1f`, formatted as "₹Xk"
- **CPL** (column 3):
  - Label: 11px, weight 500, color `#666666`
  - Value: 12px, weight 600, monospace, color `#1d1d1f`, formatted as "₹X"
- **CMA** (column 4):
  - Label: 11px, weight 500, color `#666666`
  - Value: 12px, weight 600, monospace, color `#ff6b35`
- **Severity Badge** (column 5):
  - Compact variant, centered

---

### 5.4 FunnelColumn Component

Vertical column showing funnel metrics and associated campaigns.

**Header Card**:
- Padding: 16px
- Border Radius: 12px
- Border Left: 4px solid (severity color)
- Background: Funnel-specific light color
- Border: 1px solid (severity color at 30% opacity)

**Content**:
- **Funnel Name**: 11px, weight 600, uppercase, letter-spacing 0.5px, color `#666666`
- **CMA Value**: 16px, weight 700, monospace, color = severity color, locale-formatted with ₹ symbol
- **Label**: 11px, weight 500, color `#666666`, text "avg Cost per Appointment"

**Campaign List**:
- Flex column with 10px gap
- If empty: centered "No campaigns" message (12px, color `#999999`, background `#f9f9fb`)

---

### 5.5 EventFeed Component (Live Feed Section)

Displays KPI metrics, health issues, and recent allocations.

**KPI Cards Section**:
- Grid: 4 columns, equal width
- Gap: 12px
- Each card shows:
  - Label: 11px, weight 500, color `#666666`
  - Value: 20px, weight 700, monospace, color `#1d1d1f`
  - Change indicator: small percentage with color (green for positive, red for negative)

**Health Issues Section**:
- Title: 16px, weight 700
- Cards list with severity coloring
- Each issue card shows:
  - Title: 13px, weight 600
  - Description: 12px, weight 400, color `#666666`
  - Severity badge (compact, right-aligned)

**Recent Allocations Section**:
- Title: 16px, weight 700
- Timeline or list view
- Each allocation shows:
  - Campaign name and funnel
  - Allocation amount (monospace, color `#ff6b35`)
  - Timestamp

---

## 6. Page Layouts

### 6.1 Live Feed Page (/)

**Structure**:
```
[Sidebar] | [Main Content]
          ├─ Header with page title
          ├─ Info banner (if applicable)
          ├─ Event Feed (KPI cards, health issues, allocations)
```

**Content Area**:
- Top padding: 32px
- Horizontal padding: 24px
- Max content width: 1400px (recommended)

**Section Spacing**:
- Between major sections: 32px
- Within sections: 24px

---

### 6.2 Funnel Health Page (/funnels)

**Structure**:
```
[Sidebar] | [Main Content]
          ├─ Header: "Funnel Health"
          ├─ 4-column grid (SELL, BUY, FINANCE, SERVICES)
          │  └─ Each column: FunnelColumn with campaigns
```

**Grid Specifications**:
- Columns: 4 equal columns
- Gap: 24px
- Min-height per column: 600px (to prevent squishing)
- Responsive: Stack to 2 columns on tablets, 1 on mobile

**Column Height**:
- All columns align to same height
- Achieved with `display: grid; grid-auto-rows: 1fr` on container

---

### 6.3 Geographic Performance Page (/geo)

**Structure**:
```
[Sidebar] | [Main Content]
          ├─ Header: "Geographic Performance"
          ├─ Section: India (major cities)
          │  └─ Grid of GeoCards
          ├─ Section: International (if applicable)
          │  └─ Grid of GeoCards
```

**Section Specifications**:
- Section header: 16px, weight 700, margin-bottom 16px
- Grid: Responsive (4 columns on desktop, 2 on tablet, 1 on mobile)
- Gap: 12px
- Card aspect ratio: auto (height determined by content)

---

## 7. Interactive States & Animations

### Hover States
- **Cards**: 
  - Background color shift (to severity/funnel color at light opacity)
  - Border color increase opacity
  - Box shadow elevation (subtle to prominent)
  - Transform: translateY(-2px) for subtle lift
  - Transition duration: 0.2s ease
  - Cursor: pointer

- **Buttons/Badges**:
  - Color intensity increases
  - Shadow or background shift
  - Transition duration: 0.15s ease

### Focus States
- **Keyboard navigation**: 2px outline in primary accent color (`#ff6b35`)
- **Outline offset**: 2px

### Active States
- **Selected cards**: Maintained shadow elevation + color shift

### Disabled States
- **Color**: `#cccccc` (gray out)
- **Opacity**: 0.5
- **Cursor**: not-allowed

### Loading States
- **Skeleton loaders**: Use lighter shade of background (`#f5f5f5`)
- **Pulse animation**: Opacity 0.5 → 1 → 0.5 (1.5s loop)

### Animations
- **Page transitions**: Fade in over 0.3s
- **List item entrance**: Stagger by 0.05s per item
- **Badge pulse**: 2s loop (defined per severity level)

---

## 8. Responsive Design

### Breakpoints
- **Mobile**: 0px - 640px
- **Tablet**: 641px - 1024px
- **Desktop**: 1025px+

### Sidebar Behavior
- **Desktop**: Always visible, 240px width
- **Tablet**: Collapsible, slide-out from left
- **Mobile**: Hidden by default, accessible via menu button

### Grid Adjustments
- **Funnel Health** (4 columns → 2 → 1)
- **Geo Cards** (4 columns → 2 → 1)
- **KPI Cards** (4 columns → 2 → 1)

### Padding Adjustments
- **Desktop**: 24px horizontal, 32px vertical
- **Tablet**: 16px horizontal, 24px vertical
- **Mobile**: 12px horizontal, 16px vertical

---

## 9. Color Accessibility

### Contrast Ratios
- **Text on backgrounds**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Severity colors**: Meet WCAG AA standards
- **Hover states**: Maintain sufficient contrast

### Color Blindness Considerations
- **Severity indicators**: Use both color AND shape/icon (dot indicator in badges)
- **Charts/graphs**: Use colorblind-safe palettes

---

## 10. Interactions & User Flows

### Campaign Selection
- Click on CampaignCard → Navigate to campaign detail view (or open modal)
- Highlight: Selected card maintains elevated shadow
- Related data updates: Associated metrics refresh

### Funnel Navigation
- Click on FunnelColumn header → Filter dashboard to show only that funnel
- Visual indicator: Active funnel column has brighter border

### Geo Navigation
- Click on GeoCard → Navigate to city detail view
- Breadcrumb shows current selection

### Live Feed Updates
- EventFeed polls for updates every 5 seconds
- New items appear with slide-in animation
- Severity badges pulse if critical alerts exist

---

## 11. Design Implementation Notes

### CSS Architecture
- Use CSS-in-JS (inline styles) for component-level styling
- Define color and spacing constants as objects at module level
- Use `transition` for all interactive state changes
- Avoid hard-coded pixels for spacing; use spacing scale

### Performance Considerations
- Lazy-load images and cards as they scroll into view
- Use CSS transforms for animations (prefer `transform` over `left`/`top`)
- Minimize repaints: Use `will-change: transform` for animated elements

### Typography Loading
- Import Satoshi from Google Fonts or self-host
- Fallback to system fonts if custom font fails
- Load IBM Plex Mono for numeric displays

---

## 12. Dark Mode (Future Consideration)

If dark mode is implemented in the future, apply these color mappings:
- Background: `#1d1d1f` (inverse of current text)
- Text Primary: `#ffffff`
- Text Secondary: `#b3b3b3`
- Card Background: `#2d2d2f`
- Borders: `#444444`
- Severity colors: Lighter variants (same hue, higher brightness)

---

## Summary

This design system creates a modern, professional growth operations dashboard with:
- **Clear visual hierarchy** through typography and spacing
- **Severity-driven color coding** for instant pattern recognition
- **Consistent interaction patterns** across all components
- **Flexible layout system** that adapts to content and screen sizes
- **Professional aesthetic** that builds user confidence in data accuracy

The dashboard prioritizes information density while maintaining readability, using Satoshi typography and a refined light color palette inspired by modern SaaS products.
