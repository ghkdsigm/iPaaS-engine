<!-- apps/frontend/pages/workflows/index.vue -->
<template>
  <div>
    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap">
      <div>
        <h2 style="font-size: 20px; font-weight: 900; margin: 0">Workflows</h2>
        <p style="margin: 8px 0 0; font-size: 13px; opacity: 0.72">
          자연어 커맨드를 실행해서 Plan 생성 → (승인 필요 시 Approvals) → 실행 결과는 Runs에서 확인합니다.
        </p>
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <NuxtLink to="/runs" style="text-decoration: none">
          <button :style="btnSecondary">Runs 보기</button>
        </NuxtLink>
        <NuxtLink to="/approvals" style="text-decoration: none">
          <button :style="btnSecondary">Approvals 보기</button>
        </NuxtLink>
      </div>
    </div>

    <div style="margin-top: 16px; border: 1px solid rgba(255,255,255,0.10); border-radius: 16px; overflow: hidden">
      <div style="padding: 14px 14px; background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.08)">
        <div style="font-weight: 900">Command Runner</div>
        <div style="font-size: 12px; opacity: 0.7; margin-top: 4px">
          예시: "홍길동이 내일 입사하는데 개발팀에 500만원 주고 계좌는 123-456-789012"
        </div>
      </div>

      <div style="padding: 14px">
        <textarea
          v-model="command"
          rows="5"
          placeholder="여기에 자연어 커맨드를 입력하세요"
          style="
            width: 100%;
            box-sizing: border-box;
            border-radius: 14px;
            padding: 12px 12px;
            border: 1px solid rgba(255,255,255,0.12);
            outline: none;
            background: rgba(0,0,0,0.35);
            color: #e6edf7;
            font-size: 14px;
            line-height: 1.5;
          "
        />

        <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap">
          <button :style="btnPrimary" :disabled="loading || !command.trim()" @click="runCommand">
            {{ loading ? "실행 중..." : "실행" }}
          </button>

          <button :style="btnSecondary" :disabled="loading" @click="fillSample">
            샘플 넣기
          </button>

          <button :style="btnDanger" :disabled="loading" @click="reset">
            초기화
          </button>

          <div v-if="error" style="margin-left: auto; font-size: 13px; color: #ff8a8a">
            {{ error }}
          </div>
        </div>

        <div v-if="result" style="margin-top: 14px">
          <div style="font-weight: 900; margin-bottom: 8px">Result</div>

          <div
            style="
              display: flex;
              gap: 10px;
              flex-wrap: wrap;
              align-items: center;
              margin-bottom: 10px;
            "
          >
            <div :style="pill">
              status: <span style="font-weight: 900; margin-left: 6px">{{ result.status }}</span>
            </div>

            <div v-if="result.runId" :style="pill">
              runId: <span style="font-weight: 900; margin-left: 6px">{{ result.runId }}</span>
            </div>

            <div v-if="result.planId" :style="pill">
              planId: <span style="font-weight: 900; margin-left: 6px">{{ result.planId }}</span>
            </div>

            <div v-if="result.commandId" :style="pill">
              commandId: <span style="font-weight: 900; margin-left: 6px">{{ result.commandId }}</span>
            </div>

            <div v-if="result.approvalId" :style="pillWarn">
              approvalId: <span style="font-weight: 900; margin-left: 6px">{{ result.approvalId }}</span>
            </div>

            <div style="display: flex; gap: 10px; margin-left: auto; flex-wrap: wrap">
              <NuxtLink v-if="result.runId" to="/runs" style="text-decoration: none">
                <button :style="btnSecondary">Runs에서 확인</button>
              </NuxtLink>

              <NuxtLink v-if="result.approvalId" to="/approvals" style="text-decoration: none">
                <button :style="btnSecondary">Approvals에서 승인</button>
              </NuxtLink>
            </div>
          </div>

          <pre
            style="
              margin: 0;
              padding: 12px;
              border-radius: 14px;
              border: 1px solid rgba(255,255,255,0.12);
              background: rgba(0,0,0,0.35);
              overflow: auto;
              font-size: 12px;
              line-height: 1.55;
              color: rgba(230, 237, 247, 0.92);
            "
          >{{ result }}</pre>
        </div>
      </div>
    </div>

    <div style="margin-top: 18px; display: grid; grid-template-columns: 1fr; gap: 12px">
      <div style="border: 1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 14px">
        <div style="font-weight: 900; margin-bottom: 6px">흐름 체크</div>
        <ol style="margin: 0; padding-left: 18px; opacity: 0.78; font-size: 13px; line-height: 1.7">
          <li>Workflows에서 커맨드 실행</li>
          <li>승인이 필요하면 Approvals에서 승인/거절</li>
          <li>실행 로그/결과는 Runs에서 확인</li>
          <li>MCP 서버/툴 목록은 Servers에서 확인</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $axios } = useNuxtApp();
const command = ref("");
const loading = ref(false);
const error = ref<string | null>(null);
const result = ref<any | null>(null);

const btnPrimary = {
  height: "38px",
  padding: "0 14px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(230, 237, 247, 0.92)",
  color: "#0b1220",
  fontWeight: "900",
  cursor: "pointer"
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

const btnDanger = {
  height: "38px",
  padding: "0 14px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(239, 68, 68, 0.18)",
  color: "rgba(255, 200, 200, 0.95)",
  fontWeight: "900",
  cursor: "pointer"
} as any;

const pill = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  fontSize: "12px",
  opacity: 0.92
} as any;

const pillWarn = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(245, 158, 11, 0.18)",
  fontSize: "12px",
  opacity: 0.95
} as any;

function fillSample() {
  command.value = "홍길동이 내일 입사하는데 개발팀에 500만원 주고 계좌는 123-456-789012";
}

function reset() {
  command.value = "";
  error.value = null;
  result.value = null;
}

async function runCommand() {
  error.value = null;
  result.value = null;

  const trimmed = command.value.trim();
  if (!trimmed) return;

  loading.value = true;
  try {
    const res = await $axios.post('/commands', { command: trimmed }, {
      headers: { Authorization: "Bearer dev" },
    });

    result.value = res.data;
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Failed to execute command";
    error.value = typeof msg === "string" ? msg : JSON.stringify(msg);
  } finally {
    loading.value = false;
  }
}
</script>
