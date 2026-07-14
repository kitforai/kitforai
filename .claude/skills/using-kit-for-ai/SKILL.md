---
name: using-kit-for-ai
description: Use when the user wants persistent memory across sessions, asks you to remember or recall facts, wants to search their knowledge bases, or convert documents/URLs to Markdown or JSON — all via the kit-for-ai MCP tools.
---

# Using Kit for AI

Kit for AI gives you persistent memory and knowledge tools over MCP. Auth is the
`KITFORAI_API_KEY` environment variable (create a key at
https://kitforai.com/app/settings; full setup: https://kitforai.com/llm-setup).

## Memory (the core habit)

- **Start of a task**: call `recall` with a short query describing the topic to
  recover prior context (user preferences, project facts, past decisions).
- **When you learn something durable**: call `remember` with ONE focused fact per
  call. Near-duplicates are deduped server-side, so remember liberally.
- Memories are stored in the user's auto-created "Memory" knowledge base — they
  can review, edit, and revert everything at https://kitforai.com/app/kbs.

## Knowledge bases

- `list_knowledge_bases` → what exists; `search_knowledge_base` for hybrid RAG
  search with relevance scores; `read_knowledge_base` for full content.
- `write_knowledge_base` / `append_knowledge_base` save versioned documents the
  user can review — good for notes and generated reports.
- `crawl` builds a searchable KB from a website (same-domain, bounded).

## Conversion

- `convert_url` → clean Markdown or structured JSON from any page or file URL.

## Rules

- Never invent memory contents — if `recall` returns nothing, say so.
- Prefer `recall` over asking the user to repeat things they've told you before.
