import React from 'react';
import {
    MousePointer2, Pen, MoveUpRight, Square, Circle, Type, Droplet,
    Undo, Redo, Copy, Download, X
} from 'lucide-react';
import '../styles/toolbar.css';
import { ToolType } from './AnnotateCanvas';

interface AnnotationToolbarProps {
    tool: ToolType;
    setTool: (t: ToolType) => void;
    color: string;
    setColor: (c: string) => void;
    strokeWidth: number;
    setStrokeWidth: (w: number) => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onCopy: () => void;
    onSave: () => void;
    onCancel: () => void;
}

const COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'];

const TOOLS = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'pen', icon: Pen, label: 'Pen' },
    { id: 'arrow', icon: MoveUpRight, label: 'Arrow' },
    { id: 'rect', icon: Square, label: 'Rectangle' },
    { id: 'ellipse', icon: Circle, label: 'Ellipse' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'blur', icon: Droplet, label: 'Blur' },
] as const;

export default function AnnotationToolbar({
    tool, setTool, color, setColor, strokeWidth, setStrokeWidth,
    onUndo, onRedo, canUndo, canRedo, onCopy, onSave, onCancel
}: AnnotationToolbarProps) {
    return (
        <div className="annotation-toolbar">
            {/* Tools Section */}
            <div className="toolbar-section">
                {TOOLS.map(t => (
                    <button
                        key={t.id}
                        className={`tool-btn ${tool === t.id ? 'active' : ''}`}
                        onClick={() => setTool(t.id as ToolType)}
                        title={t.label}
                    >
                        <t.icon size={18} />
                    </button>
                ))}
            </div>

            <div className="toolbar-divider" />

            {/* Colors Section */}
            <div className="toolbar-section colors-grid">
                {COLORS.map(c => (
                    <button
                        key={c}
                        className={`color-btn ${color === c ? 'active' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                        title={`Color ${c}`}
                    />
                ))}
            </div>

            <div className="toolbar-divider" />

            {/* Stroke Width */}
            <div className="toolbar-section">
                <input
                    type="range"
                    min="2" max="20"
                    value={strokeWidth}
                    onChange={e => setStrokeWidth(parseInt(e.target.value))}
                    className="stroke-slider"
                    title="Stroke width"
                />
            </div>

            <div className="toolbar-divider" />

            {/* History Section */}
            <div className="toolbar-section">
                <button className="icon-btn" onClick={onUndo} disabled={!canUndo} title="Undo">
                    <Undo size={18} />
                </button>
                <button className="icon-btn" onClick={onRedo} disabled={!canRedo} title="Redo">
                    <Redo size={18} />
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Actions Section */}
            <div className="toolbar-section">
                <button className="action-btn" onClick={onCopy}>
                    <Copy size={16} /> Copy
                </button>
                <button className="action-btn" onClick={onSave}>
                    <Download size={16} /> Save
                </button>
                <button className="action-btn danger" onClick={onCancel}>
                    <X size={16} /> Cancel
                </button>
            </div>
        </div>
    );
}
