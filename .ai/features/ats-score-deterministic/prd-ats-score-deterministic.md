# PRD: ATS Score Deterministic Rules Engine

> **Status**: Draft
> **Cluster**: A (P0)
> **Parent**: ATS Score Simulator (`/ats-score`)

## 1. Goal

Aggiungere un layer di regole **deterministiche** (no AI) all'attuale ATS Score Simulator, in modo da rendere l'analisi riproducibile, spiegabile e testabile. Le regole girano lato server dopo il parsing del PDF e prima dell'invocazione all'LLM.

Principio guida: **determinismo prima dell'AI** — ciò che può essere controllato con codice va controllato con codice. L'AI resta solo per analisi soggettiva (keyword match vs JD, valutazione qualitativa dell'impatto).

## 2. Architettura

### Flusso attuale
```
Upload PDF → Parsing testo → AI (LLM) → JSON punteggio
```

### Nuovo flusso
```
Upload PDF → Parsing testo → REGOLE DETERMINISTICHE → AI (solo keyword match + subjective) → Unione risultati → JSON finale
```

Tutto nella stessa API route `/api/ai/analyze-ats`. La risposta JSON unifica entrambi i layer.

### Dove girano le regole
Lato **server** (Node.js nella API route). Il testo estratto dal PDF viene passato a funzioni pure che restituiscono risultati deterministici.

## 3. Regole Deterministiche

Organizzate in categorie:

### 📞 Contatti
| ID | Regola | Implementazione |
|----|--------|----------------|
| D01 | Email presente | Regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` sul testo |
| D02 | Email formato valido | Stessa regex — se match, valido |
| D03 | Telefono presente | Regex per pattern telefonici internazionali |
| D04 | Telefono con prefisso | Prefisso +39 / +1 / +44 etc. |
| D05 | LinkedIn URL | `linkedin.com/in/` |
| D06 | GitHub URL | `github.com/` |
| D07 | Sito personale/portfolio | URL personale (non linkedin/github) |
| D08 | Location/Timezone presente | Città, paese o fuso orario nei contatti |

### 🔫 Qualità Bullet Points
| ID | Regola | Implementazione |
|----|--------|----------------|
| B01 | Action verbs presenti | Wordlist di ~100 action verbs (developed, led, created, implemented, etc.) |
| B02 | Bullet troppo corte | < 10 parole = warning |
| B03 | Bullet troppo lunghe | > 40 parole = warning |
| B04 | Metriche/Misurabilità | Presenza di numeri, %, $, €, timeframe nelle bullet |

### 📋 Struttura
| ID | Regola | Implementazione |
|----|--------|----------------|
| S01 | Sezioni standard riconoscibili | Headers come "Experience", "Education", "Skills", "Summary" |
| S02 | Date presenti | Pattern data (MM/YYYY, Month YYYY, etc.) |
| S03 | Date gap rilevanti | Gap > 6 mesi tra esperienze consecutive |
| S04 | Esperienze recenti senza fine | Ruolo recente senza anno di fine (se non "Present") |

### 🤖 ATS-Specific
| ID | Regola | Implementazione |
|----|--------|----------------|
| A01 | Caratteri speciali/emoji | Rilevazione caratteri Unicode non-standard |
| A02 | Skills in formato leggibile | Skills separati da virgola/punto e virgola/linea |
| A03 | Nome file caricato | "resume.pdf" o "CV.pdf" → suggerisci nome personalizzato |

## 4. Formato Risposta

Estensione del JSON attuale. Aggiungiamo un campo `deterministicChecks`:

```json
{
  "score": 72,
  "componentScores": { ... },
  "deterministicChecks": [
    {
      "id": "D01",
      "category": "contacts",
      "status": "passed" | "warning" | "failed",
      "label": "Email Address",
      "message": "Email found and valid.",
      "details": "mario.rossi@email.com"
    },
    {
      "id": "B01",
      "category": "bullet_quality",
      "status": "warning",
      "label": "Action Verbs",
      "message": "4 out of 12 bullets lack a strong action verb.",
      "details": "Weak bullets: 'Was responsible for...', 'Worked on...'"
    }
  ],
  "feedback": [ ... ]  // AI feedback (unchanged)
}
```

Il frontend (`ResultsDashboard`) mostra i check deterministici in una nuova sezione visiva, prima o integrata con i feedback AI.

## 5. Impatto sul Punteggio

Le regole deterministiche **non modificano** direttamente il punteggio AI. Serve una discussione su come integrarle:

- **Opzione 1**: Punteggio separato "Lint Score" (0-100) mostrato insieme al punteggio AI
- **Opzione 2**: Il punteggio AI "eredita" i fallimenti deterministici (se fallisci contatti, l'AI vede il warning e abbassa il punteggio)
- **Opzione 3**: Solo warning qualitativi, nessun impatto sul numero

**Raccomandata**: Opzione 1 — punteggio lint separato, mostrato come "CraftCV Lint Check". Trasparente e spiegabile.

### Implementato (delta rispetto a questo PRD)

Opzione 1, con due precisazioni decise in fase di hardening:

- Il lint score è **ponderato**, non una percentuale di check passati:
  `passed = 1`, `warning = 0.5`, `failed = 0`. Un warning segnala qualcosa da
  migliorare, non un documento rotto.
- D04 (GitHub) e D05 (sito personale) hanno **peso 0**: il loro stesso
  messaggio li dichiara opzionali, quindi vengono mostrati con badge
  `OPTIONAL` ma restano fuori dal denominatore. Nella risposta arrivano con
  `informational: true`.

La risposta include inoltre `lintScore`, `aiUnavailable` (true quando il layer
AI fallisce e si serve solo il report deterministico), `textTruncated` e
`gapReport`. Contratto completo e tabella delle 16 regole con i pesi:
`docs/ATS_RULES.md`.

## 6. Testing

- Ogni regola è una funzione pura → testabile con input mock
- Test specifici con un CV CraftCV noto (deve passare tutte le regole)
- Test con edge case: CV vuoto, CV con solo testo, CV con caratteri speciali
- Nessuna dipendenza da LLM per il testing delle regole

## 7. Non incluso (scope chiuso)

- Regole semantiche complesse (es. "il contenuto della summary è rilevante per il ruolo")
- Analisi di tono/formalità
- Modifiche al layout del frontend oltre all'aggiunta di una sezione lint check
