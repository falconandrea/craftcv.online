# Tasks: ATS Score Deterministic Rules Engine

## File Map

### Create
- `lib/ats-rules.ts` — Pure functions for all deterministic checks. Each rule is a function `(text: string) => DeterministicCheck`. Exports the runner `runAllChecks(text: string, fileName?: string): DeterministicCheck[]` and types.
- `lib/ats-rules.test.ts` — Unit tests for each rule with mock CV texts (edge cases, empty, good CV).

### Modify
- `app/api/ai/analyze-ats/route.ts` — Import and run deterministic checks after PDF parsing, before AI call. Merge results into response.
- `components/ats/ResultsDashboard.tsx` — Add new section `DeterministicChecks` between component scores and AI feedback. Import `DeterministicCheck` type from `lib/ats-rules.ts`.
- `lib/stats.ts` — Add `ats_lint_checks` to Stats type (optional, for tracking).

---

### U1. Regola: Contatti — Email

**Files:**
- Create: `lib/ats-rules.ts`

**Scenari:**
- Testo contiene `nome@dominio.com` → passed
- Testo contiene `email@` → failed (manca dominio)
- Testo senza email → failed
- Testo contiene `example@email.com` → warning (dominio example)

### U2. Regola: Contatti — Telefono con prefisso internazionale

**Files:**
- Modify: `lib/ats-rules.ts`

**Scenari:**
- Testo contiene `+39 123 456 7890` → passed
- Testo contiene `123-456-7890` → warning (manca prefisso)
- Testo senza telefono → failed

### U3. Regola: Contatti — LinkedIn, GitHub, Sito personale, Location

**Files:**
- Modify: `lib/ats-rules.ts`

**Scenari:**
- `linkedin.com/in/username` → passed
- `github.com/username` → passed
- `mariosite.com` (non linkedin/github) → passed (sito personale)
- `New York, NY` / `Italy` / `CET` → passed (location)
- Tutti assenti → failed per ogni missing

### U4. Regola: Bullet — Action Verbs

**Files:**
- Modify: `lib/ats-rules.ts`

**Scenari:**
- Bullet che iniziano con "Developed", "Led", "Created", "Implemented", "Managed" → passed
- Bullet che iniziano con "Was responsible for", "Worked on", "Involved in" → warning
- Wordlist di ~100 action verbs inclusa
- Nessuna bullet → skipped

### U5. Regola: Bullet — Lunghezza e Metriche

**Files:**
- Modify: `lib/ats-rules.ts`

**Scenari:**
- Bullet < 10 parole → warning "troppo corta"
- Bullet > 40 parole → warning "troppo lunga"
- Bullet contiene numeri (%, $, €, numbers) → passed per metriche
- Nessuna metrica in nessuna bullet → warning

### U6. Regola: Struttura — Sezioni e Date

**Files:**
- Modify: `lib/ats-rules.ts`

**Scenari:**
- Headers "Experience", "Education", "Skills" presenti → passed
- Pattern data `MM/YYYY` o `Month YYYY` trovato → passed
- Gap > 6 mesi tra date consecutive → warning
- Ruolo recente senza data fine (e senza "Present"/"Current") → warning

### U7. Regola: ATS-Specific — Caratteri speciali, Skills, Nome file

**Files:**
- Modify: `lib/ats-rules.ts`

**Scenari:**
- Emoji o caratteri Unicode non-standard nel testo → warning
- Skills separati da virgola/punto e virgola/newline → passed
- Skills in formato testo libero → warning (non chiaramente parsabile)
- Nome file "resume.pdf" o "CV.pdf" (case insensitive) → warning (nome generico)

### U8. Rules Runner — `runAllChecks(text, fileName?)`

**Files:**
- Modify: `lib/ats-rules.ts`

**Scenari:**
- Esegue tutte le regole in ordine e restituisce `DeterministicCheck[]`
- Calcola `lintScore` (percentuale di check passed su totali)
- Se il testo è vuoto, tutti i check → failed con messaggio appropriato

### U9. Test unitari

**Files:**
- Create: `lib/ats-rules.test.ts`

**Scenari:**
- Mock CV "buono" (CraftCV) — passa tutte le regole
- Mock CV vuoto — tutti failed
- Mock CV con solo testo — no contatti, no bullet, no sezioni → failed mirati
- Mock CV con emoji e caratteri speciali — warning su A01

### U10. Integrazione API Route

**Files:**
- Modify: `app/api/ai/analyze-ats/route.ts`

**Azioni:**
- Dopo il parsing PDF, chiamare `runAllChecks(parsedText, pdfFile.name)`
- Includere `deterministicChecks` e `lintScore` nella risposta JSON
- Mantenere retrocompatibilità (campi AI esistenti invariati)

### U11. Frontend — Sezione Deterministic Checks

**Files:**
- Modify: `components/ats/ResultsDashboard.tsx`

**Azioni:**
- Importare `DeterministicCheck` da `lib/ats-rules.ts`
- Aggiornare `AtsScoreData` interface per includere `deterministicChecks` e `lintScore`
- Nuova sezione "CraftCV Lint Check" con:
  - Punteggio lint (0-100) con grafico a barra
  - Lista di check raggruppati per categoria (contacts, bullet_quality, structure, ats_specific)
  - Icone passed/warning/failed uguali allo stile esistente

### U12. Stats counter (opzionale)

**Files:**
- Modify: `lib/stats.ts`

**Azioni:**
- Aggiungere `ats_lint_checks` alla `Stats` type
- Chiamare `incrementCounter("ats_lint_checks")` nella API route dopo il run
