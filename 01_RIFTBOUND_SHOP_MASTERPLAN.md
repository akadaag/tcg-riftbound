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

- Overall phase: `[-] Content Pipeline → Core Gameplay`
- Current milestone: `[x] M3 — Content Pipeline`
- App shell: `[x]`
- Authentication: `[x]`
- Cloud save sync: `[x]`
- PWA installability: `[x]` (manifest + icons + service worker via @serwist/turbopack, offline fallback, caching strategy)
- Catalog import pipeline: `[x]` (656 cards, 3 sets, 5 products, 2 drop tables, typed catalog module)
- Core gameplay loop: `[ ]`
- Collection/Binder: `[ ]`
- Customers: `[ ]`
- Economy: `[ ]`
- Upgrades: `[ ]`
- Events/Missions: `[ ]`
- Polish/UI: `[ ]`

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

## In Progress

- M4 — Core Gameplay Loop (dashboard, inventory, stock purchase, pack opening, economy)

## Next Up

1. M4: Core gameplay loop (dashboard, inventory, stock purchase, pack opening, economy)
2. M5: Collection / Binder system
3. M6: Customer system
4. M7: Economy balancing
5. M8: Upgrades system
6. M9: Events / Missions

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

- [ ] progetto Next.js + TypeScript + Tailwind
- [ ] shell app mobile-first
- [ ] autenticazione semplice
- [ ] cloud save base
- [ ] stato locale persistente
- [ ] catalogo carte/set/prodotti
- [ ] import pipeline contenuti
- [ ] home dashboard
- [ ] inventario prodotti
- [ ] acquisto stock
- [ ] apertura pack base
- [ ] aggiunta carte alla collezione
- [ ] binder con progress set
- [ ] clienti base
- [ ] vendite base
- [ ] economia base
- [ ] upgrade base
- [ ] missioni base
- [ ] supporto installazione PWA

## Should Have

- [ ] eventi base
- [ ] hype set base
- [ ] filtri collection avanzati
- [ ] sync status UI
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

- [ ] script import carte
- [ ] normalizzazione set
- [ ] normalizzazione prodotti
- [ ] data model catalogo interno
- [ ] catalog versioning
- [ ] seed iniziale pronto

## M4 — Core Gameplay Loop

- [ ] dashboard base
- [ ] inventario prodotti
- [ ] acquisto stock
- [ ] pack opening base
- [ ] aggiunta reward al save
- [ ] loop denaro di base

## M5 — Collection

- [ ] binder per set
- [ ] progress completion
- [ ] dettaglio carta
- [ ] stato new/owned/missing
- [ ] gestione doppioni

## M6 — Customers + Sales

- [ ] customer spawning logic base
- [ ] archetipi base
- [ ] decisione acquisto
- [ ] vendita stock e guadagno
- [ ] primi indicatori traffico

## M7 — Upgrades + Missions

- [ ] catalogo upgrade
- [ ] acquisto upgrade
- [ ] impatto upgrade sul gameplay
- [ ] missioni base
- [ ] reward claim

## M8 — Events + Hype

- [ ] sistema eventi semplice
- [ ] set hype modifier
- [ ] impatto su domanda clienti

## M9 — Polish

- [ ] animazioni pack migliori
- [ ] UX tuning
- [ ] loading/skeletons
- [ ] error states
- [ ] responsive pass
- [ ] performance pass

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

- 2026-03-19 18:00 — **M2 PWA Shell complete.** Used @serwist/turbopack (v9.5.7) to solve Turbopack incompatibility with @serwist/next. Created route handler at src/app/serwist/[path]/route.ts that compiles SW via esbuild. Rewrote src/app/sw.ts with @serwist/turbopack/worker imports, defaultCache runtime caching, and offline fallback for navigation requests. Created SerwistProvider re-export (src/app/serwist.tsx) and wrapped root layout with it (swUrl="/serwist/sw.js"). Created offline fallback page at /~offline with retry button. Updated proxy.ts matcher to exclude /serwist/ paths from auth redirect. Excluded sw.ts from main tsconfig.json (esbuild compiles independently) to fix @types/serviceworker polluting global DOM types. Added "use client" to ~offline page (onClick handler). Cleaned up .gitignore and eslint.config.mjs (removed old public/sw.js patterns). Typecheck, lint, and build all pass clean. Note: manifest + icons were already created in M0.
- 2026-03-19 15:00 — **M1 Auth + Cross-Device Persistence complete.** Built email+password login/signup page with Server Actions (signIn, signUp, signOut). Created auth layout (centered, no bottom nav). Implemented email confirmation callback route (/auth/confirm). Created SQL migration for profiles (auto-created via trigger on signup) and savegames (JSONB, RLS, unique per user) tables. Built cloud save service (loadCloudSave, saveToCloud, resolveConflict with last_write_wins). Built local save via IndexedDB (loadLocalSave, saveLocally, clearLocalSave). Created AuthProvider (checks session, loads saves with conflict resolution, provides user context). Created SaveProvider (auto-save to IndexedDB every 2s, cloud sync every 30s + on visibility change + beforeunload). Added SyncIndicator pill component. Updated root layout with AuthProvider + SaveProvider wrapping. Updated Settings page with real account info + logout. Updated Home page with display name + sync indicator. BottomNav hidden on auth pages. Updated .env.example with NEXT_PUBLIC_SITE_URL. Build, typecheck, and lint all pass clean. Note: User must run SQL migration in Supabase SQL Editor before auth will work.
- 2026-03-19 11:00 — **M0 Foundation complete.** Initialized Next.js 16 + TypeScript strict + Tailwind v4 project. Created full folder structure per masterplan. Built mobile-first app shell with bottom navigation (Home, Shop, Packs, Collection, More). Created placeholder pages for all MVP screens including sub-routes (more/upgrades, more/missions, more/stats, more/settings). Implemented Zustand game store skeleton with full SaveGame shape and all CRUD actions. Defined all core game types (CardDefinition, SetDefinition, ProductDefinition, SaveGame, SyncStatus, etc.). Set up dark/light theme via system preference with custom CSS design tokens (rarity colors, accent colors, card surfaces). Configured PWA manifest.ts with dynamic generation and placeholder SVG icons. Set up ESLint + Prettier with Tailwind class sorting plugin. Created .env.example. Note: Serwist service worker deferred to M2 due to Turbopack incompatibility in Next.js 16. Build, typecheck, and lint all pass clean.
