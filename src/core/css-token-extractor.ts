import * as csstree from 'css-tree'
import type { EditableToken } from './types'

// Units we refuse to treat as editable dimensions
const IGNORED_UNITS = new Set(['fr', 'vmin', 'vmax', 'ch', 'ex', 'svh', 'svw', 'dvh', 'dvw'])

// Color function names
const COLOR_FUNCTIONS = new Set(['rgb', 'rgba', 'hsl', 'hsla'])

let tokenCounter = 0
function nextId(): string {
  return `token_${++tokenCounter}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Parse a CSS string and extract all editable tokens.
 * Uses a single AST walk with proper context tracking.
 */
export function extractTokens(
  cssText: string,
  blockStart: number,
  blockIndex: number
): EditableToken[] {
  const tokens: EditableToken[] = []

  let ast: csstree.CssNode
  try {
    ast = csstree.parse(cssText, {
      positions: true,
      parseValue: true,
      parseAtrulePrelude: false,
      onParseError: (err) => {
        console.warn('[css-token-extractor] parse error (non-fatal):', err.message)
      }
    })
  } catch (err) {
    console.warn('[css-token-extractor] fatal parse error:', err)
    return tokens
  }

  // Track context through the walk
  let currentSelector = ''
  let currentProperty = ''
  // Count how many editable tokens we've seen in the current declaration
  const declTokenCount = new Map<string, number>()

  csstree.walk(ast, {
    enter(node: csstree.CssNode) {
      if (node.type === 'Rule') {
        currentSelector = csstree.generate(node.prelude)
        return
      }

      if (node.type === 'Declaration') {
        currentProperty = node.property
        // Reset counter for this declaration (keyed by selector+property+offset)
        const loc = node.loc
        if (loc) {
          declTokenCount.set(`${currentSelector}|${currentProperty}|${loc.start.offset}`, 0)
        }
        return
      }

      // Skip inside @-rules we don't handle
      if (node.type === 'Atrule') {
        return (this as { skip: symbol }).skip as unknown as undefined
      }

      // Determine the declaration index key
      const loc = node.loc
      if (!loc) return

      const start = loc.start.offset
      const end = loc.end.offset

      // Get the current declaration's index counter key
      // We need to find which declaration key is active — use currentSelector+currentProperty
      // (The exact offset key is resolved when we enter Declaration above)
      // For simplicity, count per (selector, property) pair across all declarations
      const declKey = `${currentSelector}|${currentProperty}`

      // ── Color functions: capture whole expression, skip children ────────
      if (node.type === 'Function') {
        const fn = node as csstree.FunctionNode
        if (COLOR_FUNCTIONS.has(fn.name.toLowerCase())) {
          const rawText = cssText.slice(start, end)
          const idx = declTokenCount.get(declKey) ?? 0
          declTokenCount.set(declKey, idx + 1)

          tokens.push({
            id: nextId(),
            styleBlockIndex: blockIndex,
            absoluteStart: blockStart + start,
            absoluteEnd: blockStart + end,
            currentText: rawText,
            parsedValue: 0,
            unit: fn.name.toLowerCase(),
            kind: 'color',
            selector: currentSelector,
            property: currentProperty,
            declarationIndex: idx
          })
          return (this as { skip: symbol }).skip as unknown as undefined
        }
        return
      }

      // ── Hash (hex color) ──────────────────────────────────────────────────
      if (node.type === 'Hash') {
        const hash = node as { type: 'Hash'; value: string; loc: csstree.CssLocation }
        // The Hash node's loc.start.offset points to the '#' character
        const rawText = cssText.slice(start, end) // includes '#' already
        const numericValue = parseInt(hash.value, 16)
        const idx = declTokenCount.get(declKey) ?? 0
        declTokenCount.set(declKey, idx + 1)

        tokens.push({
          id: nextId(),
          styleBlockIndex: blockIndex,
          absoluteStart: blockStart + start,
          absoluteEnd: blockStart + end,
          currentText: rawText,
          parsedValue: isNaN(numericValue) ? 0 : numericValue,
          unit: null,
          kind: 'color',
          selector: currentSelector,
          property: currentProperty,
          declarationIndex: idx
        })
        return
      }

      // ── Dimension (e.g. 10px, 9.5pt, 210mm) ─────────────────────────────
      if (node.type === 'Dimension') {
        const dim = node as csstree.Dimension
        const unit = dim.unit.toLowerCase()
        if (IGNORED_UNITS.has(unit)) return

        const rawText = cssText.slice(start, end)
        const numericValue = parseFloat(dim.value)
        if (isNaN(numericValue)) return

        const idx = declTokenCount.get(declKey) ?? 0
        declTokenCount.set(declKey, idx + 1)

        tokens.push({
          id: nextId(),
          styleBlockIndex: blockIndex,
          absoluteStart: blockStart + start,
          absoluteEnd: blockStart + end,
          currentText: rawText,
          parsedValue: numericValue,
          unit,
          kind: 'dimension',
          selector: currentSelector,
          property: currentProperty,
          declarationIndex: idx
        })
        return
      }

      // ── Number (bare, e.g. 1.4 in line-height) ──────────────────────────
      if (node.type === 'Number') {
        const num = node as csstree.NumberValue
        const rawText = cssText.slice(start, end)
        const numericValue = parseFloat(num.value)
        if (isNaN(numericValue)) return

        const idx = declTokenCount.get(declKey) ?? 0
        declTokenCount.set(declKey, idx + 1)

        tokens.push({
          id: nextId(),
          styleBlockIndex: blockIndex,
          absoluteStart: blockStart + start,
          absoluteEnd: blockStart + end,
          currentText: rawText,
          parsedValue: numericValue,
          unit: null,
          kind: 'number',
          selector: currentSelector,
          property: currentProperty,
          declarationIndex: idx
        })
        return
      }

      // ── Percentage (e.g. 60%) ─────────────────────────────────────────────
      if (node.type === 'Percentage') {
        const pct = node as csstree.Percentage
        const rawText = cssText.slice(start, end)
        const numericValue = parseFloat(pct.value)
        if (isNaN(numericValue)) return

        const idx = declTokenCount.get(declKey) ?? 0
        declTokenCount.set(declKey, idx + 1)

        tokens.push({
          id: nextId(),
          styleBlockIndex: blockIndex,
          absoluteStart: blockStart + start,
          absoluteEnd: blockStart + end,
          currentText: rawText,
          parsedValue: numericValue,
          unit: '%',
          kind: 'percentage',
          selector: currentSelector,
          property: currentProperty,
          declarationIndex: idx
        })
        return
      }
    }
  })

  return tokens
}

/**
 * Format a numeric value preserving original decimal precision.
 * "9.5pt" edited to 10 → "10pt" (not "10.0pt")
 * "1.4" edited to 1.5 → "1.5" (not "1.5000000000000002")
 */
export function formatNumericValue(
  value: number,
  originalText: string,
  unit: string | null
): string {
  // Strip unit from original to find decimal places
  const numericPart = unit ? originalText.slice(0, -unit.length) : originalText
  const dotIndex = numericPart.indexOf('.')
  let decimals = 0
  if (dotIndex !== -1) {
    decimals = numericPart.length - dotIndex - 1
  }

  const formatted =
    decimals > 0
      ? parseFloat(value.toFixed(decimals)).toString()
      : Math.round(value).toString()

  return unit ? formatted + unit : formatted
}
