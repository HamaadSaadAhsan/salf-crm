export type TicketTypeValue = 'bug_report' | 'feature_request';
export type TicketStatusValue = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriorityValue = 'low' | 'medium' | 'high' | 'critical';

export interface TicketAttachment {
    id: number;
    ticket_id: number;
    ticket_comment_id: number | null;
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    created_at: string;
}

export interface TicketComment {
    id: number;
    ticket_id: number;
    user_id: number | null;
    body: string;
    is_admin_reply: boolean;
    user: {
        id: number;
        name: string;
        email: string;
    } | null;
    attachments: TicketAttachment[];
    created_at: string;
    updated_at: string;
}

export interface Ticket {
    id: number;
    user_id: number;
    assigned_to_id: number | null;
    type: TicketTypeValue;
    status: TicketStatusValue;
    priority: TicketPriorityValue;
    subject: string;
    description: string;
    resolved_at: string | null;
    closed_at: string | null;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    assigned_to?: {
        id: number;
        name: string;
        email: string;
    } | null;
    comments?: TicketComment[];
    attachments?: TicketAttachment[];
    comments_count?: number;
    created_at: string;
    updated_at: string;
}

export interface SelectOption {
    value: string;
    label: string;
}
