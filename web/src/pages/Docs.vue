<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeSection = ref('getting-started')
const mobileMenuOpen = ref(false)

const sections = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'tasks', label: 'Task Definitions' },
  { id: 'runtimes', label: 'Runtimes' },
  { id: 'cli', label: 'CLI Reference' },
  { id: 'concepts', label: 'Core Concepts' },
]

function scrollTo(id: string) {
  activeSection.value = id
  mobileMenuOpen.value = false
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  if (route.hash) {
    const id = route.hash.slice(1)
    activeSection.value = id
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          activeSection.value = e.target.id
        }
      }
    },
    { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
  )
  sections.forEach((s) => {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  })
})

watch(() => route.hash, (hash) => {
  if (hash) scrollTo(hash.slice(1))
})
</script>

<template>
  <div class="docs">
    <button class="mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen" :aria-label="mobileMenuOpen ? 'Close menu' : 'Open menu'">
      {{ mobileMenuOpen ? '✕' : '☰' }}
    </button>

    <div v-if="mobileMenuOpen" class="mobile-overlay" @click="mobileMenuOpen = false"></div>

    <aside class="sidebar" :class="{ open: mobileMenuOpen }">
      <div class="sidebar-inner">
        <h3 class="sidebar-title">Documentation</h3>
        <nav class="sidebar-nav">
          <a
            v-for="s in sections"
            :key="s.id"
            :href="'#' + s.id"
            :class="{ active: activeSection === s.id }"
            @click.prevent="scrollTo(s.id)"
          >
            {{ s.label }}
          </a>
        </nav>
      </div>
    </aside>

    <main class="content">
      <!-- Getting Started -->
      <section id="getting-started">
        <h1>Getting Started</h1>
        <p class="lead">
          <strong>hive</strong> listens for GitHub webhook events and cron schedules,
          then dispatches AI coding agents to handle them. Define tasks in YAML,
          connect repos, start the daemon.
        </p>

        <div class="doc-callout">
          <strong>No API keys needed.</strong> hive runs your AI CLI tools headless
          &mdash; Claude Code, Codex, Gemini CLI, and more. It uses your existing
          subscriptions. No separate token billing.
        </div>

        <h2>Prerequisites</h2>
        <div class="props-table compact">
          <div class="prop-row">
            <code class="prop-name">gh</code>
            <span class="prop-desc">GitHub CLI &mdash; <a href="https://cli.github.com" target="_blank">Install</a>, then run <code>gh auth login</code></span>
          </div>
          <div class="prop-row">
            <code class="prop-name">gh-webhook</code>
            <span class="prop-desc">Extension for webhook forwarding &mdash; <code>gh extension install cli/gh-webhook</code></span>
          </div>
        </div>

        <h2>Install</h2>
        <div class="code-block">
          <pre><code><span class="c-dim"># npm</span>
npm install -g @caiokf/hive

<span class="c-dim"># pnpm</span>
pnpm add -g @caiokf/hive

<span class="c-dim"># or run directly</span>
npx @caiokf/hive init</code></pre>
        </div>

        <h2>Quick start</h2>
        <div class="code-block">
          <pre><code><span class="c-dim"># 1. Scaffold the .hive/ directory</span>
hive init

<span class="c-dim"># 2. Check prerequisites</span>
hive doctor

<span class="c-dim"># 3. Connect a GitHub repo</span>
hive connect owner/repo

<span class="c-dim"># 4. Start the daemon</span>
hive start

<span class="c-dim"># 5. Open the TUI dashboard</span>
hive dash</code></pre>
        </div>
      </section>

      <!-- Configuration -->
      <section id="configuration">
        <h1>Configuration</h1>
        <p class="lead">
          Global settings live in <code>.hive/config.yaml</code>. Controls defaults,
          server settings, runtime overrides, and model aliases.
        </p>

        <div class="code-block">
          <div class="code-label">config.yaml</div>
          <pre><code><span class="y-key">defaults</span>:
  <span class="y-key">runtime</span>: <span class="y-val">claude</span>
  <span class="y-key">model</span>: <span class="y-val">sonnet</span>

<span class="y-key">server</span>:
  <span class="y-key">port</span>: <span class="y-val">7777</span>

<span class="y-key">github</span>:
  <span class="y-key">repos</span>:
    - <span class="y-val">owner/repo</span>

<span class="y-key">runtimes</span>:
  <span class="y-key">claude</span>:
    <span class="y-key">command</span>: <span class="y-val">claude</span>
    <span class="y-key">env</span>: {}
    <span class="y-key">args</span>: []

<span class="y-key">aliases</span>:
  <span class="y-key">opus</span>: <span class="y-val">claude-opus-4-6</span>
  <span class="y-key">sonnet</span>: <span class="y-val">claude-sonnet-4-6</span>
  <span class="y-key">haiku</span>: <span class="y-val">claude-haiku-4-5-20251001</span></code></pre>
        </div>
      </section>

      <!-- Task Definitions -->
      <section id="tasks">
        <h1>Task Definitions</h1>
        <p class="lead">
          Tasks live in <code>.hive/tasks/*.yaml</code>. Each defines a trigger
          (webhook event or cron) and a task spec (runtime, model, prompt).
        </p>

        <h2>Webhook-triggered task</h2>
        <div class="code-block">
          <div class="code-label">review-prs.yaml</div>
          <pre><code><span class="y-key">name</span>: <span class="y-val">review-prs</span>
<span class="y-key">description</span>: <span class="y-val">Run code review on new PRs</span>

<span class="y-key">trigger</span>:
  <span class="y-key">type</span>: <span class="y-val">webhook</span>
  <span class="y-key">event</span>: <span class="y-val">pull_request</span>
  <span class="y-key">action</span>:
    - <span class="y-val">opened</span>
    - <span class="y-val">synchronize</span>
  <span class="y-key">filter</span>:
    <span class="y-key">base</span>: <span class="y-val">main</span>

<span class="y-key">task</span>:
  <span class="y-key">runtime</span>: <span class="y-val">claude</span>
  <span class="y-key">model</span>: <span class="y-val">sonnet</span>
  <span class="y-key">agent</span>: <span class="y-val">./agents/reviewer.md</span>
  <span class="y-key">context</span>:
    - <span class="y-str">ARCHITECTURE.md</span>
    - <span class="y-str">docs/**/*.md</span>
  <span class="y-key">timeout</span>: <span class="y-val">300000</span></code></pre>
        </div>

        <h2>Cron-scheduled task</h2>
        <div class="code-block">
          <div class="code-label">morning-summary.yaml</div>
          <pre><code><span class="y-key">name</span>: <span class="y-val">morning-summary</span>
<span class="y-key">description</span>: <span class="y-val">Daily summary of open PRs and issues</span>

<span class="y-key">trigger</span>:
  <span class="y-key">type</span>: <span class="y-val">cron</span>
  <span class="y-key">schedule</span>: <span class="y-str">"0 9 * * 1-5"</span>          <span class="c-dim"># weekdays at 9am</span>

<span class="y-key">task</span>:
  <span class="y-key">runtime</span>: <span class="y-val">claude</span>
  <span class="y-key">model</span>: <span class="y-val">haiku</span>
  <span class="y-key">prompt</span>: <span class="y-str">|
    Summarize all open PRs and issues for this
    repository. Group by priority and highlight
    anything that needs immediate attention.</span>
  <span class="y-key">timeout</span>: <span class="y-val">120000</span></code></pre>
        </div>

        <h2>Task fields</h2>
        <div class="props-table">
          <div class="prop-row">
            <code class="prop-name">name</code>
            <span class="prop-type">string</span>
            <span class="prop-req">required</span>
            <span class="prop-desc">Unique task identifier</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">trigger.type</code>
            <span class="prop-type">"webhook" | "cron"</span>
            <span class="prop-req">required</span>
            <span class="prop-desc">Event source type</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">trigger.event</code>
            <span class="prop-type">string</span>
            <span class="prop-req">webhook</span>
            <span class="prop-desc">GitHub event name (pull_request, issues, etc.)</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">trigger.action</code>
            <span class="prop-type">string[]</span>
            <span class="prop-req">optional</span>
            <span class="prop-desc">Filter by event action (opened, labeled, etc.)</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">trigger.schedule</code>
            <span class="prop-type">string</span>
            <span class="prop-req">cron</span>
            <span class="prop-desc">Cron expression</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">task.runtime</code>
            <span class="prop-type">string</span>
            <span class="prop-req">required</span>
            <span class="prop-desc">AI runtime to use</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">task.model</code>
            <span class="prop-type">string</span>
            <span class="prop-req">optional</span>
            <span class="prop-desc">Model identifier or alias</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">task.prompt</code>
            <span class="prop-type">string</span>
            <span class="prop-req">optional</span>
            <span class="prop-desc">Inline prompt (mutually exclusive with agent)</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">task.agent</code>
            <span class="prop-type">string</span>
            <span class="prop-req">optional</span>
            <span class="prop-desc">Path to an agent/prompt file</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">task.context</code>
            <span class="prop-type">string[]</span>
            <span class="prop-req">optional</span>
            <span class="prop-desc">Additional context file globs</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">task.timeout</code>
            <span class="prop-type">number</span>
            <span class="prop-req">optional</span>
            <span class="prop-desc">Timeout in milliseconds</span>
          </div>
        </div>
      </section>

      <!-- Runtimes -->
      <section id="runtimes">
        <h1>Runtimes</h1>
        <p class="lead">
          hive uses <a href="https://github.com/caiokf/valet" target="_blank">valet</a>
          for runtime abstraction. Any CLI tool valet supports works with hive.
          Each runs headless using your existing subscriptions.
        </p>

        <h2>Supported runtimes</h2>
        <div class="props-table compact">
          <div class="prop-row">
            <code class="prop-name">claude</code>
            <span class="prop-desc">Claude Code &mdash; Subscription or <code>ANTHROPIC_API_KEY</code></span>
          </div>
          <div class="prop-row">
            <code class="prop-name">codex</code>
            <span class="prop-desc">OpenAI Codex CLI &mdash; <code>OPENAI_API_KEY</code></span>
          </div>
          <div class="prop-row">
            <code class="prop-name">gemini</code>
            <span class="prop-desc">Google Gemini CLI &mdash; <code>GEMINI_API_KEY</code> or <code>GOOGLE_API_KEY</code></span>
          </div>
          <div class="prop-row">
            <code class="prop-name">kimi</code>
            <span class="prop-desc">Moonshot Kimi &mdash; <code>MOONSHOT_API_KEY</code></span>
          </div>
          <div class="prop-row">
            <code class="prop-name">coderabbit</code>
            <span class="prop-desc">CodeRabbit &mdash; <code>cr auth status</code></span>
          </div>
          <div class="prop-row">
            <code class="prop-name">opencode</code>
            <span class="prop-desc">OpenCode &mdash; <code>~/.opencode/config.json</code></span>
          </div>
          <div class="prop-row">
            <code class="prop-name">droid</code>
            <span class="prop-desc">Droid &mdash; Subscription</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">mastracode</code>
            <span class="prop-desc">MastraCode &mdash; Subscription</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">pi</code>
            <span class="prop-desc">Pi &mdash; Subscription</span>
          </div>
        </div>

        <h2>Checking health</h2>
        <div class="code-block">
          <pre><code><span class="c-dim"># Check which runtimes are available</span>
hive doctor</code></pre>
        </div>
      </section>

      <!-- CLI Reference -->
      <section id="cli">
        <h1>CLI Reference</h1>
        <p class="lead">All available commands.</p>

        <div class="props-table compact">
          <div class="prop-row">
            <code class="prop-name">hive init</code>
            <span class="prop-desc">Scaffold <code>.hive/</code> directory, check prerequisites</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">hive connect &lt;repo&gt;</code>
            <span class="prop-desc">Add a GitHub repo for webhook forwarding</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">hive start</code>
            <span class="prop-desc">Start daemon (webhook server + forwarders + cron scheduler)</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">hive stop</code>
            <span class="prop-desc">Stop daemon, kill forwarders, clean up GitHub webhooks</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">hive status</code>
            <span class="prop-desc">Show daemon status, forwarding repos, active/recent runs</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">hive dash</code>
            <span class="prop-desc">Open TUI dashboard with real-time run monitoring</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">hive add</code>
            <span class="prop-desc">Interactively create a new task definition</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">hive list</code>
            <span class="prop-desc">List configured tasks and their triggers</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">hive run &lt;task&gt;</code>
            <span class="prop-desc">Manually trigger a task</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">hive logs [task]</code>
            <span class="prop-desc">Show run history and logs</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">hive doctor</code>
            <span class="prop-desc">Check gh CLI, gh-webhook extension, runtimes, config</span>
          </div>
        </div>
      </section>

      <!-- Core Concepts -->
      <section id="concepts">
        <h1>Core Concepts</h1>
        <p class="lead">The building blocks of hive.</p>

        <div class="props-table">
          <div class="prop-row">
            <code class="prop-name">Trigger</code>
            <span class="prop-type">event source</span>
            <span class="prop-req"></span>
            <span class="prop-desc">A GitHub webhook event filter or a cron expression</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">Task</code>
            <span class="prop-type">action</span>
            <span class="prop-req"></span>
            <span class="prop-desc">What to do when a trigger fires: runtime, model, prompt, and context</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">Run</code>
            <span class="prop-type">execution</span>
            <span class="prop-req"></span>
            <span class="prop-desc">A single execution of a task with status, logs, duration, and result</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">Daemon</code>
            <span class="prop-type">process</span>
            <span class="prop-req"></span>
            <span class="prop-desc">The background process that listens for triggers and dispatches tasks</span>
          </div>
          <div class="prop-row">
            <code class="prop-name">Forwarder</code>
            <span class="prop-type">bridge</span>
            <span class="prop-req"></span>
            <span class="prop-desc">A <code>gh webhook forward</code> process that pipes GitHub events to the local daemon</span>
          </div>
        </div>

        <h2>How it works</h2>
        <ol class="steps">
          <li>Define tasks in <code>.hive/tasks/*.yaml</code> with triggers and task specs</li>
          <li>Connect repos with <code>hive connect owner/repo</code></li>
          <li>Start the daemon with <code>hive start</code> &mdash; launches webhook server, forwarders, and cron scheduler</li>
          <li>GitHub sends events via WebSocket to <code>gh webhook forward</code>, which POSTs them to the local server</li>
          <li>hive matches events against task triggers and spawns AI agents via <a href="https://github.com/caiokf/valet" target="_blank">valet</a></li>
          <li>Results are stored locally with status, output, duration, and links</li>
          <li><code>hive stop</code> kills forwarders, deletes temporary webhooks, and stops the server</li>
        </ol>

        <div class="doc-callout">
          <strong>Crash recovery.</strong> If the daemon crashes, orphaned
          <code>gh webhook forward</code> processes and their temporary GitHub
          webhooks are cleaned up automatically on the next <code>hive start</code>.
        </div>

        <h2>Project structure</h2>
        <div class="code-block">
          <pre><code>.hive/
├── config.yaml          <span class="c-dim"># Global config, server settings, model aliases</span>
├── tasks/
│   ├── review-prs.yaml  <span class="c-dim"># Webhook-triggered PR review</span>
│   └── morning-summary.yaml  <span class="c-dim"># Cron-scheduled daily summary</span>
├── agents/
│   └── reviewer.md      <span class="c-dim"># Agent prompt file</span>
├── runs/                <span class="c-dim"># Run history (JSON)</span>
└── logs/                <span class="c-dim"># Per-repo forwarding logs</span></code></pre>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.docs {
  display: flex;
  min-height: 100vh;
  padding-top: 48px;
}

/* ── Sidebar ── */
.sidebar {
  position: fixed;
  top: 60px;
  left: 0;
  bottom: 0;
  width: 220px;
  border-right: 1px solid var(--col-border);
  background: rgba(6, 5, 3, 0.85);
  backdrop-filter: blur(20px);
  overflow-y: auto;
  z-index: 10;
}

.sidebar-inner {
  padding: 32px 16px;
}

.sidebar-title {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--col-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 20px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-nav a {
  display: block;
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--col-text-dim);
  border-radius: 6px;
  text-decoration: none;
  transition: color 0.15s, background 0.15s;
}

.sidebar-nav a:hover {
  color: var(--col-text);
  background: rgba(212, 136, 15, 0.06);
}

.sidebar-nav a.active {
  color: var(--col-orange);
  background: rgba(212, 136, 15, 0.1);
}

/* ── Content ── */
.content {
  flex: 1;
  margin-left: 220px;
  padding: 48px 64px 120px;
  max-width: 840px;
}

.content section {
  padding-top: 16px;
  padding-bottom: 40px;
  border-bottom: 1px solid var(--col-border);
}

.content section:last-child {
  border-bottom: none;
}

.content h1 {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
  color: var(--col-text);
}

.content h2 {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
  margin-top: 36px;
  margin-bottom: 12px;
  color: var(--col-text);
}

.lead {
  font-size: 15px;
  color: var(--col-text-dim);
  line-height: 1.7;
  margin-bottom: 24px;
}

.lead strong {
  color: var(--col-text);
}

.lead a {
  color: var(--col-orange);
  text-decoration: none;
}

.content p {
  font-size: 14px;
  color: var(--col-text-dim);
  line-height: 1.7;
  margin-bottom: 16px;
}

.content p code,
.content li code {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--col-text);
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
}

/* ── Code blocks ── */
.code-block {
  background: rgba(3, 2, 1, 0.7);
  border: 1px solid var(--col-border);
  border-radius: 10px;
  overflow-x: auto;
  margin-bottom: 20px;
}

.code-label {
  padding: 10px 20px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--col-text-muted);
  border-bottom: 1px solid var(--col-border);
  letter-spacing: 0.05em;
}

.code-block pre {
  padding: 20px;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--col-text-dim);
}

.y-key { color: #7dd3fc; }
.y-val { color: var(--col-text); }
.y-str { color: var(--col-orange); }
.y-bool { color: #fbbf24; }
.c-dim { color: var(--col-text-muted); }

/* ── Props table ── */
.props-table {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--col-border);
  border: 1px solid var(--col-border);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 20px;
}

.prop-row {
  display: grid;
  grid-template-columns: 160px 120px 70px 1fr;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(6, 5, 3, 0.8);
  align-items: baseline;
  font-size: 13px;
}

.props-table.compact .prop-row {
  grid-template-columns: 200px 1fr;
}

.prop-name {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--col-orange);
}

.prop-type {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--col-text-muted);
}

.prop-req {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--col-text-muted);
}

.prop-desc {
  color: var(--col-text-dim);
  line-height: 1.5;
}

.prop-desc code {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--col-text);
  background: rgba(255, 255, 255, 0.06);
  padding: 1px 5px;
  border-radius: 3px;
}

.prop-desc a {
  color: var(--col-orange);
  text-decoration: none;
}

/* ── Callout ── */
.doc-callout {
  padding: 16px 20px;
  background: rgba(232, 122, 46, 0.06);
  border: 1px solid rgba(232, 122, 46, 0.18);
  border-radius: 8px;
  font-size: 13px;
  color: var(--col-text-dim);
  line-height: 1.7;
  margin-bottom: 24px;
}

.doc-callout strong {
  color: var(--col-orange);
  font-weight: 600;
}

.doc-callout code {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--col-text);
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
}

/* ── Steps ── */
.steps {
  padding-left: 24px;
  margin-bottom: 20px;
}

.steps li {
  font-size: 14px;
  color: var(--col-text-dim);
  line-height: 1.8;
  margin-bottom: 6px;
}

.steps li code {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--col-text);
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
}

.steps li a {
  color: var(--col-orange);
  text-decoration: none;
}

/* ── Mobile menu button ── */
.mobile-menu-btn {
  display: none;
}

.mobile-overlay {
  display: none;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .docs {
    padding-top: 0;
  }

  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 200;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 1px solid var(--col-border-hover);
    background: rgba(6, 5, 3, 0.9);
    backdrop-filter: blur(16px);
    color: var(--col-orange);
    font-size: 18px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }

  .mobile-overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(0, 0, 0, 0.5);
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 240px;
    transform: translateX(-100%);
    transition: transform 0.25s var(--ease-out-expo);
    z-index: 100;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .sidebar-inner {
    padding-top: 56px;
  }

  .content {
    margin-left: 0;
    padding: 8px 16px 80px;
    max-width: 100%;
  }

  .content section {
    padding-top: 8px;
    padding-bottom: 28px;
  }

  .content section:first-child {
    padding-top: 0;
  }

  .content h1 {
    font-size: 1.5rem;
    margin-bottom: 8px;
  }

  .content h2 {
    margin-top: 24px;
  }

  .code-block {
    border-radius: 8px;
    margin-left: -4px;
    margin-right: -4px;
  }

  .code-block pre {
    padding: 14px;
    font-size: 12px;
  }

  .prop-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .props-table.compact .prop-row {
    grid-template-columns: 1fr;
  }

  .props-table {
    border-radius: 8px;
  }

  .lead {
    font-size: 14px;
    margin-bottom: 16px;
  }

  .doc-callout {
    font-size: 12px;
    padding: 12px 14px;
  }
}
</style>
