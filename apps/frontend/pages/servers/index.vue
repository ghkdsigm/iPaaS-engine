<template>
  <div style="max-width: 980px; margin: 24px auto; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">
    <h2 style="margin:0 0 12px;">Servers</h2>
<button @click="sync" style="padding:8px 12px; border:1px solid #333; border-radius:10px; background:#fff; cursor:pointer;">Sync HR tools</button>
<pre style="margin-top:12px; padding:12px; border:1px solid #eee; border-radius:10px; background:#fafafa;">{{ out }}</pre>
<script setup lang="ts">
const config = useRuntimeConfig();
const out = ref("");
async function sync() {
  const r = await $fetch(`${config.public.apiBase}/tool-registry/sync?server=hr`);
  out.value = JSON.stringify(r, null, 2);
}
</script>

  </div>
</template>
