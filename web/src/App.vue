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
          <li>
            <a href="https://github.com/caiokf/hive" target="_blank" rel="noopener" class="header-icon-link" aria-label="GitHub">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </li>
        </ul>
      </nav>
    </header>

    <router-view />
  </div>
</template>
