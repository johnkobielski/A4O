# Attuned Assistant setup and maintenance

## The file you edit

Edit `knowledge/attuned-assistant.md` whenever A4O services, partners, capabilities, biographies, FAQs, or contact details change.

The file is published with the website, so do not add passwords, API keys, private client information, or confidential material.

## Why the live assistant currently feels limited

The GitHub Pages website currently runs in approved-knowledge preview mode. That mode does not call an LLM; it searches the Markdown knowledge file and uses a few curated capability answers. It is safe and free to test, but it cannot reason as broadly as the secure AI mode.

GitHub Pages is a static host and cannot safely hold an OpenAI API key or execute the supplied server function.

## Recommended: keep the site on GitHub Pages and host only the AI function on Netlify

1. Connect the `johnkobielski/A4O` repository to Netlify.
2. Leave the publish directory as `.` and functions directory as `netlify/functions`; these values are already in `netlify.toml`.
3. In Netlify, add an environment variable named `OPENAI_API_KEY`.
4. Optionally set `OPENAI_MODEL`. The default is `gpt-5.6-terra`, selected to balance answer quality and cost. Use `gpt-5.6-sol` when maximum answer quality matters more than cost.
5. Deploy the site.
6. Copy the deployed Netlify site URL.
7. In `index.html`, find `window.ATTUNED_ASSISTANT_ENDPOINT` and set it to:
   `https://YOUR-NETLIFY-SITE.netlify.app/api/attuned-assistant`
8. Republish `index.html` to GitHub Pages.
9. Test the assistant with service, partner, contact, unsupported, and pricing questions.

Never put the API key in GitHub, JavaScript delivered to the browser, or the Markdown knowledge file.

The secure function already permits calls from `att4opt.com`, `www.att4opt.com`, and the GitHub Pages origin. The full assistant uses A4O-approved knowledge, applies broader model reasoning for technology explanations, and searches only `att4opt.com`, `quantup.ai`, and `gammasoft.pl` for business-specific evidence.

For capability questions, the assistant distinguishes confirmed facts from evidence-based inferences. It may infer a nearby capability when approved evidence supports the required skills, but it must label the scope as subject to discovery. If it cannot verify or responsibly infer an answer, it offers a human conversation.

## Example now covered

For “Can you develop a custom LLM?”, the assistant can answer yes based on QuantUp’s documented AI product-development lifecycle, bespoke solutions and algorithms, natural-language processing, generative AI, APIs, scalable deployment, MLOps, and production integration. A4O’s role is business case, governance, responsible-AI controls, adoption, and program leadership; the exact solution architecture is confirmed during discovery.

## Contact links now configured

- Scheduling: `https://calendly.com/john-kobielski-att4opt`
- Email: `john.kobielski@att4opt.com`

Consider enabling Netlify rate limiting or a bot-protection control before promoting the assistant broadly.
