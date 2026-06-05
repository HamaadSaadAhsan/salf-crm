import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type DialogState = {
    viewState: 'closed' | 'minimized' | 'window' | 'full';
    modelType: 'note' | 'task' | null;
};

const dialog = vi.hoisted(() => ({
    state: { viewState: 'closed', modelType: 'note' } as DialogState,
}));

vi.mock('@/providers/CreateDialogProvider', () => ({
    useCreateDialog: () => dialog.state,
}));

vi.mock('./create-dialog-header', () => ({
    CreateDialogHeader: () => <div data-testid="header" />,
}));

vi.mock('./create-dialog-title-bar', () => ({
    CreateDialogTitleBar: () => <div data-testid="title-bar" />,
}));

vi.mock('./create-dialog-minimized-button', () => ({
    CreateDialogMinimizedButton: () => <div data-testid="minimized" />,
}));

vi.mock('@/components/ui/scroll-area', () => ({
    ScrollArea: ({ children }: { children?: ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

// Stand in for the lexical-heavy note editor. Its presence in the DOM proves the
// lazy chunk resolved; its absence proves it was never imported.
vi.mock('./note-dialog-content', () => ({
    NoteDialogContent: () => <div data-testid="note-content" />,
}));

import { CreateDialogShell } from './create-dialog-shell';

describe('CreateDialogShell', () => {
    beforeEach(() => {
        dialog.state = { viewState: 'closed', modelType: 'note' };
    });

    it('renders nothing when the dialog is closed', () => {
        const { container } = render(<CreateDialogShell />);

        expect(container).toBeEmptyDOMElement();
    });

    it('does not load the note editor while the dialog is closed', () => {
        render(<CreateDialogShell />);

        expect(screen.queryByTestId('note-content')).not.toBeInTheDocument();
    });

    it('renders only the minimized button when minimized', () => {
        dialog.state = { viewState: 'minimized', modelType: 'note' };

        render(<CreateDialogShell />);

        expect(screen.getByTestId('minimized')).toBeInTheDocument();
        expect(screen.queryByTestId('header')).not.toBeInTheDocument();
        expect(screen.queryByTestId('note-content')).not.toBeInTheDocument();
    });

    it('lazily renders the note editor when a note dialog is open', async () => {
        dialog.state = { viewState: 'full', modelType: 'note' };

        render(<CreateDialogShell />);

        expect(await screen.findByTestId('note-content')).toBeInTheDocument();
        expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('does not render the note editor for non-note models', () => {
        dialog.state = { viewState: 'full', modelType: 'task' };

        render(<CreateDialogShell />);

        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.queryByTestId('note-content')).not.toBeInTheDocument();
    });
});
