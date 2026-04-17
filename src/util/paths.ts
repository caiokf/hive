import fs from "node:fs"
import path from "node:path"
import chalk from "chalk"

export function getHiveDir(projectRoot: string): string {
  return path.join(projectRoot, ".hive")
}

export function getTasksDir(hiveDir: string): string {
  return path.join(hiveDir, "tasks")
}

export function getRunsDir(hiveDir: string): string {
  return path.join(hiveDir, "runs")
}

export function getAgentsDir(hiveDir: string): string {
  return path.join(hiveDir, "agents")
}

export function getPidFile(hiveDir: string): string {
  return path.join(hiveDir, "hive.pid")
}

export function getLogFile(hiveDir: string): string {
  return path.join(hiveDir, "daemon.log")
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

export function writeIfNew(filePath: string, content: string): void {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf-8").trim().length > 0) {
    return
  }
  fs.writeFileSync(filePath, content, "utf-8")
  console.log(chalk.green(`  ✓ ${path.relative(process.cwd(), filePath)}`))
}
