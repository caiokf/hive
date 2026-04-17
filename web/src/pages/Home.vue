<script setup lang="ts">
import HiveLogo from '../components/HiveLogo.vue'
import { ref } from 'vue'

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
</script>

<template>
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
      <router-link to="/docs" class="btn btn-primary">Get Started</router-link>
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
</template>
