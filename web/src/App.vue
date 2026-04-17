<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Shader,
  SolidColor,
  RadialGradient,
  Dither,
  Vignette,
  FilmGrain,
  Voronoi,
  Bulge,
} from 'shaders/vue'

const route = useRoute()
const isHome = computed(() => route.path === '/')
const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 10
}

// Mouse tracking with smooth lerp for Bulge gravity
const mousePos = ref({ x: 0.5, y: 0.5 })
const targetPos = { x: 0.5, y: 0.5 }
let animFrame = 0

function onMouseMove(e: MouseEvent) {
  targetPos.x = e.clientX / window.innerWidth
  targetPos.y = e.clientY / window.innerHeight
}

function lerpLoop() {
  const ease = 0.04
  mousePos.value = {
    x: mousePos.value.x + (targetPos.x - mousePos.value.x) * ease,
    y: mousePos.value.y + (targetPos.y - mousePos.value.y) * ease,
  }
  animFrame = requestAnimationFrame(lerpLoop)
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('scroll', onScroll, { passive: true })
  animFrame = requestAnimationFrame(lerpLoop)
})
onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('scroll', onScroll)
  cancelAnimationFrame(animFrame)
})
</script>

<template>
  <Shader v-if="isHome" class="shader-backdrop">
    <SolidColor color="#060503" />

    <RadialGradient
      colorA="#6b3a08"
      colorB="transparent"
      :center="{ x: 0.35, y: 0.35 }"
      :radius="0.9"
      blendMode="screen"
      :opacity="0.5"
    />

    <RadialGradient
      colorA="#4a2006"
      colorB="transparent"
      :center="{ x: 0.7, y: 0.7 }"
      :radius="0.7"
      blendMode="screen"
      :opacity="0.35"
    />

    <Bulge
      :center="mousePos"
      :strength="0.08"
      :radius="0.5"
      :falloff="0.95"
      edges="mirror"
    >
      <Dither
        pattern="bayer8"
        :pixelSize="3"
        :threshold="0.5"
        :spread="0.8"
        colorMode="source"
      >
        <Voronoi
          colorA="#9a6510"
          colorB="#4a2a08"
          colorBorder="#1a0a02"
          :scale="10"
          :speed="0.8"
          :edgeIntensity="0.6"
          :edgeSoftness="0.04"
          :opacity="0.6"
          colorSpace="oklch"
        />
      </Dither>

      <Dither
        pattern="bayer4"
        :pixelSize="2"
        :threshold="0.55"
        :spread="0.5"
        colorMode="source"
        blendMode="screen"
        :opacity="0.15"
      >
        <Voronoi
          colorA="#c47a1a"
          colorB="#2d1806"
          colorBorder="#060503"
          :scale="14"
          :speed="0.6"
          :seed="5"
          :edgeIntensity="0.5"
          :edgeSoftness="0.03"
          :opacity="0.5"
          colorSpace="oklch"
        />
      </Dither>
    </Bulge>

    <Vignette
      color="#030201"
      :radius="0.25"
      :falloff="0.55"
      :intensity="1"
    />

    <FilmGrain :strength="0.2" />
  </Shader>

  <div class="page">
    <header class="header" :class="{ scrolled }">
      <router-link to="/" class="header-logo"><span>//</span> hive</router-link>
      <nav>
        <ul class="header-links">
          <li><router-link to="/docs">Docs</router-link></li>
          <li><a href="https://github.com/caiokf/hive" target="_blank" rel="noopener">GitHub</a></li>
          <li><a href="https://www.npmjs.com/package/@caiokf/hive" target="_blank" rel="noopener">npm</a></li>
        </ul>
      </nav>
    </header>

    <router-view />
  </div>
</template>
