# Attuned Assistant setup and maintenance

## The file you edit

Edit `knowledge/attuned-assistant.md` whenever A4O services, partners, capabilities, biographies, FAQs, or contact details change.

The file is published with the website, so do not add passwords, API keys, private client information, or confidential material.

## Current testing mode

The website works immediately in knowledge-preview mode. It searches the approved Markdown file and can be tested without an API key.

GitHub Pages is a static host and cannot safely run the OpenAI API function. The secure function supplied in `netlify/functions/attuned-assistant.mjs` can run when the site is deployed through Netlify or when an equivalent server endpoint is provided.

## Enabling the full AI assistant on Netlify

1. Connect the `johnkobielski/A4O` repository to Netlify.
2. Leave the publish directory as `.` and functions directory as `netlify/functions`; these values are already in `netlify.toml`.
3. In Netlify, add an environment variable named `OPENAI_API_KEY`.
4. Optionally set `OPENAI_MODEL`. The default is `gpt-5.6-luna`, selected for a cost-sensitive customer Q&A workload.
5. Deploy the site.
6. Test the assistant with service, partner, contact, unsupported, and pricing questions.

Never put the API key in GitHub, JavaScript delivered to the browser, or the Markdown knowledge file.

The full assistant uses A4O-approved knowledge and may search only `att4opt.com`, `quantup.ai`, and `gammasoft.pl`. If it cannot verify an answer, it offers a human conversation.

## Before launch

Replace these two placeholders in `knowledge/attuned-assistant.md`:

- `Contact email: TO BE ADDED`
- `Scheduling link: TO BE ADDED`

Consider enabling Netlify rate limiting or a bot-protection control before promoting the assistant broadly.
