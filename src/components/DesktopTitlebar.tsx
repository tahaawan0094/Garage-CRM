import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Maximize2, Minimize2 } from 'lucide-react';
import './DesktopTitlebar.css';

interface WindowState {
  maximized: boolean;
  fullscreen: boolean;
}

interface DesktopTitlebarProps {
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

declare global {
  interface Window {
    desktopApp?: {
      controlWindow: (action: string) => Promise<WindowState | null>;
      getWindowState: () => Promise<WindowState | null>;
      onWindowStateChange: (cb: (state: WindowState) => void) => () => void;
      setZoomFactor?: (factor: number) => void;
      getZoomFactor?: () => number;
      isElectron?: boolean;
    };
  }
}

export default function DesktopTitlebar({ onToggleFullscreen, isFullscreen }: DesktopTitlebarProps) {
  const desktop = typeof window !== 'undefined' ? window.desktopApp : undefined;
  const isElectron = !!desktop?.controlWindow;

  const [windowState, setWindowState] = useState<WindowState>({
    maximized: false,
    fullscreen: false,
  });

  useEffect(() => {
    if (!desktop?.getWindowState) return;
    let mounted = true;
    const update = (state: WindowState | null) => {
      if (mounted && state) {
        setWindowState(state);
      }
    };
    desktop.getWindowState().then(update).catch(() => {});
    const unsub = desktop.onWindowStateChange?.(update);
    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, [desktop]);

  const controlWindow = (action: string) => {
    if (!desktop?.controlWindow) {
      if (action === 'toggle-fullscreen' && onToggleFullscreen) {
        onToggleFullscreen();
      }
      return;
    }
    desktop.controlWindow(action)
      .then((state) => {
        if (state) setWindowState(state);
      })
      .catch(() => {});
  };

  const handleTitlebarDoubleClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('.desktop-titlebar-actions')) return;
    controlWindow('toggle-maximize');
  };

  const activeFullscreen = isElectron ? windowState.fullscreen : !!isFullscreen;
  const isExpanded = windowState.fullscreen || windowState.maximized;

  return (
    <header
      className={`desktop-titlebar ${activeFullscreen ? 'is-fullscreen' : ''}`}
      onDoubleClick={handleTitlebarDoubleClick}
    >
      <div className="desktop-titlebar-brand">
        <span className="desktop-brand-icon">
          <img
            src={`${import.meta.env.BASE_URL}app-icon-preview.png`}
            alt="Garage CRM"
            draggable="false"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}Garage-crm-logo-light.png`;
            }}
          />
        </span>
        <span className="desktop-brand-name">
          GARAGE CRM <span>SUITE</span>
        </span>
      </div>

      <div className="desktop-titlebar-dragspace" />

      <div className="desktop-titlebar-actions">
        {/* Fullscreen Button */}
        <button
          type="button"
          className={`desktop-fullscreen-btn ${activeFullscreen ? 'is-active' : ''}`}
          aria-label={activeFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          title={activeFullscreen ? 'Exit Full Screen (F11 / Esc)' : 'Full Screen (F11) - Hide Windows Taskbar'}
          onClick={() => controlWindow('toggle-fullscreen')}
        >
          {activeFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span>{activeFullscreen ? 'Exit Fullscreen' : 'Full Screen'}</span>
        </button>

        {/* Window controls (Minimize, Maximize, Close) */}
        {isElectron && (
          <div className="desktop-window-controls">
            <button
              type="button"
              aria-label="Minimize Window"
              title="Minimize"
              onClick={() => controlWindow('minimize')}
            >
              <Minus size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label={isExpanded ? 'Restore Window' : 'Maximize Window'}
              title={isExpanded ? 'Restore' : 'Maximize'}
              onClick={() => controlWindow('toggle-maximize')}
            >
              {isExpanded ? <Copy size={12} strokeWidth={2} /> : <Square size={12} strokeWidth={2} />}
            </button>
            <button
              type="button"
              className="desktop-window-close"
              aria-label="Close Application"
              title="Close"
              onClick={() => controlWindow('close')}
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
