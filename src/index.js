export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === "/hit" || url.pathname === "/stream") {
      const id = env.STREAM.idFromName("live-user-agents")
      return env.STREAM.get(id).fetch(request)
    }
    return env.ASSETS.fetch(request)
  }
}

export class StreamHub {
  constructor(state, env) {
    this.state = state
    this.env = env
    this.clients = new Set()
    this.buffer = []
    this.maxBuffer = 5000
  }

  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === "/stream" && request.method === "GET") {
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()

      const send = (obj) => writer.write(new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`))

      for (const e of this.buffer.slice(-200)) send(e)

      const client = { writer, send }
      this.clients.add(client)

      request.signal.addEventListener("abort", () => {
        this.clients.delete(client)
        try { writer.close() } catch {}
      })

      return new Response(readable, {
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          "connection": "keep-alive",
          "access-control-allow-origin": "*"
        }
      })
    }

    if (url.pathname === "/hit" && request.method === "POST") {
      let body = {}
      try { body = await request.json() } catch {}

      const ua = request.headers.get("user-agent") || ""
      const ref = request.headers.get("referer") || ""
      const path = typeof body.path === "string" ? body.path : "/"
      const isBot = /bot|crawler|spider|curl|wget|python|requests|headless/i.test(ua)
      const label = isBot ? "bot" : "human"

      const cf = request.cf || {}
      const accept = request.headers.get("accept") || null
      const secFetchSite = request.headers.get("sec-fetch-site") || null
      const httpProtocol = cf.httpProtocol || null
      const country = cf.country || null
      const city = cf.city || null
      const colo = cf.colo || null
      
      const uaLower = ua.toLowerCase()
      const device =
        /iphone|ipad|android/.test(uaLower) ? "mobile" :
        /mac|win|linux/.test(uaLower) ? "desktop" :
        "unknown"
      
      const browser =
        ua.includes("Firefox/") ? "firefox" :
        ua.includes("Edg/") ? "edge" :
        ua.includes("Chrome/") && !ua.includes("Edg/") ? "chrome" :
        ua.includes("Safari/") && !ua.includes("Chrome/") ? "safari" :
        "unknown"
      
      const evt = {
        tsUtc: new Date().toISOString(),
        ua,
        ref: ref || body.ref || null,
        path,
        label,
        country,
        city,
        colo,
        httpProtocol,
        accept,
        secFetchSite,
        browser,
        device,
        qs: body.qs || null
      }
      

      this.buffer.push(evt)
      if (this.buffer.length > this.maxBuffer) this.buffer.splice(0, this.buffer.length - this.maxBuffer)

      for (const c of this.clients) {
        try { c.send(evt) } catch {}
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
      })
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "content-type"
        }
      })
    }

    return new Response("not found", { status: 404 })
  }
}
