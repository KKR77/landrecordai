# RakshaSetu — Complete Master Knowledge Base & Context Dossier
**Smart India Hackathon (SIH) 2026 | Problem Statement ID: SIH26206**
**Team Name:** ResQNova | **Theme:** Disaster Management | **PS Category:** Software (Student Innovation)

---

## Executive Summary & Core Philosophy

**RakshaSetu** ("Bridge of Protection") is an AI-powered, multilingual, network-resilient, offline-first Disaster Response Progressive Web App (PWA) designed to bridge the **Last-Mile Emergency Communication Gap** during catastrophic floods and natural disasters (grounded in North Bihar's hydrological reality).

### The Fundamental Thesis
1. **The Forecast Exists — Delivery Fails:** Forecasting systems (IMD, CWC, ISRO, C-FLOOD) generate accurate early warnings. The failure occurs at the *last mile* when cellular towers and power grids collapse, leaving citizens in a complete digital blackout before alerts reach their phones.
2. **Zero-Decision Emergency Mode:** Under acute panic, fear, and cognitive narrowing, users cannot navigate complex menus. All configurations (language, emergency contacts, offline regional packages) occur *pre-disaster*. During a disaster, the user performs **exactly one action (1-Tap SOS)**; all fallback mechanisms (SMS outbox preparation, data compression, priority flagging) are completely automated.
3. **Radical Engineering Honesty:** Features are strictly categorized into **MVP (Built & Working)**, **Stretch (Heuristics)**, and **Roadmap (Conceptual/Hardware/Gov Dependent)**. Real-world physical limitations (e.g., Bluetooth mesh packet loss, total RF blackout, transboundary GLOFs) are explicitly documented rather than overclaimed.
4. **Zero Paid API Stack:** Built 100% on public Indian Digital Public Infrastructure (DPI) and open-source stacks (India-WRIS, IMD, Bhashini, NDMA, ISRO Bhuvan, Leaflet/OSRM) to guarantee zero recurring platform cost.

---

## 1. Ground Reality & Research Foundation (Bihar & South Asia)

### 1.1 Bihar Hydrological & Geographical Crisis
- **Flood Exposure:** Bihar is India's most flood-prone state; **73% of North Bihar** is chronically flood-prone. Over **1/4th (25%)** of India's total flood-affected population lives here.
- **Annual Human Toll:** ~76 lakh people and ~15 lakh hectares of agricultural land affected annually.
- **Historical Catastrophes:**
  - *2008 Kosi Avulsion (Kushaha Breach):* River breached its eastern embankment, shifted eastward by >100 km, displaced 3.5–4.0 million people, caused 493 official deaths, and deposited massive infertile sand.
  - *2016 Ganga Floods:* Impacted 88.2 lakh people across 12 districts, causing over US$74M in infrastructure damage.
- **Siltation Dynamics:** The Kosi River deposited **1,082 million tonnes of silt over 54 years** (IIT Kanpur research, Sinha et al., 2019). It carries 100–120 million m³/year of sediment, raising riverbeds above surrounding countryside levels. Kosi Barrage discharge capacity has dropped 1–1.5m.
- **The Embankment Paradox:** 3,430 km of embankments built since 1954 have confined sediment-heavy rivers, artificially raising riverbeds and converting natural shallow spills into catastrophic high-velocity embankment breaches.
- **Transboundary Governance Gaps:** All 8 major North Bihar rivers (Kosi, Gandak, Bagmati, Kamla-Balan, Mahananda, Burhi Gandak, Adhwara, Ghaghra) originate in Nepal/Tibet. The proposed 269m Sapta Kosi High Dam (Barahkshetra, Nepal) has been stalled for 35+ years in the DPR stage due to bilateral diplomatic and displacement challenges.

### 1.2 Cross-Country Scientific Findings & Disaster Literature (~60 Peer-Reviewed Sources)
- **The Last-Mile Early Warning Paradox (Dominant Research Finding):**
  - *South Africa (2026):* Accurate meteorological forecasts failed to prevent casualties due to breakdown in last-mile digital dissemination. WhatsApp-based distribution outperformed dedicated native apps due to zero installation barrier.
  - *Super-Typhoon Haiyan (Philippines, 2013):* Accurate warnings failed because technical meteorological jargon (*"storm surge"*) was not understood by local populations.
  - *Bangladesh (CPP Model):* Demonstrates that trained grassroots volunteer networks (human-mediated warning) outperform centralized digital-only broadcasts.
- **Disaster Linguicism (Uekusa, 2019):** Linguistic minorities and non-Hindi/non-English speakers suffer disproportionately during emergencies due to alert language exclusion.
- **Cognitive Narrowing Under Stress (CHI 2026 / Mass Casualty Studies):** Under life-threatening stress, working memory shrinks; multi-step digital workflows experience a >70% abandonment rate. One-tap interfaces and voice interactions are essential.
- **Bluetooth Mesh Reality (Bluemergency, IEEE GHTC 2019):** Real-world post-disaster BLE mesh networks face **up to 38% packet loss** and practical throughput constraints (**11-byte payloads** per hop), proving that pure peer-to-peer mobile mesh cannot be claimed as a reliable real-time voice/data pipe without dedicated relay hubs.

---

## 2. Master System Architecture & Technology Stack

```
                                    ┌─────────────────────────────────────────────────────────┐
                                    │                     CITIZEN PWA                         │
                                    │  (React 18 · TypeScript · Tailwind CSS · ServiceWorker) │
                                    └────────────┬────────────────────────────┬────────────────┘
                                                 │                            │
                     [TIER 1: Live Internet]     │                            │  [TIER 2B: Cellular Blackout]
                                                 ▼                            ▼
                      ┌──────────────────────────────────────┐     ┌────────────────────────────────────┐
                      │          ONLINE CLOUD CORE           │     │       OFFLINE ZERO-DECISION        │
                      ├──────────────────────────────────────┤     ├────────────────────────────────────┤
                      │ • Claude AI Safety Advisory Chat     │     │ • Pre-cached Regional Bundle       │
                      │ • Bhashini Live Speech-to-Speech API │     │   (IndexedDB: Shelters, Guides)    │
                      │ • Live GPS Telemetry Stream          │     │ • Web Speech API (Local Voice)     │
                      │ • Supabase Realtime SOS Ingestion    │     │ • Prepared 1-Tap SMS Outbox        │
                      │ • Dynamic Leaflet + OSRM Routing     │     │ • Offline Cached Leaflet Maps      │
                      └──────────────────┬───────────────────┘     └─────────────────┬──────────────────┘
                                         │                                           │
                                         │ (Sync on Connection)                      │ (Telecom SMS Gateway / EOC)
                                         ▼                                           ▼
                                    ┌─────────────────────────────────────────────────────────┐
                                    │                AUTHORITY EOC DASHBOARD                  │
                                    │  (Supabase RLS · Realtime Queue · Geospatial Dispatch) │
                                    └─────────────────────────────────────────────────────────┘
```

### Complete Technology Stack:
- **Frontend / PWA Core:** React 18, TypeScript, Tailwind CSS, Vite, Service Worker (Workbox / Cache API), IndexedDB (Dexie.js / LocalForage).
- **Backend & Realtime Infrastructure:** Supabase (PostgreSQL 15, Row-Level Security, Realtime WebSockets, Edge Functions, Auth, Storage).
- **AI & Linguistic Intelligence:**
  - *Online Conversational Advisory:* Anthropic Claude API (`claude-sonnet-5` / `claude-haiku-4-5`) with strict system prompts for numbered, actionable survival steps.
  - *Linguistic Processing:* Bhashini API (MeitY, Government of India) providing ASR (Speech Recognition), NMT (Machine Translation across 22+ scheduled Indian languages), and TTS (Text-to-Speech).
  - *Offline Voice:* Native Browser Web Speech API (`SpeechRecognition` & `SpeechSynthesis`).
- **Mapping & Geospatial Routing:** Leaflet.js, OpenStreetMap raster tiles (pre-cached for user's district), Open Source Routing Machine (OSRM) with dynamic hazard-avoidance weighting.
- **Public Government Data Ingestion (Zero Paid APIs):**
  - *India-WRIS (Central Water Commission):* Reservoir water levels, dam discharge data.
  - *IMD (Mausam API):* District-level weather forecasts, heavy rainfall alerts, cyclone tracks.
  - *NDMA & Indian Red Cross:* Standard Operating Procedures (SOPs), validated disaster Do's & Don'ts.
  - *ISRO Bhuvan / NDEM:* Satellite inundation and flood extent vector layers.

---

## 3. Network Resilience Tiers (Graceful Degradation Model)

| Tier | Network Condition | System Behavior & Fallback Mechanism | Status |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Full Internet & Cellular** | Full Claude AI safety chat, live Bhashini 22+ language speech translation, real-time GPS streaming, live OSM shelter routing, instant Supabase SOS dispatch. | **MVP (Built)** |
| **Tier 2A** | **Data Down, Cache Available** | App runs fully offline via Service Worker & IndexedDB. Pre-downloaded 3-language NDMA safety bundle, cached shelter directory, offline leaflet map. | **MVP (Built)** |
| **Tier 2B** | **Cellular Voice/SMS Only** | Zero-Decision SMS fallback. Prepares compressed 140-char payload (`GPS fix + Timestamp + Medical Flag + User ID`). Dispatches via 1-tap native SMS outbox. | **MVP (Built)** |
| **Tier 2C** | **Complete Signal Loss (Single Peer)** | Web Bluetooth API (GATT relay). Device transmits SOS packet to any nearby in-range smartphone. (Android/Chrome). | **Roadmap** |
| **Tier 2D** | **Mesh Cluster (Multi-Peer)** | Opportunistic delay-tolerant network. Clustered packets held locally; the first device encountering connectivity syncs all stored packets. | **Roadmap** |
| **Tier 3** | **Total Regional Blackout** | Uplink to government satellite relay hubs (following ISRO Disaster Warning System DWS-S precedent). | **Roadmap** |
| **Zero-Bal** | **Active Tower, No Talktime/Data** | Integration with National Emergency Response System (112 / ERSS) via toll-free carrier signaling. | **Roadmap** |

---

## 4. Complete Feature Matrix (28 Features Across 4 Tiers)

### 4.1 Minimum Viable Product (MVP — 14 Features Built)
1. **Multilingual Voice & Text Safety Chat:** AI-powered structured safety advice (online Claude + Bhashini), strictly constrained to practical survival guidance.
2. **Zero-Decision SOS + Location Capture:** 1-tap trigger capturing high-accuracy GPS coordinates, battery level, timestamp, and pre-configured emergency metadata.
3. **SMS Outbox Fallback:** Encodes critical rescue packet into ≤140 characters; opens pre-populated native OS SMS client with 1 confirmation tap (complying with Android/iOS security sandboxes).
4. **Offline Regional Data Package:** District-specific lightweight JSON/GIS bundle storing shelter locations, contact numbers, and NDMA guidance in **Hindi + English + 1 local language** (e.g., Maithili, Bhojpuri, Urdu, Bengali).
5. **Interactive Shelter Map:** Leaflet.js map displaying pre-cached safe zones, elevated embankments, relief camps, and primary health centers (PHCs).
6. **Hazard-Aware Safe Route to Shelter:** OSRM-based navigation that dynamically excludes flooded roads, broken bridges, or community-reported hazard zones.
7. **Health Do's/Don'ts & Symptom Guide:** Verified NDMA/Red Cross first-aid and hygiene guides (water purification, snakebite, cholera, dysentery) bundled offline. **Strict patient-safety rule: Zero medical prescriptions or drug dosages.**
8. **"I'm Safe" Broadcast:** 1-tap notification sending verified status, timestamp, and coordinates to family members via SMS/data.
9. **Pre-Blackout Location Heartbeat (Data Path):** Background telemetry logging coordinates every ~10 minutes while connected, caching the last-known position in Supabase before blackout.
10. **Low-Data Location Ping (SMS Path):** Periodic background SMS telemetry for users possessing active talktime balance but no active 4G/5G data pack.
11. **Dam & Weather Risk Digest:** Ingests weekly/daily India-WRIS reservoir levels and IMD rainfall bulletins; compares values against danger levels with manual fallback.
12. **Web Push Emergency Notifications:** Service Worker push notification alerts triggered before forecast storms or dam gate releases.
13. **Flood Extent Reporting & Map:** Crowdsourced flood depth reporting (Ankle / Knee / Waist / Submerged) tagged with photo and GPS coordinates.
14. **Authority Emergency Operations Center (EOC) Dashboard:** Role-based web interface for district disaster management authorities (DDMA/SDRF/NDRF) displaying live SOS queue, cluster heatmaps, and resource demands.

### 4.2 Stretch Features (4 Features)
15. **Nearest-Need-First Dispatch Heuristic:** Geospatial straight-line & road distance sorting from rescue boat/team staging hubs to open SOS beacons.
16. **Live Incident Map:** Consolidated multi-layer map aggregating verified shelters, road cuts, flood extents, and pending rescues.
17. **Historical Risk Scoring:** Heuristic risk index (Low/Medium/High) calculated from historical flood return periods (1987, 2004, 2008, 2016, 2020) per block/panchayat.
18. **Citizen Rebuild Feedback:** Post-disaster damage reporting interface (housing, crop loss, siltation) structured for ISRO National Database for Emergency Management (NDEM) format.

### 4.3 Roadmap Features (10 Features — Explicitly Not Overclaimed)
19. **Real-Time Dam Gate-Release Telemetry:** Direct webhook/API feed from CWC barrage control rooms (requires government MOU).
20. **Dynamic Safe-Zone Broadcasting:** Authority-signed broadcast of temporary shelters (requires Aadhaar/DigiLocker OAuth authority verification to prevent rogue safe zones).
21. **Earthquake Rapid Shake Alert:** Post-event shockwave alerts integrated with National Center for Seismology (NCS) sensors (minutes post-rupture).
22. **Automated Satellite Flood Inundation Pipeline:** Serverless Sentinel-1 SAR / Landsat-9 automated ML inundation processing.
23. **Bluetooth Opportunistic Mesh Relay:** Multi-hop BLE GATT communication stack (acknowledging 38% packet loss from Bluemergency research).
24. **Community Location Snapshot:** Clustered offline peer caching where one connected node flushes neighborhood location queues.
25. **Government Satellite Hub Uplink:** Direct hardware integration with NavIC/INSAT-MSS terminals.
26. **National 112 / ERSS Carrier Integration:** Zero-balance carrier signaling for trapped citizens without cellular balance.
27. **Person-Finder & Missing Registry:** Centralized missing persons database (Google Person Finder architecture; omitted from MVP to protect citizen PII).
28. **Multi-Source Misinformation Verification:** Cross-verification engine reconciling social media rumors against official IMD/CWC/NDMA feeds.

---

## 5. Explicit Engineering Boundaries (What Software Honestly Cannot Solve)

To maintain absolute scientific credibility during SIH evaluation, RakshaSetu explicitly documents its boundaries:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   HONEST SCIENTIFIC BOUNDARIES                                   │
├──────────────────────────────────────────────────┬───────────────────────────────────────────────┤
│ WHAT RAKSHASETU SOLVES                           │ WHAT RAKSHASETU HONESTLY CANNOT SOLVE         │
├──────────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ • Last-mile warning delivery before blackout     │ • Total RF/cellular blackout without relays   │
│ • Zero-decision SOS under acute panic            │ • Glacial Lake Outburst Floods (GLOFs in      │
│ • Overcoming disaster linguicism (22+ languages) │   Tibet/Nepal with <4hr warning windows)     │
│ • Pre-blackout last known location capture       │ • Transboundary political & dam treaties      │
│ • Zero recurring cost using Government DPI       │ • Mathematical vehicle routing optimization   │
│ • Offline shelter navigation & verified guidance │ • Uncontrolled social media rumor velocity    │
│ • Safe first-aid guidance without dosage risk    │ • AI medical diagnosis or dosage prescription │
└──────────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

1. **Total RF Blackout:** If zero devices, towers, or satellite hubs exist within radio range, no digital system on earth can transmit data. RakshaSetu maximizes reach via local caching and store-and-forward hopping, but cannot overcome physics.
2. **Transboundary GLOFs (Glacial Lake Outburst Floods):** Catastrophic bursts (such as Bhutan's Thorthomi Lake with potential peak discharge of 16,360 m³/s within 4 hours, or the 60 high-risk glacial lakes in the Kosi basin located in Tibet/Nepal) require upstream seismic/hydrological sensors across international borders. Software in Bihar cannot predict them without upstream telemetry.
3. **Siltation & Land-Use Governance:** Software cannot dredge the 1,082 million tonnes of Kosi sediment or resolve 35-year diplomatic stalemates over the Sapta Kosi High Dam.
4. **Patient Safety in First Aid:** RakshaSetu strictly excludes AI-generated drug dosages or chemical water treatment prescriptions to prevent fatal poisoning or contraindications during crises.

---

## 6. Slide-by-Slide Presentation Structure (`vik GECM final.pdf`)

- **Slide 1 — Title Slide:**
  - Team: **ResQNova** | Problem Statement ID: **SIH26206** | Theme: **Disaster Management** | Category: **Software (Student Innovation)**.
- **Slide 2 — Proposed Solution & Flowchart Architecture:**
  - *Column 1 (Problem Flowchart):* 5-step cascading failure from accurate IMD/CWC forecast to cellular blackout, language barrier, panic UI, and blind search operations.
  - *Column 2 (Solution Pipeline):* 4-stage engineering lifecycle from pre-cached offline core to 1-tap SOS, multilingual Bhashini voice, and shelter routing.
  - *Column 3 (Differentiator Loop):* 3 Core Pillars: Two-way channel (vs 1-way SACHET), pre-blackout heartbeat capture, and 100% Zero Paid API DPI foundation.
- **Slide 3 — Technical Approach & Emergency Operations:**
  - Citizen PWA offline architecture, Authority EOC dashboard workflow (127.0.0.1:5500), SOS packet structure (≤140 chars), 3-tier network resilience degradation table.
- **Slide 4 — Feasibility, Viability & Risk Mitigation:**
  - Addresses 4 critical risks: Pre-disaster adoption (PWA via Panchayats/Jeevika SHGs), AI Offline Paradox (decoupled NDMA verified core), OS SMS restrictions (1-tap confirmed outbox), and Government API instability (weekly caching).
- **Slide 5 — Impact & Benefits:**
  - Ground statistics (76 Lakh Bihar affected, 73% North Bihar flood-prone, 88.2 Lakh in 2016, 493 deaths in 2008). Strategic impacts across Social, Economic, Governance, and Systemic levels.
- **Slide 6 — Academic & Peer-Reviewed References:**
  - 6 verifiable DOI citations: *Bluemergency (IEEE 2019)*, *Das et al. (Springer 2021)*, *Sinha et al. Kosi Siltation (Elsevier 2019)*, *Disaster Linguicism (Cambridge 2019)*, *Typhoon Haiyan (Elsevier 2016)*, *Bangladesh Last-Mile (Elsevier 2021)*.

---

## 7. Key Data Schema & State Specifications

### Core Supabase Tables:
- **`profiles`:** User ID (UUID), phone number, home district, primary language (Bhashini code), medical vulnerabilities (e.g., elderly, infant, insulin-dependent, disabled), emergency contact array.
- **`sos_beacons`:** Beacon ID, user ID, exact latitude/longitude, battery percentage, timestamp, network tier used, status (`PENDING`, `DISPATCHED`, `RESCUED`, `RESOLVED`), priority score (computed via medical flags + battery + age).
- **`shelters`:** Shelter ID, name, district, capacity, current occupancy, elevation (meters AMSL), amenities (drinking water, power generator, medical kit, boat dock), GPS coordinates, verification status (`AUTHORITY_VERIFIED`).
- **`hazard_reports`:** Report ID, user ID, latitude/longitude, hazard type (`FLOOD_DEPTH`, `ROAD_CUT`, `FALLEN_TREE`, `LIVE_WIRE`), severity level (`ANKLE`, `KNEE`, `WAIST`, `SUBMERGED`), media URL, status (`COMMUNITY_REPORTED`, `AUTHORITY_VERIFIED`, `REJECTED`).
- **`location_heartbeats`:** Heartbeat ID, user ID, last-known latitude/longitude, network signal strength, battery level, recorded at timestamp.

---

## 8. Summary for External Evaluators & Future Sessions

> **RakshaSetu** is not another generic chatbot or static information portal. It is a **hardened, offline-first emergency communication protocol and PWA** that transforms uncoordinated disaster chaos into a prioritized, two-way rescue channel. By combining pre-blackout state caching, zero-decision emergency design, native Bhashini voice navigation, and public government data feeds, RakshaSetu guarantees that when the power grid fails and cellular towers collapse, life-saving guidance and rescue coordinates still reach those who need them most.
