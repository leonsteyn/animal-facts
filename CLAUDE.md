# Animal Facts — Project Handoff

## What this project is
A static educational website for Year 5–6 students covering 200 animals across 8 habitats.
Each animal has a real Wikipedia photo, GeoChart distribution map, classification, diet, size, IUCN conservation status, and a fun fact.
A full quiz mode is included with 5 question types, a 20-second timer, and speed+accuracy scoring.

## Live URL
https://animalfactsquiz.netlify.app

## GitHub repo
https://github.com/leonsteyn/animal-facts

## Deployment
- Hosted on **Netlify**, auto-deploys from the `main` branch on GitHub.
- `netlify.toml` sets `publish = "."` (no build step — pure static files).
- To deploy a change: commit and `git push origin main`. Netlify picks it up automatically.

## Tech stack
- **Vanilla HTML / CSS / JavaScript only** — no frameworks, no npm, no build step.
- **Google GeoCharts** (`https://www.gstatic.com/charts/loader.js`) for distribution maps.
- **Wikipedia REST API** (`https://en.wikipedia.org/api/rest_v1/page/summary/{title}`) for animal photos — returns `thumbnail.source`. No API key needed, CORS-enabled.
- **Fonts**: Fredoka One + Nunito from Google Fonts.

---

## File structure

```
animal-facts/
├── index.html          Landing page — shows a random animal card
├── habitat.html        Lists all animals in a habitat
├── animal.html         Individual animal card page
├── quiz.html           Quiz page
├── preview.html        Temporary dev preview — can be deleted
├── css/
│   ├── styles.css      Shared styles (header, cards, nav, responsive)
│   └── quiz.css        Quiz-specific styles
├── js/
│   ├── app.js          Shared logic (header builder, card renderer, GeoChart, Wikipedia photo)
│   └── quiz.js         Full quiz engine
└── data/
    └── animals.js      Global ANIMALS array (200 animals)
```

---

## Data format — `data/animals.js`

Exports a global `const ANIMALS = [...]` array. Each entry:

```js
{
  name:               "Jaguar",
  emoji:              "🐆",
  habitat:            "Rainforest",       // must match a key in HABITAT_CONFIG
  classification:     "Mammal",           // Mammal | Bird | Reptile | Amphibian | Fish |
                                          // Insect | Arachnid | Crustacean | Mollusc |
                                          // Jellyfish | Crustacean
  diet:               "Carnivore",        // Carnivore | Herbivore | Omnivore | Insectivore |
                                          // Filter Feeder | Scavenger | Detritivore
  size:               "1.2–1.95 m long · 56–96 kg",
  conservationStatus: "Near Threatened",  // full label matching IUCN_LABELS
  iucn:               "NT",              // LC | NT | VU | EN | CR | EW | EX | DD
  distributionText:   "Central and South America",
  mapRegion:          "019",             // UN M.49 region code — zooms the GeoChart
  mapCountries:       ["br","co","pe"],  // ISO2 codes (lowercase) — highlighted on map
                                          // use [] for Arctic/open-ocean animals
  wikiTitle:          "Jaguar",          // Wikipedia page title for photo lookup
  fact:               "The jaguar has the strongest bite...",
}
```

### mapRegion codes (most common)
| Code | Region |
|---|---|
| `"world"` | Full world map |
| `"002"` | Africa |
| `"005"` | South America |
| `"013"` | Central America |
| `"014"` | Eastern Africa |
| `"015"` | Northern Africa |
| `"017"` | Middle Africa |
| `"018"` | Southern Africa |
| `"019"` | Americas (North + South) |
| `"021"` | Northern America |
| `"029"` | Caribbean |
| `"030"` | Eastern Asia |
| `"034"` | Southern Asia |
| `"035"` | South-Eastern Asia |
| `"053"` | Australia & New Zealand |
| `"142"` | Asia |
| `"150"` | Europe |
| `"154"` | Northern Europe |

### Special map cases
- **Arctic animals** (Polar Bear, Arctic Wolf, etc.): `mapCountries: []` → shows a grey world map
- **Antarctic animals** (Emperor Penguin, Weddell Seal): `mapCountries: ["aq"]`, `mapRegion: "world"`
- **Oceanic/migratory animals**: `mapCountries: []`, `mapRegion: "world"`

---

## Habitats and colours — `HABITAT_CONFIG` in `js/app.js`

```js
const HABITAT_CONFIG = {
  "Rainforest":         { color: "#27ae60", emoji: "🌿" },
  "Desert":             { color: "#e67e22", emoji: "🏜️" },
  "Savannah":           { color: "#d4a017", emoji: "🌾" },
  "Polar Regions":      { color: "#2980b9", emoji: "❄️" },
  "Ocean & Coral Reef": { color: "#0077b6", emoji: "🌊" },
  "Rivers & Wetlands":  { color: "#16a085", emoji: "💧" },
  "Mountains":          { color: "#8e44ad", emoji: "⛰️" },
  "Woodlands":          { color: "#5d8a3c", emoji: "🌳" },
};
```

---

## IUCN conservation status — `IUCN_LABELS` / `IUCN_COLORS` in `js/app.js`

| Code | Label | Colour |
|---|---|---|
| LC | Least Concern | `#27ae60` (green) |
| NT | Near Threatened | `#f39c12` (amber) |
| VU | Vulnerable | `#e67e22` (orange) |
| EN | Endangered | `#e74c3c` (red) |
| CR | Critically Endangered | `#c0392b` (dark red) |
| EW | Extinct in Wild | `#8e44ad` (purple) |
| EX | Extinct | `#2c3e50` (near black) |
| DD | Data Deficient | `#95a5a6` (grey) |

---

## Shared logic — `js/app.js`

Key functions:

| Function | Purpose |
|---|---|
| `buildHeader(activeHabitat)` | Injects site header with habitat pills into `#site-header` |
| `buildCardHTML(animal, suffix)` | Returns full animal card HTML string |
| `renderCard(animal, containerId)` | Renders card + fetches Wikipedia photo + draws GeoChart |
| `fetchAnimalPhoto(wikiTitle, imgEl, fallbackEl)` | Fetches photo from Wikipedia REST API; falls back to emoji |
| `drawAnimalGeoChart(divId, animal, color)` | Draws a Google GeoChart for an animal's distribution |
| `onGoogleChartsReady()` | Called by Google Charts loader callback — flushes queued charts |
| `getAnimalsByHabitat(habitat)` | Returns animals in a habitat, sorted alphabetically |
| `hexToRgba(hex, alpha)` | Colour utility |
| `getQueryParam(name)` | Reads a URL query parameter |

---

## Quiz engine — `js/quiz.js`

### Question types
| Type | Question |
|---|---|
| `classification` | What is the classification of X? |
| `diet` | What does X eat? |
| `habitat` | Which habitat does X live in? |
| `conservation` | What is the conservation status of X? |
| `fact` | Which animal is this fun fact about? (name redacted from fact) |

> **No size questions** — deliberately excluded as sizes vary widely and are hard to quiz fairly.

### Key constants
```js
const QUESTION_TIME = 20;   // seconds per question
const QUIZ_LENGTH   = 10;   // questions per game
const FEEDBACK_MS   = 1400; // ms to show correct/wrong before advancing
```

### Scoring
`points = max(1, round(20 − timeTaken))` per correct answer. Max 200 per game.

### Fun fact redaction
`redactAnimalName(factText, animal)` in `quiz.js` removes the animal's name from the fact text so students can't see the answer. Handles:
- Exact name: "Jaguar" → "this animal"
- Possessives: "Jaguar's" → "this animal's"
- Plurals: "Jaguars" → "this animal"
- Irregular plurals: "butterflies" from "Butterfly", "foxes" from "Fox"
- "The X" prefix: "The jaguar" → "This animal"
- First word of multi-word names: "Snow leopards" caught via "Snow" + "s"

### Quiz filter options
- **Habitat filter**: All Animals, or any of the 8 habitats
- **Topic filter**: All Topics | Classification | Diet | Habitat | Conservation | Fun Facts
- When quizzing a single habitat, "Habitat" questions are automatically excluded (trivial)

### Quiz state machine
Screens: `setup → ready → question → feedback → results`

---

## Page navigation flow

```
index.html
  ↓ habitat pill
habitat.html?h=Rainforest
  ↓ animal button
animal.html?h=Rainforest&i=3    (i = index within sorted habitat list)
  ↓ ← / → nav arrows
animal.html?h=Rainforest&i=4

quiz.html                        (standalone — all animals)
quiz.html?h=Rainforest           (pre-filtered to habitat)
```

---

## All Games banner (identical on every page)

```html
<a href="https://mrssteynsgames.netlify.app" style="
  display:flex;align-items:center;gap:0.5rem;
  background:#1e293b;color:#f8fafc;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  font-size:0.82rem;font-weight:600;
  padding:0.55rem 1.2rem;
  text-decoration:none;letter-spacing:0.01em;
">← All Games</a>
```

---

## Common tasks

### Add a new animal
Add an entry to the `ANIMALS` array in `data/animals.js`. Follow the existing format exactly.
Make sure `habitat` matches one of the 8 keys in `HABITAT_CONFIG` and `iucn` matches one of the 8 IUCN codes.

### Add a new habitat
1. Add an entry to `HABITAT_CONFIG` in `js/app.js` with a `color` and `emoji`
2. Add a matching CSS class `.iucn-XX` in `css/styles.css` if needed
3. Add animals with the new habitat name to `data/animals.js`

### Change a habitat colour
Edit the `color` value in `HABITAT_CONFIG` in `js/app.js`.

### Add a new quiz question type
1. Add the type string to `TOPIC_TYPES` in `quiz.js`
2. Add a `case` to the `makeQuestion()` switch statement
3. Add a label entry to `TYPE_LABELS` in `showResults()`

### Update the live site
```bash
git add .
git commit -m "describe your change"
git push origin main
```
Netlify auto-deploys within ~1 minute.

---

## Notes
- `preview.html` is a leftover dev file used to check the first 24 sample animals. It can be deleted.
- Wikipedia photo fetching is async — the emoji shows first, then the photo loads in. This is intentional and expected.
- Some animals deliberately have `mapCountries: []` (Arctic/oceanic species). The map renders as a plain grey world map for these.
