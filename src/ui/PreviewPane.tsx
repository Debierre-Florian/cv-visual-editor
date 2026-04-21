import React, { useEffect, useRef, useCallback, useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Target } from 'lucide-react'
import { useEditorStore } from '../store/editor-store'

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200]

// IDs of injected helper nodes — never touched by incremental style updates
const HL_STYLE_ID   = '__cv-editor-hl-style__'
const HL_SCRIPT_ID  = '__cv-editor-hl-script__'
const INS_STYLE_ID  = '__cv-inspect-style__'
const INS_SCRIPT_ID = '__cv-inspect__'

export default function PreviewPane() {
  const {
    doc,
    previewZoom,
    setPreviewZoom,
    inspectMode,
    toggleInspectMode,
    selectSelector,
    hoveredSelector,
    getRenderedSource
  } = useEditorStore()

  const iframeRef  = useRef<HTMLIFrameElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [highlightCount, setHighlightCount] = useState(0)
  const lastSourceRef = useRef<string>('')

  const renderedSource = getRenderedSource()

  // ─── Helper: get iframe document safely ───────────────────────────────────
  const getIDoc = useCallback((): Document | null => {
    try { return iframeRef.current?.contentDocument ?? null }
    catch { return null }
  }, [])

  // ─── Inject highlight listener (survives incremental style updates) ────────
  const ensureHighlightScript = useCallback((idoc: Document) => {
    if (idoc.getElementById(HL_SCRIPT_ID)) return   // already present

    // CSS for the two highlight classes
    const style = idoc.createElement('style')
    style.id = HL_STYLE_ID
    style.textContent = `
      .__cv-editor-hl  { outline: 2px solid #3b82f6 !important; outline-offset: 2px !important; background: rgba(59,130,246,0.08) !important; transition: outline 0.1s, background 0.1s; }
      .__cv-inspect-hl { outline: 2px solid #f97316 !important; outline-offset: 1px !important; }
    `
    idoc.head.appendChild(style)

    // postMessage listener — runs inside the iframe
    const script = idoc.createElement('script')
    script.id = HL_SCRIPT_ID
    script.textContent = `
(function () {
  var highlighted = [];

  function applyHighlight(selector) {
    clearHighlight();
    if (!selector) return;
    try {
      var els = Array.from(document.querySelectorAll(selector));
      els.forEach(function (el) { el.classList.add('__cv-editor-hl'); });
      highlighted = els;
      // Report count back to parent
      window.parent.postMessage({ type: 'cv-hl-count', count: els.length }, '*');
    } catch (e) {
      // Invalid selector — ignore silently
    }
  }

  function clearHighlight() {
    highlighted.forEach(function (el) { el.classList.remove('__cv-editor-hl'); });
    highlighted = [];
  }

  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'cv-highlight')       applyHighlight(e.data.selector);
    if (e.data.type === 'cv-clear-highlight') { clearHighlight(); window.parent.postMessage({ type: 'cv-hl-count', count: 0 }, '*'); }
  });
})();
    `
    idoc.body.appendChild(script)
  }, [])

  // ─── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!iframeRef.current || !renderedSource || isLoaded) return
    iframeRef.current.srcdoc = renderedSource
    lastSourceRef.current = renderedSource
  }, [renderedSource, isLoaded])

  // ─── Incremental style update ──────────────────────────────────────────────
  useEffect(() => {
    if (!iframeRef.current || !isLoaded || !renderedSource) return
    if (renderedSource === lastSourceRef.current) return

    const idoc = getIDoc()
    if (!idoc) return

    try {
      // Only update CV style tags — skip our injected helpers
      const cvStyles   = Array.from(idoc.querySelectorAll('style'))
        .filter(s => !s.id.startsWith('__cv-'))
      const parser  = new DOMParser()
      const newDoc  = parser.parseFromString(renderedSource, 'text/html')
      const newStyles = Array.from(newDoc.querySelectorAll('style'))
        .filter(s => !s.id.startsWith('__cv-'))

      cvStyles.forEach((styleEl, i) => {
        const newStyle = newStyles[i]
        if (newStyle && styleEl.textContent !== newStyle.textContent) {
          styleEl.textContent = newStyle.textContent
        }
      })

      lastSourceRef.current = renderedSource

      // Re-inject helpers if they were lost (e.g. after a full srcdoc reload)
      ensureHighlightScript(idoc)
      if (inspectMode) ensureInspectScript(idoc, selectSelector)
    } catch {
      // Fallback: full reload — helpers will be re-injected on the next onLoad
      iframeRef.current.srcdoc = renderedSource
      lastSourceRef.current = renderedSource
    }
  }, [renderedSource, isLoaded, inspectMode, getIDoc, ensureHighlightScript, selectSelector])

  // ─── On iframe load: inject helpers ───────────────────────────────────────
  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    const idoc = getIDoc()
    if (!idoc) return
    ensureHighlightScript(idoc)
  }, [getIDoc, ensureHighlightScript])

  // ─── Inspect mode ──────────────────────────────────────────────────────────
  useEffect(() => {
    const idoc = getIDoc()
    if (!idoc || !isLoaded) return
    if (inspectMode) {
      ensureInspectScript(idoc, selectSelector)
    } else {
      removeInspectScript(idoc)
    }
  }, [inspectMode, isLoaded, getIDoc, selectSelector])

  // ─── Sidebar hover → highlight in iframe ──────────────────────────────────
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !isLoaded) return

    if (hoveredSelector) {
      iframe.contentWindow?.postMessage({ type: 'cv-highlight', selector: hoveredSelector }, '*')
    } else {
      iframe.contentWindow?.postMessage({ type: 'cv-clear-highlight' }, '*')
    }
  }, [hoveredSelector, isLoaded])

  // ─── Listen for count / inspect messages from iframe ──────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'cv-hl-count')         setHighlightCount(e.data.count ?? 0)
      if (e.data?.type === 'cv-inspect-selector') selectSelector(e.data.selector)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [selectSelector])

  // Clear badge when hover ends
  useEffect(() => {
    if (!hoveredSelector) setHighlightCount(0)
  }, [hoveredSelector])

  const zoomIn = () => {
    const idx = ZOOM_LEVELS.findIndex((z) => z > previewZoom)
    if (idx !== -1) setPreviewZoom(ZOOM_LEVELS[idx]!)
  }
  const zoomOut = () => {
    const arr = [...ZOOM_LEVELS].reverse()
    const idx = arr.findIndex((z) => z < previewZoom)
    if (idx !== -1) setPreviewZoom(arr[idx]!)
  }

  if (!doc) return null

  return (
    <div className="flex flex-col h-full bg-gray-200 dark:bg-gray-700">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 h-8 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 select-none">
        <button onClick={zoomOut} title="Zoom -" aria-label="Zoom arrière" className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
          <ZoomOut size={14} />
        </button>
        <select
          value={previewZoom}
          onChange={(e) => setPreviewZoom(Number(e.target.value))}
          className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5"
          aria-label="Niveau de zoom"
        >
          {ZOOM_LEVELS.map((z) => (
            <option key={z} value={z}>{z}%</option>
          ))}
        </select>
        <button onClick={zoomIn} title="Zoom +" aria-label="Zoom avant" className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
          <ZoomIn size={14} />
        </button>
        <button onClick={() => setPreviewZoom(75)} title="Ajuster" aria-label="Ajuster à la fenêtre" className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
          <Maximize2 size={14} />
        </button>

        {/* Hover match badge */}
        {highlightCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500 text-white leading-none">
            {highlightCount} élément{highlightCount > 1 ? 's' : ''}
          </span>
        )}

        <div className="flex-1" />

        <button
          onClick={toggleInspectMode}
          title="Mode Inspect (Ctrl+I)"
          aria-label="Mode Inspect"
          aria-pressed={inspectMode}
          className={`
            flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors
            ${inspectMode ? 'bg-orange-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}
          `}
        >
          <Target size={13} />
          Inspect
        </button>
      </div>

      {/* iframe */}
      <div className="flex-1 overflow-auto flex justify-center pt-4 pb-4">
        <div
          style={{
            transform: `scale(${previewZoom / 100})`,
            transformOrigin: 'top center',
            width: `${100 / (previewZoom / 100)}%`
          }}
        >
          <iframe
            ref={iframeRef}
            sandbox="allow-same-origin"
            onLoad={handleLoad}
            className={`w-full border-0 ${inspectMode ? 'cursor-crosshair' : ''}`}
            style={{ minHeight: '297mm', display: 'block' }}
            title="Aperçu du CV"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Inspect script helpers ────────────────────────────────────────────────────

function ensureInspectScript(idoc: Document, onSelect: (s: string) => void): void {
  if (idoc.getElementById(INS_SCRIPT_ID)) return

  // Style for orange inspect hover (distinct from blue sidebar highlight)
  if (!idoc.getElementById(INS_STYLE_ID)) {
    const style = idoc.createElement('style')
    style.id = INS_STYLE_ID
    style.textContent = `.__cv-inspect-hl { outline: 2px solid #f97316 !important; outline-offset: 1px !important; }`
    idoc.head.appendChild(style)
  }

  const script = idoc.createElement('script')
  script.id = INS_SCRIPT_ID
  script.textContent = `
(function () {
  var hovered = null;
  function getCssSelector(el) {
    if (!el || el === document.body) return 'body';
    var parts = [], current = el;
    while (current && current !== document.body) {
      var part = current.tagName.toLowerCase();
      if (current.id) { part += '#' + current.id; parts.unshift(part); break; }
      var classes = Array.from(current.classList).filter(function(c) { return !c.startsWith('__cv'); });
      if (classes.length) part += '.' + classes.join('.');
      parts.unshift(part);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }
  document.addEventListener('mouseover', function(e) {
    if (hovered) hovered.classList.remove('__cv-inspect-hl');
    hovered = e.target;
    if (hovered) hovered.classList.add('__cv-inspect-hl');
  });
  document.addEventListener('click', function(e) {
    e.preventDefault();
    window.parent.postMessage({ type: 'cv-inspect-selector', selector: getCssSelector(e.target) }, '*');
  });
})();
  `
  idoc.body.appendChild(script)
}

function removeInspectScript(idoc: Document): void {
  idoc.getElementById(INS_SCRIPT_ID)?.remove()
  idoc.getElementById(INS_STYLE_ID)?.remove()
  idoc.querySelectorAll('.__cv-inspect-hl').forEach(el => el.classList.remove('__cv-inspect-hl'))
}
