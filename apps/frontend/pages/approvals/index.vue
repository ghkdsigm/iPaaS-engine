<!-- apps/frontend/pages/approvals/index.vue -->
<template>
  <div class="p-[18px]">
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-xl font-black m-0">승인 대기</h2>
        <p class="mt-2 text-[13px] opacity-[0.72]">
          승인이 필요한 작업들을 확인하고 승인 또는 거절할 수 있습니다.
        </p>
      </div>

      <button 
        :class="['h-[38px]', 'px-[14px]', 'rounded-xl', 'border', 'border-white/10', 'bg-white/6', 'text-[#e6edf7]/92', 'font-extrabold', 'text-[13px]', 'cursor-pointer', loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90']"
        @click="load" 
        :disabled="loading"
      >
        {{ loading ? "로딩 중..." : "새로고침" }}
      </button>
    </div>

    <div v-if="loading" class="mt-4 opacity-70">Loading...</div>

    <div v-else class="mt-4">
      <div
        v-for="a in approvals"
        :key="a.id"
        class="mt-3 p-[14px] border border-white/10 rounded-xl bg-white/2"
      >
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="flex-1 min-w-0">
            <div class="font-bold text-[15px] text-[#e6edf7]/95 mb-2">
              {{ a.commandRaw || "(명령어 없음)" }}
            </div>
            
            <div class="flex gap-[10px] flex-wrap items-center mt-2">
              <div class="text-xs text-[#e6edf7]/70">
                Status: <span class="font-bold text-[#e6edf7]/90">{{ a.status }}</span>
              </div>
              <span v-if="a.reason" class="text-xs text-[#e6edf7]/60">
                · {{ a.reason }}
              </span>
              <span class="text-xs text-[#e6edf7]/50">
                · {{ formatDate(a.createdAt) }}
              </span>
            </div>

            <div v-if="a.preview || a.diff" class="mt-3 grid grid-cols-1 gap-[10px]">
              <details v-if="a.preview" class="border border-white/8 rounded-[10px] overflow-hidden">
                <summary class="p-2 px-[10px] bg-white/4 cursor-pointer text-xs font-bold text-[#e6edf7]/80">
                  PREVIEW 보기
                </summary>
                <pre class="m-0 p-[10px] max-h-[300px] overflow-auto text-[11px] leading-[1.5] text-[#e6edf7]/85 bg-black/20">{{ pretty(a.preview) }}</pre>
              </details>

              <details v-if="a.diff" class="border border-white/8 rounded-[10px] overflow-hidden">
                <summary class="p-2 px-[10px] bg-white/4 cursor-pointer text-xs font-bold text-[#e6edf7]/80">
                  DIFF 보기
                </summary>
                <pre class="m-0 p-[10px] max-h-[300px] overflow-auto text-[11px] leading-[1.5] text-[#e6edf7]/85 bg-black/20">{{ pretty(a.diff) }}</pre>
              </details>
            </div>
          </div>

          <div v-if="a.status === 'PENDING'" class="flex gap-2 shrink-0 flex-wrap">
            <button
              :class="['h-[38px]', 'px-4', 'rounded-[10px]', 'border', 'border-green-500/30', 'bg-green-500/20', 'text-[#86efac]', 'font-black', 'text-sm', 'cursor-pointer', 'hover:opacity-90', busy ? 'opacity-50 cursor-not-allowed' : '']"
              :disabled="busy"
              @click="approve(a.id)"
            >
              승인
            </button>
            <button
              :class="['h-[38px]', 'px-4', 'rounded-[10px]', 'border', 'border-red-500/30', 'bg-red-500/18', 'text-[#fca5a5]', 'font-black', 'text-sm', 'cursor-pointer', 'hover:opacity-90', busy ? 'opacity-50 cursor-not-allowed' : '']"
              :disabled="busy"
              @click="reject(a.id)"
            >
              거절
            </button>
          </div>
          <div v-else class="px-3 py-2 rounded-lg bg-white/4 text-xs text-[#e6edf7]/60">
            처리 완료
          </div>
        </div>
      </div>

      <div v-if="approvals.length === 0" class="mt-4 py-6 text-center border border-white/10 rounded-xl text-[#e6edf7]/60">
        승인 대기 항목이 없습니다.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

type ApprovalRow = {
  id: string;
  status: string;
  reason?: string | null;
  createdAt: string;
  command: { raw: string };
  preview?: any;
  diff?: any;
};

const { $axios } = useNuxtApp();
const loading = ref(true);
const busy = ref(false);
const approvals = ref<
  { id: string; status: string; reason?: string | null; createdAt: string; commandRaw: string; preview: any; diff: any }[]
>([]);

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function pretty(v: any) {
  return JSON.stringify(v ?? null, null, 2);
}

async function load() {
  loading.value = true;
  try {
    const r = await $axios.get<{ approvals: any[] }>('/approvals', {
      headers: { Authorization: "Bearer dev" },
    });

    approvals.value = ((r.data.approvals || []) as any[]).map((a: any) => ({
      id: a.id,
      status: a.status,
      reason: a.reason,
      createdAt: a.createdAt,
      commandRaw: a.plan?.command?.raw ?? a.command?.raw ?? a.commandRaw ?? "",
      preview: a.preview ?? null,
      diff: a.diff ?? null,
    }));
  } finally {
    loading.value = false;
  }
}

async function approve(id: string) {
  busy.value = true;
  try {
    await $axios.post(`/approvals/${id}/approve`, {}, {
      headers: { Authorization: "Bearer dev" },
    });
    await navigateTo("/runs");
  } finally {
    busy.value = false;
  }
}

async function reject(id: string) {
  busy.value = true;
  try {
    await $axios.post(`/approvals/${id}/reject`, {}, {
      headers: { Authorization: "Bearer dev" },
    });
    await load();
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>
