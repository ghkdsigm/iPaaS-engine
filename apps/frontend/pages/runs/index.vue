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
        <div style="margin-top: 8px; font-size: 12px; color: #666">
          {{ r.command?.raw }}
        </div>

        <div v-if="r.steps?.length" style="margin-top: 10px">
          <div style="font-size: 12px; font-weight: 700; margin-bottom: 6px">Steps</div>
          <div
            v-for="s in r.steps"
            :key="s.id"
            style="font-size: 12px; padding: 6px 8px; border: 1px solid #eee; border-radius: 10px; margin-top: 6px"
          >
            <div><b>{{ s.index }}</b> · {{ s.tool }} · <b>{{ s.status }}</b></div>
            <div v-if="s.error" style="color: #c00; margin-top: 4px">error: {{ s.error }}</div>
          </div>
        </div>
      </div>

      <div v-if="!runs.length" style="margin-top: 12px; opacity: 0.7">No runs</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $axios } = useNuxtApp();
const runs = ref<any[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const res: any = await $axios.get('/runs');
    runs.value = Array.isArray(res.data) ? res.data : (res.data?.runs ?? []);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
