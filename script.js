/* ============================================================
   Treinador de Redação ENEM — script.js
   ============================================================ */

const API_URL   = 'https://copilot-mtcporto.vercel.app/v1/chat/completions';
const API_MODEL = 'gpt-4.1';

// ── DOM References ──────────────────────────────────────────
const topicSelect      = document.getElementById('topicSelect');
const customTopicGroup = document.getElementById('customTopicGroup');
const customTopicInput = document.getElementById('customTopic');
const essayText        = document.getElementById('essayText');
const wordCountEl      = document.getElementById('wordCount');
const charCountEl      = document.getElementById('charCount');
const lineEstimateEl   = document.getElementById('lineEstimate');
const lengthBadge      = document.getElementById('lengthBadge');
const badgeDot         = document.getElementById('badgeDot');
const lengthStatus     = document.getElementById('lengthStatus');
const submitBtn        = document.getElementById('submitBtn');
const tipsToggle       = document.getElementById('tipsToggle');
const tipsChevron      = document.getElementById('tipsChevron');
const tipsContent      = document.getElementById('tipsContent');
const formCard         = document.getElementById('formCard');
const loadingSection   = document.getElementById('loadingSection');
const resultsSection   = document.getElementById('resultsSection');
const errorSection     = document.getElementById('errorSection');
const errorMessage     = document.getElementById('errorMessage');
const newEssayBtn      = document.getElementById('newEssayBtn');
const retryBtn         = document.getElementById('retryBtn');
const printBtn         = document.getElementById('printBtn');

// ── Topic Selection ──────────────────────────────────────────
topicSelect.addEventListener('change', () => {
  if (topicSelect.value === 'custom') {
    customTopicGroup.style.display = 'flex';
    customTopicInput.focus();
  } else {
    customTopicGroup.style.display = 'none';
  }
  validateForm();
});

customTopicInput.addEventListener('input', validateForm);

function getSelectedTopic() {
  if (topicSelect.value === 'custom') return customTopicInput.value.trim();
  return topicSelect.value;
}

// ── Word Counter ─────────────────────────────────────────────
essayText.addEventListener('input', () => {
  updateStats();
  validateForm();
});

function countWords(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function estimateLines(text) {
  // ~70 chars per line is a typical handwriting estimate
  const chars = text.replace(/\n/g, ' ').length;
  return Math.round(chars / 70) || 0;
}

function updateStats() {
  const text  = essayText.value;
  const words = countWords(text);
  const chars = text.length;
  const lines = estimateLines(text);

  wordCountEl.textContent    = words;
  charCountEl.textContent    = chars;
  lineEstimateEl.textContent = '~' + lines;

  // Length feedback
  const badges = [
    { max: 50,   cls: 'status-short', label: 'Muito curta' },
    { max: 100,  cls: 'status-ok',    label: 'Curta' },
    { max: 200,  cls: 'status-ok',    label: 'Abaixo do ideal' },
    { max: 320,  cls: 'status-good',  label: 'Boa extensão' },
    { max: 430,  cls: 'status-ideal', label: 'Extensão ideal' },
    { max: Infinity, cls: 'status-long', label: 'Muito longa' },
  ];

  const badge = badges.find(b => words <= b.max);

  lengthBadge.className = 'length-badge ' + badge.cls;
  lengthStatus.textContent = badge.label;
}

function validateForm() {
  const topic = getSelectedTopic();
  const words = countWords(essayText.value);
  submitBtn.disabled = !(topic && words >= 30);
}

// ── Tips Accordion ───────────────────────────────────────────
tipsToggle.addEventListener('click', () => {
  const open = tipsContent.classList.toggle('open');
  tipsChevron.classList.toggle('open', open);
});

// ── Submit ───────────────────────────────────────────────────
submitBtn.addEventListener('click', handleSubmit);

async function handleSubmit() {
  const topic = getSelectedTopic();
  const essay = essayText.value.trim();

  if (!topic || countWords(essay) < 30) return;

  showLoading();

  try {
    const result = await evaluateEssay(topic, essay);
    showResults(result);
  } catch (err) {
    showError(err.message || 'Erro desconhecido. Verifique sua conexão e tente novamente.');
  }
}

// ── API Call ─────────────────────────────────────────────────
async function evaluateEssay(topic, essay) {
  const systemPrompt = `Você é um corretor especialista de redações do ENEM (Exame Nacional do Ensino Médio), treinado com os critérios oficiais do INEP. Avalie a redação dissertativo-argumentativa fornecida com base nas 5 competências do ENEM, atribuindo a cada competência uma nota de 0 a 200 em múltiplos de 40 (0, 40, 80, 120, 160 ou 200).

CRITÉRIOS DAS 5 COMPETÊNCIAS:

Competência I — Domínio da modalidade escrita formal da língua portuguesa
Avalie: gramática, ortografia, pontuação, morfossintaxe, concordância verbal e nominal, regência, crase, uso do vocabulário formal e registro culto da língua.
- 200: excelente domínio, sem erros ou com desvios mínimos que não comprometem
- 160: bom domínio, alguns desvios sem comprometimento global
- 120: domínio mediano, desvios recorrentes mas compreensível
- 80: domínio insuficiente, muitos desvios que comprometem a leitura
- 40: domínio precário, inadequação total da escrita formal
- 0: desconhecimento total da língua culta / texto não avaliável

Competência II — Compreensão da proposta de redação e aplicação de conceitos das várias áreas do conhecimento
Avalie: se o tema foi desenvolvido corretamente, se há pertinência ao recorte temático, uso de repertório sociocultural diversificado e legitimado (dados, citações, leis, obras, fatos históricos, ciência).
- 200: desenvolvimento do tema excelente com repertório original e bem articulado
- 160: bom desenvolvimento com repertório adequado
- 120: desenvolvimento mediano, tangencia o tema ou repertório superficial
- 80: desenvolvimento tangencial, com risco de fuga parcial
- 40: tangenciamento grave ou fuga parcial confirmada
- 0: fuga total ao tema / texto não avaliável

Competência III — Seleção, relacionamento, organização e interpretação de informações, fatos, opiniões e argumentos em defesa de um ponto de vista
Avalie: coerência, progressão temática, organização das ideias, consistência dos argumentos, relação entre as partes do texto.
- 200: informações e argumentos muito bem relacionados, defesa consistente da tese
- 160: informações bem relacionadas com poucas imprecisões
- 120: relação mediana, alguns problemas de progressão ou consistência
- 80: dificuldades na organização, argumentação fraca
- 40: argumentação confusa ou incoerente
- 0: ausência de defesa de ponto de vista

Competência IV — Conhecimento dos mecanismos linguísticos necessários para a construção da argumentação
Avalie: coesão textual, uso de conectivos, pronomes, elipses, paralelismo, operadores argumentativos, variação e qualidade dos recursos coesivos.
- 200: excelente uso de recursos coesivos, texto fluente e bem articulado
- 160: bom uso da coesão, com pequenos deslizes
- 120: uso regular, com rupturas coesivas perceptíveis
- 80: uso insuficiente, muitas rupturas ou repetições excessivas
- 40: uso precário, texto com graves problemas de articulação
- 0: ausência de recursos coesivos

Competência V — Elaboração de proposta de intervenção para o problema abordado, respeitando os direitos humanos
Avalie: presença e qualidade da proposta de intervenção na conclusão. A proposta deve ter: Agente + Ação + Modo/Meio + Finalidade + Detalhamento. Deve respeitar os direitos humanos.
- 200: proposta completa, bem detalhada, com todos os elementos e respeito aos direitos humanos
- 160: proposta bem articulada mas com algum elemento menos desenvolvido
- 120: proposta presente mas pouco detalhada (2-3 elementos)
- 80: proposta vaga ou muito genérica (1-2 elementos)
- 40: proposta tangencial ou que viola parcialmente os direitos humanos
- 0: ausência de proposta ou violação grave dos direitos humanos

ATENÇÃO ESPECIAL:
- Se houver fuga total ao tema, a nota final deve ser próxima de 0.
- Se o texto for muito curto (menos de ~7 linhas), zere a competência V e penalize as demais.
- A proposta de intervenção deve respeitar os direitos humanos.

Retorne APENAS um objeto JSON válido, sem texto adicional, sem markdown, sem explicações fora do JSON:
{
  "nota_final": <soma das 5 competências, número entre 0 e 1000>,
  "fuga_tema": <true ou false>,
  "nivel_geral": "<Insuficiente|Regular|Bom|Muito Bom|Excelente>",
  "comentario_geral": "<parágrafo avaliando a redação de forma geral, com tom construtivo>",
  "competencias": [
    {
      "numero": 1,
      "nome": "Domínio da modalidade escrita formal",
      "nota": <0, 40, 80, 120, 160 ou 200>,
      "descricao": "<avaliação específica desta competência, 2-3 frases>",
      "pontos_positivos": ["<ponto positivo específico>", "<outro ponto positivo>"],
      "pontos_melhorar": ["<sugestão de melhoria específica>", "<outra sugestão>"]
    },
    {
      "numero": 2,
      "nome": "Compreensão da proposta e desenvolvimento do tema",
      "nota": <0, 40, 80, 120, 160 ou 200>,
      "descricao": "<avaliação específica desta competência, 2-3 frases>",
      "pontos_positivos": ["<ponto positivo específico>", "<outro ponto positivo>"],
      "pontos_melhorar": ["<sugestão de melhoria específica>", "<outra sugestão>"]
    },
    {
      "numero": 3,
      "nome": "Seleção e organização das informações",
      "nota": <0, 40, 80, 120, 160 ou 200>,
      "descricao": "<avaliação específica desta competência, 2-3 frases>",
      "pontos_positivos": ["<ponto positivo específico>", "<outro ponto positivo>"],
      "pontos_melhorar": ["<sugestão de melhoria específica>", "<outra sugestão>"]
    },
    {
      "numero": 4,
      "nome": "Mecanismos linguísticos e coesão textual",
      "nota": <0, 40, 80, 120, 160 ou 200>,
      "descricao": "<avaliação específica desta competência, 2-3 frases>",
      "pontos_positivos": ["<ponto positivo específico>", "<outro ponto positivo>"],
      "pontos_melhorar": ["<sugestão de melhoria específica>", "<outra sugestão>"]
    },
    {
      "numero": 5,
      "nome": "Proposta de intervenção",
      "nota": <0, 40, 80, 120, 160 ou 200>,
      "descricao": "<avaliação específica desta competência, 2-3 frases>",
      "pontos_positivos": ["<ponto positivo específico>", "<outro ponto positivo>"],
      "pontos_melhorar": ["<sugestão de melhoria específica>", "<outra sugestão>"]
    }
  ]
}`;

  const userMessage = `TEMA: ${topic}\n\nREDAÇÃO:\n${essay}`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: API_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Erro na API (${response.status}): ${errorBody.slice(0, 200) || response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) throw new Error('Resposta vazia da API. Tente novamente.');

  return parseJSON(content);
}

function parseJSON(text) {
  // Try direct parse
  try { return JSON.parse(text); } catch (_) {}

  // Strip markdown code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch (_) {}
  }

  // Extract first {...} block
  const braceMatch = text.match(/\{[\s\S]+\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch (_) {}
  }

  throw new Error('Não foi possível interpretar a resposta da IA. Tente novamente.');
}

// ── Loading State ────────────────────────────────────────────
let loadingInterval = null;

function showLoading() {
  hideAll();
  loadingSection.style.display = 'block';
  loadingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  animateLoadingSteps();
}

function animateLoadingSteps() {
  const steps = loadingSection.querySelectorAll('.loading-step');
  let current = 0;

  steps.forEach(s => {
    s.classList.remove('active', 'done');
    s.querySelector('.step-icon').textContent = '○';
  });

  steps[0].classList.add('active');
  steps[0].querySelector('.step-icon').textContent = '●';

  loadingInterval = setInterval(() => {
    steps[current].classList.remove('active');
    steps[current].classList.add('done');
    steps[current].querySelector('.step-icon').textContent = '✓';
    current++;
    if (current < steps.length) {
      steps[current].classList.add('active');
      steps[current].querySelector('.step-icon').textContent = '●';
    } else {
      clearInterval(loadingInterval);
    }
  }, 1800);
}

function stopLoadingAnimation() {
  if (loadingInterval) {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }
}

// ── Results ──────────────────────────────────────────────────
function showResults(data) {
  stopLoadingAnimation();
  hideAll();
  resultsSection.style.display = 'block';
  renderResults(data);
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderResults(data) {
  // ── Score Banner
  const total = Math.max(0, Math.min(1000, data.nota_final || 0));
  document.getElementById('scoreFinal').textContent = total;

  const nivel   = data.nivel_geral || scoreLevel(total);
  const badgeEl = document.getElementById('levelBadge');
  badgeEl.textContent = nivel;

  // Banner color
  const banner = document.getElementById('resultsBanner');
  banner.className = 'results-banner ' + bannerClass(total);

  // Gauge animation
  const circumference = 2 * Math.PI * 66; // r=66 → ≈ 414.69
  const gaugeArc = document.getElementById('gaugeArc');
  const offset   = circumference * (1 - total / 1000);
  requestAnimationFrame(() => {
    gaugeArc.style.strokeDashoffset = offset;
    gaugeArc.style.stroke = gaugeColor(total);
  });

  // Fuga do tema warning
  const fugaEl = document.getElementById('fugaAviso');
  fugaEl.style.display = data.fuga_tema ? 'block' : 'none';

  // Low score alert
  const lsaEl    = document.getElementById('lowScoreAlert');
  const lsaIcon  = document.getElementById('lsaIcon');
  const lsaTitle = document.getElementById('lsaTitle');
  const lsaMsg   = document.getElementById('lsaMessage');

  if (total === 0) {
    lsaEl.style.display = 'flex';
    lsaIcon.textContent = '🚫';
    lsaTitle.textContent = 'Redação zerada';
    lsaMsg.textContent = 'A redação recebeu nota zero. Isso ocorre por fuga total ao tema, cópia dos textos motivadores, ofensa aos direitos humanos ou texto em branco/insuficiente. Revise os critérios e tente novamente.';
  } else if (total <= 200) {
    lsaEl.style.display = 'flex';
    lsaIcon.textContent = '⚠️';
    lsaTitle.textContent = 'Desempenho muito abaixo da média';
    lsaMsg.textContent = 'Sua redação precisa de muita atenção. Leia as dicas abaixo de cada competência, revise a estrutura (introdução, dois desenvolvimentos, conclusão com proposta) e pratique mais antes de tentar novamente.';
  } else if (total <= 400) {
    lsaEl.style.display = 'flex';
    lsaIcon.textContent = '📉';
    lsaTitle.textContent = 'Pontuação abaixo da média';
    lsaMsg.textContent = 'Há espaço significativo para melhora. Foque nas competências com nota mais baixa, utilize conectivos variados, inclua repertório sociocultural (dados, leis, citações) e elabore melhor a proposta de intervenção na conclusão.';
  } else if (total <= 600) {
    lsaEl.style.display = 'flex';
    lsaIcon.textContent = '📊';
    lsaTitle.textContent = 'Desempenho intermediário';
    lsaMsg.textContent = 'Sua redação está no nível médio. Com ajustes pontuais nas competências indicadas, você pode alcançar uma nota acima de 700. Preste atenção especial à proposta de intervenção e ao repertório sociocultural.';
  } else {
    lsaEl.style.display = 'none';
  }

  // ── General Comment
  const commentEl = document.getElementById('generalComment');
  if (data.comentario_geral) {
    document.getElementById('commentText').textContent = data.comentario_geral;
    commentEl.style.display = 'flex';
    commentEl.classList.add('fade-in-up');
  } else {
    commentEl.style.display = 'none';
  }

  // ── Competências Cards
  const grid = document.getElementById('competenciasGrid');
  grid.innerHTML = '';

  if (Array.isArray(data.competencias)) {
    data.competencias.forEach(comp => {
      grid.appendChild(buildCompCard(comp));
    });
  }

  // ── Breakdown Table
  const tableEl = document.getElementById('breakdownTable');
  tableEl.innerHTML = '';

  if (Array.isArray(data.competencias)) {
    data.competencias.forEach(comp => {
      tableEl.appendChild(buildBreakdownRow(
        `C${comp.numero} — ${comp.nome}`,
        comp.nota || 0
      ));
    });
    // Total row
    const totalRow = buildBreakdownRow('PONTUAÇÃO TOTAL', total, true);
    tableEl.appendChild(totalRow);
  }

  document.getElementById('scoreBreakdown').style.display = 'block';
}

function buildCompCard(comp) {
  const note = comp.nota || 0;
  const pct  = (note / 200) * 100;

  const card = document.createElement('div');
  card.className = 'comp-card';

  const positivos = (comp.pontos_positivos || []).slice(0, 3);
  const melhorar  = (comp.pontos_melhorar  || []).slice(0, 3);

  const positivosHTML = positivos.length > 0
    ? `<div class="feedback-group">
        <div class="feedback-title positive">Pontos positivos</div>
        <ul class="feedback-list positive">${positivos.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
       </div>`
    : '';

  const melhorarHTML = melhorar.length > 0
    ? `<div class="feedback-group">
        <div class="feedback-title improve">Para melhorar</div>
        <ul class="feedback-list improve">${melhorar.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul>
       </div>`
    : '';

  card.innerHTML = `
    <div class="comp-card-header">
      <div>
        <div class="comp-number">Competência ${toRoman(comp.numero)}</div>
        <div class="comp-name">${escapeHtml(comp.nome || '')}</div>
      </div>
      <div class="comp-score-badge score-${note}">${note}</div>
    </div>
    <div class="comp-card-body">
      <div class="score-bar-wrapper">
        <div class="score-bar-bg">
          <div class="score-bar-fill bar-${note}" style="width:0%"></div>
        </div>
        <div class="score-bar-label">${note}/200</div>
      </div>
      <div class="comp-description">${escapeHtml(comp.descricao || '')}</div>
      <div class="comp-feedback">
        ${positivosHTML}
        ${melhorarHTML}
      </div>
    </div>
  `;

  // Animate bar after paint
  requestAnimationFrame(() => {
    setTimeout(() => {
      const bar = card.querySelector('.score-bar-fill');
      if (bar) bar.style.width = pct + '%';
    }, 100);
  });

  return card;
}

function buildBreakdownRow(label, score, isTotal = false) {
  const pct = isTotal ? (score / 1000) * 100 : (score / 200) * 100;
  const row = document.createElement('div');
  row.className = 'breakdown-row' + (isTotal ? ' breakdown-total' : '');
  row.innerHTML = `
    <div class="breakdown-label">${escapeHtml(label)}</div>
    <div class="breakdown-bar-bg">
      <div class="breakdown-bar-fill" style="width:0%; background:${barFillColor(score, isTotal)}"></div>
    </div>
    <div class="breakdown-score" style="color:${barFillColor(score, isTotal)}">${score}</div>
  `;
  requestAnimationFrame(() => {
    setTimeout(() => {
      row.querySelector('.breakdown-bar-fill').style.width = pct + '%';
    }, 150);
  });
  return row;
}

// ── Error State ──────────────────────────────────────────────
function showError(msg) {
  stopLoadingAnimation();
  hideAll();
  errorSection.style.display = 'block';
  errorMessage.textContent   = msg;
  errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

retryBtn.addEventListener('click', () => {
  hideAll();
  formCard.style.display = 'block';
  handleSubmit();
});

// ── New Essay ────────────────────────────────────────────────
newEssayBtn.addEventListener('click', resetToForm);

function resetToForm() {
  hideAll();
  formCard.style.display = 'block';
  formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Print ────────────────────────────────────────────────────
printBtn.addEventListener('click', () => window.print());

// ── Helpers ─────────────────────────────────────────────────
function hideAll() {
  formCard.style.display        = 'none';
  loadingSection.style.display  = 'none';
  resultsSection.style.display  = 'none';
  errorSection.style.display    = 'none';
}

function scoreLevel(n) {
  if (n <= 200) return 'Insuficiente';
  if (n <= 400) return 'Regular';
  if (n <= 600) return 'Bom';
  if (n <= 800) return 'Muito Bom';
  return 'Excelente';
}

function bannerClass(n) {
  if (n <= 200) return 'banner-poor';
  if (n <= 400) return 'banner-weak';
  if (n <= 600) return 'banner-avg';
  if (n <= 800) return 'banner-good';
  if (n < 1000) return 'banner-great';
  return 'banner-exc';
}

function gaugeColor(n) {
  if (n <= 200) return '#ef4444';
  if (n <= 400) return '#f97316';
  if (n <= 600) return '#f59e0b';
  if (n <= 800) return '#a5b4fc';
  return '#6ee7b7';
}

function barFillColor(score, isTotal) {
  const pct = isTotal ? score / 1000 : score / 200;
  if (pct <= 0.2) return '#ef4444';
  if (pct <= 0.4) return '#f97316';
  if (pct <= 0.6) return '#f59e0b';
  if (pct <= 0.8) return '#3b82f6';
  return '#10b981';
}

function toRoman(n) {
  return ['I','II','III','IV','V'][n - 1] || n;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Init ─────────────────────────────────────────────────────
updateStats();
validateForm();
