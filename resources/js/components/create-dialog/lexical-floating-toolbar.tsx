import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_LOW,
    FORMAT_TEXT_COMMAND,
    SELECTION_CHANGE_COMMAND,
    type RangeSelection,
    $createParagraphNode,
} from 'lexical';
import { $setBlocksType, $patchStyleText, $getSelectionStyleValueForProperty } from '@lexical/selection';
import { $createHeadingNode, $isHeadingNode, type HeadingTagType } from '@lexical/rich-text';
import { $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bold, ChevronLeft, Italic, Link2, Strikethrough, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    useFloating,
    offset,
    flip,
    shift,
    FloatingPortal,
} from '@floating-ui/react';

/* ─── Types ─── */

type ToolbarView = 'default' | 'block-type' | 'text-color' | 'highlight-color';
type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol';

/* ─── Constants ─── */

const BLOCK_LABELS: Record<BlockType, string> = {
    paragraph: 'Body',
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    ul: 'Bulleted list',
    ol: 'Numbered list',
};

const TEXT_COLORS = [
    { label: 'Default', value: '', swatch: 'rgb(238,239,241)' },
    { label: 'Gray', value: 'rgb(162,164,167)', swatch: 'rgb(162,164,167)' },
    { label: 'Brown', value: 'rgb(159,107,83)', swatch: 'rgb(159,107,83)' },
    { label: 'Orange', value: 'rgb(217,133,56)', swatch: 'rgb(217,133,56)' },
    { label: 'Yellow', value: 'rgb(203,176,60)', swatch: 'rgb(203,176,60)' },
    { label: 'Green', value: 'rgb(68,172,99)', swatch: 'rgb(68,172,99)' },
    { label: 'Blue', value: 'rgb(78,140,252)', swatch: 'rgb(78,140,252)' },
    { label: 'Purple', value: 'rgb(154,109,215)', swatch: 'rgb(154,109,215)' },
    { label: 'Pink', value: 'rgb(209,87,150)', swatch: 'rgb(209,87,150)' },
    { label: 'Red', value: 'rgb(235,87,87)', swatch: 'rgb(235,87,87)' },
] as const;

const HIGHLIGHT_COLORS = [
    { label: 'No highlight', value: '', swatch: '' },
    { label: 'Gray', value: 'rgba(162,164,167,0.2)', swatch: 'rgb(162,164,167)' },
    { label: 'Brown', value: 'rgba(159,107,83,0.2)', swatch: 'rgb(159,107,83)' },
    { label: 'Orange', value: 'rgba(217,133,56,0.2)', swatch: 'rgb(217,133,56)' },
    { label: 'Yellow', value: 'rgba(203,176,60,0.2)', swatch: 'rgb(203,176,60)' },
    { label: 'Green', value: 'rgba(68,172,99,0.2)', swatch: 'rgb(68,172,99)' },
    { label: 'Blue', value: 'rgba(78,140,252,0.2)', swatch: 'rgb(78,140,252)' },
    { label: 'Purple', value: 'rgba(154,109,215,0.2)', swatch: 'rgb(154,109,215)' },
    { label: 'Pink', value: 'rgba(209,87,150,0.2)', swatch: 'rgb(209,87,150)' },
    { label: 'Red', value: 'rgba(235,87,87,0.2)', swatch: 'rgb(235,87,87)' },
] as const;

/* ─── Helpers ─── */

function getBlockType(selection: RangeSelection): BlockType {
    const anchor = selection.anchor;
    const node = anchor.getNode();
    const parent = node.getParent();

    if ($isListNode(parent)) {
        return parent.getListType() === 'number' ? 'ol' : 'ul';
    }

    if (parent) {
        const grandParent = parent.getParent();
        if ($isListNode(grandParent)) {
            return grandParent.getListType() === 'number' ? 'ol' : 'ul';
        }
    }

    const topLevel = node.getTopLevelElementOrThrow();
    if ($isHeadingNode(topLevel)) {
        return topLevel.getTag() as BlockType;
    }

    return 'paragraph';
}

/** Get a virtual element at the selection start for FloatingUI positioning */
function getSelectionStartRect(): DOMRect | null {
    const nativeSelection = window.getSelection();
    if (!nativeSelection || nativeSelection.rangeCount === 0) return null;

    const range = nativeSelection.getRangeAt(0);
    // Create a collapsed range at the start of the selection
    const startRange = document.createRange();
    startRange.setStart(range.startContainer, range.startOffset);
    startRange.setEnd(range.startContainer, range.startOffset);

    const rect = startRange.getBoundingClientRect();
    startRange.detach();

    if (rect.width === 0 && rect.height === 0 && rect.x === 0 && rect.y === 0) return null;

    return rect;
}

/* ─── Icons ─── */

function HighlightOffIcon({ className }: { className?: string }) {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
            <rect width="16" height="16" rx="5" fill="white" />
            <path d="M5 11L11 5" stroke="#FF5B59" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="0.5" y="0.5" width="15" height="15" rx="4.5" stroke="#232529" strokeOpacity="0.1" />
        </svg>
    );
}

function ColorSwatch({ color, active, noColor }: { color: string; active: boolean; noColor?: boolean }) {
    if (noColor) {
        return (
            <div className="relative size-5 rounded-[5px] bg-white flex items-center justify-center overflow-hidden">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="absolute">
                    <path d="M3 13L13 3" stroke="#FF5B59" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 rounded-[5px] ring-1 ring-inset ring-[rgba(35,37,41,0.1)]" />
            </div>
        );
    }

    return (
        <div
            className={cn(
                'relative size-5 rounded-[5px] flex items-center justify-center',
                active && 'ring-2 ring-[rgb(78,140,252)] ring-offset-1 ring-offset-[rgb(26,29,33)]',
            )}
            style={{ backgroundColor: color }}
        >
            {active && <Check className="size-2.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />}
        </div>
    );
}

/* ─── Plugin ─── */

export function FloatingToolbarPlugin() {
    const [editor] = useLexicalComposerContext();
    const [isVisible, setIsVisible] = useState(false);
    const [view, setView] = useState<ToolbarView>('default');
    const [blockType, setBlockType] = useState<BlockType>('paragraph');
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [textColor, setTextColor] = useState('');
    const [highlightColor, setHighlightColor] = useState('');
    const positionRef = useRef<DOMRect | null>(null);

    const { refs, floatingStyles } = useFloating({
        strategy: 'absolute',
        placement: 'top-start',
        middleware: [
            offset(8),
            flip({ padding: 8 }),
            shift({ padding: 8 }),
        ],
    });

    const updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || selection.isCollapsed()) {
            setIsVisible(false);
            setView('default');
            return;
        }

        setIsBold(selection.hasFormat('bold'));
        setIsItalic(selection.hasFormat('italic'));
        setIsStrikethrough(selection.hasFormat('strikethrough'));
        setBlockType(getBlockType(selection));
        setTextColor($getSelectionStyleValueForProperty(selection, 'color', ''));
        setHighlightColor($getSelectionStyleValueForProperty(selection, 'background-color', ''));

        const rect = getSelectionStartRect();
        if (!rect) {
            setIsVisible(false);
            return;
        }

        positionRef.current = rect;
        refs.setPositionReference({
            getBoundingClientRect: () => positionRef.current!,
        });
        setIsVisible(true);
    }, [refs]);

    useEffect(() => {
        return editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            () => {
                updateToolbar();
                return false;
            },
            COMMAND_PRIORITY_LOW,
        );
    }, [editor, updateToolbar]);

    useEffect(() => {
        const handleMouseUp = () => {
            setTimeout(() => {
                editor.getEditorState().read(() => {
                    updateToolbar();
                });
            }, 10);
        };
        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [editor, updateToolbar]);

    const formatBlock = useCallback((type: BlockType) => {
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;

            switch (type) {
                case 'paragraph':
                    $setBlocksType(selection, () => $createParagraphNode());
                    break;
                case 'h1':
                case 'h2':
                case 'h3':
                    $setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType));
                    break;
                case 'ul':
                    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
                    break;
                case 'ol':
                    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
                    break;
            }
        });
        setView('default');
    }, [editor]);

    const applyTextColor = useCallback((color: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            $patchStyleText(selection, { color: color || null });
        });
        setTextColor(color);
        setView('default');
    }, [editor]);

    const applyHighlightColor = useCallback((color: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            $patchStyleText(selection, { 'background-color': color || null });
        });
        setHighlightColor(color);
        setView('default');
    }, [editor]);

    if (!isVisible) return null;

    /* ─── Attio: always-dark toolbar ─── */

    const toggleBtnClass = (active: boolean) => cn(
        'flex items-center justify-center h-7 max-h-7 p-[7px] rounded-lg',
        'transition-[background-color,color,box-shadow] duration-[160ms]',
        active
            ? 'bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] text-[rgb(238,239,241)]'
            : 'text-[rgb(238,239,241)] shadow-[inset_0_0_0_1px_transparent] hover:bg-white/5',
    );

    const labelBtnClass = (variant: 'primary' | 'secondary') => cn(
        'flex items-center justify-center gap-1 h-7 max-h-7 px-[7px] rounded-lg shrink-0',
        'text-sm font-medium tracking-[-0.01em] leading-5 font-[Inter,sans-serif]',
        'transition-[background-color,color,box-shadow] duration-[160ms]',
        'hover:bg-white/5',
        variant === 'primary' ? 'text-[rgb(238,239,241)]' : 'text-[rgb(162,164,167)]',
    );

    const separator = (
        <div className="self-stretch w-px rounded-[1px] bg-[rgba(255,255,255,0.05)] shrink-0" />
    );

    const activeTextSwatch = textColor || 'rgb(238,239,241)';
    const activeHighlightSwatch = highlightColor
        ? HIGHLIGHT_COLORS.find((c) => c.value === highlightColor)?.swatch || ''
        : '';

    return (
        <FloatingPortal>
            <div
                ref={refs.setFloating}
                data-hidden={!isVisible}
                className="pointer-events-auto"
                style={{
                    ...floatingStyles,
                    zIndex: 2147483646,
                    willChange: 'transform',
                }}
                onMouseDown={(e) => e.preventDefault()}
            >
                {/* Toolbar pill — Attio .kjFacc */}
                <div
                    className={cn(
                        'flex items-center gap-0.5 p-0.5 rounded-[10px]',
                        'bg-[rgb(26,29,33)]',
                        'shadow-[rgb(47,48,51)_0_0_0_1px_inset,rgba(0,0,0,0.16)_0_0_0_1px,rgba(0,0,0,0.48)_0_4px_8px_-4px,rgba(0,0,0,0.64)_0_4px_12px_-2px]',
                    )}
                >
                    {/* ── Default view ── */}
                    {view === 'default' && (
                        <>
                            {/* Block type — Attio .sBWdo[data-variant="secondary"] */}
                            <button
                                type="button"
                                onClick={() => setView('block-type')}
                                className={labelBtnClass('secondary')}
                            >
                                {BLOCK_LABELS[blockType]}
                            </button>

                            {separator}

                            {/* Text color — Attio .sBWdo[data-variant="primary"] + .cURHnC dot */}
                            <button
                                type="button"
                                onClick={() => setView('text-color')}
                                className={labelBtnClass('primary')}
                                aria-label="Text color"
                            >
                                Text
                                <div
                                    className="size-2 rounded-full shrink-0"
                                    style={{ backgroundColor: activeTextSwatch }}
                                />
                            </button>

                            {/* Highlight — Attio .sBWdo[data-variant="primary"] + .ffzjYc icon */}
                            <button
                                type="button"
                                onClick={() => setView('highlight-color')}
                                className={labelBtnClass('primary')}
                                aria-label="Highlight"
                            >
                                Highlight
                                {activeHighlightSwatch ? (
                                    <div
                                        className="size-4 rounded-[5px] shrink-0 ring-1 ring-inset ring-[rgba(255,255,255,0.1)]"
                                        style={{ backgroundColor: activeHighlightSwatch }}
                                    />
                                ) : (
                                    <HighlightOffIcon className="size-4 shrink-0" />
                                )}
                            </button>

                            {separator}

                            {/* Link — Attio .eIzORp */}
                            <button
                                type="button"
                                aria-pressed={false}
                                data-state="off"
                                aria-label="Link"
                                className={toggleBtnClass(false)}
                            >
                                <Link2 className="size-3.5" />
                            </button>

                            {separator}

                            {/* Bold / Italic / Strikethrough — Attio .iJTgVp group */}
                            <div className="flex items-center gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
                                    aria-pressed={isBold}
                                    data-state={isBold ? 'on' : 'off'}
                                    aria-label="Bold"
                                    className={toggleBtnClass(isBold)}
                                >
                                    <Bold className="size-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
                                    aria-pressed={isItalic}
                                    data-state={isItalic ? 'on' : 'off'}
                                    aria-label="Italic"
                                    className={toggleBtnClass(isItalic)}
                                >
                                    <Italic className="size-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
                                    aria-pressed={isStrikethrough}
                                    data-state={isStrikethrough ? 'on' : 'off'}
                                    aria-label="Strikethrough"
                                    className={toggleBtnClass(isStrikethrough)}
                                >
                                    <Strikethrough className="size-3.5" />
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── Block type picker ── */}
                    {view === 'block-type' && (
                        <>
                            <button
                                type="button"
                                onClick={() => setView('default')}
                                className={cn(
                                    'flex items-center justify-center h-7 max-h-7 p-[7px] rounded-lg',
                                    'text-[rgb(162,164,167)] hover:bg-white/5 hover:text-[rgb(238,239,241)]',
                                    'transition-[background-color,color] duration-[160ms]',
                                )}
                            >
                                <ChevronLeft className="size-3.5" />
                            </button>
                            {(Object.entries(BLOCK_LABELS) as [BlockType, string][]).map(([type, label]) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => formatBlock(type)}
                                    data-state={blockType === type ? 'on' : 'off'}
                                    className={cn(
                                        'flex items-center justify-center h-7 max-h-7 px-[7px] rounded-lg',
                                        'text-sm font-medium tracking-[-0.01em] leading-5 font-[Inter,sans-serif]',
                                        'transition-[background-color,color,box-shadow] duration-[160ms]',
                                        blockType === type
                                            ? 'bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] text-[rgb(238,239,241)]'
                                            : 'text-[rgb(238,239,241)] hover:bg-white/5',
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </>
                    )}

                    {/* ── Text color picker ── */}
                    {view === 'text-color' && (
                        <>
                            <button
                                type="button"
                                onClick={() => setView('default')}
                                className={cn(
                                    'flex items-center justify-center h-7 max-h-7 p-[7px] rounded-lg',
                                    'text-[rgb(162,164,167)] hover:bg-white/5 hover:text-[rgb(238,239,241)]',
                                    'transition-[background-color,color] duration-[160ms]',
                                )}
                            >
                                <ChevronLeft className="size-3.5" />
                            </button>
                            <div className="flex items-center gap-1 px-1">
                                {TEXT_COLORS.map((c) => (
                                    <button
                                        key={c.label}
                                        type="button"
                                        onClick={() => applyTextColor(c.value)}
                                        aria-label={c.label}
                                        className="flex items-center justify-center size-7 rounded-lg hover:bg-white/10 transition-[background-color] duration-[160ms]"
                                    >
                                        <ColorSwatch color={c.swatch} active={textColor === c.value} />
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── Highlight color picker ── */}
                    {view === 'highlight-color' && (
                        <>
                            <button
                                type="button"
                                onClick={() => setView('default')}
                                className={cn(
                                    'flex items-center justify-center h-7 max-h-7 p-[7px] rounded-lg',
                                    'text-[rgb(162,164,167)] hover:bg-white/5 hover:text-[rgb(238,239,241)]',
                                    'transition-[background-color,color] duration-[160ms]',
                                )}
                            >
                                <ChevronLeft className="size-3.5" />
                            </button>
                            <div className="flex items-center gap-1 px-1">
                                {HIGHLIGHT_COLORS.map((c) => (
                                    <button
                                        key={c.label}
                                        type="button"
                                        onClick={() => applyHighlightColor(c.value)}
                                        aria-label={c.label}
                                        className="flex items-center justify-center size-7 rounded-lg hover:bg-white/10 transition-[background-color] duration-[160ms]"
                                    >
                                        <ColorSwatch
                                            color={c.swatch}
                                            active={highlightColor === c.value}
                                            noColor={!c.value}
                                        />
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </FloatingPortal>
    );
}
