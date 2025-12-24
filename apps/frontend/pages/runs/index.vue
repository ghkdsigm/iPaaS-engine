<template>
  <div style="max-width: 980px; margin: 24px auto; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">
    <h2 style="margin:0 0 12px;">Runs</h2>
<button @click="load" style="padding:8px 12px; border:1px solid #333; border-radius:10px; background:#fff; cursor:pointer;">Refresh</button>
<div v-for="r in runs" :key="r.id" style="margin-top:12px; padding:12px; border:1px solid #eee; border-radius:12px;">
  <div><b>{{ r.status }}</b> — {{ r.createdAt }}</div>
  <div style="margin-top:8px; font-size:12px; color:#666;">{{ r.command?.raw }}</div>
</div>
<script setup lang="ts">
const config = useRuntimeConfig();
const runs = ref<any[]>([]);
async function load() {
  const r: any = await $fetch(`${config.public.apiBase}/runs`);
  runs.value = r.runs || [];
}
onMounted(load);
</script>

  </div>
</template>
