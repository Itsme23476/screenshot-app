import { useSettings } from '../hooks/useSettings';
import '../styles/dashboard.css';

export default function PreferencesView() {
    const { settings, updateSetting, isLoaded } = useSettings();

    if (!isLoaded) return null;

    return (
        <div className="tab-content preferences-view">
            <h3>Basic Settings</h3>

            <div className="setting-row">
                <div className="setting-info">
                    <label>Global Shortcut</label>
                    <span className="setting-desc">The hotkey to trigger a screenshot</span>
                </div>
                {/* Normally we'd build a hotkey recorder, but we'll use a text input for the MVP */}
                <input
                    type="text"
                    value={settings.shortcut}
                    onChange={(e) => updateSetting('shortcut', e.target.value)}
                    className="setting-input"
                    placeholder="E.g. CommandOrControl+Shift+S"
                />
            </div>

            <div className="setting-row">
                <div className="setting-info">
                    <label>Default Save Format</label>
                    <span className="setting-desc">Preferred image format when saving directly</span>
                </div>
                <select
                    value={settings.format}
                    onChange={(e) => updateSetting('format', e.target.value as 'png' | 'jpg')}
                    className="setting-input"
                >
                    <option value="png">PNG (Lossless)</option>
                    <option value="jpg">JPEG (Lossy)</option>
                </select>
            </div>

            <div className="setting-row">
                <div className="setting-info">
                    <label>Play Capture Sound</label>
                    <span className="setting-desc">Play a camera shutter sound on capture</span>
                </div>
                <input
                    type="checkbox"
                    checked={settings.playSound}
                    onChange={(e) => updateSetting('playSound', e.target.checked)}
                    className="setting-toggle"
                />
            </div>

            <div className="setting-row">
                <div className="setting-info">
                    <label>Show Capture Flash</label>
                    <span className="setting-desc">Show a quick screen flash animation on capture</span>
                </div>
                <input
                    type="checkbox"
                    checked={settings.showFlash}
                    onChange={(e) => updateSetting('showFlash', e.target.checked)}
                    className="setting-toggle"
                />
            </div>
        </div>
    );
}
