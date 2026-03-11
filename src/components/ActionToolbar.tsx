import "../styles/toolbar.css";

interface ActionToolbarProps {
    onCopy: () => void;
    onSave: () => void;
    onCancel: () => void;
}

export default function ActionToolbar({ onCopy, onSave, onCancel }: ActionToolbarProps) {
    return (
        <div className="action-toolbar">
            <button className="toolbar-btn copy-btn" onClick={onCopy} title="Copy to Clipboard">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy</span>
            </button>
            <button className="toolbar-btn save-btn" onClick={onSave} title="Save to Disk">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Save</span>
            </button>
            <div className="toolbar-divider" />
            <button className="toolbar-btn cancel-btn" onClick={onCancel} title="Cancel (Esc)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>Cancel</span>
            </button>
        </div>
    );
}
