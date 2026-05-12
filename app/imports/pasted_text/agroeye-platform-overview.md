You are a senior product designer, UX architect, and full-stack SaaS engineer.

Your task is to build a COMPLETE production-grade smart agriculture platform called “AgroEye”.

This is NOT a simple dashboard UI project.
This should feel like a real modern agriculture operating system.

You are building the WEB PLATFORM from scratch while respecting the fact that AgroEye is fundamentally a MOBILE-FIRST IoT ecosystem.

The final result must feel like:

* a premium SaaS platform
* a modern observability dashboard
* an AI-powered agriculture command center
* a real enterprise IoT monitoring system

The quality level should be comparable to:

* Linear
* Vercel
* Notion
* Arc Browser
* modern DevOps dashboards
* modern observability platforms
* premium AI SaaS products

==================================================
CORE PRODUCT IDENTITY
=====================

AgroEye is an AI-powered smart agriculture platform that combines:

* IoT greenhouse monitoring
* ESP32/ESP32-CAM devices
* environmental sensing
* AI disease detection
* irrigation analytics
* AI farming assistant
* farm/device management
* realtime agriculture analytics

The system already exists as a MOBILE APPLICATION.

The web platform is an EXTENSION of the existing ecosystem.

==================================================
VERY IMPORTANT PRODUCT RULE
===========================

AgroEye is MOBILE-FIRST.

The mobile app is responsible for:

* BLE provisioning
* first-time device setup
* WiFi onboarding
* ESP32 pairing
* physical device configuration

The WEB DASHBOARD is responsible for:

* monitoring
* analytics
* management
* reporting
* AI assistance
* visualization
* organization-level control

The web app MUST reflect this architecture clearly.

DO NOT create misleading UX where users can fully provision new hardware from the web dashboard.

Instead:

* explain provisioning workflow
* guide users toward mobile setup
* allow management only for already-registered devices

==================================================
REAL DATABASE ARCHITECTURE
==========================

The entire dashboard architecture MUST be built around this REAL hierarchy:

User
└── Farms
└── Fields
└── Devices
└── SensingNodes
└── SensorReadings / SensorLog

Additional systems:

* AIResults
* Images
* Notifications
* IrrigationEvents
* ChatbotSessions
* ChatMessages

The UI, navigation, charts, analytics, and relationships MUST reflect this structure naturally.

==================================================
DATABASE-DRIVEN UX
==================

Do NOT create random generic SaaS cards.

The interface must feel connected to:

* actual entities
* actual relationships
* actual sensor data
* actual workflows

Everything should feel operational and intelligent.

==================================================
TECH STACK
==========

Build using:

* React
* Tailwind CSS
* TypeScript
* Modern component architecture

Recommended:

* shadcn/ui
* Framer Motion
* Recharts
* React Query
* Zustand or Context API
* React Router

Use scalable architecture.

==================================================
DESIGN LANGUAGE
===============

The design should feel:

* premium
* futuristic
* agricultural
* calm
* intelligent
* clean
* highly interactive
* data-driven
* responsive
* immersive

Avoid:

* generic admin templates
* crowded layouts
* flat boring cards
* outdated UI
* bootstrap-looking dashboards

Use:

* soft shadows
* glassmorphism carefully
* modern spacing
* elegant typography
* layered UI depth
* subtle animations
* smooth transitions
* responsive interactions

Color direction:

* agriculture-inspired greens
* subtle blues
* neutral dark surfaces
* calm backgrounds

==================================================
LANDING PAGE
============

Build a premium landing page containing:

* hero section
* animated agriculture visuals
* AI platform showcase
* IoT monitoring showcase
* realtime analytics previews
* mobile app integration section
* feature breakdowns
* testimonials
* pricing section
* CTA sections
* footer

The landing page should transition naturally into the dashboard experience.

==================================================
AUTHENTICATION SYSTEM
=====================

Build:

* Login
* Signup
* Forgot Password
* Session persistence
* Protected routes
* Role-based access
* Auth loading states
* Smooth auth transitions

Roles:

* Farmer
* Technician
* Admin

==================================================
ONBOARDING EXPERIENCE
=====================

Build an INTERACTIVE onboarding flow.

It should explain:

1. AgroEye ecosystem
2. Mobile-first provisioning
3. BLE setup process
4. Device registration flow
5. Farm hierarchy
6. AI assistant
7. Analytics system
8. Notifications
9. Device monitoring
10. Reports system

The onboarding should feel:

* guided
* animated
* modern
* educational
* lightweight
* premium

==================================================
MAIN DASHBOARD EXPERIENCE
=========================

The dashboard must feel like a REAL command center.

==================================================
LAYOUT REQUIREMENTS
===================

Build:

* collapsible sidebar
* floating topbar
* command palette
* smart search
* notifications center
* profile menu
* global time filters
* responsive mobile layout
* keyboard-friendly navigation

Sidebar:

* smooth animations
* icon-only mode
* persistent collapse state
* elegant hover states

Topbar:

* greenhouse switcher
* dark/light toggle
* notifications
* AI quick actions
* realtime sync status

==================================================
MULTI-GREENHOUSE EXPERIENCE
===========================

Users can own multiple farms/greenhouses.

The greenhouse selector should:

* feel modern
* searchable
* visually rich
* show quick stats
* support favorites
* support recent farms

Switching farms should dynamically update:

* analytics
* charts
* devices
* alerts
* irrigation
* AI context

==================================================
GLOBAL FILTER SYSTEM
====================

Create centralized filters:

* Today
* 24 Hours
* Weekly
* Monthly
* Quarterly
* Yearly
* Custom Range

All analytics and charts should react dynamically.

==================================================
OVERVIEW PAGE
=============

Build a powerful realtime command center.

Include:

1. KPI Cards

* Total Farms
* Total Fields
* Active Devices
* Offline Devices
* Active Nodes
* Low Battery Nodes
* Alerts Today
* Irrigation Events
* AI Detections

2. Realtime Sensor Grid
   Display:

* Air Temperature
* Air Humidity
* Soil Temperature
* Soil Moisture
* Soil pH
* NPK
* CO2
* Conductivity
* Light Intensity

3. Live Trend Charts
   Interactive:

* hourly
* daily
* weekly
* monthly

4. Device Health Visualization
   Show:

* active
* inactive
* low battery
* offline
* maintenance

5. Irrigation Timeline

6. AI Detection Summary

7. Recent Alerts Feed

8. Weather Widget

9. Farm Activity Feed

==================================================
ANALYTICS PAGE
==============

This page should feel enterprise-grade.

Features:

* advanced charts
* multi-metric comparison
* farm comparison
* field comparison
* anomaly detection
* sensor correlations
* trend forecasting
* heatmaps
* historical replay mode
* irrigation efficiency analytics
* crop performance insights

Add:

* export CSV
* export PDF
* share reports

==================================================
DEVICE MANAGEMENT PAGE
======================

This page must reflect REAL AgroEye workflow.

Display:

* devices
* sensing nodes
* firmware versions
* signal strength
* battery levels
* calibration state
* last seen
* health state

VERY IMPORTANT:
Do NOT allow fake full provisioning from web.

Instead:

* explain provisioning via mobile app
* explain BLE dependency
* explain device setup flow

Allow:

* rename devices
* move devices
* reassign fields
* archive devices
* maintenance mode

==================================================
AI ASSISTANT PAGE
=================

Build a premium AI copilot experience.

Inspired by:

* ChatGPT
* Perplexity
* Notion AI

Features:

* persistent conversations
* session history
* markdown rendering
* attachments
* contextual recommendations
* farm-aware memory
* AI suggestions
* smart prompts
* search conversations
* recent activity context

The assistant should feel deeply integrated into AgroEye.

==================================================
SCAN & AI ANALYSIS PAGE
=======================

Use:

* AIResults
* Images

Build:

* scan gallery
* disease analytics
* confidence charts
* image preview
* AI recommendations
* scan timeline
* filtering system
* comparison mode

==================================================
NOTIFICATIONS CENTER
====================

Build:

* realtime notifications
* grouped alerts
* warnings/info categories
* filtering
* read/unread states
* bulk actions
* activity timeline

==================================================
REPORTS SYSTEM
==============

Build:

* dynamic report generation
* export tools
* scheduled reports
* visual summaries
* printable layouts

==================================================
SETTINGS EXPERIENCE
===================

Build:

* account settings
* organization settings
* farm settings
* theme settings
* notification preferences
* device preferences
* AI preferences
* security settings

==================================================
DARK/LIGHT MODE
===============

Both themes must feel intentionally designed.

Dark mode:

* premium
* soft contrast
* modern surfaces
* readable charts
* elegant depth

Light mode:

* calm
* airy
* highly readable
* not overly white

==================================================
INTERACTIONS & MICRO-UX
=======================

Add:

* skeleton loaders
* animated counters
* hover states
* smooth transitions
* realtime feeling updates
* expandable cards
* command interactions
* empty states
* onboarding hints
* intelligent tooltips

==================================================
RESPONSIVENESS
==============

The system must work beautifully on:

* desktop
* tablets
* laptops
* ultrawide screens
* mobile responsive layouts

==================================================
IMPORTANT UX REQUIREMENTS
=========================

The platform should NEVER feel:

* like a template
* generic
* fake
* static
* disconnected from data
* visually dead

The experience should feel:

* alive
* intelligent
* operational
* premium
* production-grade
* cohesive
* deeply integrated

==================================================
FINAL GOAL
==========

Build AgroEye as a REAL smart agriculture operating system that combines:

* AI
* IoT
* analytics
* monitoring
* farm management
* realtime observability
* agriculture intelligence

This should feel like a startup-ready production SaaS platform, not a frontend concept demo.
