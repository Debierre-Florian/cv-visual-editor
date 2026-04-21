import React, { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import { RotateCcw } from 'lucide-react'

interface Props {
  label: string
  value: string      // raw CSS value, e.g. "#2e74b5" or "rgb(30, 100, 180)"
  originalText: string
  onChange: (newText: string) => void
  onReset: () => void
  isModified?: boolean
}

function toHex(value: string): string {
  const v = value.trim()
  if (v.startsWith('#')) return v.length === 4
    ? '#' + v[1]! + v[1]! + v[2]! + v[2]! + v[3]! + v[3]!
    : v
  const rgbMatch = v.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/)
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch
    return '#' + [r, g, b].map((n) => parseInt(n!).toString(16).padStart(2, '0')).join('')
  }
  return '#000000'
}

function isHexFormat(value: string): boolean {
  return value.trim().startsWith('#')
}

function hexToRgbString(hex: string, original: string): string {
  // Preserve the original format (rgb vs rgba etc.)
  const fmt = original.trim().match(/^(rgba?|hsla?)\(/i)?.[1]?.toLowerCase() ?? 'rgb'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  if (fmt === 'rgba') {
    const alphaMatch = original.match(/,\s*([\d.]+)\s*\)/)
    const alpha = alphaMatch ? alphaMatch[1] : '1'
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return `rgb(${r}, ${g}, ${b})`
}

export default function ColorControl({ label, value, originalText, onChange, onReset, isModified = false }: Props) {
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState(toHex(value))
  const popoverRef = useRef<HTMLDivElement>(null)
  const isHex = isHexFormat(value)

  // Sync input when value changes from outside
  useEffect(() => {
    setHexInput(toHex(value))
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open])

  const emitHex = (hex: string) => {
    if (isHex) {
      onChange(hex)
    } else {
      onChange(hexToRgbString(hex, originalText))
    }
  }

  const commitHexInput = () => {
    let h = hexInput.trim()
    if (!h.startsWith('#')) h = '#' + h
    if (/^#[0-9a-fA-F]{6}$/.test(h)) {
      emitHex(h)
    }
  }

  return (
    <div className="flex items-center gap-2 group">
      <span
        className={`
          w-28 flex-shrink-0 text-xs truncate select-none
          ${isModified ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}
        `}
        title={label}
      >
        {label}
      </span>

      <div className="flex items-center gap-1 flex-1 relative">
        {/* Color swatch */}
        <button
          onClick={() => setOpen(!open)}
          className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0 shadow-sm"
          style={{ background: value }}
          title="Ouvrir le sélecteur de couleur"
          aria-label={`Couleur actuelle : ${value}`}
        />

        {/* Hex input */}
        <input
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={commitHexInput}
          onKeyDown={(e) => { if (e.key === 'Enter') commitHexInput() }}
          className={`
            flex-1 px-1 py-0.5 text-xs font-mono border rounded
            ${isModified
              ? 'border-orange-300 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
            }
            focus:outline-none focus:ring-1 focus:ring-blue-400
          `}
          aria-label={`Valeur hex de ${label}`}
          maxLength={7}
        />

        {/* Picker popover */}
        {open && (
          <div
            ref={popoverRef}
            className="absolute top-8 left-0 z-50 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
          >
            <HexColorPicker
              color={toHex(value)}
              onChange={(hex) => {
                setHexInput(hex)
                emitHex(hex)
              }}
            />
            <div className="mt-2 text-xs text-center text-gray-400">
              {isHex ? 'Format hex' : `Format ${originalText.split('(')[0]}`}
            </div>
          </div>
        )}
      </div>

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
