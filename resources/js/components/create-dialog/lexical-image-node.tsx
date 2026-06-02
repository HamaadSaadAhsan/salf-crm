import type {
    DOMConversionMap,
    DOMConversionOutput,
    DOMExportOutput,
    EditorConfig,
    LexicalNode,
    NodeKey,
    SerializedLexicalNode,
    Spread,
} from 'lexical';
import { $applyNodeReplacement, $getNodeByKey, DecoratorNode } from 'lexical';
import { type ReactNode, Suspense, useCallback, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Download, Ellipsis, Trash2 } from 'lucide-react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type ImageAlignment = 'left' | 'center' | 'right';

export type SerializedImageNode = Spread<
    {
        src: string;
        altText: string;
        width?: number;
        height?: number;
        alignment?: ImageAlignment;
    },
    SerializedLexicalNode
>;

function convertImageElement(domNode: Node): DOMConversionOutput | null {
    const img = domNode as HTMLImageElement;
    const src = img.getAttribute('src');
    if (!src) return null;
    const altText = img.getAttribute('alt') || '';
    const width = img.getAttribute('width') ? Number(img.getAttribute('width')) : undefined;
    const height = img.getAttribute('height') ? Number(img.getAttribute('height')) : undefined;
    const node = $createImageNode({ src, altText, width, height });
    return { node };
}

export class ImageNode extends DecoratorNode<ReactNode> {
    __src: string;
    __altText: string;
    __width: number | undefined;
    __height: number | undefined;
    __alignment: ImageAlignment;

    static getType(): string {
        return 'image';
    }

    static clone(node: ImageNode): ImageNode {
        return new ImageNode(node.__src, node.__altText, node.__width, node.__height, node.__alignment, node.__key);
    }

    constructor(src: string, altText: string, width?: number, height?: number, alignment?: ImageAlignment, key?: NodeKey) {
        super(key);
        this.__src = src;
        this.__altText = altText;
        this.__width = width;
        this.__height = height;
        this.__alignment = alignment || 'left';
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const span = document.createElement('span');
        span.className = 'editor-image-wrapper';
        span.style.display = 'block';
        return span;
    }

    updateDOM(): false {
        return false;
    }

    static importDOM(): DOMConversionMap | null {
        return {
            img: () => ({
                conversion: convertImageElement,
                priority: 0,
            }),
        };
    }

    exportDOM(): DOMExportOutput {
        const img = document.createElement('img');
        img.setAttribute('src', this.__src);
        img.setAttribute('alt', this.__altText);
        if (this.__width) img.setAttribute('width', String(this.__width));
        if (this.__height) img.setAttribute('height', String(this.__height));
        return { element: img };
    }

    static importJSON(serializedNode: SerializedImageNode): ImageNode {
        return $createImageNode({
            src: serializedNode.src,
            altText: serializedNode.altText,
            width: serializedNode.width,
            height: serializedNode.height,
            alignment: serializedNode.alignment,
        });
    }

    exportJSON(): SerializedImageNode {
        return {
            type: 'image',
            version: 1,
            src: this.__src,
            altText: this.__altText,
            width: this.__width,
            height: this.__height,
            alignment: this.__alignment,
        };
    }

    setWidth(width: number): void {
        const writable = this.getWritable();
        writable.__width = width;
    }

    setAlignment(alignment: ImageAlignment): void {
        const writable = this.getWritable();
        writable.__alignment = alignment;
    }

    decorate(): ReactNode {
        return (
            <Suspense fallback={null}>
                <ImageComponent
                    src={this.__src}
                    altText={this.__altText}
                    nodeKey={this.__key}
                    width={this.__width}
                    height={this.__height}
                    alignment={this.__alignment}
                />
            </Suspense>
        );
    }

    isInline(): boolean {
        return false;
    }

    getTextContent(): string {
        return `[image: ${this.__altText}]`;
    }
}

export function $createImageNode({
    src,
    altText,
    width,
    height,
    alignment,
}: {
    src: string;
    altText: string;
    width?: number;
    height?: number;
    alignment?: ImageAlignment;
}): ImageNode {
    return $applyNodeReplacement(new ImageNode(src, altText, width, height, alignment));
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
    return node instanceof ImageNode;
}

/* ------------------------------------------------------------------ */
/*  ImageComponent — Attio-style with resize handles & dropdown menu  */
/* ------------------------------------------------------------------ */

const MIN_WIDTH = 100;

/** Stop Lexical from capturing mouse events on interactive overlays */
function stopLexicalEvent(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
}

function ImageComponent({
    src,
    altText,
    nodeKey,
    width: initialWidth,
    height: initialHeight,
    alignment,
}: {
    src: string;
    altText: string;
    nodeKey: NodeKey;
    width?: number;
    height?: number;
    alignment: ImageAlignment;
}) {
    const [editor] = useLexicalComposerContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState(false);
    const [resizing, setResizing] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [currentWidth, setCurrentWidth] = useState<number | undefined>(initialWidth);
    const [naturalRatio, setNaturalRatio] = useState<number | null>(null);

    // Keep controls visible while resizing or menu is open
    const isVisible = hovered || resizing || menuOpen;

    // Compute height from aspect ratio
    const computedHeight = currentWidth && naturalRatio ? Math.round(currentWidth / naturalRatio) : initialHeight;

    // Capture natural aspect ratio on load
    const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (img.naturalWidth && img.naturalHeight) {
            setNaturalRatio(img.naturalWidth / img.naturalHeight);
            if (!currentWidth) {
                setCurrentWidth(img.naturalWidth);
            }
        }
    }, [currentWidth]);

    // Commit width to Lexical node
    const commitWidth = useCallback((w: number) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isImageNode(node)) {
                node.setWidth(w);
            }
        });
    }, [editor, nodeKey]);

    // Resize via mousedown → mousemove → mouseup on document
    const handleResizeStart = useCallback((side: 'left' | 'right', e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setResizing(true);

        const startX = e.clientX;
        const startWidth = currentWidth || containerRef.current?.offsetWidth || 300;

        const onMove = (moveEvt: MouseEvent) => {
            moveEvt.preventDefault();
            const dx = moveEvt.clientX - startX;
            const delta = side === 'right' ? dx : -dx;
            const newWidth = Math.max(MIN_WIDTH, startWidth + delta);
            setCurrentWidth(newWidth);
        };

        const onUp = () => {
            setResizing(false);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            const finalWidth = containerRef.current?.offsetWidth;
            if (finalWidth) {
                commitWidth(finalWidth);
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [currentWidth, commitWidth]);

    // Handle delete
    const handleDelete = useCallback(() => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node) node.remove();
        });
    }, [editor, nodeKey]);

    // Handle alignment
    const handleAlignment = useCallback((align: ImageAlignment) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isImageNode(node)) node.setAlignment(align);
        });
    }, [editor, nodeKey]);

    // Handle download
    const handleDownload = useCallback(() => {
        const link = document.createElement('a');
        link.href = src;
        link.download = altText || 'image';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [src, altText]);

    const alignmentClass = alignment === 'center' ? 'justify-center' : alignment === 'right' ? 'justify-end' : 'justify-start';

    return (
        // Outer: contentEditable=false prevents Lexical from treating this as editable text
        // onMouseDown stop prevents Lexical selection handling from swallowing our events
        <div
            className={`flex ${alignmentClass} mb-3`}
            contentEditable={false}
            suppressContentEditableWarning
        >
            <div
                ref={containerRef}
                className="relative inline-block"
                style={{
                    width: currentWidth ? `${currentWidth}px` : undefined,
                    maxWidth: '100%',
                    minWidth: `${MIN_WIDTH}px`,
                    transition: resizing ? 'none' : 'width 0.3s ease, height 0.3s ease',
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => { if (!resizing && !menuOpen) setHovered(false); }}
            >
                <img
                    src={src}
                    alt={altText}
                    width={currentWidth}
                    height={computedHeight}
                    className="max-w-full h-auto rounded-lg"
                    style={{ display: 'block' }}
                    draggable={false}
                    onLoad={handleImgLoad}
                />

                {/* Resize handle — left */}
                {isVisible && (
                    <div
                        role="separator"
                        aria-orientation="vertical"
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-full border border-white bg-[rgba(26,29,33,0.2)] mix-blend-difference cursor-col-resize shadow-[inset_0_0_0_1px_rgb(47,48,51),0_0_0_1px_rgba(0,0,0,0.16),0_4px_8px_-4px_rgba(0,0,0,0.48),0_4px_12px_-2px_rgba(0,0,0,0.64)]"
                        onMouseDown={(e) => handleResizeStart('left', e)}
                    />
                )}

                {/* Resize handle — right */}
                {isVisible && (
                    <div
                        role="separator"
                        aria-orientation="vertical"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-full border border-white bg-[rgba(26,29,33,0.2)] mix-blend-difference cursor-col-resize shadow-[inset_0_0_0_1px_rgb(47,48,51),0_0_0_1px_rgba(0,0,0,0.16),0_4px_8px_-4px_rgba(0,0,0,0.48),0_4px_12px_-2px_rgba(0,0,0,0.64)]"
                        onMouseDown={(e) => handleResizeStart('right', e)}
                    />
                )}

                {/* Three-dot menu — top right */}
                {isVisible && (
                    <div
                        className="absolute top-1.5 right-1.5"
                        onMouseDown={stopLexicalEvent}
                    >
                        <DropdownMenu onOpenChange={setMenuOpen}>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center justify-center size-7 rounded-lg bg-[rgb(26,29,33)] shadow-[inset_0_0_0_1px_#2F3033,0_0_2px_0_rgb(0,0,0),0_1px_3px_0_rgba(0,0,0,0.08)] hover:bg-[#27282B] transition-[background-color] duration-200"
                                >
                                    <Ellipsis className="size-3.5 text-[#EEEFF1]" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                side="top"
                                align="start"
                                sideOffset={6}
                                collisionPadding={12}
                                className="z-[10000] w-[180px]"
                            >
                                <DropdownMenuItem onSelect={handleDownload}>
                                    <Download className="size-3.5 shrink-0" />
                                    Download
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <AlignLeft className="size-3.5 shrink-0" />
                                        Align
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent
                                        className="z-[10000] w-[140px]"
                                        collisionPadding={12}
                                        sideOffset={2}
                                    >
                                        <DropdownMenuItem onSelect={() => handleAlignment('left')}>
                                            <AlignLeft className="size-3.5 shrink-0" />
                                            Left
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleAlignment('center')}>
                                            <AlignCenter className="size-3.5 shrink-0" />
                                            Center
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleAlignment('right')}>
                                            <AlignRight className="size-3.5 shrink-0" />
                                            Right
                                        </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
                                    <Trash2 className="size-3.5 shrink-0" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>
        </div>
    );
}
