import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Toaster } from 'sonner'
import { useThemeStore } from './stores/themeStore'

function AppRoot() {
  const { theme } = useThemeStore();

  return (
    <>
      <App />
      <Toaster
        position="top-center"
        richColors
        theme={theme}
        toastOptions={{
          style: {
            fontFamily: 'inherit',
            fontSize: '0.75rem',
            fontWeight: '700',
            letterSpacing: '0.02em',
            borderRadius: '14px',
            border: '1px solid',
          },
          classNames: {
            toast: 'shadow-xl',
          },
        }}
      />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
)
