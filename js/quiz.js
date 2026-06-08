// ── Constants ─────────────────────────────────────────────
const QUESTION_TIME = 20;
const QUIZ_LENGTH   = 10;
const FEEDBACK_MS   = 1400;
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const TOPIC_LIST = [
  { id: 'all',            label: '🌟 All Topics' },
  { id: 'classification', label: '🔬 Classification' },
  { id: 'diet',           label: '🍽️ Diet' },
  { id: 'habitat',        label: '🌿 Habitat' },
  { id: 'conservation',   label: '🛡️ Conservation' },
  { id: 'facts',          label: '⭐ Fun Facts' },
];

const TOPIC_TYPES = {
  all:            ['classification', 'diet', 'habitat', 'conservation', 'fact'],
  classification: ['classification'],
  diet:           ['diet'],
  habitat:        ['habitat'],
  conservation:   ['conservation'],
  facts:          ['fact'],
};

// ── State ─────────────────────────────────────────────────
let S = {
  screen:        'setup',
  habitat:       'all',
  topic:         'all',
  pool:          [],
  questions:     [],
  currentQ:      0,
  results:       [],
  timerSecs:     QUESTION_TIME,
  timerInterval: null,
  totalElapsed:  0,
  totalInterval: null,
  qStartTime:    0,
  answered:      false,
};

// ── Utilities ─────────────────────────────────────────────
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function pickRandom(arr, n) { return shuffle(arr).slice(0, n); }

function getWrongValues(values, correct, n) {
  const unique = [...new Set(values)].filter(v => v !== correct);
  return pickRandom(unique, Math.min(n, unique.length));
}

function getWrongAnimals(pool, correct, n) {
  const others = pool.filter(a => a.name !== correct.name);
  return pickRandom(others, Math.min(n, others.length));
}

// Redact the animal's name from the fun fact text
function redactAnimalName(factText, animal) {
  const escaped = animal.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let result = factText;
  // "The X's" → "This animal's"
  result = result.replace(new RegExp('\\bThe ' + escaped + "'s\\b", 'gi'), "This animal's");
  // "The X" → "This animal"
  result = result.replace(new RegExp('\\bThe ' + escaped + '\\b', 'gi'), 'This animal');
  // "X's" → "This animal's"
  result = result.replace(new RegExp('\\b' + escaped + "'s\\b", 'gi'), "This animal's");
  // "X" → "this animal"
  result = result.replace(new RegExp('\\b' + escaped + '\\b', 'gi'), 'this animal');
  // Capitalise first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function el(id) { return document.getElementById(id); }
function render(html) { el('quiz-app').innerHTML = html; }

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Question generators ───────────────────────────────────
function makeQuestion(type, animal, pool) {
  switch (type) {

    case 'classification': {
      const wrongs = getWrongValues(pool.map(a => a.classification), animal.classification, 3);
      const opts   = shuffle([animal.classification, ...wrongs]);
      return {
        type,
        text: `What is the classification of the <strong>${animal.name}</strong> ${animal.emoji}?`,
        options: opts, answer: animal.classification, animalName: animal.name,
      };
    }

    case 'diet': {
      const wrongs = getWrongValues(pool.map(a => a.diet), animal.diet, 3);
      const opts   = shuffle([animal.diet, ...wrongs]);
      return {
        type,
        text: `What does the <strong>${animal.name}</strong> ${animal.emoji} eat?`,
        options: opts, answer: animal.diet, animalName: animal.name,
      };
    }

    case 'habitat': {
      const habitats = Object.keys(HABITAT_CONFIG);
      const wrongs   = pickRandom(habitats.filter(h => h !== animal.habitat), 3);
      const opts     = shuffle([animal.habitat, ...wrongs]);
      return {
        type,
        text: `Which habitat does the <strong>${animal.name}</strong> ${animal.emoji} live in?`,
        options: opts, answer: animal.habitat, animalName: animal.name,
      };
    }

    case 'conservation': {
      const statuses = Object.values(IUCN_LABELS);
      const wrongs   = pickRandom(statuses.filter(s => s !== animal.conservationStatus), 3);
      const opts     = shuffle([animal.conservationStatus, ...wrongs]);
      return {
        type,
        text: `What is the conservation status of the <strong>${animal.name}</strong> ${animal.emoji}?`,
        options: opts, answer: animal.conservationStatus, animalName: animal.name,
      };
    }

    case 'fact': {
      const wrongs   = getWrongAnimals(pool, animal, 3).map(a => a.name);
      const opts     = shuffle([animal.name, ...wrongs]);
      const redacted = redactAnimalName(animal.fact, animal);
      return {
        type,
        text: `Which animal is this fun fact about?`,
        factText: redacted,
        options: opts, answer: animal.name, animalName: animal.name,
      };
    }
  }
}

function generateQuestions(pool, topic, habitat) {
  let types = [...(TOPIC_TYPES[topic] || TOPIC_TYPES.all)];
  // Habitat questions are trivial when quizzing one habitat
  if (habitat !== 'all') types = types.filter(t => t !== 'habitat');
  if (types.length === 0) types = ['classification', 'diet', 'fact'];

  const supplementedPool = pool.length >= 4 ? pool : ANIMALS;
  const subjects = pickRandom(pool, Math.min(QUIZ_LENGTH, pool.length));
  const questions = [];

  for (let i = 0; i < QUIZ_LENGTH; i++) {
    const animal = subjects[i % subjects.length];
    const type   = types[Math.floor(Math.random() * types.length)];
    const q      = makeQuestion(type, animal, supplementedPool);
    if (q) questions.push(q);
  }
  return questions;
}

// ── Timers ────────────────────────────────────────────────
function startTimers() {
  S.timerSecs  = QUESTION_TIME;
  S.qStartTime = Date.now();
  S.answered   = false;

  S.timerInterval = setInterval(() => {
    S.timerSecs = Math.max(0, QUESTION_TIME - Math.floor((Date.now() - S.qStartTime) / 1000));
    const numEl = el('quiz-timer-num');
    if (numEl) numEl.textContent = S.timerSecs + 's';
    const barFill = el('quiz-timer-fill');
    if (barFill) barFill.style.width = (S.timerSecs / QUESTION_TIME * 100) + '%';
    if (S.timerSecs <= 0 && !S.answered) handleAnswer(null);
  }, 250);

  if (!S.totalInterval) {
    S.totalInterval = setInterval(() => {
      S.totalElapsed++;
      const totEl = el('quiz-total-time');
      if (totEl) totEl.textContent = '⏱ ' + formatTime(S.totalElapsed);
    }, 1000);
  }
}

function stopTimers() {
  clearInterval(S.timerInterval);
  S.timerInterval = null;
}

function stopAllTimers() {
  clearInterval(S.timerInterval);
  clearInterval(S.totalInterval);
  S.timerInterval = null;
  S.totalInterval = null;
}

// ── Answer handling ───────────────────────────────────────
function handleAnswer(selectedOption) {
  if (S.answered) return;
  S.answered = true;
  stopTimers();

  const q         = S.questions[S.currentQ];
  const timeTaken = Math.min(QUESTION_TIME, (Date.now() - S.qStartTime) / 1000);
  const correct   = selectedOption !== null && selectedOption === q.answer;
  const points    = correct ? Math.max(1, Math.round(QUESTION_TIME - timeTaken)) : 0;

  S.results.push({ question: q, selected: selectedOption, correct, timeTaken, points });

  // Highlight options
  q.options.forEach((opt, i) => {
    const btn = el(`qopt-${i}`);
    if (!btn) return;
    if (opt === q.answer)           btn.classList.add('quiz-opt-correct');
    else if (opt === selectedOption) btn.classList.add('quiz-opt-wrong');
    btn.disabled = true;
  });

  // Feedback badge
  const badge = el('quiz-feedback-badge');
  if (badge) {
    badge.textContent  = correct ? '✅ Correct! +' + points + ' pts' : selectedOption ? '❌ Wrong!' : '⏰ Time\'s up!';
    badge.className    = 'quiz-feedback-badge ' + (correct ? 'badge-correct' : 'badge-wrong');
    badge.style.display = 'block';
  }

  setTimeout(() => {
    S.currentQ++;
    if (S.currentQ >= QUIZ_LENGTH) {
      stopAllTimers();
      showResults();
    } else {
      showQuestion();
    }
  }, FEEDBACK_MS);
}

// ── Screen renderers ──────────────────────────────────────
function showSetup() {
  S.screen = 'setup';
  const preHabitat = new URLSearchParams(window.location.search).get('h') || 'all';
  S.habitat = preHabitat;

  const habitatOpts = [
    { id: 'all', label: '🐾 All Animals', color: '#27ae60' },
    ...Object.entries(HABITAT_CONFIG).map(([name, cfg]) => ({ id: name, label: cfg.emoji + ' ' + name, color: cfg.color }))
  ];

  const habitatBtns = habitatOpts.map(opt => `
    <button class="quiz-choice-btn ${S.habitat === opt.id ? 'selected' : ''}"
            style="${S.habitat === opt.id ? `border-color:${opt.color};background:${opt.color}22;color:${opt.color}` : ''}"
            onclick="selectHabitat('${opt.id}')">${opt.label}</button>
  `).join('');

  const topicBtns = TOPIC_LIST.map(opt => `
    <button class="quiz-choice-btn ${S.topic === opt.id ? 'selected' : ''}"
            onclick="selectTopic('${opt.id}')">${opt.label}</button>
  `).join('');

  render(`
    <div class="quiz-wrap">
      <div class="quiz-setup-card">
        <div class="quiz-setup-icon">🧠</div>
        <h2 class="quiz-setup-title">Animal Quiz</h2>
        <p class="quiz-setup-sub">10 questions · 20 seconds each · Speed + accuracy scoring</p>

        <div class="quiz-section-label">Choose a habitat</div>
        <div class="quiz-choice-group" id="habitat-group">${habitatBtns}</div>

        <div class="quiz-section-label">Choose a topic</div>
        <div class="quiz-choice-group" id="topic-group">${topicBtns}</div>

        <button class="quiz-start-btn" onclick="startQuiz()">🚀 Start Quiz</button>
      </div>
    </div>
  `);
}

function selectHabitat(id) {
  S.habitat = id;
  const color = HABITAT_CONFIG[id]?.color || '#27ae60';
  document.querySelectorAll('#habitat-group .quiz-choice-btn').forEach(btn => {
    btn.classList.remove('selected');
    btn.style.borderColor = '';
    btn.style.background  = '';
    btn.style.color       = '';
  });
  const sel = document.querySelector(`#habitat-group .quiz-choice-btn[onclick="selectHabitat('${id}')"]`);
  if (sel) {
    sel.classList.add('selected');
    sel.style.borderColor = color;
    sel.style.background  = color + '22';
    sel.style.color       = color;
  }
}

function selectTopic(id) {
  S.topic = id;
  document.querySelectorAll('#topic-group .quiz-choice-btn').forEach(btn => btn.classList.remove('selected'));
  const sel = document.querySelector(`#topic-group .quiz-choice-btn[onclick="selectTopic('${id}')"]`);
  if (sel) sel.classList.add('selected');
}

function startQuiz() {
  S.pool = S.habitat === 'all'
    ? ANIMALS
    : ANIMALS.filter(a => a.habitat === S.habitat);

  S.questions    = generateQuestions(S.pool, S.topic, S.habitat);
  S.currentQ     = 0;
  S.results      = [];
  S.totalElapsed = 0;
  S.totalInterval = null;
  showReady();
}

function showReady() {
  S.screen = 'ready';
  const habitatLabel = S.habitat === 'all' ? 'All Animals' : S.habitat;
  const topicLabel   = TOPIC_LIST.find(t => t.id === S.topic)?.label || 'All Topics';
  const color        = HABITAT_CONFIG[S.habitat]?.color || '#27ae60';

  render(`
    <div class="quiz-wrap">
      <div class="quiz-setup-card">
        <div class="quiz-setup-icon">🏆</div>
        <h2 class="quiz-setup-title">Ready?</h2>
        <p class="quiz-setup-sub">You'll get 10 questions. Answer as fast as you can —<br>faster correct answers earn more points!</p>

        <div class="quiz-chips">
          <span class="quiz-chip" style="background:${color}22;color:${color};border-color:${color}">🐾 ${habitatLabel}</span>
          <span class="quiz-chip">${topicLabel}</span>
          <span class="quiz-chip">⏱ 20s per question</span>
          <span class="quiz-chip">🏆 Max ${QUIZ_LENGTH * QUESTION_TIME} points</span>
        </div>

        <button class="quiz-start-btn" onclick="showQuestion()" style="margin-top:1.5rem">🚀 Let's Go!</button>
        <button class="quiz-back-btn" onclick="showSetup()">← Change Settings</button>
      </div>
    </div>
  `);
}

function showQuestion() {
  S.screen = 'question';
  const q    = S.questions[S.currentQ];
  const qNum = S.currentQ + 1;
  const color = HABITAT_CONFIG[S.habitat]?.color || '#27ae60';
  const pct   = ((S.currentQ) / QUIZ_LENGTH * 100).toFixed(0);

  const optionsHtml = `<div class="quiz-text-opts">` +
    q.options.map((opt, i) => `
      <button class="quiz-text-opt" id="qopt-${i}" onclick="handleAnswer('${opt.replace(/'/g, "\\'")}')">
        <span class="opt-label">${OPTION_LABELS[i]}</span>
        <span class="opt-text">${opt}</span>
      </button>
    `).join('') +
    `</div>`;

  const factHtml = q.factText
    ? `<div class="quiz-fact-callout">"${q.factText}"</div>`
    : '';

  render(`
    <div class="quiz-wrap">
      <div class="quiz-top-bar">
        <button class="quiz-back-btn" onclick="confirmQuit()">✕ Quit</button>
        <span class="quiz-qcount">Question ${qNum} of ${QUIZ_LENGTH}</span>
        <span class="quiz-elapsed" id="quiz-total-time">⏱ 0:00</span>
      </div>

      <div class="quiz-progress-track">
        <div class="quiz-progress-fill" style="width:${pct}%;background:${color}"></div>
      </div>

      <div class="quiz-timer-track">
        <div class="quiz-timer-fill" id="quiz-timer-fill" style="width:100%;background:${color}"></div>
      </div>
      <div class="quiz-timer-row">
        <span class="quiz-timer-label">Time left:</span>
        <span class="quiz-timer-num" id="quiz-timer-num">${QUESTION_TIME}s</span>
      </div>

      <div class="quiz-card">
        <div class="quiz-q-text">${q.text}</div>
        ${factHtml}
        ${optionsHtml}
        <div class="quiz-feedback-badge" id="quiz-feedback-badge" style="display:none"></div>
      </div>
    </div>
  `);

  startTimers();
}

function confirmQuit() {
  if (confirm('Quit the quiz? Your progress will be lost.')) {
    stopAllTimers();
    showSetup();
  }
}

function showResults() {
  S.screen = 'results';
  const totalScore = S.results.reduce((sum, r) => sum + r.points, 0);
  const maxScore   = QUIZ_LENGTH * QUESTION_TIME;
  const correct    = S.results.filter(r => r.correct).length;
  const accuracy   = Math.round((correct / QUIZ_LENGTH) * 100);

  const pct    = totalScore / maxScore;
  const trophy = pct >= 0.85 ? '🥇' : pct >= 0.65 ? '🥈' : pct >= 0.45 ? '🥉' : '🎯';

  const TYPE_LABELS = {
    'classification': '🔬 Classification',
    'diet':           '🍽️ Diet',
    'habitat':        '🌿 Habitat',
    'conservation':   '🛡️ Conservation',
    'fact':           '⭐ Fun Fact',
  };

  const rows = S.results.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
      <td>${i + 1}</td>
      <td>${r.question.animalName}</td>
      <td>${TYPE_LABELS[r.question.type] || r.question.type}</td>
      <td>
        <span class="result-badge ${r.correct ? 'badge-correct' : 'badge-wrong'}">
          ${r.correct ? '✅ Correct' : r.selected ? '❌ Wrong' : '⏰ Timeout'}
        </span>
      </td>
      <td>${r.timeTaken.toFixed(1)}s</td>
      <td class="${r.points > 0 ? 'pts-positive' : 'pts-zero'}">${r.points}</td>
    </tr>
  `).join('');

  render(`
    <div class="quiz-wrap">
      <div class="quiz-results-header">
        <div class="quiz-results-trophy">${trophy}</div>
        <h2 class="quiz-setup-title">Quiz Complete!</h2>
      </div>

      <div class="quiz-stat-cards">
        <div class="quiz-stat-card" style="color:#27ae60">
          <div class="stat-value">${totalScore}<span class="stat-max">/${maxScore}</span></div>
          <div class="stat-label">Score</div>
        </div>
        <div class="quiz-stat-card" style="color:#10b981">
          <div class="stat-value">${correct}<span class="stat-max">/${QUIZ_LENGTH}</span></div>
          <div class="stat-label">Correct</div>
        </div>
        <div class="quiz-stat-card" style="color:#f59e0b">
          <div class="stat-value">${formatTime(S.totalElapsed)}</div>
          <div class="stat-label">Time</div>
        </div>
        <div class="quiz-stat-card" style="color:#3b82f6">
          <div class="stat-value">${accuracy}%</div>
          <div class="stat-label">Accuracy</div>
        </div>
      </div>

      <div class="quiz-results-table-wrap">
        <table class="quiz-results-table">
          <thead>
            <tr><th>#</th><th>Animal</th><th>Topic</th><th>Result</th><th>Time</th><th>Points</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="quiz-results-btns">
        <button class="quiz-start-btn" onclick="startQuiz()">🔄 Play Again</button>
        <button class="quiz-back-btn" onclick="showSetup()">⚙️ Change Settings</button>
      </div>
    </div>
  `);
}

// ── Init ──────────────────────────────────────────────────
function initQuiz() {
  showSetup();
}
