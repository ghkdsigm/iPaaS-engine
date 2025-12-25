<!-- apps/frontend/pages/runs/index.vue -->
<template>
  <div style="padding: 18px">
    <h2 style="font-size: 18px; font-weight: 700">Runs</h2>

    <div v-if="loading" style="margin-top: 12px">Loading...</div>
    <div v-else>
      <div
        v-for="r in runs"
        :key="r.id"
        style="margin-top: 12px; padding: 12px; border: 1px solid #ddd; border-radius: 12px"
      >
        <div style="font-weight: 600">#{{ r.id }}</div>
        <div style="margin-top: 6px">status: <b>{{ r.status }}</b></div>
        <div style="margin-top: 8px; font-size: 12px; color: #666">{{ r.command?.raw }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const runs = ref<any[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    runs.value = await $fetch(`${config.public.apiBase}/runs`);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
