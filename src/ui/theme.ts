import chalk from "chalk"

export const theme = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  dim: chalk.dim,
  bold: chalk.bold,
  accent: chalk.cyan,
}

export const STATUS_ICONS: Record<string, string> = {
  success: chalk.green("✓"),
  failure: chalk.red("✗"),
  running: chalk.yellow("●"),
  pending: chalk.dim("◌"),
  timeout: chalk.yellow("⏱"),
  cancelled: chalk.dim("○"),
}
