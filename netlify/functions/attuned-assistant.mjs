/*
  ATTUNED ASSISTANT — SECURE SERVER FUNCTION
  ==========================================
  Never place OPENAI_API_KEY in index.html, assistant.js, or this file.
  Add it as a protected environment variable in Netlify.

  The assistant uses:
  1. knowledge/attuned-assistant.md as A4O-approved source material.
  2. Optional live web search restricted to att4opt.com, quantup.ai, and gammasoft.pl.
*/

import { readFile } from 'node:fs/promises';

const KNOWLEDGE_URL = new URL('../../knowledge/attuned-assistant.md', import.meta.url);
const APPROVED_DOMAINS = ['att4opt.com', 'quantup.ai', 'gammasoft.pl'];
const ALLOWED_ORIGINS = [
  'https://att4opt.com',
  'https://www.att4opt.com',
  'https://johnkobielski.github.io'
];

const corsHeaders = event => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    ...(allowedOrigin ? { 'access-control-allow-origin': allowedOrigin } : {}),
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'Origin'
  };
};

const json = (statusCode, value, event) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...corsHeaders(event)
  },
  body: JSON.stringify(value)
});

const textFromResponse = data => {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  return (data.output || [])
    .filter(item => item.type === 'message')
    .flatMap(item => item.content || [])
    .filter(item => item.type === 'output_text')
    .map(item => item.text || '')
    .join('\n')
    .trim();
};

const sourcesFromResponse = data => {
  const sources = (data.output || [])
    .filter(item => item.type === 'web_search_call')
    .flatMap(item => item.action?.sources || [])
    .filter(source => source.url)
    .map(source => {
      const url = new URL(source.url);
      return {
        title: url.hostname.replace(/^www\./, ''),
        url: source.url
      };
    });

  return [...new Map(sources.map(source => [source.url, source])).values()].slice(0, 3);
};

const cleanHistory = history => Array.isArray(history)
  ? history
      .slice(-6)
      .filter(turn => ['user', 'assistant'].includes(turn?.role) && typeof turn.content === 'string')
      .map(turn => ({ role: turn.role, content: turn.content.slice(0, 1200) }))
  : [];

export const handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' }, event);
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(503, { error: 'The secure assistant is not configured yet.' }, event);
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body' }, event);
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (!message || message.length > 600) {
    return json(400, { error: 'Please provide a question of 600 characters or fewer.' }, event);
  }

  try {
    const knowledge = await readFile(KNOWLEDGE_URL, 'utf8');
    const input = [
      ...cleanHistory(payload.history),
      { role: 'user', content: message }
    ];

    const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.6-terra',
        reasoning: { effort: 'medium' },
        text: { verbosity: 'low' },
        max_output_tokens: 900,
        store: false,
        tools: [{
          type: 'web_search',
          filters: { allowed_domains: APPROVED_DOMAINS }
        }],
        tool_choice: 'auto',
        include: ['web_search_call.action.sources'],
        instructions: `You are Attuned Assistant, the customer-facing assistant for Attunement 4 Optimum (A4O).

Lead with a direct answer. Write in a warm, concise, executive-friendly style. Preserve the material evidence, caveat, and next action; omit generic introductions and repetition.

Use the approved knowledge below first. Use web search when a visitor asks whether A4O or a partner can deliver a capability and the exact answer is not explicit in the approved knowledge. Search only att4opt.com, quantup.ai, or gammasoft.pl.

You may use general model knowledge to explain technology concepts and solution options, but never as evidence that A4O or a partner has a specific capability, credential, client, or product.

Capability reasoning:
- CONFIRMED: approved knowledge or an approved website directly supports the capability.
- INFERRED: approved evidence establishes the adjacent skills and delivery lifecycle needed for the capability, but does not use the visitor's exact wording. You may answer "Yes, A4O can likely support that" and briefly explain the evidence, while stating that exact scope is confirmed during discovery.
- GENERAL: the answer explains a general concept without making an A4O capability claim.

For "Can you develop a custom LLM?" answer yes: A4O can lead the initiative and QuantUp can provide specialist AI product engineering. Explain that the confirmed base includes custom AI product development, bespoke solutions and algorithms, NLP, generative AI, APIs, scalable deployment, MLOps, and production integration. State that the exact model, data, RAG or adaptation approach, security, hosting, cost, and timeline are determined during discovery.

Never treat organizations shown on partner websites as direct A4O clients. Organizations in John's career history are leadership experience, not current A4O clients or endorsers.

Do not invent services, credentials, prices, timelines, certifications, client relationships, availability, or commitments. If the answer is not supported, say that you cannot verify it and invite the visitor to request a conversation.

End every answer with two separate final lines. Choose exactly one BASIS value and one HANDOFF value:
BASIS: CONFIRMED
BASIS: INFERRED
BASIS: GENERAL
HANDOFF: YES
HANDOFF: NO

Use HANDOFF: YES for contact or scheduling requests, unsupported questions, pricing, proposals, or situations needing a person.

APPROVED A4O KNOWLEDGE:
${knowledge}`,
        input
      })
    });

    const data = await openAIResponse.json();
    if (!openAIResponse.ok) {
      console.error('OpenAI response error', openAIResponse.status, data?.error?.message);
      return json(502, { error: 'The assistant could not complete the request.' }, event);
    }

    const rawAnswer = textFromResponse(data);
    const handoff = /(?:^|\n)HANDOFF:\s*YES\s*$/i.test(rawAnswer);
    const basisMatch = rawAnswer.match(/(?:^|\n)BASIS:\s*(CONFIRMED|INFERRED|GENERAL)\s*$/im);
    const basis = basisMatch
      ? {
          CONFIRMED: 'Confirmed by approved sources',
          INFERRED: 'Evidence-based inference · scope confirmed in discovery',
          GENERAL: 'General technology guidance'
        }[basisMatch[1].toUpperCase()]
      : 'Approved-source answer';
    const answer = rawAnswer
      .replace(/(?:^|\n)BASIS:\s*(?:CONFIRMED|INFERRED|GENERAL)\s*$/gim, '')
      .replace(/(?:^|\n)HANDOFF:\s*(?:YES|NO)\s*$/gim, '')
      .trim();

    if (!answer) {
      return json(502, { error: 'The assistant returned an empty response.' }, event);
    }

    const sources = sourcesFromResponse(data);
    if (!sources.length) {
      sources.push({ title: 'A4O approved knowledge', url: 'https://att4opt.com/' });
    }

    return json(200, { answer, handoff, sources, basis }, event);
  } catch (error) {
    console.error('Attuned Assistant error', error);
    return json(500, { error: 'The assistant is temporarily unavailable.' }, event);
  }
};
