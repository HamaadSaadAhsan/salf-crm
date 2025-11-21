import { User } from './lead';

export type TaskStatusValue = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriorityValue = 'low' | 'medium' | 'high' | 'urgent';
export type TaskTypeValue = 'follow_up' | 'call' | 'message' | 'meeting' | 'email' | 'other';
export type TaskStatusColor = 'gray' | 'blue' | 'green' | 'red';
export type TaskPriorityColor = 'gray' | 'blue' | 'orange' | 'red';
export type TaskTypeColor = 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'gray';

export interface TaskStatus {
    value: TaskStatusValue;
    label: string;
    color: TaskStatusColor;
}

export interface TaskPriority {
    value: TaskPriorityValue;
    label: string;
    color: TaskPriorityColor;
}

export interface TaskType {
    value: TaskTypeValue;
    label: string;
    color: TaskTypeColor;
    icon: string;
}

export interface Task {
    id: number;
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    type: TaskType;
    due_at?: string | null;
    due_at_formatted?: string | null;
    completed_at?: string | null;
    completed_at_formatted?: string | null;
    is_completed: boolean;
    is_overdue: boolean;
    assigned_to?: User | null;
    created_by?: User | null;
    collaborators?: User[];
    taskable_type?: string | null;
    taskable_id?: number | string | null;
    created_at: string;
    updated_at: string;
}
