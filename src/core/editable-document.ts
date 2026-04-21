import * as csstree from 'css-tree'
import * as parse5 from 'parse5'
import { extractTokens } from './css-token-extractor'
import type { EditableToken } from './types'

export interface StyleBlock {
  startOffset: number // offset of CSS content start (after `<style...>`)
  endOffset: number   // offset of CSS content end (before `</style>`)
  cssText: string
}

export class EditableDocument {
  private readonly originalSource: string
  private readonly lineEnding: '\r\n' | '\n'
  readonly styleBlocks: StyleBlock[]
  readonly tokens: Map<string, EditableToken>
  private modifications: Map<string, string> // tokenId → newText

  constructor(source: string) {
    this.originalSource = source
    this.lineEnding = source.includes('\r\n') ? '\r\n' : '\n'
    this.styleBlocks = this._locateStyleBlocks(source)
    this.tokens = new Map()
    this.modifications = new Map()
    this._extractAllTokens()
  }

  // ─── Style block location (parse5) ────────────────────────────────────────

  private _locateStyleBlocks(source: string): StyleBlock[] {
    const blocks: StyleBlock[] = []

    const document = parse5.parse(source, { sourceCodeLocationInfo: true })

    const walk = (node: parse5.DefaultTreeAdapterMap['childNode']): void => {
      if (node.nodeName === 'style') {
        const el = node as parse5.DefaultTreeAdapterMap['element']
        const loc = el.sourceCodeLocation

        if (!loc) return

        // We want the content between <style> and </style>
        // loc.startTag.endOffset = end of the opening tag `>`
        // loc.endTag.startOffset = start of `</style>`
        const contentStart = loc.startTag?.endOffset ?? loc.startOffset
        const contentEnd = loc.endTag?.startOffset ?? loc.endOffset

        const cssText = source.slice(contentStart, contentEnd)
        blocks.push({ startOffset: contentStart, endOffset: contentEnd, cssText })
      }

      if ('childNodes' in node) {
        for (const child of (node as parse5.DefaultTreeAdapterMap['element']).childNodes) {
          walk(child as parse5.DefaultTreeAdapterMap['childNode'])
        }
      }
    }

    for (const child of document.childNodes) {
      walk(child as parse5.DefaultTreeAdapterMap['childNode'])
    }

    return blocks
  }

  // ─── Token extraction ──────────────────────────────────────────────────────

  private _extractAllTokens(): void {
    this.styleBlocks.forEach((block, blockIndex) => {
      const tokens = extractTokens(block.cssText, block.startOffset, blockIndex)
      for (const token of tokens) {
        this.tokens.set(token.id, token)
      }
    })
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  getTokens(): EditableToken[] {
    return Array.from(this.tokens.values())
  }

  getToken(id: string): EditableToken | undefined {
    return this.tokens.get(id)
  }

  findToken(criteria: { selector?: string; property?: string; declarationIndex?: number }): EditableToken | undefined {
    for (const token of this.tokens.values()) {
      if (criteria.selector !== undefined && token.selector !== criteria.selector) continue
      if (criteria.property !== undefined && token.property !== criteria.property) continue
      if (criteria.declarationIndex !== undefined && token.declarationIndex !== criteria.declarationIndex) continue
      return token
    }
    return undefined
  }

  setTokenValue(id: string, newText: string): void {
    const token = this.tokens.get(id)
    if (!token) throw new Error(`Token "${id}" not found`)
    this.modifications.set(id, newText)
  }

  resetToken(id: string): void {
    this.modifications.delete(id)
  }

  resetAll(): void {
    this.modifications.clear()
  }

  hasModifications(): boolean {
    return this.modifications.size > 0
  }

  getModifications(): Map<string, string> {
    return new Map(this.modifications)
  }

  /**
   * Render the document with all current modifications applied.
   * Applies replacements in DESCENDING offset order to preserve all other offsets.
   * If no modifications: returns originalSource byte-for-byte.
   */
  render(): string {
    if (this.modifications.size === 0) {
      return this.originalSource
    }

    // Build list of (absoluteStart, absoluteEnd, newText) sorted descending
    const replacements: Array<{ start: number; end: number; newText: string }> = []

    for (const [id, newText] of this.modifications) {
      const token = this.tokens.get(id)
      if (!token) continue
      replacements.push({
        start: token.absoluteStart,
        end: token.absoluteEnd,
        newText
      })
    }

    // Sort descending by start offset — critical for safe in-place replacement
    replacements.sort((a, b) => b.start - a.start)

    let result = this.originalSource
    for (const { start, end, newText } of replacements) {
      result = result.slice(0, start) + newText + result.slice(end)
    }

    return result
  }

  get lineEndingStyle(): '\r\n' | '\n' {
    return this.lineEnding
  }
}
