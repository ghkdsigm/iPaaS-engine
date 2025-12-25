<!-- apps/frontend/pages/approvals/index.vue -->
<template>
  <div style="padding: 18px">
    <h2 style="font-size: 18px; font-weight: 700">Approvals</h2>

    <div v-if="loading" style="margin-top: 12px">Loading...</div>
    <div v-else>
      <div
        v-for="a in approvals"
        :key="a.id"
        style="margin-top: 12px; padding: 12px; border: 1px solid #ddd; border-radius: 12px"
      >
        <div style="display: flex; justify-content: space-between; gap: 12px">
          <div style="min-width: 0; flex: 1">
            <div style="font-weight: 700">{{ a.title }}</div>
            <div style="font-size: 12px; opacity: 0.7">Status: {{ a.status }}</div>
            <pre style="margin: 8px 0 0; padding: 8px; background: #f7f7f7; border-radius: 8px; overflow:auto">{{
              a.payload
            }}</pre>
          </div>
          <div style="display: flex; gap: 8px; align-items: start">
            <button @click="approve(a.id)" :disabled="a.status !== 'PENDING'">Approve</button>
            <button @click="reject(a.id)" :disabled="a.status !== 'PENDING'">Reject</button>
          </div>
        </div>
      </div>

      <div v-if="!approvals.length" style="margin-top: 12px; opacity: 0.7">No approvals</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const approvals = ref<any[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const res: any = await $fetch(`${apiBase}/approvals`, {
      headers: { Authorization: "Bearer dev" },
    });
    approvals.value = Array.isArray(res) ? res : (res?.approvals ?? []);
  } finally {
    loading.value = false;
  }
}

async function approve(id: string) {
  const res: any = await $fetch(`${apiBase}/approvals/${id}/approve`, {
    method: "POST",
    headers: { Authorization: "Bearer dev" },
  });

  await load();

  if (res?.runId) {
    await navigateTo("/runs");
  }
}

async function reject(id: string) {
  await $fetch(`${apiBase}/approvals/${id}/reject`, {
    method: "POST",
    headers: { Authorization: "Bearer dev" },
  });
  await load();
}

onMounted(load);
</script>
