<script setup lang="ts">
import HiveLogo from './components/HiveLogo.vue'
import { ref, onMounted, onUnmounted } from 'vue'
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

const installTabs = [
  { label: 'npm', cmd: 'npm install -g @caiokf/hive' },
  { label: 'pnpm', cmd: 'pnpm add -g @caiokf/hive' },
  { label: 'npx', cmd: 'npx @caiokf/hive init' },
] as const

const activeTab = ref(0)
const copied = ref(false)

function copyCmd() {
  navigator.clipboard.writeText(installTabs[activeTab.value].cmd)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
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
  animFrame = requestAnimationFrame(lerpLoop)
})
onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  cancelAnimationFrame(animFrame)
})
</script>

<template>
  <!--
    Shader background: Faded Dither reconstruction
    Layers (bottom to top):
    1. Deep dark base
    2. Warm radial glow (amber center bleeding outward)
    3. Animated simplex noise for organic movement
    4. Dithered gradient layer — the core "faded dither" effect
    5. Vignette to darken edges (the "faded" part)
    6. Subtle film grain for texture
  -->
  <Shader class="shader-backdrop">
    <!-- 1. Deep warm black base -->
    <SolidColor color="#060503" />

    <!-- 2. Warm amber radial glow, off-center top-left -->
    <RadialGradient
      colorA="#6b3a08"
      colorB="transparent"
      :center="{ x: 0.35, y: 0.35 }"
      :radius="0.9"
      blendMode="screen"
      :opacity="0.5"
    />

    <!-- 3. Secondary orange glow, bottom-right -->
    <RadialGradient
      colorA="#4a2006"
      colorB="transparent"
      :center="{ x: 0.7, y: 0.7 }"
      :radius="0.7"
      blendMode="screen"
      :opacity="0.35"
    />

    <!-- 4. Mouse-reactive bulge wrapping the honeycomb layers -->
    <Bulge
      :center="mousePos"
      :strength="0.08"
      :radius="0.5"
      :falloff="0.95"
      edges="mirror"
    >
      <!-- Dither: bayer8 grid on animated Voronoi honeycomb -->
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

      <!-- Second dither layer — finer Voronoi, offset pattern -->
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

    <!-- 7. Heavy vignette for the "faded" edges -->
    <Vignette
      color="#030201"
      :radius="0.25"
      :falloff="0.55"
      :intensity="1"
    />

    <!-- 8. Film grain for analog texture -->
    <FilmGrain :strength="0.2" />
  </Shader>

  <!-- Page content -->
  <div class="page">
    <header class="header">
      <a href="/" class="header-logo"><span>//</span> hive</a>
      <nav>
        <ul class="header-links">
          <li><a href="https://github.com/caiokf/hive" target="_blank" rel="noopener">GitHub</a></li>
          <li><a href="https://github.com/caiokf/hive#quick-start" target="_blank" rel="noopener">Docs</a></li>
          <li><a href="https://www.npmjs.com/package/@caiokf/hive" target="_blank" rel="noopener">npm</a></li>
        </ul>
      </nav>
    </header>

    <main class="hero">
      <span class="hero-badge">Open Source</span>

      <h1 class="hero-title">
        <HiveLogo :size="80" :scale="2.5" :stroke-width="1.2" class="hero-logo" />
        <span class="accent">hive</span>
      </h1>

      <p class="hero-subtitle">
        Autonomous AI agents triggered by GitHub events.
        Define what happens when a PR opens, an issue is labeled,
        or on a cron schedule &mdash; hive dispatches agents to handle it.
      </p>

      <div class="hero-actions">
        <a href="https://github.com/caiokf/hive#quick-start" class="btn btn-primary" target="_blank" rel="noopener">
          Get Started
        </a>
        <a href="https://github.com/caiokf/hive" class="btn btn-ghost" target="_blank" rel="noopener">
          View Source
        </a>
      </div>

      <div class="terminal">
        <div class="terminal-bar">
          <span class="terminal-dot"></span>
          <span class="terminal-dot"></span>
          <span class="terminal-dot"></span>
        </div>
        <div class="terminal-body">
          <div class="terminal-line">
            <span class="terminal-prompt">$</span>
            <span class="terminal-cmd">hive init</span>
          </div>
          <div class="terminal-line">
            <span class="terminal-prompt">$</span>
            <span class="terminal-cmd">hive connect owner/repo</span>
          </div>
          <div class="terminal-line">
            <span class="terminal-prompt">$</span>
            <span class="terminal-cmd">hive start</span>
            <span class="terminal-comment"># listening for events</span>
          </div>
          <div class="terminal-line">
            <span class="terminal-prompt">$</span>
            <span class="terminal-cmd">hive dash</span>
            <span class="terminal-comment"># open the TUI</span>
          </div>
        </div>
      </div>
    </main>

    <section class="install">
      <h2 class="install-title">Install</h2>
      <div class="install-widget">
        <div class="install-tabs">
          <button
            v-for="(tab, i) in installTabs"
            :key="tab.label"
            class="install-tab"
            :class="{ active: activeTab === i }"
            @click="activeTab = i"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="install-body">
          <code class="install-cmd">{{ installTabs[activeTab].cmd }}</code>
          <button class="install-copy" @click="copyCmd">
            {{ copied ? 'copied' : 'copy' }}
          </button>
        </div>
      </div>
    </section>

    <section class="callout">
      <p class="callout-label">No API keys needed</p>
      <p class="callout-text">
        hive runs your AI CLI tools headless &mdash; Claude Code, Codex, Gemini CLI, and more.
        No API keys to configure, no token billing surprises. Just your existing subscriptions, dispatched automatically.
      </p>
    </section>

    <section class="features">
      <div class="feature">
        <span class="feature-icon">&gt;_</span>
        <h3 class="feature-title">Zero-Config Webhooks</h3>
        <p class="feature-desc">
          No tunnels, no public URLs. Uses gh webhook forward
          to pipe GitHub events directly to your machine.
        </p>
      </div>

      <div class="feature">
        <span class="feature-icon">{&nbsp;}</span>
        <h3 class="feature-title">Multi-Runtime Agents</h3>
        <p class="feature-desc">
          Claude Code, Codex, Gemini, and more. Use your existing
          AI CLI subscriptions through valet's runtime layer.
        </p>
      </div>

      <div class="feature">
        <span class="feature-icon">&lt;/&gt;</span>
        <h3 class="feature-title">YAML Task Definitions</h3>
        <p class="feature-desc">
          Declarative triggers (webhook events or cron), prompts,
          model selection, and context files. Simple as a config.
        </p>
      </div>

      <div class="feature">
        <span class="feature-icon">#_</span>
        <h3 class="feature-title">Full Run Visibility</h3>
        <p class="feature-desc">
          Every run stored with status, duration, output, and links.
          Real-time TUI dashboard or query from the CLI.
        </p>
      </div>
    </section>

    <footer class="footer">
      built by <a href="https://github.com/caiokf" target="_blank" rel="noopener">@caiokf</a>
      &middot; MIT License
    </footer>
  </div>
</template>
