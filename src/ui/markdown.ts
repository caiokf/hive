import chalk from "chalk"

/**
 * Lightweight markdown-to-terminal renderer.
 * Handles the subset of markdown that AI agents typically produce:
 * headers, bold, italic, inline code, code blocks, lists, links, and HRs.
 */
export function renderMarkdown(input: string): string {
  const lines = input.split("\n")
  const out: string[] = []
  let inCodeBlock = false
  let codeLang = ""

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block fences
    if (line.trimStart().startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeLang = line.trimStart().slice(3).trim()
        out.push(chalk.dim("  ┌" + (codeLang ? ` ${codeLang} ` : "") + "─".repeat(Math.max(0, 40 - codeLang.length))))
      } else {
        inCodeBlock = false
        codeLang = ""
        out.push(chalk.dim("  └" + "─".repeat(40)))
      }
      continue
    }

    if (inCodeBlock) {
      out.push(chalk.dim("  │ ") + chalk.cyan(line))
      continue
    }

    // Headings
    const h1Match = line.match(/^# (.+)/)
    if (h1Match) {
      out.push(chalk.bold.white(h1Match[1]))
      continue
    }
    const h2Match = line.match(/^## (.+)/)
    if (h2Match) {
      out.push(chalk.bold.blue(h2Match[1]))
      continue
    }
    const h3Match = line.match(/^### (.+)/)
    if (h3Match) {
      out.push(chalk.bold.cyan(h3Match[1]))
      continue
    }
    const h4Match = line.match(/^#{4,} (.+)/)
    if (h4Match) {
      out.push(chalk.bold(h4Match[1]))
      continue
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      out.push(chalk.dim("─".repeat(40)))
      continue
    }

    // Unordered list items
    const ulMatch = line.match(/^(\s*)[-*+] (.+)/)
    if (ulMatch) {
      const indent = ulMatch[1]
      out.push(indent + chalk.dim("•") + " " + renderInline(ulMatch[2]))
      continue
    }

    // Ordered list items
    const olMatch = line.match(/^(\s*)\d+\. (.+)/)
    if (olMatch) {
      const indent = olMatch[1]
      const num = line.match(/^(\s*)(\d+)\./)![2]
      out.push(indent + chalk.dim(`${num}.`) + " " + renderInline(olMatch[2]))
      continue
    }

    // Blockquote
    if (line.startsWith("> ")) {
      out.push(chalk.dim("│ ") + chalk.italic(renderInline(line.slice(2))))
      continue
    }

    // Regular paragraph line
    out.push(renderInline(line))
  }

  // Close unclosed code block
  if (inCodeBlock) {
    out.push(chalk.dim("  └" + "─".repeat(40)))
  }

  return out.join("\n")
}

function renderInline(text: string): string {
  return text
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, (_, c) => chalk.bold.italic(c))
    // Bold
    .replace(/\*\*(.+?)\*\*/g, (_, c) => chalk.bold(c))
    .replace(/__(.+?)__/g, (_, c) => chalk.bold(c))
    // Italic
    .replace(/\*(.+?)\*/g, (_, c) => chalk.italic(c))
    .replace(/_(.+?)_/g, (_, c) => chalk.italic(c))
    // Strikethrough
    .replace(/~~(.+?)~~/g, (_, c) => chalk.strikethrough(c))
    // Inline code
    .replace(/`([^`]+)`/g, (_, c) => chalk.cyan(c))
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `${chalk.underline.blue(t)} ${chalk.dim(`(${u})`)}`)
}
