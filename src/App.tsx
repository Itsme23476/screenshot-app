import { useEffect, useState } from "react";
import { getCurrentWebviewWindow, WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { listen } from "@tauri-apps/api/event";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { currentMonitor, primaryMonitor } from "@tauri-apps/api/window";
import OverlayView from "./views/OverlayView";
import PreferencesView from "./views/PreferencesView";
import HistoryView from "./views/HistoryView";
import { Settings, History } from "lucide-react";
import "./styles/dashboard.css";

const currentWindow = getCurrentWebviewWindow();
const IS_OVERLAY = currentWindow.label === "overlay";

async function showOverlay() {
  const overlay = await WebviewWindow.getByLabel("overlay");
  if (!overlay) return;

  const monitor = await currentMonitor() || await primaryMonitor();
  if (monitor) {
    await overlay.setPosition(
      new PhysicalPosition(monitor.position.x, monitor.position.y)
    );
    await overlay.setSize(
      new PhysicalSize(monitor.size.width, monitor.size.height)
    );
  }
  await overlay.show();
  await overlay.setFocus();
}

function App() {
  const [activeTab, setActiveTab] = useState<'history' | 'preferences'>('history');

  useEffect(() => {
    // Only set up global logic on the main window
    if (IS_OVERLAY) return;

    let unlisten: (() => void) | undefined;
    let unlistenShow: (() => void) | undefined;

    async function setup() {
      try {
        await unregisterAll();

        // Get the latest shortcut preference manually from localStorage for setup
        const stored = localStorage.getItem('snapshot_settings');
        let shortcut = "CommandOrControl+Shift+S";
        if (stored) {
          try { shortcut = JSON.parse(stored).shortcut || shortcut; } catch (e) { }
        }

        await register(shortcut, async (event) => {
          if (event.state === "Pressed") await showOverlay();
        });

        unlisten = await listen("start-capture", async () => {
          await showOverlay();
        });

        unlistenShow = await listen("show-dashboard", async () => {
          await currentWindow.show();
          await currentWindow.setFocus();
        });

      } catch (err) {
        console.error("Failed to setup main window listeners:", err);
      }
    }

    setup();

    return () => {
      import("@tauri-apps/plugin-global-shortcut").then(m => m.unregisterAll());
      if (unlisten) unlisten();
      if (unlistenShow) unlistenShow();
    };
  }, []);

  // The overlay window renders the overlay view
  if (IS_OVERLAY) {
    return <OverlayView />;
  }

  // Main window renders the dashboard
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>SnapShot</h2>
        <div className="dashboard-tabs">
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} /> History
          </button>
          <button
            className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <Settings size={16} /> Preferences
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'preferences' && <PreferencesView />}
      </main>
    </div>
  );
}

export default App;
