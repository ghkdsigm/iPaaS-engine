export class HttpTransport {
  async getJson(url: string, timeoutMs = 15000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const r = await fetch(url, { signal: controller.signal });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.error ? String(json.error) : `HTTP ${r.status}`);
      return json;
    } finally {
      clearTimeout(t);
    }
  }

  async postJson(url: string, body: any, timeoutMs = 15000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.error ? String(json.error) : `HTTP ${r.status}`);
      return json;
    } finally {
      clearTimeout(t);
    }
  }
}
