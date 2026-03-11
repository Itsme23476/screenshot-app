import { useState, useEffect } from 'react';

export interface AppSettings {
    shortcut: string;
    format: 'png' | 'jpg';
    quality: number;
    playSound: boolean;
    showFlash: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
    shortcut: 'CommandOrControl+Shift+S',
    format: 'png',
    quality: 100,
    playSound: true,
    showFlash: true,
};

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('snapshot_settings');
        if (stored) {
            try {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
        setIsLoaded(true);
    }, []);

    const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        const next = { ...settings, [key]: value };
        setSettings(next);
        localStorage.setItem('snapshot_settings', JSON.stringify(next));
    };

    return { settings, updateSetting, isLoaded };
}
