export class HttpTransport {
  async getJson(url: string, timeoutMs: number = 10000) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const r = await fetch(url, { signal: ac.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } finally {
      clearTimeout(t);
    }
  }

  async postJson(url: string, body: any, timeoutMs: number = 10000) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.error ? JSON.stringify(json.error) : `HTTP ${r.status}`);
      return json;
    } finally {
      clearTimeout(t);
    }
  }
}
