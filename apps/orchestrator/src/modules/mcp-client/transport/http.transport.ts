export class HttpTransport {
  async getJson(url: string) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }

  async postJson(url: string, body: any) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(json?.error ? JSON.stringify(json.error) : `HTTP ${r.status}`);
    return json;
  }
}
