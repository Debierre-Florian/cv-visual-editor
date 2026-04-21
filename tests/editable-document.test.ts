import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { EditableDocument } from '../src/core/editable-document'
import { formatNumericValue } from '../src/core/css-token-extractor'

const FIXTURE = join(__dirname, 'CV_RadioFrance.html')

// ─── Critical round-trip tests ────────────────────────────────────────────────

describe('EditableDocument — round-trip', () => {
  it('render() without modifications returns byte-identical source', () => {
    const src = readFileSync(FIXTURE, 'utf8')
    const doc = new EditableDocument(src)
    expect(doc.render()).toBe(src)
  })

  it('resetAll() after modifications returns byte-identical source', () => {
    const src = readFileSync(FIXTURE, 'utf8')
    const doc = new EditableDocument(src)
    const tokens = doc.getTokens()
    expect(tokens.length).toBeGreaterThan(0)

    // Modify first numeric token
    const first = tokens.find((t) => t.kind !== 'color')
    if (first) {
      doc.setTokenValue(first.id, '999px')
    }
    doc.resetAll()
    expect(doc.render()).toBe(src)
  })

  it('single modification produces minimal diff', () => {
    const src = readFileSync(FIXTURE, 'utf8')
    const doc = new EditableDocument(src)

    // Find the font-size token for body (9.5pt)
    const bodyFontSize = doc.findToken({ selector: 'body', property: 'font-size' })
    expect(bodyFontSize).toBeDefined()
    expect(bodyFontSize!.currentText).toBe('9.5pt')

    doc.setTokenValue(bodyFontSize!.id, '12pt')
    const out = doc.render()

    // Only difference should be the value change
    expect(out).not.toBe(src)
    expect(out.replace('12pt', '9.5pt')).toBe(src)
    // Length difference should be exactly the difference in text length
    expect(out.length - src.length).toBe('12pt'.length - '9.5pt'.length)
  })

  it('modifying header font-size changes only that occurrence', () => {
    const src = readFileSync(FIXTURE, 'utf8')
    const doc = new EditableDocument(src)

    const token = doc.findToken({ selector: '.header-name h1', property: 'font-size' })
    expect(token).toBeDefined()

    const originalText = token!.currentText
    doc.setTokenValue(token!.id, '30pt')
    const out = doc.render()

    expect(out.replace('30pt', originalText)).toBe(src)
  })

  it('resetToken restores individual token', () => {
    const src = readFileSync(FIXTURE, 'utf8')
    const doc = new EditableDocument(src)

    const bodyFontSize = doc.findToken({ selector: 'body', property: 'font-size' })
    expect(bodyFontSize).toBeDefined()

    doc.setTokenValue(bodyFontSize!.id, '20pt')
    expect(doc.render()).not.toBe(src)

    doc.resetToken(bodyFontSize!.id)
    expect(doc.render()).toBe(src)
  })
})

// ─── Token extraction tests ───────────────────────────────────────────────────

describe('EditableDocument — token extraction', () => {
  let doc: EditableDocument
  let src: string

  beforeEach(() => {
    src = readFileSync(FIXTURE, 'utf8')
    doc = new EditableDocument(src)
  })

  it('extracts tokens from CV fixture', () => {
    const tokens = doc.getTokens()
    expect(tokens.length).toBeGreaterThan(10)
  })

  it('extracts body font-size as 9.5pt', () => {
    const token = doc.findToken({ selector: 'body', property: 'font-size' })
    expect(token).toBeDefined()
    expect(token!.currentText).toBe('9.5pt')
    expect(token!.parsedValue).toBe(9.5)
    expect(token!.unit).toBe('pt')
    expect(token!.kind).toBe('dimension')
  })

  it('extracts body color as hex', () => {
    const token = doc.findToken({ selector: 'body', property: 'color' })
    expect(token).toBeDefined()
    expect(token!.currentText).toBe('#1a1a1a')
    expect(token!.kind).toBe('color')
  })

  it('extracts page width as 210mm', () => {
    const token = doc.findToken({ selector: '.page', property: 'width' })
    expect(token).toBeDefined()
    expect(token!.currentText).toBe('210mm')
    expect(token!.parsedValue).toBe(210)
    expect(token!.unit).toBe('mm')
  })

  it('does NOT extract 1fr as a token (ignored unit)', () => {
    const tokens = doc.getTokens()
    const frToken = tokens.find((t) => t.unit === 'fr')
    expect(frToken).toBeUndefined()
  })

  it('extracts percentage tokens', () => {
    const tokens = doc.getTokens()
    const pctTokens = tokens.filter((t) => t.kind === 'percentage')
    expect(pctTokens.length).toBeGreaterThan(0)
    // Should find 60%, 35%, 100% progress bar values
    const values = pctTokens.map((t) => t.parsedValue)
    expect(values).toContain(100)
  })

  it('all absoluteStart offsets point to correct text in source', () => {
    const tokens = doc.getTokens()
    for (const token of tokens) {
      const extracted = src.slice(token.absoluteStart, token.absoluteEnd)
      expect(extracted).toBe(token.currentText)
    }
  })

  it('tokens are non-overlapping', () => {
    const tokens = doc.getTokens().sort((a, b) => a.absoluteStart - b.absoluteStart)
    for (let i = 1; i < tokens.length; i++) {
      const prev = tokens[i - 1]!
      const curr = tokens[i]!
      expect(curr.absoluteStart).toBeGreaterThanOrEqual(prev.absoluteEnd)
    }
  })

  it('extracts multiple values from shorthand margin', () => {
    const tokens = doc.getTokens()
    // Find margin tokens for #btn-pdf (margin: 18px auto 10px)
    const marginTokens = tokens.filter(
      (t) => t.selector === '#btn-pdf' && t.property === 'margin' && t.kind === 'dimension'
    )
    // margin: 18px auto 10px — auto is not a number, so 2 dimension tokens
    expect(marginTokens.length).toBeGreaterThanOrEqual(2)
  })

  it('extracts hex colors correctly', () => {
    const tokens = doc.getTokens()
    const colorTokens = tokens.filter((t) => t.kind === 'color')
    expect(colorTokens.length).toBeGreaterThan(0)

    // Should find #2e74b5
    const blue = colorTokens.find((t) => t.currentText === '#2e74b5')
    expect(blue).toBeDefined()
  })

  it('each token currentText matches slice of source', () => {
    const tokens = doc.getTokens()
    for (const token of tokens) {
      const slice = src.slice(token.absoluteStart, token.absoluteEnd)
      expect(slice).toBe(token.currentText)
    }
  })
})

// ─── Multiple modifications ───────────────────────────────────────────────────

describe('EditableDocument — multiple modifications', () => {
  it('applying two modifications produces correct output', () => {
    const src = readFileSync(FIXTURE, 'utf8')
    const doc = new EditableDocument(src)

    const t1 = doc.findToken({ selector: 'body', property: 'font-size' })
    const t2 = doc.findToken({ selector: 'body', property: 'color' })

    expect(t1).toBeDefined()
    expect(t2).toBeDefined()

    doc.setTokenValue(t1!.id, '11pt')
    doc.setTokenValue(t2!.id, '#ff0000')

    const out = doc.render()
    expect(out).toContain('11pt')
    expect(out).toContain('#ff0000')

    // Reversing both changes should restore original
    const restored = out
      .replace('11pt', t1!.currentText)
      .replace('#ff0000', t2!.currentText)
    expect(restored).toBe(src)
  })

  it('hasModifications() tracks state correctly', () => {
    const src = readFileSync(FIXTURE, 'utf8')
    const doc = new EditableDocument(src)

    expect(doc.hasModifications()).toBe(false)
    const token = doc.getTokens()[0]
    if (token) {
      doc.setTokenValue(token.id, '999px')
      expect(doc.hasModifications()).toBe(true)
      doc.resetToken(token.id)
      expect(doc.hasModifications()).toBe(false)
    }
  })
})

// ─── Line ending preservation ─────────────────────────────────────────────────

describe('EditableDocument — line endings', () => {
  it('detects LF line endings', () => {
    const doc = new EditableDocument('body { color: red; }\n')
    expect(doc.lineEndingStyle).toBe('\n')
  })

  it('detects CRLF line endings', () => {
    const doc = new EditableDocument('body { color: red; }\r\n')
    expect(doc.lineEndingStyle).toBe('\r\n')
  })
})

// ─── formatNumericValue ────────────────────────────────────────────────────────

describe('formatNumericValue', () => {
  it('9.5pt → 10 becomes "10pt"', () => {
    expect(formatNumericValue(10, '9.5pt', 'pt')).toBe('10pt')
  })

  it('1.4 → 1.5 becomes "1.5"', () => {
    expect(formatNumericValue(1.5, '1.4', null)).toBe('1.5')
  })

  it('preserves original decimal places', () => {
    expect(formatNumericValue(10.25, '9.50px', 'px')).toBe('10.25px')
  })

  it('integer original stays integer', () => {
    expect(formatNumericValue(20, '10px', 'px')).toBe('20px')
  })

  it('no floating point artifacts', () => {
    expect(formatNumericValue(1.5, '1.4', null)).not.toContain('000000')
  })
})
