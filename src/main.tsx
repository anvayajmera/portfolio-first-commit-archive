/* Entry point. Fonts are self-hosted and bundled — no CDN request, no flash of
   unstyled text (spec §2). See styles/fonts.css for why they are declared by
   hand rather than imported from the package entrypoints. */

import './styles/fonts.css'
import './styles/tokens.css'
import './styles/base.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
