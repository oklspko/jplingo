<template>
  <div
    class="jp-logo"
    :style="{ width: size + 'px', height: size + 'px' }"
  >
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          :id="`toriiGrad-${uid}`"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#bae6fd" />
          <stop offset="1" stop-color="#7dd3fc" />
        </linearGradient>
      </defs>
      <rect
        width="64"
        height="64"
        rx="14"
        :fill="`url(#toriiGrad-${uid})`"
      />
      <g fill="#075985">
        <path d="M5 14 L59 14 L56 20 L8 20 Z" />
        <rect x="12" y="25" width="40" height="4" rx="1.5" />
        <rect x="16" y="20" width="6" height="34" rx="1.5" />
        <rect x="42" y="20" width="6" height="34" rx="1.5" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

withDefaults(
  defineProps<{
    size?: number;
  }>(),
  {
    size: 40,
  },
);

const uid = ref(Math.random().toString(36).slice(2, 9));
</script>

<style scoped>
.jp-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(186, 230, 253, 0.5);
}
</style>