import { describe, it, expect } from 'vitest'
import { inferControl, groupTokensBySelector, shorthandLabel } from '../src/core/control-inference'
import type { EditableToken } from '../src/core/types'

function makeToken(overrides: Partial<EditableToken>): EditableToken {
  return {
    id: 'test_id',
    styleBlockIndex: 0,
    absoluteStart: 0,
    absoluteEnd: 10,
    currentText: '10px',
    parsedValue: 10,
    unit: 'px',
    kind: 'dimension',
    selector: 'body',
    property: 'font-size',
    declarationIndex: 0,
    ...overrides
  }
}

describe('inferControl — dimensions', () => {
  it('font-size → numeric-slider + unit-selector', () => {
    const result = inferControl(makeToken({ property: 'font-size', kind: 'dimension', unit: 'pt' }))
    expect(result.primary.kind).toBe('numeric-slider')
    expect(result.primary.min).toBe(4)
    expect(result.primary.max).toBe(80)
    expect(result.secondary?.kind).toBe('unit-selector')
    expect(result.secondary?.allowedUnits).toContain('pt')
  })

  it('margin → numeric-slider with unit-selector', () => {
    const result = inferControl(makeToken({ property: 'margin', kind: 'dimension', unit: 'px' }))
    expect(result.primary.kind).toBe('numeric-slider')
    expect(result.secondary?.kind).toBe('unit-selector')
  })

  it('padding-top → same as margin', () => {
    const result = inferControl(makeToken({ property: 'padding-top', kind: 'dimension', unit: 'mm' }))
    expect(result.primary.kind).toBe('numeric-slider')
    expect(result.secondary?.allowedUnits).toContain('mm')
  })

  it('border-width → numeric-slider with small max', () => {
    const result = inferControl(makeToken({ property: 'border-width', kind: 'dimension', unit: 'px' }))
    expect(result.primary.max).toBe(20)
  })

  it('border-radius → numeric-slider', () => {
    const result = inferControl(makeToken({ property: 'border-radius', kind: 'dimension', unit: 'px' }))
    expect(result.primary.kind).toBe('numeric-slider')
    expect(result.secondary?.allowedUnits).toContain('%')
  })

  it('width → numeric-slider', () => {
    const result = inferControl(makeToken({ property: 'width', kind: 'dimension', unit: 'mm' }))
    expect(result.primary.kind).toBe('numeric-slider')
  })

  it('letter-spacing → fine-grained slider', () => {
    const result = inferControl(makeToken({ property: 'letter-spacing', kind: 'dimension', unit: 'px' }))
    expect(result.primary.step).toBe(0.05)
    expect(result.primary.min).toBe(-2)
  })

  it('gap → numeric-slider', () => {
    const result = inferControl(makeToken({ property: 'gap', kind: 'dimension', unit: 'px' }))
    expect(result.primary.kind).toBe('numeric-slider')
    expect(result.primary.min).toBe(0)
  })
})

describe('inferControl — numbers', () => {
  it('line-height number → slider 0.8–3', () => {
    const result = inferControl(makeToken({ property: 'line-height', kind: 'number', unit: null }))
    expect(result.primary.kind).toBe('numeric-slider')
    expect(result.primary.min).toBe(0.8)
    expect(result.primary.max).toBe(3)
  })

  it('opacity → slider 0–1', () => {
    const result = inferControl(makeToken({ property: 'opacity', kind: 'number', unit: null }))
    expect(result.primary.min).toBe(0)
    expect(result.primary.max).toBe(1)
    expect(result.primary.step).toBe(0.01)
  })

  it('z-index → integer input', () => {
    const result = inferControl(makeToken({ property: 'z-index', kind: 'number', unit: null }))
    expect(result.primary.kind).toBe('numeric-input')
    expect(result.primary.isInteger).toBe(true)
  })

  it('font-weight → step-select with standard weights', () => {
    const result = inferControl(makeToken({ property: 'font-weight', kind: 'number', unit: null }))
    expect(result.primary.kind).toBe('step-select')
    expect(result.primary.options).toContain(700)
    expect(result.primary.options).toContain(400)
  })
})

describe('inferControl — colors', () => {
  it('hex color → color control', () => {
    const result = inferControl(makeToken({ property: 'color', kind: 'color', unit: null }))
    expect(result.primary.kind).toBe('color')
  })

  it('background-color → color control', () => {
    const result = inferControl(makeToken({ property: 'background-color', kind: 'color', unit: null }))
    expect(result.primary.kind).toBe('color')
  })
})

describe('inferControl — percentages', () => {
  it('percentage → slider 0–100', () => {
    const result = inferControl(makeToken({ kind: 'percentage', unit: '%', property: 'width' }))
    expect(result.primary.kind).toBe('numeric-slider')
    expect(result.primary.min).toBe(0)
    expect(result.primary.max).toBe(100)
  })
})

describe('groupTokensBySelector', () => {
  it('groups tokens by selector preserving order', () => {
    const tokens: EditableToken[] = [
      makeToken({ id: '1', selector: 'body', property: 'font-size' }),
      makeToken({ id: '2', selector: '.page', property: 'width' }),
      makeToken({ id: '3', selector: 'body', property: 'color' })
    ]
    const groups = groupTokensBySelector(tokens)
    expect(groups.has('body')).toBe(true)
    expect(groups.has('.page')).toBe(true)
    expect(groups.get('body')!.length).toBe(2)
  })
})

describe('shorthandLabel', () => {
  it('margin index 0 → top', () => expect(shorthandLabel('margin', 0)).toBe('top'))
  it('margin index 1 → right', () => expect(shorthandLabel('margin', 1)).toBe('right'))
  it('padding index 2 → bottom', () => expect(shorthandLabel('padding', 2)).toBe('bottom'))
  it('padding index 3 → left', () => expect(shorthandLabel('padding', 3)).toBe('left'))
  it('font-size index 0 → empty', () => expect(shorthandLabel('font-size', 0)).toBe(''))
})
