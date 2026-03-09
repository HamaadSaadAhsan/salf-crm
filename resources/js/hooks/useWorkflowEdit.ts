import { update } from '@/actions/App/Http/Controllers/WorkflowController';
import { Workflow } from '@/types/workflow';
import { router } from '@inertiajs/react';
import { useCallback, useState, useEffect, useRef } from 'react';

export const useWorkflowEdit = (workflowId: number, initialWorkflow?: Workflow) => {
    const [workflow, setWorkflow] = useState<Workflow | null>(initialWorkflow || null);
    const [loading, _setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [originalWorkflow, setOriginalWorkflow] = useState<Workflow | null>(initialWorkflow || null);
    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSaving = useRef(false);

    useEffect(() => {
        if (initialWorkflow) {
            setWorkflow(initialWorkflow);
            setOriginalWorkflow(initialWorkflow);
            setHasUnsavedChanges(false);
        }
    }, [initialWorkflow]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        };
    }, []);

    const checkForChanges = useCallback((newWorkflow: Workflow) => {
        if (!originalWorkflow) return false;
        return JSON.stringify(newWorkflow) !== JSON.stringify(originalWorkflow);
    }, [originalWorkflow]);

    const performSave = useCallback((workflowToSave: Workflow) => {
        if (isSaving.current || !workflowToSave) return;

        isSaving.current = true;
        setSaving(true);
        setError(null);

        const { url, method } = update(workflowId);
        router[method](url, {
            name: workflowToSave.name,
            description: workflowToSave.description,
            status: workflowToSave.status,
            metadata: workflowToSave.metadata,
            canvas_data: workflowToSave.canvas_data ? JSON.parse(JSON.stringify(workflowToSave.canvas_data)) : null,
            steps: JSON.parse(JSON.stringify(workflowToSave.steps)),
        }, {
            onSuccess: () => {
                setSaving(false);
                isSaving.current = false;
                setHasUnsavedChanges(false);
                setOriginalWorkflow(workflowToSave);
                setLastSavedAt(new Date());
            },
            onError: (errors) => {
                setSaving(false);
                isSaving.current = false;
                setError(Object.values(errors).join(', ') || 'Failed to save workflow');
            },
            preserveScroll: true,
        });
    }, [workflowId]);

    const scheduleAutoSave = useCallback((newWorkflow: Workflow) => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

        autoSaveTimer.current = setTimeout(() => {
            performSave(newWorkflow);
        }, 1500);
    }, [performSave]);

    const updateWorkflow = useCallback((updates: Partial<Workflow>) => {
        setWorkflow((prev) => {
            if (!prev) return null;
            const newWorkflow = { ...prev, ...updates };

            const hasChanges = checkForChanges(newWorkflow);
            setHasUnsavedChanges(hasChanges);

            if (hasChanges) {
                scheduleAutoSave(newWorkflow);
            }

            return newWorkflow;
        });
    }, [checkForChanges, scheduleAutoSave]);

    const saveWorkflow = useCallback(async () => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        if (!workflow) return false;
        performSave(workflow);
        return true;
    }, [workflow, performSave]);

    const publishWorkflow = useCallback(async () => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        if (!workflow) return false;

        const updatedWorkflow = { ...workflow, status: 'active' as const };
        setWorkflow(updatedWorkflow);
        performSave(updatedWorkflow);
        return true;
    }, [workflow, performSave]);

    return {
        workflow,
        loading,
        saving,
        error,
        hasUnsavedChanges,
        lastSavedAt,
        updateWorkflow,
        saveWorkflow,
        publishWorkflow,
        setError,
    };
};
