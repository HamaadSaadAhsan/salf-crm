export type DialogViewState = 'full' | 'pinned' | 'minimized' | 'closed';

export type CreateDialogModelType = 'note' | 'email' | 'task';

export interface DialogAssociation {
    type: 'lead';
    id: string;
    name: string;
    url?: string;
}

export interface CreateDialogState {
    viewState: DialogViewState;
    modelType: CreateDialogModelType | null;
    association: DialogAssociation | null;
    data: {
        subject: string;
        description: string;
        editorState?: string;
    };
    activityId: string | null;
    isDirty: boolean;
    isSaving: boolean;
}

export interface CreateDialogActions {
    open: (modelType: CreateDialogModelType, association?: DialogAssociation) => Promise<void>;
    openExisting: (activityId: string, modelType: CreateDialogModelType, association?: DialogAssociation) => Promise<void>;
    close: () => void;
    minimize: () => void;
    pin: () => void;
    expand: () => void;
    setData: (data: Partial<CreateDialogState['data']>) => void;
    setActivityId: (id: string) => void;
}
