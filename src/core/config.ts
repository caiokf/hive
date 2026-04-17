import fs from "node:fs"
import path from "node:path"
import { parse as parseYaml } from "yaml"
import { configSchema, taskDefinitionSchema } from "./types.js"
import type { HiveConfig, TaskDefinition } from "./types.js"

export function findHiveDir(startDir?: string): string | null {
  let dir = startDir ?? process.cwd()
  while (true) {
    const candidate = path.join(dir, ".hive")
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate
    }
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

export function loadConfig(hiveDir: string): HiveConfig {
  const configPath = path.join(hiveDir, "config.yaml")
  if (!fs.existsSync(configPath)) {
    return configSchema.parse({})
  }
  const raw = fs.readFileSync(configPath, "utf-8")
  const parsed = parseYaml(raw) ?? {}

  // Interpolate environment variables in string values
  const interpolated = interpolateEnv(parsed)
  return configSchema.parse(interpolated)
}

export function loadTasks(hiveDir: string): TaskDefinition[] {
  const tasksDir = path.join(hiveDir, "tasks")
  if (!fs.existsSync(tasksDir)) return []

  const files = fs.readdirSync(tasksDir).filter(f => f.endsWith(".yaml") || f.endsWith(".yml"))
  const tasks: TaskDefinition[] = []

  for (const file of files) {
    const raw = fs.readFileSync(path.join(tasksDir, file), "utf-8")
    const parsed = parseYaml(raw)
    const result = taskDefinitionSchema.safeParse(parsed)
    if (result.success) {
      tasks.push(result.data)
    } else {
      console.warn(`Warning: invalid task file ${file}: ${result.error.issues.map(i => i.message).join(", ")}`)
    }
  }

  return tasks
}

export function resolveModelAlias(config: HiveConfig, model: string): string {
  return config.aliases[model] ?? model
}

function interpolateEnv(obj: unknown): unknown {
  if (typeof obj === "string") {
    return obj.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? "")
  }
  if (Array.isArray(obj)) {
    return obj.map(interpolateEnv)
  }
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateEnv(value)
    }
    return result
  }
  return obj
}
