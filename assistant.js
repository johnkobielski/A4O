/*
  ATTUNED ASSISTANT — MANUAL EDITING
  ===================================
  1. Edit knowledge/attuned-assistant.md to change the assistant's information.
  2. A secure AI endpoint belongs at /api/attuned-assistant.
  3. Until that endpoint is deployed, the widget automatically uses a searchable
     preview of the same knowledge file so the interface can be tested safely.
*/

const ATTUNED_CONFIG = {
  // GitHub Pages cannot run a secure API function. Set this global in index.html
  // to the separately deployed Netlify endpoint when full AI mode is ready.
  endpoint: window.ATTUNED_ASSISTANT_ENDPOINT || '/api/attuned-assistant',
  knowledgePath: 'knowledge/attuned-assistant.md',
  scheduleUrl: 'https://calendly.com/john-kobielski-att4opt',
  contactEmail: 'john.kobielski@att4opt.com'
};

const FALLBACK_KNOWLEDGE = `
## Attunement 4 Optimum
A4O is a U.S.-based strategy, transformation, program leadership, and organizational adoption company. A4O coordinates specialist technology partners to deliver AI, analytics, custom software, automation, IoT, integration, and support.

## Industrial AI, IoT, and digitalization
A4O helps organizations prioritize industrial AI use cases, build governance, coordinate computer vision and predictive analytics delivery, integrate IoT and operational data, redesign workflows, and drive adoption.

## Technology partners
QuantUp provides AI, advanced analytics, optimization, computer vision, generative AI, and production integration. GammaSoft provides enterprise software, workflow automation, IoT and smart-city platforms, integration, modernization, maintenance, and support.

## Custom LLM and generative AI solutions
A4O can lead a custom LLM or generative AI initiative, with QuantUp providing specialist AI product engineering. The capability base includes custom AI product development, bespoke algorithms and solutions, natural-language processing, generative AI, APIs, scalable deployment, MLOps, and production integration. The exact architecture is confirmed during discovery.

## Contact
Schedule an appointment with John S. Kobielski, PhD, MBA, at https://calendly.com/john-kobielski-att4opt or email john.kobielski@att4opt.com.
`;

const launcher = document.querySelector('.assistant-launcher');
const panel = document.querySelector('.assistant-panel');
const closeButton = document.querySelector('.assistant-close');
const form = document.querySelector('.assistant-form');
const input = document.querySelector('#assistant-input');
const messages = document.querySelector('.assistant-messages');
const suggestions = [...document.querySelectorAll('.assistant-suggestions button')];
const modeLabel = document.querySelector('.assistant-mode');

let knowledgePromise;
let conversationHistory = [];

const setAssistantMode = mode => {
  if (!modeLabel) return;
  modeLabel.textContent = mode === 'ai'
    ? 'AI reasoning · approved sources'
    : 'Approved-knowledge preview · AI endpoint not connected';
};

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

  if (options.basis) {
    const basis = document.createElement('span');
    basis.className = 'assistant-basis';
    basis.textContent = options.basis;
    article.appendChild(basis);
  }

  if (options.handoff) {
    const actions = document.createElement('div');
    actions.className = 'assistant-handoff-actions';

    const schedule = document.createElement('a');
    schedule.className = 'assistant-handoff';
    schedule.href = ATTUNED_CONFIG.scheduleUrl;
    schedule.target = '_blank';
    schedule.rel = 'noopener';
    schedule.textContent = 'Schedule an appointment →';

    const contact = document.createElement('a');
    contact.className = 'assistant-handoff assistant-handoff-secondary';
    contact.href = `mailto:${ATTUNED_CONFIG.contactEmail}`;
    contact.textContent = 'Contact us →';

    actions.append(schedule, contact);
    article.appendChild(actions);
  }

  messages.appendChild(article);
  messages.scrollTop = messages.scrollHeight;
  return article;
};

const normalizeWords = value => (value.toLowerCase().match(/[a-z0-9]+/g) || [])
  .filter(word => (word.length > 2 || ['ai', 'ml'].includes(word))
    && !['the', 'and', 'that', 'with', 'for', 'from', 'your', 'about', 'how', 'can', 'does', 'help', 'what', 'tell', 'our'].includes(word));

const answerKnownCapability = question => {
  const customLLMIntent = /\b(?:custom|private|domain[- ]specific|bespoke)\b.{0,45}\b(?:llm|large language model|generative ai|ai assistant|chatbot|rag)\b|\b(?:llm|large language model|generative ai|ai assistant|chatbot|rag)\b.{0,45}\b(?:build|create|develop|custom|private|bespoke)\b/i;

  if (!customLLMIntent.test(question)) return null;

  return {
    answer: 'Yes. A4O can lead a custom LLM or generative AI initiative, with QuantUp providing specialist AI product engineering. The confirmed capability base includes custom AI product development, bespoke algorithms and solutions, natural-language processing, generative AI, APIs, scalable deployment, MLOps, and production integration. Depending on discovery, the solution could use private organizational knowledge, retrieval-augmented generation, model adaptation, tool-using workflows, evaluation, guardrails, and monitoring. A4O would lead the business case, governance, responsible-AI controls, adoption, and measurable outcomes; the exact architecture, cost, security design, and timeline would be confirmed during discovery.',
    sources: [
      { title: 'QuantUp — AI product development', url: 'https://quantup.ai/what-we-do/ai-product-development/' },
      { title: 'QuantUp — bespoke AI solutions', url: 'https://quantup.ai/what-we-do/business-process-optimisation/' }
    ],
    handoff: false,
    basis: 'Supported capability · scope confirmed in discovery',
    mode: 'preview'
  };
};

const answerFromKnowledge = async question => {
  const knownCapability = answerKnownCapability(question);
  if (knownCapability) return knownCapability;

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
        ? 'Yes. You can schedule an appointment directly with John using Calendly or email A4O at john.kobielski@att4opt.com. Choose either option below.'
        : 'I could not verify that from the approved A4O knowledge. I can still help you request a conversation with John.',
      sources: [{ title: 'A4O', url: 'https://att4opt.com/' }],
      handoff: true,
      basis: 'Human confirmation recommended',
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
    basis: 'Approved A4O knowledge',
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
      setAssistantMode('ai');
    } catch {
      result = await answerFromKnowledge(trimmed);
      setAssistantMode('preview');
    }

    loading.remove();
    addMessage(result.answer, 'bot', {
      sources: result.sources,
      handoff: Boolean(result.handoff),
      basis: result.basis
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
