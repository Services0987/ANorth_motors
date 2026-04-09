# AutoNorth Motors — PRD

## Original Problem Statement
Build a highly powerful, automated lead and deal generation platform for vehicle dealerships. Requirements:
- Single/multi-page website to list cars
- Track user intent/visits, capture leads, message them
- Ultra-premium, luxurious UI (dark theme #050505, gold accents #D4AF37, 3D effects/animations)
- Intelligent AI chatbot to converse with visitors and book test drives
- Top-tier SEO setup
- Easy-to-use admin panel with CSV upload for inventory
- Remove "Made with Emergent" branding
- First-person viewpoint 3D effects like gaming websites
- Fonts large enough to read

## Architecture
- **Frontend**: React 18, Tailwind CSS, Framer Motion, react-parallax-tilt, react-helmet-async
- **Backend**: FastAPI + Motor (async MongoDB), emergentintegrations for AI chatbot
- **Database**: MongoDB (motor async driver)
- **AI**: emergentintegrations SDK (Emergent LLM key) for AI chatbot

## File Structure
```
/app/
├── backend/
│   ├── .env              (MONGO_URL, DB_NAME, EMERGENT_LLM_KEY)
│   ├── requirements.txt
│   └── server.py         (FastAPI routes: vehicles, leads, auth, chat, CSV import)
└── frontend/
    ├── .env              (REACT_APP_BACKEND_URL)
    ├── src/
    │   ├── App.js          (Routes, ScrollToTop, global ChatBot)
    │   ├── index.css       (Premium CSS: glass-card, btn-gold, 3D utilities)
    │   ├── components/
    │   │   ├── ChatBot.js        (AI chatbot panel, emergentintegrations)
    │   │   ├── Navbar.js
    │   │   ├── Footer.js
    │   │   ├── VehicleCard.js    (Framer Motion 3D mouse-tracking card)
    │   │   ├── ExitIntentPopup.js
    │   │   └── ProtectedRoute.js
    │   └── pages/
    │       ├── Home.js           (Hero, Featured, 3D Showroom section)
    │       ├── Inventory.js      (Grid + filters)
    │       ├── VehicleDetail.js  (3D gallery, SEO schema, lead capture)
    │       ├── Financing.js      (Calculator + pre-approval form)
    │       ├── Contact.js        (Contact form)
    │       ├── AdminLogin.js
    │       ├── AdminDashboard.js
    │       ├── AdminInventory.js (CSV upload)
    │       └── AdminLeads.js
```

## DB Schema
- **vehicles**: {make, model, year, price, mileage, image, status, description, features, condition, body_type, fuel_type, transmission, images[], featured}
- **leads**: {name, email, phone, vehicle_id, status, notes, source, intent_data, lead_type}
- **users**: {email, password_hash, name, role}

## API Endpoints
- `POST /api/auth/login` — Cookie-based auth
- `GET /api/vehicles` — List with filters
- `GET /api/vehicles/{id}` — Single vehicle
- `POST /api/vehicles` — Create (admin)
- `POST /api/vehicles/import` — Bulk CSV import (admin)
- `GET /api/vehicles/template/csv` — Download CSV template
- `POST /api/leads` — Create lead
- `GET /api/leads` — List leads (admin)
- `POST /api/chat` — AI chatbot via emergentintegrations

## What's Implemented (as of 2026-04-09)
- ✅ Full vehicle listing + filtering + search
- ✅ Vehicle detail page with 3D interactive gallery (mouse-tracking rotation)
- ✅ AI Chatbot using emergentintegrations (Gemini) for test-drive bookings
- ✅ ChatBot global (injected in App.js), no overlap with send button
- ✅ Admin panel: Login, Dashboard, Inventory CRUD, CSV Import, Leads management
- ✅ Lead capture forms (Contact, Test Drive, Financing pre-approval)
- ✅ Financing payment calculator with sliders
- ✅ Exit intent popup for lead conversion
- ✅ SEO: react-helmet-async on all pages, structured JSON-LD schema on VehicleDetail
- ✅ Framer Motion 3D card effect (mouse-tracking parallax) on VehicleCard
- ✅ 3D Showroom Experience section on Home page
- ✅ ScrollToTop on route navigation
- ✅ Made with Emergent badge hidden
- ✅ Premium typography (Outfit + Manrope), larger fonts for readability
- ✅ Dark theme (#050505) with gold (#D4AF37) accents throughout

## Backlog / Upcoming Tasks
- P1: Add real car images from Unsplash/Pexels API for seeded vehicles
- P1: Enhanced hero section with parallax driving effect
- P1: Add more vehicle categories to inventory seeding (expand from 8 to 20+)
- P2: Google Maps embed on Contact page
- P2: WhatsApp/SMS integration for instant lead notification
- P2: Vehicle comparison feature
- P2: Test drive calendar booking integration
- P2: Email notification when new lead is created (Resend/SendGrid)
- P3: Analytics dashboard (page views, conversion rates)
- P3: Vehicle 360-degree viewer (when 3D models available)
- P3: Vehicle loan comparison with multiple lenders
