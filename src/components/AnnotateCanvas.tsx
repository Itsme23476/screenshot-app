import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Rect, Ellipse, Arrow, Text } from 'react-konva';
import useImage from 'use-image';
import AnnotationToolbar from './AnnotationToolbar';
import { KonvaEventObject } from 'konva/lib/Node';

export type ToolType = 'select' | 'pen' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'blur';

export interface Annotation {
    id: string;
    type: ToolType;
    color: string;
    strokeWidth: number;
    points?: number[];
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    text?: string;
}

interface AnnotateCanvasProps {
    base64Data: string;
    width: number;
    height: number;
    onSave: (finalBase64: string) => void;
    onCopy: (finalBase64: string) => void;
    onCancel: () => void;
}

export default function AnnotateCanvas({ base64Data, width, height, onSave, onCopy, onCancel }: AnnotateCanvasProps) {
    const [image] = useImage(`data:image/png;base64,${base64Data}`);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
    const [history, setHistory] = useState<Annotation[][]>([[]]);
    const [historyStep, setHistoryStep] = useState(0);

    const [tool, setTool] = useState<ToolType>('pen');
    const [color, setColor] = useState('#ff0000');
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [isDrawing, setIsDrawing] = useState(false);

    // Focus and text editing
    const [editingTextId, setEditingTextId] = useState<string | null>(null);

    const stageRef = useRef<any>(null);

    // Calculate scaled dimensions for preview to fit screen roughly (CSS handles main div scale but Konva needs raw pixels)
    // Let's use raw pixels for the stage so export is native quality
    const stageWidth = width;
    const stageHeight = height;

    const handleUndo = () => {
        if (historyStep === 0) return;
        setHistoryStep((step) => step - 1);
        setAnnotations(history[historyStep - 1]);
    };

    const handleRedo = () => {
        if (historyStep === history.length - 1) return;
        setHistoryStep((step) => step + 1);
        setAnnotations(history[historyStep + 1]);
    };

    const pushToHistory = (newAnnotations: Annotation[]) => {
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(newAnnotations);
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    };

    const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
        if (tool === 'select') return;

        // Check if clicking on empty stage (not text)
        const clickedOnEmpty = e.target === e.target.getStage();
        if (!clickedOnEmpty && tool === 'text' && e.target.className === 'Text') {
            return; // handled by clicking text itself
        }

        setIsDrawing(true);
        const pos = e.target.getStage()?.getPointerPosition();
        if (!pos) return;

        const id = Date.now().toString();

        if (tool === 'text') {
            const newAnno: Annotation = {
                id, type: 'text', x: pos.x, y: pos.y, color, strokeWidth, text: 'Text', width: 100, height: 20
            };
            setAnnotations([...annotations, newAnno]);
            pushToHistory([...annotations, newAnno]);
            setEditingTextId(id);
            setIsDrawing(false);
            return;
        }

        setCurrentAnnotation({
            id,
            type: tool,
            color,
            strokeWidth,
            points: [pos.x, pos.y, pos.x, pos.y],
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
        });
    };

    const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
        if (!isDrawing || !currentAnnotation) return;

        const stage = e.target.getStage();
        const point = stage?.getPointerPosition();
        if (!point) return;

        if (tool === 'pen') {
            setCurrentAnnotation({
                ...currentAnnotation,
                points: [...(currentAnnotation.points || []), point.x, point.y]
            });
        } else if (tool === 'rect' || tool === 'ellipse') {
            setCurrentAnnotation({
                ...currentAnnotation,
                width: point.x - (currentAnnotation.x || 0),
                height: point.y - (currentAnnotation.y || 0),
            });
        } else if (tool === 'arrow') {
            setCurrentAnnotation({
                ...currentAnnotation,
                points: [currentAnnotation.points![0], currentAnnotation.points![1], point.x, point.y]
            });
        }
    };

    const handleMouseUp = () => {
        if (!isDrawing || !currentAnnotation) {
            setIsDrawing(false);
            return;
        }

        // Prevent 0-size objects
        if (
            (tool === 'pen' && currentAnnotation.points && currentAnnotation.points.length < 4) ||
            ((tool === 'rect' || tool === 'ellipse') && currentAnnotation.width === 0 && currentAnnotation.height === 0)
        ) {
            setIsDrawing(false);
            setCurrentAnnotation(null);
            return;
        }

        setIsDrawing(false);
        const newAnnotations = [...annotations, currentAnnotation];
        setAnnotations(newAnnotations);
        setCurrentAnnotation(null);
        pushToHistory(newAnnotations);
    };

    const handleExport = (action: 'save' | 'copy') => {
        if (!stageRef.current) return;
        setEditingTextId(null);

        setTimeout(() => {
            const dataUrl = stageRef.current.toDataURL({ pixelRatio: 1 });
            const base64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
            if (action === 'save') onSave(base64);
            if (action === 'copy') onCopy(base64);
        }, 50);
    };

    // Keep rendering logic clean for drawing
    const renderAnnotation = (anno: Annotation) => {
        switch (anno.type) {
            case 'pen':
                return <Line key={anno.id} points={anno.points || []} stroke={anno.color} strokeWidth={anno.strokeWidth} tension={0.5} lineCap="round" lineJoin="round" />;
            case 'arrow':
                return <Arrow key={anno.id} points={anno.points || []} stroke={anno.color} fill={anno.color} strokeWidth={anno.strokeWidth} pointerLength={10} pointerWidth={10} />;
            case 'rect':
                return <Rect key={anno.id} x={anno.x} y={anno.y} width={anno.width} height={anno.height} stroke={anno.color} strokeWidth={anno.strokeWidth} cornerRadius={4} />;
            case 'ellipse':
                return <Ellipse key={anno.id} x={(anno.x || 0) + (anno.width || 0) / 2} y={(anno.y || 0) + (anno.height || 0) / 2} radiusX={Math.abs((anno.width || 0) / 2)} radiusY={Math.abs((anno.height || 0) / 2)} stroke={anno.color} strokeWidth={anno.strokeWidth} />;
            // Text handles inline editing via HTML overlay
            case 'text':
                if (anno.id === editingTextId) return null; // hide while editing
                return (
                    <Text
                        key={anno.id}
                        x={anno.x}
                        y={anno.y}
                        text={anno.text}
                        fill={anno.color}
                        fontSize={Math.max(20, anno.strokeWidth * 4)}
                        fontFamily="sans-serif"
                        onClick={() => setEditingTextId(anno.id)}
                        onTap={() => setEditingTextId(anno.id)}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div
                style={{
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    maxWidth: '90vw',
                    maxHeight: '80vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <div style={{
                    transform: `scale(${Math.min(1, (window.innerWidth * 0.9) / stageWidth, (window.innerHeight * 0.8) / stageHeight)})`,
                    transformOrigin: 'center center'
                }}>
                    <Stage
                        width={stageWidth}
                        height={stageHeight}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        ref={stageRef}
                        style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
                    >
                        <Layer>
                            {image && <KonvaImage image={image} width={stageWidth} height={stageHeight} />}
                            {annotations.map(renderAnnotation)}
                            {currentAnnotation && renderAnnotation(currentAnnotation)}
                        </Layer>
                    </Stage>

                    {/* HTML Overlay for Text Editing */}
                    {editingTextId && (
                        <textarea
                            autoFocus
                            defaultValue={annotations.find(a => a.id === editingTextId)?.text}
                            style={{
                                position: 'absolute',
                                left: annotations.find(a => a.id === editingTextId)?.x,
                                top: annotations.find(a => a.id === editingTextId)?.y,
                                border: '1px dashed #4A9EFF',
                                background: 'transparent',
                                color: annotations.find(a => a.id === editingTextId)?.color,
                                outline: 'none',
                                resize: 'none',
                                padding: 0,
                                margin: 0,
                                fontSize: Math.max(20, (annotations.find(a => a.id === editingTextId)?.strokeWidth || 4) * 4),
                                fontFamily: 'sans-serif',
                                lineHeight: 1,
                                minWidth: 100,
                                minHeight: 40,
                                whiteSpace: 'pre',
                                overflow: 'hidden'
                            }}
                            onBlur={(e) => {
                                const newText = e.target.value;
                                setAnnotations(annotations.map(a => a.id === editingTextId ? { ...a, text: newText } : a));
                                setEditingTextId(null);
                                pushToHistory(annotations.map(a => a.id === editingTextId ? { ...a, text: newText } : a));
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setEditingTextId(null);
                                }
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Floating Toolbar for tools and actions */}
            <AnnotationToolbar
                tool={tool}
                setTool={setTool}
                color={color}
                setColor={setColor}
                strokeWidth={strokeWidth}
                setStrokeWidth={setStrokeWidth}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={historyStep > 0}
                canRedo={historyStep < history.length - 1}
                onCopy={() => handleExport('copy')}
                onSave={() => handleExport('save')}
                onCancel={onCancel}
            />
        </div>
    );
}
