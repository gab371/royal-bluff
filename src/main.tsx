import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

export function mount(element: HTMLElement, options: { peerId: string; onExit?: () => void; externalPeerManager?: any }) {
  const root = createRoot(element);
  root.render(
    <StrictMode>
      <App isEmbedded={true} externalPeerManager={options.externalPeerManager} onExit={options.onExit} />
    </StrictMode>
  );
  return () => root.unmount();
}

// Attach to window for dynamic runtime loads
(window as any).mountRoyal = mount;

const rootEl = document.getElementById('root');
if (rootEl && rootEl.children.length === 0) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
