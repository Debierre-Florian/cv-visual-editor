import React, { useRef, useState, useCallback, useId } from 'react'
import { RotateCcw } from 'lucide-react'
import { formatNumericValue } from '../../core/css-token-extractor'

interface Props {
  label: string
  value: number
  unit: string | null
  originalText: string
  min?: number
  max?: number
  step?: number
  onChange: (newText: string) => void
  onReset: () => void
  isModified?: boolean
}

// Safe expression evaluator — no eval, uses a restricted parser
function safeEval(expr: string): number | null {
  const clean = expr.replace(/\s/g, '')
  // Allow: digits, decimal point, +, -, *, /, (, )
  if (!/^[0-9+\-*/().]+$/.test(clean)) return null
  try {
    // Simple recursive descent parser
    return parseExpr(clean, { pos: 0 })
  } catch {
    return null
  }
}

function parseExpr(s: string, state: { pos: number }): number {
  let result = parseTerm(s, state)
  while (state.pos < s.length && (s[state.pos] === '+' || s[state.pos] === '-')) {
    const op = s[state.pos++]!
    const right = parseTerm(s, state)
    result = op === '+' ? result + right : result - right
  }
  return result
}

function parseTerm(s: string, state: { pos: number }): number {
  let result = parseFactor(s, state)
  while (state.pos < s.length && (s[state.pos] === '*' || s[state.pos] === '/')) {
    const op = s[state.pos++]!
    const right = parseFactor(s, state)
    if (op === '/' && right === 0) throw new Error('div by zero')
    result = op === '*' ? result * right : result / right
  }
  return result
}

function parseFactor(s: string, state: { pos: number }): number {
  if (s[state.pos] === '(') {
    state.pos++ // consume '('
    const val = parseExpr(s, state)
    if (s[state.pos] !== ')') throw new Error('expected )')
    state.pos++ // consume ')'
    return val
  }
  const start = state.pos
  if (s[state.pos] === '-') state.pos++
  while (state.pos < s.length && /[0-9.]/.test(s[state.pos]!)) state.pos++
  const numStr = s.slice(start, state.pos)
  const val = parseFloat(numStr)
  if (isNaN(val)) throw new Error(`invalid number: ${numStr}`)
  return val
}

export default function NumericSlider({
  label, value, unit, originalText, min = 0, max = 200, step = 0.5,
  onChange, onReset, isModified = false
}: Props) {
  const id = useId()
  const [inputValue, setInputValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const dragStart = useRef<{ y: number; value: number } | null>(null)

  const emitValue = (v: number) => {
    const clamped = Math.min(max * 2, Math.max(min - Math.abs(min), v))
    onChange(formatNumericValue(clamped, originalText, unit))
  }

  // ── Label drag (vertical) ─────────────────────────────────────────────────
  const onLabelMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.detail === 2) { onReset(); return } // double-click = reset
    dragStart.current = { y: e.clientY, value }
    e.preventDefault()

    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return
      const mult = ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1
      const delta = -(ev.clientY - dragStart.current.y) * step * mult
      emitValue(dragStart.current.value + delta)
    }
    const onUp = () => {
      dragStart.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [value, step, emitValue, onReset])

  // ── Scroll wheel ──────────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
    const direction = e.deltaY < 0 ? 1 : -1
    emitValue(value + direction * step * mult)
  }, [value, step, emitValue])

  // ── Text input ────────────────────────────────────────────────────────────
  const startEditing = () => {
    setInputValue(String(value))
    setIsEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commitInput = () => {
    const raw = inputValue.trim()
    const isFormula = raw.startsWith('=')
    const expr = isFormula ? raw.slice(1) : raw
    const parsed = isFormula ? safeEval(expr) : parseFloat(expr)
    if (parsed !== null && !isNaN(parsed)) {
      emitValue(parsed)
    }
    setIsEditing(false)
  }

  const sliderPercent = max > min ? ((value - min) / (max - min)) * 100 : 0

  return (
    <div className="flex items-center gap-2 group" onWheel={onWheel}>
      {/* Label — draggable */}
      <span
        ref={labelRef}
        className={`
          w-28 flex-shrink-0 text-xs truncate cursor-ns-resize select-none
          ${isModified ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}
        `}
        title={`${label} — glisser pour ajuster, double-clic pour reset`}
        onMouseDown={onLabelMouseDown}
        data-drag-label
        aria-label={label}
      >
        {label}
      </span>

      {/* Slider */}
      <div className="flex-1 relative h-4 flex items-center">
        <div className="absolute inset-x-0 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-400 dark:bg-blue-500 rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, sliderPercent))}%` }}
          />
        </div>
        <input
          type="range"
          id={id}
          min={min}
          max={max}
          step={step}
          value={Math.min(max, Math.max(min, value))}
          onChange={(e) => emitValue(parseFloat(e.target.value))}
          className="absolute inset-x-0 w-full opacity-0 cursor-pointer h-4"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>

      {/* Numeric input */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={commitInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitInput()
            if (e.key === 'Escape') setIsEditing(false)
          }}
          className="w-16 px-1 py-0.5 text-xs text-right border border-blue-400 rounded bg-white dark:bg-gray-800 focus:outline-none"
          aria-label={`Valeur de ${label}`}
        />
      ) : (
        <button
          onClick={startEditing}
          className={`
            w-16 px-1 py-0.5 text-xs text-right rounded border
            ${isModified
              ? 'border-orange-300 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
            }
            hover:border-blue-400 transition-colors font-mono
          `}
          title="Cliquer pour éditer (préfixe = pour une formule)"
          aria-label={`Valeur : ${value}${unit ?? ''}`}
        >
          {value}{unit ?? ''}
        </button>
      )}

      {/* Reset button */}
      <button
        onClick={onReset}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity"
        title="Réinitialiser"
        aria-label={`Réinitialiser ${label}`}
      >
        <RotateCcw size={11} />
      </button>
    </div>
  )
}
