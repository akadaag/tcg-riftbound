# 01 — Riftbound Shop PWA Masterplan

## Project Identity

### Working Title

**Riftbound Shop**

### High Concept

Gestionale single-player mobile-first in cui il giocatore gestisce un negozio specializzato Riftbound: acquista prodotti, vende booster e box, apre pack per la propria collezione, completa set, attira clienti diversi, espande il negozio e costruisce una progressione economica e collezionistica persistente tra dispositivi.

### Product Goal

Creare un'esperienza che unisca:

- il loop tycoon di un card shop simulator
- il piacere compulsivo del pack opening
- la soddisfazione di collezionare e completare set
- una progressione da management game accessibile ma profonda
- una UX premium da app installabile via browser

### Non-Negotiable Requirements

- PWA installabile
- mobile-first
- accessibile da qualsiasi device moderno tramite browser
- login semplice
- cloud save cross-device
- single-player
- deployabile su Vercel
- contenuti carte separati dalla logica di gameplay

---

# Project Status Snapshot

## Current Status

- Overall phase: `[x] Polish (UI, UX, Accessibility, Animations)`
- Current milestone: `[x] M9 — Polish`
- App shell: `[x]`
- Authentication: `[x]`
- Cloud save sync: `[x]`
- PWA installability: `[x]` (manifest + icons + service worker via @serwist/turbopack, offline fallback, caching strategy)
- Catalog import pipeline: `[x]` (656 cards, 3 sets, 5 products, 2 drop tables, typed catalog module)
- Core gameplay loop: `[x]` (shelves, supplier, customers, economy, pack opening, day cycle, events, hype, offline progress, End Day flow)
- Collection/Binder: `[x]` (set progress, card grid, filter, rarity borders, dupe tracking, card detail modal, display case toggle)
- Customers: `[x]` (5 types, budget/patience/tolerance, offline simulation)
- Economy: `[x]` (sell pricing, markup, hype multiplier, XP, daily traffic)
- Upgrades: `[x]` (8 upgrades in 5 categories, multi-level, effect aggregation, integrated into engine)
- Events/Missions: `[x]` (events system complete, missions: 6 daily + 5 weekly + 16 milestone, seeded generation, day/week reset)
- Display Case: `[x]` (showcase cards, traffic bonus via displayScore, capacity from upgrades)
- Duplicate Systems: `[x]` (Card Trader: 5-for-1 rarity upgrade with 4 trade lanes, weighted result picking; Singles Counter: list individual cards for sale, auto-pricing with markup slider, integrated into day cycle + offline progress)
- Polish/UI: `[x]`

## Completed

- M0 Foundation: Next.js 16 + TypeScript strict + Tailwind v4 + Zustand
- App shell with mobile-first bottom navigation (Home, Shop, Packs, Collection, More)
- Full folder structure per masterplan
- Placeholder pages for all MVP screens (Home, Shop, Packs, Collection, More + sub-pages)
- Zustand game store skeleton with full SaveGame shape and all core actions
- Type definitions for all game entities (CardDefinition, SetDefinition, ProductDefinition, SaveGame, etc.)
- PWA manifest.ts with dynamic generation, placeholder SVG icons
- ESLint + Prettier configured with Tailwind class sorting
- Dark/light theme via system preference with custom design tokens (rarity colors, accents, surfaces)
- .env.example with Supabase placeholders
- M1 Auth + Cross-Device Persistence: Supabase Auth (email+password), proxy JWT refresh, login/signup page, email confirmation, cloud save (Supabase JSONB), local save (IndexedDB), auto-save orchestration (2s local, 30s cloud), sync status indicator, AuthProvider + SaveProvider, settings page with account info + logout
- M2 PWA Shell: Service worker via @serwist/turbopack (route handler at /serwist/sw.js), defaultCache runtime caching, offline fallback page (/~offline), SerwistProvider registration in root layout, proxy excludes /serwist/ paths, tsconfig excludes sw.ts from main compilation (esbuild compiles separately)
- M3 Content Pipeline: Types aligned with real Riftbound TCG (5 rarities: common/uncommon/rare/epic/showcase, 6 card types, 4 supertypes, 7 domains). Import script fetches from RiftCodex API (656 cards, 3 sets). Normalised JSON data files: sets.json (3 sets with gameplay tuning), cards.json (656 cards with full metadata), gameplay-meta.json (derived baseValue/pullWeight/collectorScore). Products/drop tables for OGN + SFD boosters (14 cards: 7C+3U+2R+1foil+1token) and boxes (24 packs). OGS starter product. Typed catalog accessor module with Map-based indices for fast lookups.
- M4 Core Gameplay Loop: Full game engine (pure functions, no side effects) covering: economy (sell pricing, markup, hype multiplier, XP calculation, daily traffic), customers (5 types with budget/patience/tolerance, offline simulation), pack opening (drop table resolution, weighted rarity, dupe detection, reveal sorting), events (9 event templates with modifiers, scheduling, cooldowns), hype tracker (per-set 0-100 with decay/boost), day cycle (offline progress capped at 8h, day advancement with XP/events/hype). Zustand store fully rewritten with all gameplay actions. UI screens: Home dashboard (offline report, XP bar, events, stats, End Day button), Shop (shelf management with markup slider, restock, product picker), Supplier (distributor catalog with box→pack conversion, event price modifiers), Pack Opening (card reveal sequence, rarity borders, NEW badges), Collection Binder (set progress, card grid, filter, showcase toggle). EndDayModal with day summary, XP earned, level up, event preview. Offline progress and hype initialization wired into AuthProvider on save load.
- M5 Upgrades + Missions + Card Detail + Display Case: Upgrades engine (8 upgrades in 5 categories: Extra Shelf, Better Signage, Loyalty Program, Training Manual, Supplier Contacts, Display Case Expansion, Premium Lighting, Stock Room). Multi-level upgrades with scaling costs and aggregated UpgradeModifiers. Missions engine (6 daily templates, 5 weekly templates, 16 milestone missions) with seeded random generation, evaluation against save state, weekly accumulation, day/week reset. Display case bonus calculation (displayScore-based traffic bonus with sqrt diminishing returns). Full engine integration: traffic/tolerance/XP params from upgrades, wholesale discount from supplier contacts, display case bonus in traffic calc, mission lifecycle in day-cycle (evaluate→reset→generate). Store actions: purchaseUpgrade, setMissions, claimMissionReward. UI: Upgrades shop page (category groups, level badges, active bonuses summary), Missions tracker page (Daily/Weekly/Milestones tabs, progress bars, claim buttons), Card detail modal in collection (full metadata, gameplay meta, display case toggle), Display case summary on home dashboard, completed missions banner in EndDayModal.
- M6 Duplicate Systems (Card Trader + Singles Counter): Card Trader engine (src/features/trader/) with 5-for-1 trade ratio, 4 rarity lanes (common→uncommon→rare→epic→showcase), weighted random result favoring unowned cards. Singles Counter engine (src/features/singles/) with auto-pricing from baseValue × rarity multiplier × hype, markup slider (0-100%), customer singles visit simulation for collectors/competitive customers. Day-cycle integration: singles sales simulated during End Day with fresh customer wave. Offline progress integration: scaled singles simulation during idle time. XP for singles (8 XP per sale via XP_VALUES.singleSold). Store actions: listSingle, unlistSingle, sellSingle, tradeCards. Legacy save migration for singlesListings, singlesRevenue, singlesSold, totalSinglesRevenue, totalSinglesSold, totalTradesCompleted. Card Trader UI (src/app/more/trader/page.tsx) with trade lanes overview, card picker with selection pills, trade result reveal with card image/NEW badge. Singles Counter UI (src/app/shop/singles/page.tsx) with listable card browser, price slider, active listings with unlist button, slot indicator (5 max). Navigation: Singles Counter link on Shop page (locked until level 5), Card Trader link on More page (locked until level 3).
- M9 Polish (UI, UX, Accessibility, Animations): Comprehensive polish pass covering all sub-tasks. See M9 milestone breakdown below for details.

## In Progress

- (none — ready for next milestone)

## Next Up

1. M11: Advanced features (multi-open packs, guest mode, Google login, notifications)

## Blockers / Decisions

- Decision (RESOLVED): Serwist service worker — @serwist/next does not support Turbopack. Solved with @serwist/turbopack (v9.5.7) which uses a route handler + esbuild. SW served at /serwist/sw.js. Registration via SerwistProvider from @serwist/turbopack/react.
- Decision: @types/serviceworker pollutes global types (removes `window`/`document`). Solved by excluding sw.ts from main tsconfig (esbuild compiles it independently).
- Decision: Using Tailwind CSS v4 with CSS-based config (no tailwind.config.js)
- Decision: System preference theme (dark default via CSS `prefers-color-scheme`)
- Decision: Auth via email + password (not magic link). Display name stored in profiles table via trigger.
- Decision: Supabase new key format — `sb_publishable_xxx` and `sb_secret_xxx`. Using `@supabase/ssr` (not deprecated auth-helpers).
- Decisione assunta: progetto PWA, non Swift nativo
- Decisione assunta: supporto cross-device con login semplice e salvataggi cloud
- Pending: User must run SQL migration `scripts/migrations/001_profiles_and_savegames.sql` in Supabase SQL Editor and configure Site URL + Redirect URL in Supabase dashboard.
- Decision (RESOLVED): Riftbound pack structure — 14 cards per pack (7 common, 3 uncommon, 2 rare-or-better, 1 foil wildcard, 1 token/rune). 24 packs per box. "Showcase" rarity = alt-art/overnumbered/signature variants. Rarities: common/uncommon/rare/epic/showcase. Drop rates: rare-or-better slots have 70% rare, 23% epic, 7% showcase chance. Based on real Riftbound TCG research.
- Decision (RESOLVED): RiftCodex API data source — fetches from api.riftcodex.com (/sets, /cards paginated). API uses `items`/`total`/`page`/`size`/`pages` response shape. Set label for SFD is "SFD" (use `name` field "Spiritforged" instead). tcgplayer_id is string not number.
- Decision (RESOLVED): Game engine architecture — all engine modules (economy, customers, events, hype, day-cycle, pack-opener) are pure functions with no side effects, no React, no store access. UI calls engine functions and dispatches results to Zustand. This separation is intentional for testability and maintainability.
- Decision (RESOLVED): Hybrid day cycle — offline idle revenue (capped 8h), active play for stocking/pricing/packs, manual "End Day" button advances day with summary/XP/events. Economy is the throttle (no artificial pack-opening limits).
- Decision (RESOLVED): Customer system — 5 types (casual, collector, competitive, kid, whale) with budget, patience, price tolerance, product preferences. Progressively unlocked by shop level.
- Decision (RESOLVED): Event system — 9 event types with traffic/budget/tolerance/wholesale/rarity/XP modifiers, min shop level requirements, cooldown logic, semi-random scheduling every 5-10 days.
- Decision (RESOLVED): Hype tracker — per-set 0-100 scale with 3% daily decay toward base, event boosts, demand/price multiplier (0.5x at hype 0, 1.5x at hype 100).

---

# Product Vision

## Fantasy del giocatore

"Gestisco il miglior shop Riftbound, apro prodotti, completo collezioni, faccio crescere il negozio e costruisco una reputazione nella community."

## Experience Pillars

### 1. Collection Excitement

Aprire pack deve essere soddisfacente, leggibile e memorabile.

### 2. Shop Progression

Il negozio deve crescere in modo visibile e sensato.

### 3. Meaningful Management

Ogni scelta di acquisto, pricing, esposizione e upgrade deve avere impatto.

### 4. Cross-Device Continuity

L'utente deve poter entrare da un altro telefono o browser e ritrovare il proprio account e i propri progressi.

### 5. Mobile Quality

L'app deve sembrare un prodotto mobile vero, non una dashboard amministrativa.

---

# Player Promise

Il gioco promette al giocatore:

- progressione costante
- reward loop frequente
- collezione persistente
- negozio personalizzabile e migliorabile
- sessioni brevi ma gratificanti
- ritorno facile al gioco da qualsiasi device

---

# Target Platform and Session Design

## Primary Platform

- smartphone browser / installazione PWA

## Secondary Platforms

- tablet
- desktop browser

## Session Target

- sessioni da 2 a 10 minuti per il loop base
- sessioni più lunghe per gestione negozio, collection e upgrade

## Input Model

- touch-first
- click come fallback naturale su desktop

---

# Core Game Loop

## Main Loop

1. Il giocatore entra nel gioco e carica il profilo
2. Controlla stato negozio, cassa, stock, missioni e notifiche
3. Acquista stock di prodotti Riftbound
4. Espone o conserva i prodotti
5. I clienti entrano e comprano in base ai loro interessi
6. Il giocatore può aprire pack per la propria collezione
7. Ottiene carte nuove o doppioni
8. Completa set, riceve reward, sblocca nuovi prodotti e upgrade
9. Investe i guadagni per far crescere il negozio
10. Torna a giocare il giorno successivo / nella sessione successiva

## Supporting Loops

### Collection Loop

- aprire pack
- ottenere carte
- scoprire rarità
- completare set
- accumulare doppioni
- esporre carte speciali

### Shop Loop

- comprare stock
- gestire disponibilità
- attirare clienti
- aumentare reputazione
- espandere il negozio

### Progression Loop

- completare obiettivi
- sbloccare set/prodotti
- aumentare livello negozio
- migliorare margini e capienza

### Meta Loop

- seguire eventi interni al gioco
- reagire a hype dei set
- costruire identità del negozio

---

# Core Systems

## 1. Account System

### Goal

Permettere all'utente di entrare facilmente e recuperare i propri progressi da qualunque device.

### MVP Requirements

- registrazione/login semplice
- sessione persistente
- logout
- recupero account
- caricamento savegame all'accesso

### Recommended UX

- email magic link
- opzionale login Google in fase 2
- opzionale guest mode in fase 2

### Data Responsibilities

- identificare univocamente il giocatore
- associare profilo, progressione e savegame
- impedire accesso ai dati di altri utenti

---

## 2. Cloud Save + Local Save

### Goal

Il gioco deve funzionare bene da più device senza perdere i progressi.

### Save Strategy

**Local-first + cloud sync**

### Required Behavior

- all'avvio carica sessione utente
- se autenticato, scarica save dal cloud
- mantiene cache/snapshot locale
- salva localmente durante la sessione
- sincronizza sul cloud in modo trasparente
- gestisce conflitti con strategia semplice e documentata

### MVP Conflict Strategy

- `last_write_wins` con `updated_at` e `save_version`
- in futuro: merge per sezioni specifiche

### Save Categories

- progressione negozio
- valuta
- stock inventario
- collezione utente
- missioni
- upgrade
- statistiche
- preferenze UI

---

## 3. PWA Shell

### Goal

Essere installabile e accessibile come app leggera.

### Requirements

- manifest valido
- icone app
- splash/basic installability
- service worker / caching strategy
- shell veloce da caricare
- comportamento affidabile su mobile browser

### Offline Expectations

- apertura shell possibile con asset cachati
- schermate statiche e catalogo locale accessibili
- scritture cloud in coda o ripristinate appena torna la rete

---

## 4. Content Catalog System

### Goal

Avere un catalogo carte/set/prodotti robusto e separato dai save dell'utente.

### Source Strategy

- usare sorgente esterna solo come input di import
- normalizzare in file dati interni
- non rendere il gameplay dipendente da richieste live al provider contenuti

### Catalog Domains

- cards
- sets
- products
- rarity tables
- drop tables
- tags

### Internal Separation

Per ogni carta distinguere tra:

- dati contenuto: nome, set, rarità, numero, immagine, tag
- dati gameplay: valore, peso drop, appeal, domanda, score collezione

---

## 5. Pack Opening System

### Goal

Rendere l'apertura pack uno dei momenti più gratificanti del gioco.

### MVP Behavior

- acquisto booster/pack dal negozio o stock personale
- apertura di un pack alla volta
- generazione carte basata su drop table del set
- reveal visuale delle carte
- evidenziazione rarità e varianti
- aggiunta alla collezione utente
- gestione doppioni

### UX Requirements

- animazione breve ma appagante
- possibilità di tap rapido/skippa reveal
- carta rara con feedback visivo forte
- indicatore "new" per carte mai ottenute

### Future Enhancements

- multi-open
- foil shimmer
- signature/variant reveal
- statistiche apertura pack

---

## 6. Collection / Binder System

### Goal

Far sentire il piacere del collezionismo in modo persistente e leggibile.

### MVP Features

- binder per set
- progress percentuale completamento set
- filtro possedute / mancanti
- conteggio copie per carta
- vista dettaglio carta
- badge "new"

### Collection States

- mai ottenuta
- ottenuta
- ottenuta multipla
- variante speciale ottenuta

### Rewards Possibili

- bonus al completamento set
- sblocco prodotti
- premi valuta
- cosmetici negozio

---

## 7. Shop Inventory System

### Goal

Gestire prodotti e stock del negozio.

### MVP Features

- acquistare prodotti da catalogo disponibile
- quantità in inventario
- mettere in vendita prodotti base
- consumo stock quando i clienti acquistano
- riordino semplice

### Product Types

- booster pack
- booster box
- starter / bundle
- prodotti speciali futuri

### Data Needed Per Product

- id
- nome
- set
- costo acquisto
- prezzo vendita base
- quantità per unità
- drop table associata
- requisito sblocco

---

## 8. Customer System

### Goal

Dare vita al negozio e differenziare la domanda.

### MVP Customer Archetypes

- **Casual Buyer**: compra prodotti economici e generici
- **Collector**: attratto da rarità, set specifici, progressione collezione
- **Competitive Fan**: attratto da prodotti/set più richiesti e hype

### MVP Customer Behavior

- entra nel negozio
- valuta disponibilità prodotto
- decide acquisto in base a preferenze e prezzi
- genera entrata economica

### Customer Variables

- budget
- patience
- interest tags
- price sensitivity
- rarity preference
- hype sensitivity

### Future Enhancements

- richieste specifiche
- clienti VIP
- eventi dedicati
- reputazione per tipologia di clientela

---

## 9. Economy System

### Goal

Far sì che il business loop abbia senso, scelte e progressione.

### MVP Economy Variables

- soft currency principale
- costo prodotti
- margine vendita
- spesa upgrade
- livello negozio
- traffico clienti

### Required Balancing Goals

- primi minuti facili e soddisfacenti
- no stalli troppo duri nel primo ciclo di gioco
- upgrade percepibili
- aprire pack non deve distruggere sempre l'economia del negozio

### Future Economy Systems

- prezzi dinamici
- eventi di mercato
- domanda set-specifica
- premium showcase

---

## 10. Store Upgrade System

### Goal

Mostrare crescita del negozio e sbloccare nuove possibilità.

### MVP Upgrade Categories

- capienza stock
- scaffali / slot vendita
- velocità/volume clienti
- qualità negozio / reputazione
- accesso a nuovi prodotti

### Upgrade Principles

- ogni upgrade deve avere impatto leggibile
- evitare upgrade cosmetici puri nell'MVP se non hanno feedback
- preferire bonus chiari e misurabili

---

## 11. Mission / Objective System

### Goal

Dare obiettivi a breve termine e guidare il giocatore.

### MVP Objective Types

- vendi X pack
- guadagna X monete
- apri X pack
- ottieni X carte nuove
- completa Y% di un set

### Rewards

- monete
- unlock prodotti
- boost temporanei
- reward collection

---

## 12. Event / Hype System

### Goal

Aggiungere varietà al loop e identità al mondo di gioco.

### MVP Event Concepts

- settimana hype di un set
- bonus affluenza clienti
- promo prodotti
- reward extra apertura pack

### Set Hype Variables

- popolarità del set
- bonus domanda clienti
- maggiore visibilità nel negozio

---

# Game Feel and UX Direction

## Visual Direction

- mobile game premium 2D
- interfaccia scura con accenti forti per rarità
- carte protagoniste assolute
- glow controllati, non eccessivi
- layout pulito e leggibile

## UX Rules

- tap targets grandi
- massimo 1 focus principale per schermata
- feedback immediato per reward e progressione
- animazioni brevi ma gratificanti
- evitare scroll infiniti su schermate cruciali

## UI Mood

- non sembrare un gestionale Excel
- non sembrare un semplice sito web
- sembrare una vera app-gioco collezionistica

---

# Information Architecture / Screens

## MVP Screen List

### 1. Auth Screen

- login / signup
- magic link flow
- stato sessione

### 2. Home Dashboard

- livello negozio
- valuta
- stock critico
- missioni attive
- CTA principali

### 3. Shop Screen

- prodotti esposti
- flusso clienti
- vendite in corso
- accesso rapido a riordino

### 4. Inventory / Stock Screen

- quantità prodotti
- acquisto stock
- riordino

### 5. Pack Opening Screen

- selezione prodotto apribile
- reveal carte
- riepilogo ottenuto

### 6. Binder / Collection Screen

- progress per set
- lista carte
- filtri
- dettaglio carta

### 7. Upgrades Screen

- elenco upgrade
- costi
- effetti

### 8. Missions Screen

- obiettivi attivi
- reward
- stato avanzamento

### 9. Profile / Settings Screen

- account
- sync status
- preferenze
- logout

## Future Screens

- Event Hub
- Showcase premium
- Statistics
- Notifications inbox

---

# Recommended Technical Architecture

## Frontend

- Next.js App Router
- TypeScript strict
- Tailwind CSS
- componenti React modulari

## State Layers

- UI state locale nei componenti
- game state in Zustand
- persisted local state in IndexedDB
- sync state separato

## Persistence

- local cache/save: IndexedDB
- cloud profile/save: Supabase/Postgres

## Authentication

- Supabase Auth
- sessione persistente
- RLS per isolare i dati utente

## Hosting

- frontend su Vercel
- backend/auth/database su servizio dedicato

## Content Pipeline

- script import catalogo
- normalizzazione in `/src/data` o storage equivalente
- versioning catalog

---

# Data Model

## Core Entities

### UserProfile

- id
- email
- created_at
- last_login_at
- display_name (opzionale)

### SaveGame

- user_id
- save_version
- updated_at
- shop_level
- soft_currency
- reputation
- current_day
- inventory_snapshot
- collection_snapshot
- upgrades_snapshot
- missions_snapshot
- stats_snapshot

### CardDefinition

- id
- external_id
- name
- set_code
- set_name
- collector_number
- rarity
- image_url
- tags
- type
- variant_flags

### CardGameplayMeta

- card_id
- base_value
- collector_score
- playable_score
- display_score
- pull_weight

### SetDefinition

- set_code
- set_name
- release_order
- hype_base
- completion_reward

### ProductDefinition

- id
- name
- set_code
- product_type
- buy_price
- sell_price_base
- cards_per_pack
- unlock_requirement
- drop_table_id

### InventoryItem

- product_id
- owned_quantity
- listed_quantity

### CollectionEntry

- card_id
- copies_owned
- first_obtained_at
- highest_variant_owned
- is_new_flag

### UpgradeDefinition

- id
- category
- name
- description
- cost
- effect_type
- effect_value
- unlock_requirement

### UpgradeState

- upgrade_id
- level_owned

### MissionDefinition

- id
- type
- target
- reward_type
- reward_value

### MissionProgress

- mission_id
- current_value
- completed
- claimed

---

# Sync Strategy

## Principle

Il gioco deve rimanere utilizzabile e robusto anche se l'utente cambia browser, telefono o sessione.

## MVP Sync Flow

1. Login utente
2. Caricamento profilo cloud
3. Download save più recente
4. Merge semplice con snapshot locale se presente
5. Durante il gioco, autosave locale frequente
6. Sync cloud a momenti chiave:
   - fine azione importante
   - cambio schermata critica
   - uscita / background se possibile

## Conflict Resolution MVP

- confronto `save_version`
- confronto `updated_at`
- priorità alla versione più recente
- loggare decisione di sync lato client

## Required UX States

- synced
- saving locally
- syncing cloud
- offline
- sync error retrying

---

# PWA Requirements in Detail

## Installability

- manifest
- icons multiple sizes
- theme color
- standalone display mode

## Performance Goals

- caricamento iniziale rapido
- transizioni fluide su telefono medio
- immagini ottimizzate
- bundle non gonfio inutilmente

## Cache Strategy

- app shell cache-first
- content catalog stale-while-revalidate o versionato
- immagini carte con caching sensato

## Responsive Behavior

- primary layout mobile
- tablet con più densità informativa
- desktop come bonus, non priorità progettuale

---

# Gameplay Balancing Principles

## Early Game

- accessibile
- comprensibile in meno di 2 minuti
- reward frequenti

## Mid Game

- più scelta su upgrade, stock e collection
- primi obiettivi di completamento set

## Long Term

- completamento set multipli
- eventi e hype
- ottimizzazione del negozio

## Anti-Frustration Rules

- doppioni utili in qualche modo
- niente blocchi economici troppo punitivi all'inizio
- onboarding leggero ma chiaro

---

# MVP Scope

## Must Have

- [x] progetto Next.js + TypeScript + Tailwind
- [x] shell app mobile-first
- [x] autenticazione semplice
- [x] cloud save base
- [x] stato locale persistente
- [x] catalogo carte/set/prodotti
- [x] import pipeline contenuti
- [x] home dashboard
- [x] inventario prodotti
- [x] acquisto stock
- [x] apertura pack base
- [x] aggiunta carte alla collezione
- [x] binder con progress set
- [x] clienti base
- [x] vendite base
- [x] economia base
- [x] upgrade base
- [x] missioni base
- [x] supporto installazione PWA

## Should Have

- [x] eventi base
- [x] hype set base
- [ ] filtri collection avanzati
- [x] sync status UI
- [ ] multi-open pack semplice

## Nice to Have

- [ ] vetrina premium
- [ ] statistiche dettagliate
- [ ] guest mode
- [ ] Google login
- [ ] notifiche leggere

---

# Milestones

## M0 — Foundation

- [x] inizializzazione repository/app
- [x] setup TypeScript strict
- [x] setup Tailwind
- [x] struttura cartelle base
- [x] layout root e navigation shell
- [x] configurazione env example
- [x] lint/format basics

## M1 — Auth + Cross-Device Persistence

- [x] integrazione auth provider
- [x] login email + password (signup/login toggle)
- [x] session restore (proxy JWT refresh)
- [x] protected routes/app gating (proxy redirect)
- [x] tabella profilo utente (SQL migration with auto-create trigger)
- [x] tabella savegame (JSONB, RLS, upsert)
- [x] load/save cloud base (Supabase upsert + select)
- [x] snapshot locale IndexedDB
- [x] sync status UI minima (SyncIndicator pill + auto-save orchestration)

## M2 — PWA Shell

- [x] manifest
- [x] icone
- [x] service worker / caching
- [x] install prompt handling
- [x] offline shell basics

## M3 — Content Pipeline

- [x] script import carte
- [x] normalizzazione set
- [x] normalizzazione prodotti
- [x] data model catalogo interno
- [x] catalog versioning
- [x] seed iniziale pronto

## M4 — Core Gameplay Loop

- [x] dashboard base
- [x] inventario prodotti
- [x] acquisto stock
- [x] pack opening base
- [x] aggiunta reward al save
- [x] loop denaro di base
- [x] game engine (pure functions): economy, customers, events, hype, day cycle, pack opener
- [x] shelf system with markup slider
- [x] supplier screen with box→pack conversion
- [x] customer simulation (5 types, offline support)
- [x] event system (9 templates, scheduling, modifiers)
- [x] hype tracker (per-set, decay/boost)
- [x] day cycle (End Day + offline progress)
- [x] collection/binder (set progress, card grid, filters)
- [x] EndDayModal (summary, XP, level up, event preview)
- [x] offline progress wired into auth-provider
- [x] set hype initialization on new game

## M5 — Collection + Upgrades + Missions + Display Case

- [x] binder per set
- [x] progress completion
- [x] dettaglio carta (card detail modal with full metadata, gameplay meta, display case toggle)
- [x] stato new/owned/missing
- [x] gestione doppioni

## M6 — Customers + Sales

- [x] customer spawning logic base
- [x] archetipi base (casual, collector, competitive, kid, whale)
- [x] decisione acquisto
- [x] vendita stock e guadagno
- [x] primi indicatori traffico

## M7 — Upgrades + Missions

- [x] catalogo upgrade (8 upgrades in 5 categories)
- [x] acquisto upgrade (multi-level with scaling costs)
- [x] impatto upgrade sul gameplay (traffic, tolerance, XP, wholesale, shelf slots, display case capacity)
- [x] missioni base (6 daily, 5 weekly, 16 milestone templates)
- [x] reward claim (coins + XP rewards, mission progress evaluation)
- [x] display case effects (displayScore-based traffic bonus, capacity from upgrades)
- [x] mission lifecycle (evaluate → reset → generate in day cycle)

## M8 — Events + Hype

- [x] sistema eventi semplice
- [x] set hype modifier
- [x] impatto su domanda clienti

## M8.5 — Duplicate Systems (Card Trader + Singles Counter)

- [x] Card Trader engine (5-for-1 trade, 4 rarity lanes, weighted random result)
- [x] Card Trader UI (trade lanes, card picker, selection pills, result reveal)
- [x] Singles Counter engine (auto-pricing, markup slider, customer singles simulation)
- [x] Singles Counter UI (listable cards, price slider, active listings, slot indicator)
- [x] Day-cycle integration (singles sales during End Day)
- [x] Offline progress integration (scaled singles sales)
- [x] XP for singles sold (8 XP each)
- [x] Store actions (listSingle, unlistSingle, sellSingle, tradeCards)
- [x] Legacy save migration for new fields
- [x] Navigation links (Singles Counter on Shop, Card Trader on More, locked states)

## M9 — Polish

- [x] 9.1 Animation Foundation: Created src/lib/animations.ts with shared framer-motion variants (fadeIn, fadeSlideUp, overlayVariants, modalVariants, cardFlip, cardSlideIn, packShake, staggerContainer/Item, toastVariants, levelUpPulse, tapScale, hoverGlow). Added CSS keyframes and utility classes (shimmer, rarity-glow-rare/epic/showcase, counter-tick) to globals.css.
- [x] 9.2 Pack Opening Animations: Rewrote packs/page.tsx with framer-motion. Pack shake→burst sequence (rotate/scale keyframes over 900ms), card flip reveal with perspective transform and AnimatePresence, rarity glow classes on rare/epic/showcase cards, stagger-animated card grid, spring-bounced NEW badge, motion.button whileTap feedback on all actions.
- [x] 9.3 Modal & Overlay Animations: EndDayModal uses framer-motion AnimatePresence with overlayVariants (fade) + modalVariants (scale+slide spring). Level-up celebration uses levelUpPulse variant (scale 0.5→1.15→1). Stats rows stagger in. Missions/events sections animate with delay. CardDetailModal in collection uses overlayVariants + modalVariants for enter/exit animations.
- [x] 9.4 Loading States: Created src/components/ui/skeleton.tsx with Skeleton, SkeletonText, SkeletonCard, SkeletonStatCard, DashboardSkeleton, ListPageSkeleton, GridPageSkeleton. Created loading.tsx for root, shop, shop/supplier, shop/singles, packs, collection, more.
- [x] 9.5 Error States: Created src/components/ui/error-display.tsx with ErrorDisplay (retry button) and NotFoundDisplay (back-to-home link). Created error.tsx for root, shop, packs, collection. Created root not-found.tsx.
- [x] 9.6 Toast System: Created src/components/ui/toast.tsx with ToastProvider (context), useToast hook, animated toast component using framer-motion AnimatePresence. Types: success, error, info, warning. Auto-dismiss with configurable duration. Wired ToastProvider into layout.tsx. Migrated inline setState+setTimeout messages in missions and upgrades pages to use toast.
- [x] 9.7 Touch Targets: Fixed all buttons below 44px minimum. Collection modal close (32→44px), Trader +/- (36→44px), selected card pills (36→44px), Singles "Unlist" (36→44px), Shop Restock/Clear, Supplier Buy, Settings Sign Out, Login toggle link — all min-h-[44px].
- [x] 9.8 Accessibility: Viewport userScalable false→true. Bottom nav aria-label + aria-current. CardDetailModal role="dialog", aria-modal, aria-label, Escape key. EndDayModal role="dialog", aria-modal, aria-label, Escape key. Collection close button aria-label. Trader +/- buttons aria-labels. Toast container aria-live="polite" + role="alert". SyncIndicator role="status" + aria-live="polite" + aria-label. Markup sliders (shop + singles) aria-label. Focus-visible styles added globally.
- [x] 9.9 Responsive Pass: max-w-lg on main container in layout.tsx. Collection card grid: grid-cols-3 sm:grid-cols-4. Pack reveal grid: grid-cols-4 sm:grid-cols-5. Text overflow handling with truncate classes.
- [x] 9.10 Color & Contrast: --foreground-muted increased from #606078 to #8080a0 for WCAG AA compliance. --nav-inactive updated to match. text-[8px] and text-[9px] in collection grid bumped to text-[10px]. Pack reveal grid text sizes fixed to text-[10px] minimum.
- [x] 9.11 Micro-Interactions: Dashboard StatCard whileTap scale feedback. ActionButton whileTap scale feedback + min-h-[44px]. End Day button whileTap scale + min-h-[44px]. Pack selection Open buttons whileTap scale. Pack reveal Next/RevealAll/Done buttons whileTap scale. EndDayModal continue button whileTap scale. XP progress bar transition-all duration-500. Progress bars in stats page transition-all duration-500.
- [x] 9.12 Stats Page: Full implementation with real game data. Overview cards (total revenue, avg revenue/day, items sold, customers served). Sales breakdown (items, revenue, singles, conversion rate, trades). Collection stats (packs opened, cards collected, unique cards, completion with progress bar). Per-set progress with individual progress bars. Shop info (level, day, balance, reputation, XP, display case). Motion animations (fadeSlideUp, staggerContainer/staggerItem).

---

# Suggested Folder Structure

```txt
src/
  app/
    (auth)/
    (game)/
    api/
    layout.tsx
    page.tsx
  components/
    ui/
    game/
    auth/
    layout/
  features/
    auth/
    save/
    catalog/
    shop/
    packs/
    collection/
    customers/
    economy/
    upgrades/
    missions/
    events/
    pwa/
  lib/
    supabase/
    storage/
    sync/
    utils/
  stores/
  data/
    cards/
    sets/
    products/
  types/
  hooks/
  styles/
scripts/
  import-catalog/
public/
  icons/
```

---

# Acceptance Criteria Per Major Area

## Auth

- l'utente può accedere facilmente
- la sessione resta disponibile ai riavvii
- da secondo device ritrova il proprio profilo

## Save

- il progresso viene mantenuto
- il progresso torna correttamente dopo logout/login
- il save cloud e quello locale non si contraddicono senza gestione

## Pack Opening

- un pack genera carte coerenti
- il reveal è chiaro
- le carte finiscono in collezione

## Binder

- mostra progresso reale
- distingue possedute e mancanti
- mostra copie possedute

## Shop

- esiste stock
- i clienti consumano stock e generano denaro
- l'economia è leggibile

## PWA

- installabile
- shell accessibile
- buona UX su telefono

---

# Implementation Rules

## Do Not Do

- non legare il gameplay a fetch live obbligatori del catalogo
- non costruire tutto in un singolo store/file enorme
- non creare UI desktop-first da riadattare male al mobile
- non marcare task come fatti senza verifica minima

## Always Do

- aggiornare roadmap prima/dopo il lavoro
- mantenere coerenza tra codice e piano
- preferire implementazioni piccole ma reali
- documentare decisioni nuove

---

# Open Decisions

- [ ] guest mode sì/no nell'MVP
- [ ] Google login in M1 o post-MVP
- [ ] dettaglio strategia sync conflitti oltre `last_write_wins`
- [ ] profondità iniziale del sistema hype
- [ ] gestione doppioni: solo conteggio o conversione economica

---

# QA / Test Checklist

## Manual Smoke Tests

- [ ] login funziona
- [ ] refresh non perde sessione
- [ ] cambio device recupera save
- [ ] acquisto stock funziona
- [ ] apertura pack aggiorna collection
- [ ] clienti generano vendite
- [ ] upgrade applicano effetti
- [ ] installazione PWA proposta correttamente

## Technical Checks

- [ ] lint ok
- [ ] typecheck ok
- [ ] build ok
- [ ] nessun errore critico client console

---

# Implementation Log

- 2026-03-19 28:00 — **M10 complete.** 10.1: Wired customer preferredSets + event affectedSets — generateCustomer() takes preferredSets param, generateCustomerWave() populates from event.affectedSets (50% chance for boosted types), rollNewEvent called with availableSetCodes from save.setHype. 10.2: Inventory capacity enforcement (BASE_INVENTORY_CAPACITY=200, getTotalInventoryCapacity exported), set completion detection in advanceDay (EndDayResult.setCompletions, completedSets on SaveGame, set reward banner in EndDayModal), complete_set_pct mission type + two new milestones (ms_collection_25pct 2000G, ms_collection_50pct 5000G). 10.3: Product unlock auto-population on level-up in advanceDay (7th param sets?: SetDefinition[], populates unlockedProducts for shop level). 10.4: Economy balancing — starting gold 500→750G, XP dayComplete 15→20. 10.5: Performance — next/image remotePatterns for cmsassets.rgpub.io, LazyMotion+domAnimation via MotionProvider client component (layout.tsx), all motion._ → m._ across page.tsx/packs/collection/stats/end-day-modal/toast, <img> → <Image> in singles and trader, inventory capacity progress bar in supplier (color-coded at 70%/90%), CacheFirst SW rule for card art (500 entries, 30d TTL). Typecheck + build pass clean. Files modified: customers.ts, events.ts, day-cycle.ts, economy.ts, missions/index.ts, upgrades/index.ts, types/game.ts, game-store.ts, page.tsx, end-day-modal.tsx, layout.tsx, next.config.ts, packs/page.tsx, collection/page.tsx, more/stats/page.tsx, shop/singles/page.tsx, more/trader/page.tsx, shop/supplier/page.tsx, sw.ts. Files created: src/components/ui/motion-provider.tsx.

- 2026-03-19 27:00 — **M9 Polish complete (remaining sub-tasks).** Completed 9.2 Pack Opening Animations: rewrote packs/page.tsx with framer-motion — pack shake→burst keyframe sequence (900ms), card flip reveal with perspective transform and AnimatePresence, rarity glow CSS classes on rare/epic/showcase cards, stagger-animated reveal grid, spring-bounced NEW badge. Completed 9.3 Modal & Overlay Animations: EndDayModal rewritten with framer-motion AnimatePresence (overlayVariants + modalVariants + levelUpPulse + stagger stats), CardDetailModal in collection wrapped with motion overlay/modal variants. EndDayModal always rendered (isOpen controls AnimatePresence) for proper exit animations. Completed 9.8 Accessibility (remaining): EndDayModal now has role="dialog", aria-modal="true", aria-label, Escape key handler. SyncIndicator has role="status", aria-live="polite", aria-label. Shop markup slider and Singles markup slider both have aria-label. Completed 9.9 Responsive: collection card grid grid-cols-3 sm:grid-cols-4, pack reveal grid grid-cols-4 sm:grid-cols-5. Completed 9.10 Color & Contrast: pack reveal grid text sizes fixed to text-[10px] minimum. Completed 9.11 Micro-Interactions: dashboard StatCard/ActionButton/EndDay button all use motion whileTap scale, pack buttons have whileTap, EndDayModal continue button has whileTap. Completed 9.12 Stats Page: full implementation with overview cards (total revenue, avg rev/day, items sold, customers), sales breakdown (items, revenue, singles, conversion rate, trades), collection stats (packs, cards, unique, completion bar), per-set progress bars, shop info (level, day, balance, reputation, XP, display case). Uses fadeSlideUp + stagger animations. Updated masterplan with detailed M9 breakdown, fixed Next Up numbering (M10/M11). Typecheck + build pass clean. Files created: none (all edits to existing files). Files modified: packs/page.tsx, end-day-modal.tsx, collection/page.tsx, sync-indicator.tsx, more/stats/page.tsx, page.tsx (dashboard), shop/page.tsx, shop/singles/page.tsx, 01_RIFTBOUND_SHOP_MASTERPLAN.md.

- 2026-03-19 26:00 — **M6 Duplicate Systems (Card Trader + Singles Counter) complete.** Built across multiple sessions. Card Trader engine (src/features/trader/index.ts): TRADE_RATIO=5, 4 trade lanes (common→uncommon→rare→epic→showcase), getTradeableCards filters collection for 2+ copies, getTradeLanes provides lane overview, executeTrade with weighted random result favoring unowned cards (2× weight for new cards). Singles Counter engine (src/features/singles/index.ts): calculateSuggestedPrice from baseValue × rarity multiplier × hype, calculateAskingPrice with 0-100% markup, getListableCards filters for 2+ copies not already listed, simulateSinglesVisit for collectors/competitive customers with interest scoring (collectorScore/playableScore), simulateDaySinglesSales for batch processing. Types updated (game.ts): SinglesListing interface, singlesListings on SaveGame, singlesRevenue/singlesSold on DayReport, totalSinglesRevenue/totalSinglesSold/totalTradesCompleted on ShopStats. Store actions (game-store.ts): listSingle (validates copiesOwned≥2, slot limit 5), unlistSingle, sellSingle (decrements copies, updates revenue/stats), tradeCards (decrements sacrificed copies, adds result card). Day-cycle integration: advanceDay() now takes 6 params to simulate singles sales with fresh customer wave. Offline integration: calculateOfflineProgress() simulates scaled singles sales (proportional to hours × 60% efficiency). XP: singleSold=8 added to XP_VALUES, calculateDayXP accepts singlesSold param. Legacy save migration in auth-provider.tsx. Card Trader UI (src/app/more/trader/page.tsx): 4 trade lane buttons showing excess/tradeable counts, card picker with +/- controls and selection pills, trade result reveal with card image + NEW badge. Singles Counter UI (src/app/shop/singles/page.tsx): active listings section with unlist buttons, listable cards browser with expand-to-price flow (markup slider + asking price + List button), slot indicator (X/5), locked state for level<5. Navigation: Singles Counter link on Shop page with accent-secondary styling (locked badge until level 5), Card Trader link on More page with locked state until level 3. Build + typecheck pass clean.
- 2026-03-19 23:00 — **Mobile touch-target fixes (5/5).** Fixed all 5 issues from mobile audit: (1) collection filter buttons py-1.5→py-2.5 + min-h-[44px], (2) "Back to Sets"/"Back to Shop" text links added py-2 px-1 min-h-[44px] padding, (3) supplier quantity +/- steppers py-1.5→py-2 + min-h-[44px], (4) pack "Open" button py-2→py-2.5 + min-h-[44px] + wider px, (5) EndDayModal inner container max-h-[85vh] + overflow-y-auto for short phones. Files changed: collection/page.tsx, supplier/page.tsx, packs/page.tsx, end-day-modal.tsx. Typecheck + build pass clean.
- 2026-03-19 22:00 — **M4 Core Gameplay Loop complete.** Built full game engine as pure-function modules in src/features/engine/: economy.ts (sell pricing, markup, hype multiplier, XP, daily traffic), customers.ts (5 types with budget/patience/tolerance, offline sim), pack-opener.ts (drop table resolution, weighted rarity, dupe detection), events.ts (9 templates with modifiers, scheduling, cooldowns), hype.ts (per-set 0-100 decay/boost), day-cycle.ts (offline progress capped 8h, day advancement with XP/events/hype). Fully rewrote Zustand store with all gameplay actions (shelves, inventory, collection batch-add, day tracking, events, hype, display case, unlocks). Built 5 UI screens: Home dashboard (offline report, XP bar, events, stats, End Day button + EndDayModal), Shop (shelf management with markup slider, restock, product picker), Supplier (distributor catalog with box→pack conversion, event price modifiers), Pack Opening (card reveal sequence with rarity borders, NEW badges, reveal-all), Collection Binder (set progress bars, card grid with filter/showcase toggle, rarity-colored borders). Wired offline progress calculation + set hype initialization into AuthProvider on save load. Added getProductMap/getProductSetMap helpers to catalog module. Updated globals.css with Riftbound rarity colors and new design tokens. Typecheck, lint, and build all pass clean.
- 2026-03-19 18:00 — **M2 PWA Shell complete.** Used @serwist/turbopack (v9.5.7) to solve Turbopack incompatibility with @serwist/next. Created route handler at src/app/serwist/[path]/route.ts that compiles SW via esbuild. Rewrote src/app/sw.ts with @serwist/turbopack/worker imports, defaultCache runtime caching, and offline fallback for navigation requests. Created SerwistProvider re-export (src/app/serwist.tsx) and wrapped root layout with it (swUrl="/serwist/sw.js"). Created offline fallback page at /~offline with retry button. Updated proxy.ts matcher to exclude /serwist/ paths from auth redirect. Excluded sw.ts from main tsconfig.json (esbuild compiles independently) to fix @types/serviceworker polluting global DOM types. Added "use client" to ~offline page (onClick handler). Cleaned up .gitignore and eslint.config.mjs (removed old public/sw.js patterns). Typecheck, lint, and build all pass clean. Note: manifest + icons were already created in M0.
- 2026-03-19 15:00 — **M1 Auth + Cross-Device Persistence complete.** Built email+password login/signup page with Server Actions (signIn, signUp, signOut). Created auth layout (centered, no bottom nav). Implemented email confirmation callback route (/auth/confirm). Created SQL migration for profiles (auto-created via trigger on signup) and savegames (JSONB, RLS, unique per user) tables. Built cloud save service (loadCloudSave, saveToCloud, resolveConflict with last_write_wins). Built local save via IndexedDB (loadLocalSave, saveLocally, clearLocalSave). Created AuthProvider (checks session, loads saves with conflict resolution, provides user context). Created SaveProvider (auto-save to IndexedDB every 2s, cloud sync every 30s + on visibility change + beforeunload). Added SyncIndicator pill component. Updated root layout with AuthProvider + SaveProvider wrapping. Updated Settings page with real account info + logout. Updated Home page with display name + sync indicator. BottomNav hidden on auth pages. Updated .env.example with NEXT_PUBLIC_SITE_URL. Build, typecheck, and lint all pass clean. Note: User must run SQL migration in Supabase SQL Editor before auth will work.
- 2026-03-19 11:00 — **M0 Foundation complete.** Initialized Next.js 16 + TypeScript strict + Tailwind v4 project. Created full folder structure per masterplan. Built mobile-first app shell with bottom navigation (Home, Shop, Packs, Collection, More). Created placeholder pages for all MVP screens including sub-routes (more/upgrades, more/missions, more/stats, more/settings). Implemented Zustand game store skeleton with full SaveGame shape and all CRUD actions. Defined all core game types (CardDefinition, SetDefinition, ProductDefinition, SaveGame, SyncStatus, etc.). Set up dark/light theme via system preference with custom CSS design tokens (rarity colors, accent colors, card surfaces). Configured PWA manifest.ts with dynamic generation and placeholder SVG icons. Set up ESLint + Prettier with Tailwind class sorting plugin. Created .env.example. Note: Serwist service worker deferred to M2 due to Turbopack incompatibility in Next.js 16. Build, typecheck, and lint all pass clean.
