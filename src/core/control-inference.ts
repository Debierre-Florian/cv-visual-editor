import type { EditableToken, ControlConfig, InferredControl } from './types'

// Normalize shorthand property names (margin-top, margin-left → margin)
function normalizeProperty(prop: string): string {
  if (/^(margin|padding)(-(top|right|bottom|left))?$/.test(prop)) return 'margin-padding'
  if (/^border-(top|right|bottom|left)?-?width$/.test(prop)) return 'border-width'
  if (/^border-(top|right|bottom|left)?-?color$/.test(prop)) return 'border-color'
  if (/^border-(top|right|bottom|left)?-?radius$/.test(prop)) return 'border-radius'
  return prop
}

export function inferControl(token: EditableToken): InferredControl {
  const prop = normalizeProperty(token.property)

  // ── Color tokens ────────────────────────────────────────────────────────
  if (token.kind === 'color') {
    return {
      primary: { kind: 'color', allowedUnits: ['hex', 'rgb', 'hsl'] }
    }
  }

  // ── Percentage tokens ────────────────────────────────────────────────────
  if (token.kind === 'percentage') {
    return {
      primary: { kind: 'numeric-slider', min: 0, max: 100, step: 1 }
    }
  }

  // ── Number tokens ────────────────────────────────────────────────────────
  if (token.kind === 'number') {
    switch (prop) {
      case 'line-height':
        return { primary: { kind: 'numeric-slider', min: 0.8, max: 3, step: 0.05 } }
      case 'opacity':
        return { primary: { kind: 'numeric-slider', min: 0, max: 1, step: 0.01 } }
      case 'z-index':
        return { primary: { kind: 'numeric-input', min: -10, max: 1000, step: 1, isInteger: true } }
      case 'font-weight':
        return { primary: { kind: 'step-select', options: [100, 200, 300, 400, 500, 600, 700, 800, 900] } }
      default:
        return { primary: { kind: 'numeric-input', step: 1 } }
    }
  }

  // ── Dimension tokens ─────────────────────────────────────────────────────
  if (token.kind === 'dimension') {
    switch (prop) {
      case 'font-size':
        return {
          primary: { kind: 'numeric-slider', min: 4, max: 80, step: 0.5 },
          secondary: { kind: 'unit-selector', allowedUnits: ['pt', 'px', 'em', 'rem'] }
        }
      case 'line-height':
        return {
          primary: { kind: 'numeric-slider', min: 8, max: 60, step: 0.5 },
          secondary: { kind: 'unit-selector', allowedUnits: ['px', 'pt', 'em'] }
        }
      case 'letter-spacing':
        return {
          primary: { kind: 'numeric-slider', min: -2, max: 10, step: 0.05 },
          secondary: { kind: 'unit-selector', allowedUnits: ['px', 'pt', 'em'] }
        }
      case 'margin-padding':
        return {
          primary: { kind: 'numeric-slider', min: -50, max: 200, step: 0.5 },
          secondary: { kind: 'unit-selector', allowedUnits: ['px', 'pt', 'mm', 'em', 'rem', '%'] }
        }
      case 'width':
      case 'height':
      case 'min-width':
      case 'min-height':
      case 'max-width':
      case 'max-height':
        return {
          primary: { kind: 'numeric-slider', min: 0, max: 500, step: 0.5 },
          secondary: { kind: 'unit-selector', allowedUnits: ['px', 'pt', 'mm', '%', 'vh', 'vw'] }
        }
      case 'border-width':
        return {
          primary: { kind: 'numeric-slider', min: 0, max: 20, step: 0.25 },
          secondary: { kind: 'unit-selector', allowedUnits: ['px', 'pt'] }
        }
      case 'border-radius':
        return {
          primary: { kind: 'numeric-slider', min: 0, max: 100, step: 0.5 },
          secondary: { kind: 'unit-selector', allowedUnits: ['px', '%', 'em'] }
        }
      case 'gap':
      case 'column-gap':
      case 'row-gap':
        return {
          primary: { kind: 'numeric-slider', min: 0, max: 100, step: 0.5 },
          secondary: { kind: 'unit-selector', allowedUnits: ['px', 'rem'] }
        }
      default:
        return {
          primary: { kind: 'numeric-slider', min: 0, max: 200, step: 0.5 },
          secondary: { kind: 'unit-selector', allowedUnits: [token.unit ?? 'px'] }
        }
    }
  }

  // Fallback
  return { primary: { kind: 'numeric-input', step: 1 } }
}

/**
 * Group tokens by selector, preserving CSS source order.
 */
export function groupTokensBySelector(
  tokens: EditableToken[]
): Map<string, EditableToken[]> {
  const map = new Map<string, EditableToken[]>()
  for (const token of tokens) {
    const list = map.get(token.selector) ?? []
    list.push(token)
    map.set(token.selector, list)
  }
  return map
}

/**
 * For shorthand properties (margin, padding) with multiple values,
 * return a display label for the nth value.
 */
export function shorthandLabel(property: string, index: number): string {
  const isMarginOrPadding = /^(margin|padding)$/.test(property)
  if (isMarginOrPadding) {
    const labels = ['top', 'right', 'bottom', 'left']
    return labels[index] ?? `[${index}]`
  }
  return index > 0 ? `[${index}]` : ''
}
