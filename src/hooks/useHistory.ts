import { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';

export interface HistoryItem {
    id: string;
    timestamp: number;
    base64Url: string; // The data URL of the screenshot
    width: number;
    height: number;
}

export function useHistory() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const stored = await get<HistoryItem[]>('snapshot_history');
                if (stored) {
                    setHistory(stored);
                }
            } catch (e) {
                console.error("Failed to load history", e);
            }
            setIsLoaded(true);
        };
        load();
    }, []);

    const addHistoryItem = async (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
        const newItem: HistoryItem = {
            ...item,
            id: Date.now().toString(),
            timestamp: Date.now()
        };
        const next = [newItem, ...history].slice(0, 50); // Keep last 50 screenshots
        setHistory(next);
        await set('snapshot_history', next);
    };

    const removeHistoryItem = async (id: string) => {
        const next = history.filter(h => h.id !== id);
        setHistory(next);
        await set('snapshot_history', next);
    };

    const clearHistory = async () => {
        setHistory([]);
        await set('snapshot_history', []);
    };

    return { history, addHistoryItem, removeHistoryItem, clearHistory, isLoaded };
}
