import type { EditCommand, HistoryEntry } from './types'

export class History {
  private stack: HistoryEntry[] = []
  private cursor = -1 // points to the last applied entry
  readonly maxSize: number

  constructor(maxSize = 1000) {
    this.maxSize = maxSize
  }

  push(commands: EditCommand[], label?: string): void {
    // Drop any "future" entries if we're not at the end
    this.stack = this.stack.slice(0, this.cursor + 1)

    this.stack.push({ commands, timestamp: Date.now(), label })
    this.cursor = this.stack.length - 1

    // Trim oldest entries if over limit
    if (this.stack.length > this.maxSize) {
      const excess = this.stack.length - this.maxSize
      this.stack.splice(0, excess)
      this.cursor -= excess
    }
  }

  canUndo(): boolean {
    return this.cursor >= 0
  }

  canRedo(): boolean {
    return this.cursor < this.stack.length - 1
  }

  undo(): EditCommand[] | null {
    if (!this.canUndo()) return null
    const entry = this.stack[this.cursor]
    if (!entry) return null
    this.cursor--
    // Return commands to reverse (apply previousText)
    return entry.commands.map((c) => ({ ...c, nextText: c.previousText, previousText: c.nextText }))
  }

  redo(): EditCommand[] | null {
    if (!this.canRedo()) return null
    this.cursor++
    const entry = this.stack[this.cursor]
    if (!entry) return null
    return entry.commands
  }

  getEntries(): HistoryEntry[] {
    return this.stack.slice()
  }

  getCurrentIndex(): number {
    return this.cursor
  }

  clear(): void {
    this.stack = []
    this.cursor = -1
  }
}
