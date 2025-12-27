// plugins/axios.client.ts
import axios from "axios";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const rawBase = (config.public.apiBase || "").toString().trim();

  // Default to the nginx proxy path used in docker (/api -> orchestrator)
  // Use relative paths (e.g. $axios.get("runs")) in pages to ensure baseURL path is preserved.
  const baseURL = rawBase.length > 0 ? rawBase.replace(/\/$/, "") : "/api";

  const instance = axios.create({
    baseURL,
    withCredentials: true
  });

  return {
    provide: {
      axios: instance
    }
  };
});
