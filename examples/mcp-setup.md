# Connect an MCP agent to Kit for AI

The hosted MCP server exposes your memory, knowledge bases, conversion, and web
search as tools any MCP client can call.

- Endpoint: `https://kitforai.com/api/mcp`
- Auth: header `x-api-key: kfa_...` (create a key at <https://kitforai.com/app/settings>)

## Tools

`remember`, `recall`, `search_knowledge_base`, `read_knowledge_base`,
`write_knowledge_base`, `append_knowledge_base`, `list_knowledge_bases`,
`convert_url`, `crawl`, `list_recent_conversions`.

## Claude Code (via this repo's plugin)

```
/plugin marketplace add kitforai/kitforai
/plugin install kit-for-ai@kitforai-dev
export KITFORAI_API_KEY=kfa_...
```

## Any MCP client (raw config)

```json
{
  "kit-for-ai": {
    "type": "http",
    "url": "https://kitforai.com/api/mcp",
    "headers": { "x-api-key": "${KITFORAI_API_KEY}" }
  }
}
```

## Let the agent configure itself

Point your agent at <https://kitforai.com/llm-setup> — it returns setup
instructions the model can follow, and `https://kitforai.com/llms.txt` indexes
the endpoints and docs.
