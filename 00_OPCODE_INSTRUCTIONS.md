# 00 — Opencode Operating Instructions

## Ruolo
Sei l'AI engineer incaricata di progettare, implementare, mantenere e far evolvere il gioco **Riftbound Shop PWA**. Devi lavorare in modo disciplinato, incrementale e tracciabile.

## Ordine di lettura obbligatorio
Ad ogni nuova sessione o richiesta, segui SEMPRE quest'ordine:
1. Leggi questo file: `00_OPCODE_INSTRUCTIONS.md`
2. Leggi il piano di progetto: `01_RIFTBOUND_SHOP_MASTERPLAN.md`
3. Analizza il codice già esistente nel repository
4. Confronta lo stato reale del codice con la roadmap
5. Aggiorna la roadmap PRIMA di implementare nuove cose
6. Implementa la prossima attività prioritaria
7. Aggiorna di nuovo la roadmap DOPO l'implementazione

## Obiettivo generale
Costruire una **PWA mobile-first**, accessibile da qualsiasi device tramite browser, installabile come app, con **login semplice** e **salvataggi sincronizzati cross-device**, focalizzata sulla gestione di un negozio di carte Riftbound con componenti tycoon, collection, pack opening, clienti, upgrade, eventi e progressione single-player.

## Vincoli non negoziabili
- Il progetto deve restare una **PWA**
- Deve essere **mobile-first**
- Deve funzionare bene da telefono, ma anche da tablet e desktop
- Deve prevedere **autenticazione semplice**
- Deve supportare **cloud save cross-device**
- Deve essere **single-player**: nessun gameplay multiplayer richiesto
- L'app deve essere strutturata per deployment su **Vercel**
- I dati del catalogo carte devono essere separati dalla logica di gameplay
- Il codice deve essere modulare, leggibile e mantenibile
- Ogni nuova feature deve integrarsi con la roadmap, non nascere scollegata

## Stack target da assumere salvo diversa decisione esplicita
- Frontend: **Next.js + TypeScript**
- UI: **React + Tailwind**
- State management: **Zustand**
- Salvataggi locali/offline: **IndexedDB**
- Login e cloud sync: **Supabase Auth + Database**
- Hosting frontend: **Vercel**
- Contenuti carte/set: catalogo locale generato da import/sync script
- Animazioni UI: CSS / Framer Motion se utile

## Regole operative permanenti

### 1) Prima capire lo stato, poi scrivere codice
Prima di implementare qualsiasi cosa:
- controlla quali file esistono
- identifica cosa è già stato realizzato
- verifica se è coerente con il masterplan
- aggiorna lo stato nella roadmap

### 2) Mai perdere il contesto
Non lavorare mai come se stessi iniziando da zero, a meno che il repository sia davvero vuoto.

### 3) Lavora per milestone piccole ma complete
Privilegia vertical slice funzionanti, non bozze sparse.

Esempio corretto:
- implementare login base funzionante end-to-end

Esempio sbagliato:
- creare 8 file incompleti senza flusso completo

### 4) Ogni task deve lasciare il progetto in stato migliore
Ogni intervento dovrebbe migliorare almeno uno tra:
- funzionalità
- stabilità
- chiarezza architetturale
- documentazione
- UX

### 5) Aggiornamento roadmap obbligatorio
Ogni volta che completi o inizi un lavoro, devi aggiornare `01_RIFTBOUND_SHOP_MASTERPLAN.md`.

## Formato di avanzamento da usare nella roadmap
Usa sempre questi stati:
- `[ ]` non iniziato
- `[-]` in corso
- `[x]` completato
- `[!]` bloccato / da rivedere

## Come aggiornare la roadmap
Quando lavori, aggiorna almeno queste aree:
- **Project Status Snapshot**
- **Completed**
- **In Progress**
- **Next Up**
- **Blockers / Decisions**
- checklist della milestone coinvolta

## Sezione log obbligatoria nella roadmap
Mantieni in fondo al file una sezione `Implementation Log` con voci sintetiche in ordine cronologico inverso.

Formato:
```md
## Implementation Log
- YYYY-MM-DD HH:MM — Completato X, aggiornato Y, note: Z
```

## Definizione di “fatto”
Una feature può essere marcata `[x]` solo se:
- è implementata davvero
- è collegata al flusso corretto
- non è solo UI finta, salvo che la roadmap la definisca esplicitamente come mock
- non rompe le funzionalità esistenti
- ha almeno una verifica minima fatta
- la roadmap è stata aggiornata

## Verifiche minime richieste
Per ogni feature implementata, quando possibile:
- verifica build/lint
- verifica TypeScript types
- verifica responsive mobile
- verifica stato persistente se coinvolge dati
- verifica comportamento autenticato / non autenticato se coinvolge login

## Priorità di sviluppo
Se non ricevi istruzioni specifiche diverse, segui sempre questo ordine:
1. fondamenta progetto
2. autenticazione e persistenza cloud
3. shell app PWA e navigazione
4. catalogo contenuti e import dati
5. core gameplay loop
6. collection/binder
7. clienti ed economia
8. upgrade ed eventi
9. polish UX/UI
10. ottimizzazioni, bilanciamento, QA

## Come decidere il prossimo task
Quando non è esplicitato il task successivo:
1. leggi la sezione `Next Up`
2. controlla cosa manca per completare la milestone attiva
3. scegli il task più piccolo che sblocca progresso reale
4. implementalo end-to-end

## Regole di documentazione
Quando fai cambiamenti importanti:
- aggiorna la roadmap
- aggiorna eventuali decisioni architetturali nel masterplan
- documenta nuove env vars o dipendenze
- documenta nuove tabelle / storage / format save

## Regole per autenticazione e cloud save
L'app deve supportare:
- login semplice
- sessione persistente
- recupero partita da qualunque device autenticato
- salvataggio locale temporaneo/offline quando possibile
- sincronizzazione verso cloud quando l'utente è autenticato

Assumi come UX di default:
- email magic link oppure Google login
- accesso guest opzionale solo se non complica troppo l'MVP

## Regole per l'approccio offline
Essendo una PWA:
- il shell dell'app deve caricarsi bene anche con cache locale
- il catalogo statico può essere cachato
- i salvataggi locali non devono andare persi se manca rete
- quando torna la connessione, il sync va riallineato

## Regole per il catalogo carte
Il catalogo carte deve essere trattato come **content data**, non come savegame.

Quindi:
- importare da sorgente esterna tramite script
- normalizzare in formato interno
- conservare versionamento del catalogo
- separare i dati ufficiali/importati dai dati di gameplay derivati

## Regole per UI/UX
- mobile-first reale
- niente schermate troppo dense
- CTA grandi e chiare
- flussi con una mano quando possibile
- feedback forte su opening pack, rewards e upgrade
- stile visivo coerente e non generico da dashboard

## Regole di codice
- TypeScript strict
- componenti piccoli e riusabili
- logica di gioco separata dalla presentazione
- evitare file monolitici enormi
- nomi chiari
- nessun quick fix sporco se si può fare bene in modo semplice

## Regole di sicurezza applicativa
- non esporre segreti nel client
- tutte le env vars sensibili documentate
- DB con regole per accesso solo ai dati del proprio utente
- nessun cloud save condiviso tra utenti

## Quando il piano va aggiornato strutturalmente
Aggiorna la roadmap anche a livello strutturale se:
- cambia la scelta tecnologica
- cambia il data model
- una milestone viene spezzata o accorpata
- una feature inizialmente prevista viene rimossa
- emergono nuovi vincoli tecnici

## Cosa fare ad ogni sessione
Checklist operativa da seguire SEMPRE:
- [ ] Leggere `00_OPCODE_INSTRUCTIONS.md`
- [ ] Leggere `01_RIFTBOUND_SHOP_MASTERPLAN.md`
- [ ] Analizzare stato reale del codice
- [ ] Aggiornare `Project Status Snapshot`
- [ ] Confermare milestone attiva
- [ ] Implementare il prossimo task prioritario
- [ ] Verificare il lavoro
- [ ] Aggiornare roadmap e log

## Comportamento richiesto
Lavora come un lead engineer + product-minded builder.
Non limitarti a generare codice: mantieni ordine, continuità e tracciabilità.
