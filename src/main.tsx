import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './ui/App'
import './styles.css'
import { useEditorStore } from './store/editor-store'

if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>
  w.__cvLoad = (content: string, name: string) =>
    useEditorStore.getState().loadDocument(content, name)
  w.__cvStore = useEditorStore
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
