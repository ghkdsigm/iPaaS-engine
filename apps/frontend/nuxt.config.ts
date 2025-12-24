export default defineNuxtConfig({
  runtimeConfig: { public: { apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:8080/api" } },
  app: { head: { title: "Company Automation Admin" } }
});
