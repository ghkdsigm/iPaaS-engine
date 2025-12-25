<!-- apps/frontend/layouts/default.vue -->
<template>
    <div style="min-height: 100vh; background: #0b1220; color: #e6edf7">
      <header
        style="
          position: sticky;
          top: 0;
          z-index: 10;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(11, 18, 32, 0.85);
          backdrop-filter: blur(10px);
        "
      >
        <div style="max-width: 1100px; margin: 0 auto; padding: 14px 16px">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">
            <div style="display: flex; align-items: center; gap: 10px">
              <div
                style="
                  width: 34px;
                  height: 34px;
                  border-radius: 10px;
                  background: linear-gradient(135deg, #60a5fa, #a78bfa, #34d399);
                "
              />
              <div>
                <div style="font-weight: 800; letter-spacing: 0.2px">Company Automation</div>
                <div style="font-size: 12px; opacity: 0.72; margin-top: 2px">iPaaS Engine Admin</div>
              </div>
            </div>
  
            <nav style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
              <NuxtLink :to="'/workflows'" :style="linkStyle('/workflows')">Workflows</NuxtLink>
              <NuxtLink :to="'/runs'" :style="linkStyle('/runs')">Runs</NuxtLink>
              <NuxtLink :to="'/approvals'" :style="linkStyle('/approvals')">Approvals</NuxtLink>
              <NuxtLink :to="'/servers'" :style="linkStyle('/servers')">Servers</NuxtLink>
            </nav>
          </div>
        </div>
      </header>
  
      <main style="max-width: 1100px; margin: 0 auto; padding: 18px 16px 56px">
        <slot />
      </main>
    </div>
  </template>
  
  <script setup lang="ts">
  import { useRoute } from "vue-router";
  
  const route = useRoute();
  
  function isActive(path: string) {
    return route.path === path || route.path.startsWith(path + "/");
  }
  
  function linkStyle(path: string) {
    const active = isActive(path);
  
    return {
      display: "inline-flex",
      alignItems: "center",
      height: "36px",
      padding: "0 12px",
      borderRadius: "12px",
      textDecoration: "none",
      fontWeight: active ? "800" : "700",
      fontSize: "13px",
      color: active ? "#0b1220" : "rgba(230, 237, 247, 0.92)",
      background: active ? "rgba(230, 237, 247, 0.92)" : "rgba(255, 255, 255, 0.06)",
      border: "1px solid rgba(255, 255, 255, 0.10)"
    } as any;
  }
  </script>
  