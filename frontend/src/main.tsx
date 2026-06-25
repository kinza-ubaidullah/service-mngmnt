import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import App from './App.tsx'
import { store } from './store/index.ts'

// Apply theme immediately on load to reduce flash
try {
  const saved = localStorage.getItem('crmThemeMode');
  if (saved === 'dark') {
    document.documentElement.classList.add('crm-dark');
    document.documentElement.style.colorScheme = 'dark';
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
