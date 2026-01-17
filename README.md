# Live user agents

A tiny experiment that shows **every user agent hitting a page in real time**, including referrers, as it happens.

No cookies. No analytics dashboards. Just raw traffic.

## What this is

- Live stream of page views
- User agent + referrer (when present)
- Naive human vs bot classification
- Built to make bot traffic *visible* when a link goes viral

If this page hits Reddit or Hacker News, you can literally watch the traffic shape change.

## Why

People talk about bots constantly.  
Very few tools let you **see them**.

This is intentionally simple, public, and slightly voyeuristic.

## How it works

- Cloudflare Worker at the edge
- Server-Sent Events (SSE) for realtime updates
- Durable Object holds:
  - active connections
  - a rolling in-memory buffer of recent hits
- No IP addresses stored
- No cookies
- No persistence beyond the rolling window

## Stack

- Cloudflare Workers
- Durable Objects
- Vanilla HTML + JS
- SSE (no WebSockets)

## Bot detection

Best-effort heuristic based on user agent strings.

It will be wrong sometimes.  
That’s fine — the goal is visibility, not enforcement.

## Running locally

```bash
npm install
npx wrangler dev
