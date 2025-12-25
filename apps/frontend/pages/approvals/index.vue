<template>
  <div
    style="max-width: 980px; margin: 24px auto; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;"
  >
    <h2 style="margin: 0 0 12px;">Approvals</h2>

    <button
      @click="load"
      style="padding: 8px 12px; border: 1px solid #333; border-radius: 10px; background: #fff; cursor: pointer;"
    >
      Refresh
    </button>

    <div
      v-for="a in approvals"
      :key="a.id"
      style="margin-top: 12px; padding: 12px; border: 1px solid #eee; border-radius: 12px;"
    >
      <div><b>{{ a.status }}</b> — {{ a.reason }}</div>

      <div style="margin-top: 8px; display: flex; gap: 8px;">
        <button
          v-if="a.status === 'PENDING'"
          @click="approve(a.id)"
          style="padding: 6px 10px; border: 1px solid #0a0; border-radius: 10px; background: #fff; cursor: pointer;"
        >
          Approve
        </button>

        <button
          v-if="a.status === 'PENDING'"
          @click="reject(a.id)"
          style="padding: 6px 10px; border: 1px solid #b00; border-radius: 10px; background: #fff; cursor: pointer;"
        >
          Reject
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const approvals = ref<any[]>([])

async function load() {
  const r: any = await $fetch(`${config.public.apiBase}/approvals`)
  approvals.value = r.approvals || []
}

async function approve(id: string) {
  await $fetch(`${config.public.apiBase}/approvals/${id}/approve`, { method: "POST" })
  await load()
}

async function reject(id: string) {
  await $fetch(`${config.public.apiBase}/approvals/${id}/reject`, { method: "POST" })
  await load()
}

onMounted(load)
</script>
