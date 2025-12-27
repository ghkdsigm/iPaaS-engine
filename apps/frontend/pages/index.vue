<!-- apps/frontend/pages/index.vue -->
<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 900; margin: 0">Dashboard</h1>
    <p style="margin: 10px 0 0; font-size: 13px; opacity: 0.72">
      상태 확인은 Runs / 승인 처리는 Approvals / 커맨드 실행은 Workflows에서 합니다.
    </p>

    <div style="margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px">
      <NuxtLink to="/workflows" style="text-decoration: none">
        <div :style="card">
          <div style="font-weight: 900; font-size: 16px">Workflows</div>
          <div style="margin-top: 6px; font-size: 13px; opacity: 0.75">자연어 커맨드 실행</div>
        </div>
      </NuxtLink>

      <NuxtLink to="/runs" style="text-decoration: none">
        <div :style="card">
          <div style="font-weight: 900; font-size: 16px">Runs</div>
          <div style="margin-top: 6px; font-size: 13px; opacity: 0.75">실행 결과/로그 확인</div>
        </div>
      </NuxtLink>

      <NuxtLink to="/approvals" style="text-decoration: none">
        <div :style="card">
          <div style="font-weight: 900; font-size: 16px">Approvals</div>
          <div style="margin-top: 6px; font-size: 13px; opacity: 0.75">승인/거절 처리</div>
        </div>
      </NuxtLink>

      <NuxtLink to="/servers" style="text-decoration: none">
        <div :style="card">
          <div style="font-weight: 900; font-size: 16px">Servers</div>
          <div style="margin-top: 6px; font-size: 13px; opacity: 0.75">MCP 서버/툴 목록</div>
        </div>
      </NuxtLink>
    </div>

    <div style="margin-top: 16px; border: 1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 14px">
      <div style="font-weight: 900; margin-bottom: 8px">Quick Check</div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center">
        <button :style="btnSecondary" :disabled="pinging" @click="ping">
          {{ pinging ? "Checking..." : "API Ping" }}
        </button>

        <div v-if="pingResult" style="font-size: 13px; opacity: 0.85">
          {{ pingResult }}
        </div>

        <div v-if="pingError" style="font-size: 13px; color: #ff8a8a">
          {{ pingError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $axios } = useNuxtApp();
const pinging = ref(false);
const pingResult = ref<string | null>(null);
const pingError = ref<string | null>(null);

const card = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "16px",
  padding: "14px",
  background: "rgba(255,255,255,0.04)"
} as any;

const btnSecondary = {
  height: "38px",
  padding: "0 14px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(230, 237, 247, 0.92)",
  fontWeight: "800",
  cursor: "pointer"
} as any;

async function ping() {
  pingError.value = null;
  pingResult.value = null;
  pinging.value = true;

  try {
    const res: any = await $axios.get('/health', {
      headers: { Authorization: "Bearer dev" }
    });

    pingResult.value = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  } catch (e: any) {
    pingError.value = e?.message || "Ping failed";
  } finally {
    pinging.value = false;
  }
}
</script>
