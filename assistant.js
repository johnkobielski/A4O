/*
  ATTUNED ASSISTANT — MANUAL EDITING
  ===================================
  1. Edit knowledge/attuned-assistant.md to change the assistant's information.
  2. A secure AI endpoint belongs at /api/attuned-assistant.
  3. Until that endpoint is deployed, the widget automatically uses a searchable
     preview of the same knowledge file so the interface can be tested safely.
*/

const ATTUNED_CONFIG = {
  endpoint: '/api/attuned-assistant',
  knowledgePath: 'knowledge/attuned-assistant.md'
};

const FALLBACK_KNOWLEDGE = `
## Attunement 4 Optimum
A4O is a U.S.-based strategy, transformation, program leadership, and organizational adoption company. A4O coordinates specialist technology partners to deliver AI, analytics, custom software, automation, IoT, integration, and support.

## Industrial AI, IoT, and digitalization
A4O helps organizations prioritize industrial AI use cases, build governance, coordinate computer vision and predictive analytics delivery, integrate IoT and operational data, redesign workflows, and drive adoption.

## Technology partners
QuantUp provides AI, advanced analytics, optimization, computer vision, generative AI, and production integration. GammaSoft provides enterprise software, workflow automation, IoT and smart-city platforms, integration, modernization, maintenance, and support.

## Contact
Use the Request a conversation link to connect with John S. Kobielski, PhD, MBA, Managing Director of A4O.
`;

const launcher = document.querySelector('.assistant-launcher');
const panel = document.querySelector('.assistant-panel');
const closeButton = document.querySelector('.assistant-close');
const form = document.querySelector('.assistant-form');
const input = document.querySelector('#assistant-input');
const messages = document.querySelector('.assistant-messages');
const suggestions = [...document.querySelectorAll('.assistant-suggestions button')];

let knowledgePromise;
let conversationHistory = [];

const loadKnowledge = () => {
  if (!knowledgePromise) {
    knowledgePromise = fetch(ATTUNED_CONFIG.knowledgePath, { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('Knowledge file unavailable');
        return response.text();
      })
      .catch(() => FALLBACK_KNOWLEDGE);
  }
  return knowledgePromise;
};

const openAssistant = () => {
  panel.hidden = false;
  launcher.hidden = true;
  launcher.setAttribute('aria-expanded', 'true');
  window.setTimeout(() => input.focus(), 60);
};

const closeAssistant = () => {
  panel.hidden = true;
  launcher.hidden = false;
  launcher.setAttribute('aria-expanded', 'false');
  launcher.focus();
};

const addMessage = (text, type, options = {}) => {
  const article = document.createElement('article');
  article.className = `assistant-message assistant-message-${type}`;
  if (options.loading) article.classList.add('is-loading');

  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  article.appendChild(paragraph);

  if (Array.isArray(options.sources) && options.sources.length) {
    const sourceLine = document.createElement('p');
    sourceLine.className = 'assistant-sources';
    sourceLine.append('Sources: ');
    options.sources.slice(0, 3).forEach((source, index) => {
      if (index) sourceLine.append(' · ');
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = source.title;
      sourceLine.appendChild(link);
    });
    article.appendChild(sourceLine);
  }

  if (options.handoff) {
    const handoff = document.createElement('a');
    handoff.className = 'assistant-handoff';
    handoff.href = '#connect';
    handoff.textContent = 'Request a conversation with A4O →';
    handoff.addEventListener('click', closeAssistant);
    article.appendChild(handoff);
  }

  messages.appendChild(article);
  messages.scrollTop = messages.scrollHeight;
  return article;
};

const normalizeWords = value => (value.toLowerCase().match(/[a-z0-9]+/g) || [])
  .filter(word => (word.length > 2 || ['ai', 'ml'].includes(word))
    && !['the', 'and', 'that', 'with', 'for', 'from', 'your', 'about', 'how', 'can', 'does', 'help', 'what', 'tell', 'our'].includes(word));

const answerFromKnowledge = async question => {
  const knowledge = await loadKnowledge();
  const queryWords = new Set(normalizeWords(question));
  const chunks = knowledge
    .split(/\n(?=##\s)/)
    .map(chunk => chunk.trim())
    .filter(Boolean);

  const ranked = chunks
    .map(chunk => {
      const chunkWords = new Set(normalizeWords(chunk));
      const matches = [...chunkWords].reduce((score, word) => score + (queryWords.has(word) ? 1 : 0), 0);
      const headingMatches = normalizeWords((chunk.split('\n')[0] || ''))
        .reduce((score, word) => score + (queryWords.has(word) ? 1 : 0), 0);
      return { chunk, headingMatches, score: matches + (headingMatches * 8) };
    })
    .sort((a, b) => b.score - a.score);

  const contactIntent = /email|contact|call|meeting|schedule|speak|talk|person/i.test(question);
  const matches = ranked.filter(item => item.score > 0);
  // A heading match is precise enough to answer from one section. Broader
  // questions may combine the two strongest approved-knowledge sections.
  const relevant = matches[0]?.headingMatches ? matches.slice(0, 1) : matches.slice(0, 2);

  if (!relevant.length || contactIntent) {
    return {
      answer: contactIntent
        ? 'I can help you connect with A4O. Use “Request a conversation” below and John will follow up about your initiative.'
        : 'I could not verify that from the approved A4O knowledge. I can still help you request a conversation with John.',
      sources: [{ title: 'A4O', url: 'https://att4opt.com/' }],
      handoff: true,
      mode: 'preview'
    };
  }

  const answer = relevant
    .map(item => item.chunk
      .replace(/^##\s+.+\n?/, '')
      .replace(/^[-*]\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim())
    .join(' ');

  return {
    answer: `${answer.slice(0, 780)}${answer.length > 780 ? '…' : ''}`,
    sources: [{ title: 'A4O approved knowledge', url: 'https://att4opt.com/' }],
    handoff: false,
    mode: 'preview'
  };
};

const askSecureAssistant = async question => {
  const response = await fetch(ATTUNED_CONFIG.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: question,
      // The current question is sent separately, so only send earlier turns here.
      history: conversationHistory.slice(0, -1).slice(-6)
    })
  });
  if (!response.ok) throw new Error('Secure assistant endpoint unavailable');
  return response.json();
};

const submitQuestion = async question => {
  const trimmed = question.trim();
  if (!trimmed) return;

  addMessage(trimmed, 'user');
  conversationHistory.push({ role: 'user', content: trimmed });
  input.value = '';
  input.disabled = true;

  const loading = addMessage('Reviewing the approved A4O knowledge…', 'bot', { loading: true });

  try {
    let result;
    try {
      result = await askSecureAssistant(trimmed);
    } catch {
      result = await answerFromKnowledge(trimmed);
    }

    loading.remove();
    addMessage(result.answer, 'bot', {
      sources: result.sources,
      handoff: Boolean(result.handoff)
    });
    conversationHistory.push({ role: 'assistant', content: result.answer });
  } catch {
    loading.remove();
    addMessage('I’m unable to retrieve an answer right now. Please request a conversation and the A4O team will follow up.', 'bot', { handoff: true });
  } finally {
    input.disabled = false;
    input.focus();
  }
};

launcher?.addEventListener('click', () => {
  if (panel.hidden) openAssistant();
  else closeAssistant();
});

closeButton?.addEventListener('click', closeAssistant);

form?.addEventListener('submit', event => {
  event.preventDefault();
  submitQuestion(input.value);
});

suggestions.forEach(button => button.addEventListener('click', () => {
  openAssistant();
  submitQuestion(button.textContent);
}));

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !panel.hidden) closeAssistant();
});

loadKnowledge();
