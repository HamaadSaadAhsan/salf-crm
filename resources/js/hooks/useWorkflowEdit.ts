import { update } from '@/actions/App/Http/Controllers/WorkflowController';
import { WorkflowHelpers } from '@/lib/workflow-helpers';
import { Workflow } from '@/types/workflow';
import { router } from '@inertiajs/react';
import { useCallback, useState, useEffect } from 'react';

export const useWorkflowEdit = (workflowId: number, initialWorkflow?: Workflow) => {
    const [workflow, setWorkflow] = useState<Workflow | null>(initialWorkflow || null);
    const [loading, _setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [originalWorkflow, setOriginalWorkflow] = useState<Workflow | null>(initialWorkflow || null);

    // Update workflow when initialWorkflow changes
    useEffect(() => {
        if (initialWorkflow) {
            setWorkflow(initialWorkflow);
            setOriginalWorkflow(initialWorkflow);
            setHasUnsavedChanges(false);
        }
    }, [initialWorkflow]);

    // Track changes against original workflow
    const checkForChanges = useCallback((newWorkflow: Workflow) => {
        if (!originalWorkflow) return false;
        return JSON.stringify(newWorkflow) !== JSON.stringify(originalWorkflow);
    }, [originalWorkflow]);

    const updateWorkflow = useCallback((updates: Partial<Workflow>) => {
        setWorkflow((prev) => {
            if (!prev) return null;
            const newWorkflow = { ...prev, ...updates };
            
            // Check if there are changes compared to original
            const hasChanges = checkForChanges(newWorkflow);
            setHasUnsavedChanges(hasChanges);
            
            return newWorkflow;
        });
    }, [checkForChanges]);

    const saveWorkflow = useCallback(async () => {
        if (!workflow) return false;

        return new Promise<boolean>((resolve) => {
            setSaving(true);
            setError(null);

            // Validate before saving
            const validation = WorkflowHelpers.validateWorkflow(workflow);
            if (!validation.isValid) {
                setError(validation.errors.join(', '));
                setSaving(false);
                resolve(false);
                return;
            }

            const { url, method } = update(workflowId);
            router[method](url, {
                name: workflow.name,
                description: workflow.description,
                status: workflow.status,
                steps: JSON.parse(JSON.stringify(workflow.steps)),
            }, {
                onSuccess: () => {
                    setSaving(false);
                    setHasUnsavedChanges(false);
                    setOriginalWorkflow(workflow);
                    resolve(true);
                },
                onError: (errors) => {
                    setSaving(false);
                    setError(Object.values(errors).join(', ') || 'Failed to save workflow');
                    resolve(false);
                },
                preserveScroll: true,
            });
        });
    }, [workflow, workflowId]);

    const publishWorkflow = useCallback(async () => {
        if (!workflow) return false;

        return new Promise<boolean>((resolve) => {
            // First update status to active
            const updatedWorkflow = { ...workflow, status: 'active' as const };
            setWorkflow(updatedWorkflow);

            setSaving(true);
            setError(null);

            const { url, method } = update(workflowId);
            router[method](url, {
                name: updatedWorkflow.name,
                description: updatedWorkflow.description,
                status: updatedWorkflow.status,
                steps: JSON.parse(JSON.stringify(updatedWorkflow.steps)),
            }, {
                onSuccess: () => {
                    setSaving(false);
                    setHasUnsavedChanges(false);
                    setOriginalWorkflow(updatedWorkflow);
                    resolve(true);
                },
                onError: (errors) => {
                    setSaving(false);
                    // Revert status change on error
                    setWorkflow(workflow);
                    setError(Object.values(errors).join(', ') || 'Failed to publish workflow');
                    resolve(false);
                },
                preserveScroll: true,
            });
        });
    }, [workflow, workflowId]);

    return {
        workflow,
        loading,
        saving,
        error,
        hasUnsavedChanges,
        updateWorkflow,
        saveWorkflow,
        publishWorkflow,
        setError,
    };
};
