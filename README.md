# Kit for AI — Developer Hub

[![CI](https://github.com/kitforai/kitforai/actions/workflows/ci.yml/badge.svg)](https://github.com/kitforai/kitforai/actions/workflows/ci.yml)

Public developer resources for [Kit for AI](https://kitforai.com): persistent
memory for AI agents — `remember`/`recall`, knowledge-base RAG search, cited
chat, and document→Markdown/JSON conversion, over **MCP** and **REST** with one
API key.

Get an API key at <https://kitforai.com/app/settings> (starts with `kfa_`).

## What's inside

| Path | What it is |
|------|-----------|
| [`packages/sdk`](packages/sdk) | `@kitforai/sdk` — the official typed TypeScript/JavaScript REST client (convert, knowledge bases). Zero-dependency, ESM + CJS. |
| [`plugins/kit-for-ai`](plugins/kit-for-ai) | The Claude Code plugin — wires the Kit for AI MCP tools + a usage skill into Claude with one command. |
| [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) | Makes this repo an installable plugin marketplace (`kitforai`). |
| [`.claude/`](.claude) | A `using-kit-for-ai` skill — clone this repo and Claude Code knows when to remember/recall and use the tools. |
| [`llms.txt`](llms.txt) | Machine-readable index for agents (mirrors <https://kitforai.com/llms.txt>). |
| [`examples/`](examples) | Runnable SDK and MCP setup examples. |

## Use the SDK

```bash
npm install @kitforai/sdk
```

```ts
import { KitForAI } from "@kitforai/sdk";

const kit = new KitForAI({ apiKey: process.env.KITFORAI_API_KEY! });

// Convert a URL to structured JSON
const res = await kit.convertUrl("https://example.com/report.pdf", { outputFormat: "json" });
```

See [`examples/sdk-quickstart.ts`](examples/sdk-quickstart.ts) to get started, or
[`examples/sdk-all-methods.ts`](examples/sdk-all-methods.ts) for a runnable tour of
**every** SDK method — conversions, batch, files, the full knowledge-base lifecycle
(search, read, versioned write/append/edit/revert), and API keys.

## Use the Claude plugin

```
/plugin marketplace add kitforai/kitforai
/plugin install kit-for-ai@kitforai
```

```bash
export KITFORAI_API_KEY=kfa_...
```

> This repo is the canonical home for the plugin, the SDK, and MCP setup. The
> plugin is submitted to Anthropic's Claude plugin directory from here.

## Connect any MCP agent

Point any MCP client at the hosted server — see [`examples/mcp-setup.md`](examples/mcp-setup.md):

```json
{
  "kit-for-ai": {
    "type": "http",
    "url": "https://kitforai.com/api/mcp",
    "headers": { "x-api-key": "${KITFORAI_API_KEY}" }
  }
}
```

Agents can self-configure from <https://kitforai.com/llm-setup>.

## Links

- Docs: <https://kitforai.com/docs> · API reference: <https://kitforai.com/reference>
- MCP endpoint: `https://kitforai.com/api/mcp` · REST base: `https://kitforai.com/api/v1`

## License

MIT — see [LICENSE](LICENSE).
