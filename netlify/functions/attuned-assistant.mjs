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

const json = (statusCode, value) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
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
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(503, { error: 'The secure assistant is not configured yet.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body' });
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (!message || message.length > 600) {
    return json(400, { error: 'Please provide a question of 600 characters or fewer.' });
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
        model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
        reasoning: { effort: 'low' },
        max_output_tokens: 500,
        store: false,
        tools: [{
          type: 'web_search',
          filters: { allowed_domains: APPROVED_DOMAINS }
        }],
        tool_choice: 'auto',
        include: ['web_search_call.action.sources'],
        instructions: `You are Attuned Assistant, the customer-facing assistant for Attunement 4 Optimum (A4O).

Answer in a warm, concise, executive-friendly style. Use no more than three short paragraphs unless the visitor asks for detail.

Use the approved knowledge below first. You may use web search only to verify or supplement information from att4opt.com, quantup.ai, or gammasoft.pl. Never treat organizations shown on partner websites as direct A4O clients. Organizations in John's career history are leadership experience, not current A4O clients or endorsers.

Do not invent services, credentials, prices, timelines, certifications, client relationships, availability, or commitments. If the answer is not supported, say that you cannot verify it and invite the visitor to request a conversation.

End every answer with a separate final line exactly in one of these formats:
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
      return json(502, { error: 'The assistant could not complete the request.' });
    }

    const rawAnswer = textFromResponse(data);
    const handoff = /(?:^|\n)HANDOFF:\s*YES\s*$/i.test(rawAnswer);
    const answer = rawAnswer
      .replace(/(?:^|\n)HANDOFF:\s*(?:YES|NO)\s*$/i, '')
      .trim();

    if (!answer) {
      return json(502, { error: 'The assistant returned an empty response.' });
    }

    const sources = sourcesFromResponse(data);
    if (!sources.length) {
      sources.push({ title: 'A4O approved knowledge', url: 'https://att4opt.com/' });
    }

    return json(200, { answer, handoff, sources });
  } catch (error) {
    console.error('Attuned Assistant error', error);
    return json(500, { error: 'The assistant is temporarily unavailable.' });
  }
};
