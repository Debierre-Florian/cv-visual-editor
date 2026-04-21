import React, { useMemo } from 'react'
import { useEditorStore } from '../store/editor-store'
import { inferControl, shorthandLabel } from '../core/control-inference'
import NumericSlider from './controls/NumericSlider'
import ColorControl from './controls/ColorControl'
import { formatNumericValue } from '../core/css-token-extractor'
import type { EditableToken } from '../core/types'

export default function ControlsPanel() {
  const { doc, selectedSelector, setTokenValue, resetToken, getRenderedSource } = useEditorStore()

  const tokens = useMemo(() => {
    if (!doc || !selectedSelector) return []
    return doc.getTokens().filter((t) => t.selector === selectedSelector)
  }, [doc, selectedSelector, getRenderedSource()])

  const modifications = useMemo(() => doc?.getModifications() ?? new Map(), [doc, getRenderedSource()])

  if (!doc) return null

  if (!selectedSelector) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400 p-4 text-center">
        Sélectionnez un sélecteur dans la liste de gauche
      </div>
    )
  }

  if (tokens.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <SelectorHeader selector={selectedSelector} />
        <div className="flex items-center justify-center flex-1 text-xs text-gray-400">
          Aucune valeur éditable
        </div>
      </div>
    )
  }

  // Group tokens by property
  const byProperty = new Map<string, EditableToken[]>()
  for (const token of tokens) {
    const list = byProperty.get(token.property) ?? []
    list.push(token)
    byProperty.set(token.property, list)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SelectorHeader selector={selectedSelector} />

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {Array.from(byProperty.entries()).map(([property, propTokens]) => (
          <PropertyGroup
            key={property}
            property={property}
            tokens={propTokens}
            modifications={modifications}
            onSetValue={setTokenValue}
            onReset={resetToken}
          />
        ))}
      </div>
    </div>
  )
}

function SelectorHeader({ selector }: { selector: string }) {
  return (
    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <span className="text-xs font-mono text-blue-600 dark:text-blue-400 break-all">
        {selector}
      </span>
    </div>
  )
}

function PropertyGroup({
  property, tokens, modifications, onSetValue, onReset
}: {
  property: string
  tokens: EditableToken[]
  modifications: Map<string, string>
  onSetValue: (id: string, text: string) => void
  onReset: (id: string) => void
}) {
  return (
    <div className="py-1">
      {tokens.length > 1 && (
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 font-mono">
          {property}
        </div>
      )}
      <div className="space-y-1">
        {tokens.map((token) => {
          const currentText = modifications.get(token.id) ?? token.currentText
          const isModified = modifications.has(token.id)
          const control = inferControl(token)

          // Derive current numeric value from currentText
          const currentValue = parseCurrentValue(currentText, token)
          const currentUnit = parseCurrentUnit(currentText, token)

          const subLabel = tokens.length > 1
            ? `${property} (${shorthandLabel(property, token.declarationIndex)})`
            : property

          const handleChange = (newText: string) => onSetValue(token.id, newText)
          const handleReset = () => onReset(token.id)

          if (token.kind === 'color') {
            return (
              <ColorControl
                key={token.id}
                label={subLabel}
                value={currentText}
                originalText={token.currentText}
                onChange={handleChange}
                onReset={handleReset}
                isModified={isModified}
              />
            )
          }

          if (control.primary.kind === 'step-select') {
            return (
              <StepSelectControl
                key={token.id}
                label={subLabel}
                value={currentValue}
                options={control.primary.options ?? [100, 200, 300, 400, 500, 600, 700, 800, 900]}
                unit={currentUnit}
                originalText={token.currentText}
                onChange={handleChange}
                onReset={handleReset}
                isModified={isModified}
              />
            )
          }

          return (
            <NumericSlider
              key={token.id}
              label={subLabel}
              value={currentValue}
              unit={currentUnit}
              originalText={token.currentText}
              min={control.primary.min}
              max={control.primary.max}
              step={control.primary.step ?? 0.5}
              onChange={handleChange}
              onReset={handleReset}
              isModified={isModified}
            />
          )
        })}
      </div>
    </div>
  )
}

function StepSelectControl({
  label, value, options, unit, originalText, onChange, onReset, isModified
}: {
  label: string
  value: number
  options: number[]
  unit: string | null
  originalText: string
  onChange: (text: string) => void
  onReset: () => void
  isModified: boolean
}) {
  return (
    <div className="flex items-center gap-2 group">
      <span className={`w-28 flex-shrink-0 text-xs truncate ${isModified ? 'text-orange-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1 flex-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(formatNumericValue(opt, originalText, unit))}
            className={`
              px-2 py-0.5 text-xs rounded border transition-colors
              ${value === opt
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-blue-400'
              }
            `}
            aria-pressed={value === opt}
          >
            {opt}
          </button>
        ))}
      </div>
      <button
        onClick={onReset}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity"
        aria-label={`Réinitialiser ${label}`}
      >
        ↺
      </button>
    </div>
  )
}

function parseCurrentValue(text: string, token: EditableToken): number {
  if (token.kind === 'color') return 0
  const num = parseFloat(text)
  return isNaN(num) ? token.parsedValue : num
}

function parseCurrentUnit(text: string, token: EditableToken): string | null {
  if (token.kind === 'color' || token.unit === null) return token.unit
  // Extract unit suffix from modified text
  const match = text.match(/[a-z%]+$/i)
  return match ? match[0]!.toLowerCase() : token.unit
}
