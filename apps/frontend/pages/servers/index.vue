<!-- apps/frontend/pages/servers/index.vue -->
<template>
  <div style="padding: 18px">
    <h2 style="font-size: 18px; font-weight: 700">Tool Servers</h2>

    <div style="margin-top: 12px">
      <button @click="sync" :disabled="syncing" style="padding: 8px 10px; border: 1px solid #ccc; border-radius: 10px">
        {{ syncing ? "Syncing..." : "Sync" }}
      </button>
      <span style="margin-left: 10px; color: #666">
        {{ statusMessage }}
      </span>
    </div>

    <div v-if="loading" style="margin-top: 12px">Loading...</div>
    <div v-else>
      <div
        v-for="t in tools"
        :key="t.name"
        style="margin-top: 12px; padding: 12px; border: 1px solid #ddd; border-radius: 12px"
      >
        <div style="display: flex; justify-content: space-between">
          <div style="font-weight: 700">{{ t.name }}</div>
          <div style="color: #666">{{ t.serverName }}</div>
        </div>
        <div style="margin-top: 6px; color: #444">{{ t.description }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { $axios } = useNuxtApp();
const tools = ref([]);
const loading = ref(true);
const syncing = ref(false);
const statusMessage = ref("");

async function fetchTools() {
  loading.value = true;
  try {
    const res = await $axios.get("/tool-registry/tools");
    tools.value = res.data;
  } finally {
    loading.value = false;
  }
}

async function sync() {
  syncing.value = true;
  statusMessage.value = "";
  try {
    const res = await $axios.get("/tool-registry/sync");
    const data = res.data;
    statusMessage.value = data?.ok ? "Synced" : "Sync failed";
    await fetchTools();
  } catch (e) {
    statusMessage.value = "Sync error";
  } finally {
    syncing.value = false;
  }
}

onMounted(fetchTools);
</script>
