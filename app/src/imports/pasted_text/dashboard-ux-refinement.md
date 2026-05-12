You are working on the existing AgroEye web dashboard project.

Do NOT redesign the entire app.
Do NOT create a landing page.
Focus only on improving dashboard UX, layout behavior, interactivity, navigation polish, and fixing broken functionality.

The current dashboard structure is already good.
Your task is to refine it into a polished production-level SaaS experience.

---

# Main Goals

1. Fix broken interactions
2. Improve usability and UX flow
3. Make the dashboard feel modern and alive
4. Improve navigation behavior
5. Improve dashboard workspace efficiency
6. Match the mobile-first AgroEye ecosystem
7. Make the UI feel premium and smooth

---

# Critical Fixes Required

## Notifications Panel

Currently notifications do not open correctly when clicked.

Fix the entire notifications interaction system:

- Notification bell must open a dropdown/panel
- Show unread badge counter
- Clicking a notification navigates to the related section
- Notifications must support:
  - alert
  - warning
  - info
- Add:
  - mark as read
  - mark all as read
  - notification timestamps
  - empty state
- Notifications panel should feel modern and animated
- Use smooth transitions and proper layering/z-index

The UI should resemble a professional SaaS notifications center.

---

# Sidebar Improvements

## Collapsible Sidebar

The left sidebar MUST become collapsible.

Add:

- Collapse/expand button at the top-left
- Smooth animation
- Persist sidebar state in local storage
- Collapsed mode should show:
  - icons only
  - hover tooltips
- Expanded mode should show:
  - icons + labels

The collapse behavior should significantly increase dashboard workspace width.

---

# Profile Placement

Move the user account/profile section to the BOTTOM LEFT of the sidebar.

It should include:

- User avatar
- Username
- User role
- Settings shortcut
- Logout button

In collapsed sidebar mode:
- Show avatar only
- Show floating profile popup on hover

This should behave similarly to modern SaaS dashboards like:
- Notion
- Linear
- Vercel
- Supabase

---

# Dashboard UX Improvements

The dashboard still feels static.

Improve the overall experience:

## Add Micro Interactions

- Hover animations
- Smooth transitions
- Animated charts
- Card hover elevation
- Status pulse indicators
- Skeleton loaders
- Animated counters
- Live refresh indicators

---

# Improve Layout System

The dashboard should adapt better to:

- Desktop
- Large monitors
- Tablets
- Smaller laptops

Use responsive grid systems instead of fixed spacing.

---

# Greenhouse Selector Redesign

The current greenhouse/farm selector is weak.

Replace it with a better UX system:

## Requirements

- Modern dropdown selector
- Search farms
- Farm quick switcher
- Recently viewed farms
- Farm status indicator
- Farm cards inside selector
- Smooth transitions

Each farm should display:

- Farm name
- Location
- Active devices
- Alert count
- Last activity

Support multiple farms per user.

---

# AgroEye Mobile-First System Rules

This is VERY IMPORTANT.

AgroEye is fundamentally a MOBILE-FIRST IoT system.

The web dashboard is NOT responsible for initial hardware provisioning.

Reflect this clearly in UI/UX and user flows.

---

# Device Management Rules

Users CANNOT:

- provision new ESP32 devices from web
- perform BLE setup from web
- configure first-time hardware pairing from web

Those actions belong ONLY to the mobile app.

The web dashboard can ONLY:

- view existing devices
- rename devices
- move devices between fields/farms
- reassign devices
- view device analytics
- monitor health/status
- archive devices

---

# Add Mobile-App Dependency UX

Inside onboarding and device pages:

Clearly explain:

“New AgroEye devices must first be configured using the AgroEye mobile application before they appear inside the web dashboard.”

Add:

- Mobile app callout cards
- Sync indicators
- Device sync status
- “Configured from mobile” labels

---

# Settings Improvements

The settings page currently feels incomplete.

Expand it into a real SaaS settings experience.

---

# Settings Sections Required

## Profile Settings

- Profile image
- Username
- Email
- Phone
- Password change
- Role display

---

## Appearance Settings

- Dark mode
- Light mode
- System mode
- Accent color presets
- Compact mode toggle
- Reduced motion toggle

Dark mode must feel premium:
- soft blacks
- proper contrast
- readable charts
- glassmorphism support

---

## Notification Settings

- Email alerts
- Push notifications UI
- Alert thresholds
- Warning sensitivity
- Notification grouping

---

## Device Preferences

- Default greenhouse
- Auto-refresh interval
- Dashboard refresh behavior
- Sensor display preferences

---

## AI Assistant Settings

- Chat history controls
- AI memory toggle
- Suggested prompts
- Context sharing permissions

---

# AI Assistant Improvements

The AgroAssist panel should feel much smarter.

Improve:

- conversation layout
- chat history sidebar
- timestamps
- typing animations
- markdown rendering
- suggestion chips
- contextual farm awareness

Add:

- “Ask about this greenhouse” quick actions
- “Analyze latest readings”
- “Explain alert”
- “Generate irrigation recommendation”

---

# Dashboard Data Alignment

The dashboard MUST visually align with the real AgroEye database structure.

Your UI architecture should reflect:

User
→ Farms
→ Fields
→ Devices
→ Sensing Nodes
→ Sensor Logs
→ AI Results
→ Notifications
→ Irrigation Events

Do NOT create fake generic SaaS cards disconnected from the real schema.

---

# Data Visualization Requirements

Improve charts dramatically.

Add:

- daily / weekly / monthly toggles
- zoomable charts
- comparison mode
- multi-greenhouse comparison
- live trend graphs
- historical playback
- sensor filtering
- anomaly highlighting

Charts should support:

- temperature_air
- humidity_air
- co2
- soil_moisture
- soil_ph
- nitrogen
- phosphorus
- potassium
- conductivity
- battery_level
- signal_strength

---

# Device Status Visualization

Improve device/system monitoring UX.

Display:

- online/offline states
- low battery nodes
- maintenance devices
- weak signal indicators
- last seen timestamps
- firmware status
- node activity heatmaps

---

# Onboarding Improvements

Replace generic onboarding.

Create a SHORT premium onboarding flow focused on:

1. AgroEye ecosystem overview
2. Mobile app dependency explanation
3. Multi-greenhouse monitoring
4. AI assistant features
5. Sensor analytics overview

The onboarding should be:
- minimal
- modern
- animated
- skippable
- fast

No marketing fluff.

---

# UI Style Direction

Use a clean premium SaaS style inspired by:

- Vercel
- Linear
- Raycast
- Notion
- Supabase
- Framer

But adapted to agriculture + IoT.

Use:
- layered cards
- soft shadows
- modern spacing
- smooth transitions
- premium typography
- clean charts
- glassmorphism carefully
- subtle gradients

Avoid:
- overly colorful UI
- giant paddings
- cluttered layouts
- generic admin templates

---

# Technical Requirements

- Keep existing architecture
- Improve existing components instead of rebuilding everything
- Maintain responsive design
- Keep Tailwind CSS
- Keep React component structure scalable
- Ensure all buttons and interactions actually work
- Add proper loading states
- Add empty states
- Add error states
- Add hover states
- Add transition consistency

---

# Final Goal

The result should feel like a real modern IoT agriculture operating system dashboard — not a basic admin panel.

The dashboard should feel:
- alive
- interactive
- spacious
- smooth
- intelligent
- data-driven
- easy to use
- optimized for real farmers and greenhouse operators