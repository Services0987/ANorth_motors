# AutoNorth Motors — PRD

## Original Problem Statement
Build a world-class automotive dealership website that:
- Acts as a powerful lead generation machine for a Canadian vehicle dealer (Edmonton, AB)
- Has mind-blowing, cinematic, luxury-level UI with stunning animations
- Allows inventory management from an admin dashboard
- Captures leads via multiple touchpoints (exit intent, vehicle detail forms, financing, contact)
- Provides vehicle inventory browsing with advanced filters
- Is SEO-optimized to rank for local automotive searches

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Framer Motion (dark luxury theme, gold accent #D4AF37)
- **Backend**: FastAPI (Python) with JWT auth
- **Database**: MongoDB via Motor (async)
- **Fonts**: Outfit (headings) + Manrope (body) from Google Fonts
- **Animations**: Framer Motion (page transitions, scroll reveals, hover effects)

## Brand
- **Name**: AutoNorth Motors
- **Location**: Edmonton, Alberta, Canada
- **Phone**: 780-555-0100
- **Email**: info@autonorth.ca
- **Admin**: admin@autonorth.ca

## What's Been Implemented (v1.0 — April 2026)

### Public Website
- **Homepage** — Cinematic hero, stats bar, featured vehicles grid, browse by category, why choose us, testimonials, inline lead form, WhatsApp float button
- **Inventory Page** — Full vehicle grid with real-time filters (condition, make, body type, fuel type, price range, search)
- **Vehicle Detail Page** — Image gallery with thumbnails, spec table, features list, 3-tab lead form (Contact / Test Drive / Financing)
- **Financing Page** — Interactive payment calculator with sliders + pre-approval form
- **Contact Page** — Showroom image, contact form, address/hours/phone/email
- **Exit Intent Popup** — Auto-triggers after 15 seconds + mouse leave, captures name/email/phone, one-show per session
- **Navbar** — Sticky, blur, gold logo, mobile menu
- **Footer** — Links, social icons, contact info, hours

### Admin Portal (/admin)
- **Admin Login** — Secure JWT cookie auth
- **Dashboard** — 6 stat cards (total vehicles, available, sold, featured, total leads, new leads), quick actions, recent leads table
- **Inventory Manager** — Full CRUD: add/edit/delete vehicles, toggle featured, update status (available/sold/pending), image URL management with thumbnails, feature tag system
- **Leads Manager** — Lead table with search + filters, status updates (new/contacted/qualified/closed), detail panel with email/call links, delete

### Backend API
- `POST /api/auth/login` — JWT cookie auth
- `GET /api/auth/me` — Session check
- `GET /api/vehicles` — Filter by condition, make, body_type, fuel_type, price, year, status, featured, search
- `GET /api/vehicles/{id}` — Single vehicle
- `POST/PUT/DELETE /api/vehicles` — Admin CRUD
- `POST /api/leads` — Public lead submission
- `GET/PUT/DELETE /api/leads` — Admin lead management
- `GET /api/stats` — Dashboard statistics

### Lead Capture Strategy (Built-in)
1. Exit intent popup (15s delay + mouseleave)
2. Vehicle detail page 3-tab lead forms
3. Homepage inline lead form
4. Financing pre-approval form
5. Contact page form
6. WhatsApp direct link

### SEO Features
- Proper meta tags (title, description, robots, OG)
- Outfit/Manrope fonts
- Fast loading images from CDN
- Semantic HTML structure

### Sample Data
- 8 seeded Ford vehicles (F-150, Explorer ST, Mustang GT, Escape PHEV, Maverick, Bronco Sport, Ranger, Expedition MAX)

## Prioritized Backlog

### P0 (Critical Next Steps)
- [ ] Real vehicle photos upload (currently URL-based, add S3/object storage)
- [ ] Email notifications when new lead submitted (SendGrid/Resend integration)
- [ ] Google Analytics 4 pixel installation in index.html
- [ ] Facebook Pixel installation for retargeting

### P1 (High Value)
- [ ] SMS/WhatsApp auto-reply to new leads (Twilio)
- [ ] Vehicle schema.org markup for Google rich snippets
- [ ] Google Business Profile connection guide
- [ ] Trade-in value estimator
- [ ] Inventory import from CSV/spreadsheet
- [ ] Lead notes field in admin

### P2 (Nice to Have)
- [ ] 360-degree vehicle view
- [ ] Vehicle comparison tool
- [ ] Customer review/testimonial submission
- [ ] Financing calculator shareable link
- [ ] Admin analytics charts
- [ ] Dark/light mode toggle
