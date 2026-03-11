import { useState, useRef, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import AnnotateCanvas from "../components/AnnotateCanvas";
import { useHistory } from "../hooks/useHistory";
import { useSettings } from "../hooks/useSettings";
import "../styles/overlay.css";

interface Selection {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

interface CaptureResult {
    base64: string;
    width: number;
    height: number;
}

type Phase = "selecting" | "captured" | "idle";

export default function OverlayView() {
    const [phase, setPhase] = useState<Phase>("idle");
    const [selection, setSelection] = useState<Selection | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [capturedImage, setCapturedImage] = useState<CaptureResult | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const { addHistoryItem } = useHistory();
    const { settings } = useSettings();

    // Reset state when a new capture session starts
    useEffect(() => {
        const setupListener = async () => {
            const unlisten = await listen("start-capture", () => {
                setPhase("selecting");
                setSelection(null);
                setCapturedImage(null);
                setIsDragging(false);
            });
            return unlisten;
        };

        const cleanup = setupListener();
        return () => {
            cleanup.then((fn) => fn());
        };
    }, []);

    // Handle Escape key to cancel
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                await hideOverlay();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const hideOverlay = useCallback(async () => {
        const currentWindow = getCurrentWebviewWindow();
        setPhase("idle");
        setSelection(null);
        setCapturedImage(null);
        setIsDragging(false);
        await currentWindow.hide();
    }, []);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (phase !== "selecting") return;
            setIsDragging(true);
            setSelection({
                startX: e.clientX,
                startY: e.clientY,
                endX: e.clientX,
                endY: e.clientY,
            });
        },
        [phase]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!isDragging || !selection) return;
            setSelection((prev) =>
                prev ? { ...prev, endX: e.clientX, endY: e.clientY } : null
            );
        },
        [isDragging, selection]
    );

    const handleMouseUp = useCallback(async () => {
        if (!isDragging || !selection) return;
        setIsDragging(false);

        const rect = getSelectionRect(selection);
        if (rect.width < 5 || rect.height < 5) {
            // Selection too small, reset
            setSelection(null);
            return;
        }

        // Take the screenshot
        try {
            // Get monitors to find the right one
            const displays: Array<{
                id: number;
                x: number;
                y: number;
                width: number;
                height: number;
            }> = await invoke("get_displays");

            const monitorId = displays.length > 0 ? displays[0].id : 0;

            // Hide overlay before capturing to avoid capturing the overlay itself
            const currentWindow = getCurrentWebviewWindow();
            await currentWindow.hide();

            // Small delay to let the window hide
            await new Promise((resolve) => setTimeout(resolve, 150));

            const result: CaptureResult = await invoke("take_screenshot", {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                monitorId: monitorId,
            });

            setCapturedImage(result);
            setPhase("captured");

            // Play sound if setting is enabled
            if (settings.playSound) {
                try {
                    const audio = new Audio('/src-tauri/resources/shutter.wav');
                    audio.play().catch(() => {
                        // Fallback to simple web audio beep if wav file fails
                        const ctx = new window.AudioContext();
                        const osc = ctx.createOscillator();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(800, ctx.currentTime);
                        osc.connect(ctx.destination);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.1);
                    });
                } catch (e) { }
            }

            // Show flash animation if setting enabled
            if (settings.showFlash) {
                const flash = document.createElement('div');
                flash.style.position = 'fixed';
                flash.style.inset = '0';
                flash.style.backgroundColor = 'white';
                flash.style.zIndex = '999999';
                flash.style.pointerEvents = 'none';
                flash.style.animation = 'flashAnimation 0.3s ease-out forwards';
                document.body.appendChild(flash);
                setTimeout(() => flash.remove(), 300);
            }

            // Add to history
            await addHistoryItem({
                base64Url: `data:image/png;base64,${result.base64}`,
                width: result.width,
                height: result.height
            });

            // Show overlay again to display the result
            await currentWindow.show();
            await currentWindow.setFocus();
        } catch (err) {
            console.error("Screenshot failed:", err);
            await hideOverlay();
        }
    }, [isDragging, selection, hideOverlay]);

    const getSelectionRect = (sel: Selection) => {
        const x = Math.min(sel.startX, sel.endX);
        const y = Math.min(sel.startY, sel.endY);
        const width = Math.abs(sel.endX - sel.startX);
        const height = Math.abs(sel.endY - sel.startY);
        return { x, y, width, height };
    };

    const handleCopy = useCallback(async (base64Data: string) => {
        try {
            await invoke("copy_image_to_clipboard", {
                base64Data: base64Data,
            });
            await hideOverlay();
        } catch (err) {
            console.error("Copy failed:", err);
        }
    }, [hideOverlay]);

    const handleSave = useCallback(async (base64Data: string) => {
        try {
            const { save } = await import("@tauri-apps/plugin-dialog");
            const filePath = await save({
                defaultPath: `screenshot-${Date.now()}.png`,
                filters: [
                    { name: "PNG Image", extensions: ["png"] },
                    { name: "JPEG Image", extensions: ["jpg", "jpeg"] },
                ],
            });

            if (filePath) {
                const ext = filePath.split(".").pop()?.toLowerCase() || "png";
                await invoke("save_image_to_disk", {
                    base64Data: base64Data,
                    filePath: filePath,
                    format: ext,
                });
                await hideOverlay();
            }
        } catch (err) {
            console.error("Save failed:", err);
        }
    }, [hideOverlay]);

    const handleCancel = useCallback(async () => {
        await hideOverlay();
    }, [hideOverlay]);

    // Build the overlay clip path to dim everything except the selection
    const selectionRect = selection ? getSelectionRect(selection) : null;

    return (
        <div
            ref={overlayRef}
            className={`overlay ${phase}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* Dimmed overlay with cutout */}
            {phase === "selecting" && (
                <>
                    <div className="overlay-dim" />
                    {selectionRect && selectionRect.width > 0 && (
                        <>
                            {/* Selection cutout (clear area) */}
                            <div
                                className="selection-cutout"
                                style={{
                                    left: selectionRect.x,
                                    top: selectionRect.y,
                                    width: selectionRect.width,
                                    height: selectionRect.height,
                                }}
                            />
                            {/* Selection border */}
                            <div
                                className="selection-border"
                                style={{
                                    left: selectionRect.x - 1,
                                    top: selectionRect.y - 1,
                                    width: selectionRect.width + 2,
                                    height: selectionRect.height + 2,
                                }}
                            />
                            {/* Dimension label */}
                            <div
                                className="selection-dimensions"
                                style={{
                                    left: selectionRect.x,
                                    top: selectionRect.y + selectionRect.height + 8,
                                }}
                            >
                                {Math.round(selectionRect.width)} × {Math.round(selectionRect.height)}
                            </div>
                        </>
                    )}
                    {/* Crosshair hint */}
                    {!isDragging && !selectionRect && (
                        <div className="crosshair-hint">
                            Click and drag to select an area
                        </div>
                    )}
                </>
            )}

            {/* Debug label to prove this mounted */}
            {phase === "selecting" && (
                <div style={{ position: "fixed", top: 10, left: 10, color: "red", background: "white", padding: 10, zIndex: 99999 }}>
                    Overlay Component is rendering! Is dragging: {String(isDragging)}
                </div>
            )}

            {/* Captured state: show image preview + toolbar */}
            {phase === "captured" && capturedImage && selectionRect && (
                <AnnotateCanvas
                    base64Data={capturedImage.base64}
                    width={selectionRect.width}
                    height={selectionRect.height}
                    onCopy={handleCopy}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            )}
        </div>
    );
}
