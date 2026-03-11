import { useHistory } from '../hooks/useHistory';
import { invoke } from '@tauri-apps/api/core';
import { Copy, Trash2, Download } from 'lucide-react';
import '../styles/dashboard.css';

export default function HistoryView() {
    const { history, removeHistoryItem, clearHistory, isLoaded } = useHistory();

    if (!isLoaded) return null;

    const handleCopy = async (base64Url: string) => {
        try {
            const base64Data = base64Url.replace(/^data:image\/[a-z]+;base64,/, '');
            await invoke("copy_image_to_clipboard", { base64Data });
        } catch (err) {
            console.error("Copy failed:", err);
        }
    };

    const handleSave = async (base64Url: string) => {
        try {
            const { save } = await import("@tauri-apps/plugin-dialog");
            const filePath = await save({
                defaultPath: `snapshot-history-${Date.now()}.png`,
                filters: [{ name: "PNG Image", extensions: ["png"] }],
            });

            if (filePath) {
                const base64Data = base64Url.replace(/^data:image\/[a-z]+;base64,/, '');
                await invoke("save_image_to_disk", {
                    base64Data,
                    filePath,
                    format: "png",
                });
            }
        } catch (err) {
            console.error("Save failed:", err);
        }
    };

    if (history.length === 0) {
        return (
            <div className="tab-content empty-state">
                <p>No recent screenshots saved in history.</p>
                <span className="setting-desc">Take a screenshot using the Tray icon or hotkey.</span>
            </div>
        );
    }

    return (
        <div className="tab-content history-view">
            <div className="history-header">
                <h3>Recent Captures</h3>
                <button className="clear-btn" onClick={clearHistory}>
                    <Trash2 size={14} /> Clear All
                </button>
            </div>

            <div className="history-grid">
                {history.map((item) => (
                    <div key={item.id} className="history-card">
                        <div className="history-img-container">
                            <img src={item.base64Url} alt="Screenshot thumbnail" loading="lazy" />
                        </div>
                        <div className="history-actions">
                            <span className="history-date">
                                {new Date(item.timestamp).toLocaleString(undefined, {
                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </span>
                            <div className="history-btn-group">
                                <button onClick={() => handleCopy(item.base64Url)} title="Copy to clipboard">
                                    <Copy size={14} />
                                </button>
                                <button onClick={() => handleSave(item.base64Url)} title="Save as file">
                                    <Download size={14} />
                                </button>
                                <button onClick={() => removeHistoryItem(item.id)} className="danger" title="Delete from history">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
