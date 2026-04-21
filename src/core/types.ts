export type TokenKind = 'dimension' | 'number' | 'percentage' | 'color'

export interface EditableToken {
  id: string
  styleBlockIndex: number
  absoluteStart: number // absolute offset in original source
  absoluteEnd: number
  currentText: string   // raw text as it appears in source, e.g. "10px"
  parsedValue: number   // numeric value, e.g. 10
  unit: string | null   // e.g. "px", null for bare numbers
  kind: TokenKind
  selector: string      // e.g. ".header-name h1"
  property: string      // e.g. "font-size"
  declarationIndex: number // nth value in the declaration (0-based)
}

export type ControlKind =
  | 'numeric-slider'
  | 'numeric-input'
  | 'color'
  | 'step-select'
  | 'unit-selector'

export interface ControlConfig {
  kind: ControlKind
  min?: number
  max?: number
  step?: number
  allowedUnits?: string[]
  options?: number[]    // for step-select (font-weight)
  isInteger?: boolean
}

export interface InferredControl {
  primary: ControlConfig
  secondary?: ControlConfig // e.g. unit selector alongside slider
}

// Command pattern for undo/redo
export interface EditCommand {
  tokenId: string
  previousText: string
  nextText: string
}

export interface HistoryEntry {
  commands: EditCommand[]
  timestamp: number
  label?: string
}
