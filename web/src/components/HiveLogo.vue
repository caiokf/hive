<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="`0 0 ${32 * scale} ${32 * scale}`"
    :width="size"
    :height="size"
    class="hive-logo"
  >
    <defs>
      <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffb347"/>
        <stop offset="100%" stop-color="#e87a2e"/>
      </linearGradient>
    </defs>
    <g
      fill="none"
      stroke="url(#logo-grad)"
      :stroke-width="strokeWidth"
      stroke-linejoin="round"
      :transform="`scale(${scale})`"
    >
      <polygon points="16,10.5 20.5,13.1 20.5,18.3 16,20.9 11.5,18.3 11.5,13.1"/>
      <polygon points="16,2.3 20.5,4.9 20.5,10.1 16,12.7 11.5,10.1 11.5,4.9"/>
      <polygon points="23.8,6.4 28.3,9 28.3,14.2 23.8,16.8 19.3,14.2 19.3,9"/>
      <polygon points="23.8,14.6 28.3,17.2 28.3,22.4 23.8,25 19.3,22.4 19.3,17.2"/>
      <polygon points="16,18.7 20.5,21.3 20.5,26.5 16,29.1 11.5,26.5 11.5,21.3"/>
      <polygon points="8.2,14.6 12.7,17.2 12.7,22.4 8.2,25 3.7,22.4 3.7,17.2"/>
      <polygon points="8.2,6.4 12.7,9 12.7,14.2 8.2,16.8 3.7,14.2 3.7,9"/>
    </g>
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: number
  scale?: number
  strokeWidth?: number
}>(), {
  size: 48,
  scale: 1,
  strokeWidth: 1.4,
})
</script>
