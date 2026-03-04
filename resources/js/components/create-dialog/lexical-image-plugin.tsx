import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodes, COMMAND_PRIORITY_EDITOR, createCommand, type LexicalCommand } from 'lexical';
import { useEffect } from 'react';
import { $createImageNode } from './lexical-image-node';

export type InsertImagePayload = {
    src: string;
    altText: string;
    width?: number;
    height?: number;
};

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> = createCommand('INSERT_IMAGE_COMMAND');

export function ImagePlugin(): null {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerCommand<InsertImagePayload>(
            INSERT_IMAGE_COMMAND,
            (payload) => {
                const imageNode = $createImageNode(payload);
                $insertNodes([imageNode]);
                return true;
            },
            COMMAND_PRIORITY_EDITOR,
        );
    }, [editor]);

    return null;
}
