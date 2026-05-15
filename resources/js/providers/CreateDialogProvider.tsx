import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from '@/lib/http';
import { store, update, show } from '@/actions/App/Http/Controllers/Api/LeadActivityController';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CreateDialogShell } from '@/components/create-dialog/create-dialog-shell';
import type {
    CreateDialogActions,
    CreateDialogModelType,
    CreateDialogState,
    DialogAssociation,
    DialogViewState,
} from '@/components/create-dialog/types';

interface CreateDialogContextType extends CreateDialogState, CreateDialogActions {}

const CreateDialogContext = createContext<CreateDialogContextType | undefined>(undefined);

const INITIAL_STATE: CreateDialogState = {
    viewState: 'closed',
    modelType: null,
    association: null,
    data: { subject: '', description: '' },
    activityId: null,
    isDirty: false,
    isSaving: false,
};

export function CreateDialogProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CreateDialogState>(INITIAL_STATE);
    const queryClient = useQueryClient();
    const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestStateRef = useRef(state);
    latestStateRef.current = state;

    // Restore dialog from URL params on mount
    const restoredRef = useRef(false);
    useEffect(() => {
        if (restoredRef.current) return;
        restoredRef.current = true;

        const url = new URL(window.location.href);
        const modal = url.searchParams.get('modal') as CreateDialogModelType | null;
        const id = url.searchParams.get('id');

        if (!modal || !id) return;

        axios.get(show.url(id)).then((response) => {
            const activity = response.data?.activity;
            if (!activity) return;

            const lead = response.data?.lead;
            const association: DialogAssociation | null = lead
                ? { type: 'lead', id: lead.id, name: lead.name, url: `/leads/${lead.id}` }
                : null;

            setState({
                viewState: 'full',
                modelType: modal,
                association,
                data: {
                    subject: activity.subject === 'Untitled note' ? '' : (activity.subject || ''),
                    description: activity.description || '',
                    editorState: activity.metadata?.editor_state || undefined,
                },
                activityId: activity.id,
                isDirty: false,
                isSaving: false,
            });
        }).catch(() => {
            // Activity not found — clean up URL params
            url.searchParams.delete('modal');
            url.searchParams.delete('id');
            window.history.replaceState({}, '', url.toString());
        });
    }, []);

    const updateUrl = useCallback((viewState: DialogViewState, modelType: CreateDialogModelType | null, activityId: string | null) => {
        const url = new URL(window.location.href);
        if (viewState !== 'closed' && viewState !== 'minimized' && modelType) {
            url.searchParams.set('modal', modelType);
            if (activityId) {
                url.searchParams.set('id', activityId.toString());
            }
        } else {
            url.searchParams.delete('modal');
            url.searchParams.delete('id');
        }
        window.history.replaceState({}, '', url.toString());
    }, []);

    const saveActivity = useCallback(async (currentState?: CreateDialogState) => {
        const s = currentState || latestStateRef.current;
        if (!s.activityId || !s.isDirty) return;

        setState(prev => ({ ...prev, isSaving: true }));
        try {
            await axios.put(update.url(s.activityId), {
                subject: s.data.subject || 'Untitled note',
                description: s.data.description,
                editor_state: s.data.editorState || null,
            });
            setState(prev => ({ ...prev, isDirty: false, isSaving: false }));
        } catch {
            setState(prev => ({ ...prev, isSaving: false }));
        }
    }, []);

    const invalidateQueries = useCallback(async (leadId?: string) => {
        if (leadId) {
            await queryClient.invalidateQueries({ queryKey: ['lead-notes', leadId] });
            await queryClient.invalidateQueries({ queryKey: ['lead-activities', 'latest', leadId] });
            await queryClient.invalidateQueries({ queryKey: ['lead-activities', 'comments', leadId] });
        }
    }, [queryClient]);

    const open = useCallback(async (modelType: CreateDialogModelType, association?: DialogAssociation) => {
        try {
            const response = await axios.post(store.url(), {
                lead_id: association?.id,
                type: modelType === 'note' ? 'note' : modelType,
                subject: 'Untitled note',
                description: '',
            });

            const activityId: string | null = response.data?.activity?.id ?? response.data?.id ?? null;

            setState({
                viewState: 'full',
                modelType,
                association: association || null,
                data: { subject: '', description: '' },
                activityId,
                isDirty: false,
                isSaving: false,
            });

            updateUrl('full', modelType, activityId);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to create note');
        }
    }, [updateUrl]);

    const openExisting = useCallback(async (activityId: string, modelType: CreateDialogModelType, association?: DialogAssociation) => {
        try {
            const response = await axios.get(show.url(activityId));
            const activity = response.data?.activity;
            if (!activity) {
                toast.error('Note not found');
                return;
            }

            const lead = response.data?.lead;
            const resolvedAssociation: DialogAssociation | null = association || (lead
                ? { type: 'lead', id: lead.id, name: lead.name, url: `/leads/${lead.id}` }
                : null);

            setState({
                viewState: 'full',
                modelType,
                association: resolvedAssociation,
                data: {
                    subject: activity.subject === 'Untitled note' ? '' : (activity.subject || ''),
                    description: activity.description || '',
                    editorState: activity.metadata?.editor_state || undefined,
                },
                activityId: activity.id,
                isDirty: false,
                isSaving: false,
            });

            updateUrl('full', modelType, activity.id);
        } catch {
            toast.error('Failed to load note');
        }
    }, [updateUrl]);

    const close = useCallback(async () => {
        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
        }

        const current = latestStateRef.current;
        if (current.isDirty && current.activityId) {
            await saveActivity(current);
        }

        const leadId = current.association?.id;
        setState(INITIAL_STATE);
        updateUrl('closed', null, null);

        if (leadId) {
            await invalidateQueries(leadId);
        }
    }, [saveActivity, updateUrl, invalidateQueries]);

    const minimize = useCallback(() => {
        setState(prev => {
            const next: DialogViewState = prev.viewState === 'full' ? 'pinned' : 'minimized';
            updateUrl(next, prev.modelType, prev.activityId);
            return { ...prev, viewState: next };
        });
    }, [updateUrl]);

    const pin = useCallback(() => {
        setState(prev => {
            updateUrl('pinned', prev.modelType, prev.activityId);
            return { ...prev, viewState: 'pinned' };
        });
    }, [updateUrl]);

    const expand = useCallback(() => {
        setState(prev => {
            const next: DialogViewState = prev.viewState === 'minimized' ? 'pinned' : 'full';
            updateUrl(next, prev.modelType, prev.activityId);
            return { ...prev, viewState: next };
        });
    }, [updateUrl]);

    const setData = useCallback((data: Partial<CreateDialogState['data']>) => {
        setState(prev => ({
            ...prev,
            data: { ...prev.data, ...data },
            isDirty: true,
        }));
    }, []);

    const setActivityId = useCallback((id: string) => {
        setState(prev => ({ ...prev, activityId: id }));
    }, []);

    // Debounced autosave
    useEffect(() => {
        if (!state.isDirty || !state.activityId || state.viewState === 'closed') return;

        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
        }

        autosaveTimerRef.current = setTimeout(() => {
            saveActivity();
        }, 500);

        return () => {
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
            }
        };
    }, [state.isDirty, state.data.subject, state.data.description, state.data.editorState, state.activityId, state.viewState, saveActivity]);

    const contextValue: CreateDialogContextType = {
        ...state,
        open,
        openExisting,
        close,
        minimize,
        pin,
        expand,
        setData,
        setActivityId,
    };

    return (
        <CreateDialogContext.Provider value={contextValue}>
            {children}
            <CreateDialogShell />
        </CreateDialogContext.Provider>
    );
}

export function useCreateDialog() {
    const context = useContext(CreateDialogContext);
    if (context === undefined) {
        throw new Error('useCreateDialog must be used within a CreateDialogProvider');
    }
    return context;
}
