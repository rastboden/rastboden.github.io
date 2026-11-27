import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import { requestPersistentStorage } from './lib/persistentStorage'

// Asked as early as possible, so the data is protected before any is entered.
void requestPersistentStorage()

const root = document.getElementById('root')
if (!root) {
  throw new Error('Missing #root element in index.html')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
