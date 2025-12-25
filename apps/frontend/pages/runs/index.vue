<template>
  <div
    style="max-width: 980px; margin: 24px auto; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;"
  >
    <h2 style="margin: 0 0 12px;">Runs</h2>

    <button
      @click="load"
      style="padding: 8px 12px; border: 1px solid #333; border-radius: 10px; background: #fff; cursor: pointer;"
    >
      Refresh
    </button>

    <div
      v-for="r in runs"
      :key="r.id"
      style="margin-top: 12px; padding: 12px; border: 1px solid #eee; border-radius: 12px;"
    >
      <div style="display: flex; justify-content: space-between; gap: 12px;">
        <div>
          <b>{{ r.status }}</b>
        </div>
        <div style="font-size: 12px; color: #666;">
          {{ formatTime(r.createdAt) }}
        </div>
      </div>

      <div style="margin-top: 8px; font-size: 12px; color: #666;">
        {{ r.command?.raw }}
      </div>

      <pre
        v-if="r.result"
        style="margin-top: 12px; padding: 12px; border: 1px solid #eee; border-radius: 10px; background: #fafafa; overflow: auto;"
      >{{ pretty(r.result) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const runs = ref<any[]>([])

function pretty(v: any) {
  try {
    return typeof v === "string" ? v : JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

function formatTime(v: any) {
  if (!v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString()
}

async function load() {
  const r: any = await $fetch(`${config.public.apiBase}/runs`)
  runs.value = r.runs || []
}

onMounted(load)
</script>
