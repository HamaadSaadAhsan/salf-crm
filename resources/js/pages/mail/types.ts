export interface MailUser {
    id: number;      // negative = free-form / lead (not a CRM user)
    name: string;
    email: string;
    initials?: string;
    isExternal?: boolean;  // true for leads / free-form emails
}

export interface MailRecipient {
    id: number;
    name: string;
    email: string;
    type: 'to' | 'cc' | 'bcc';
}

export interface MailMessage {
    id: number;
    sender: MailUser | null;
    recipients: MailRecipient[];
    subject: string;
    body: string;
    preview: string;
    type: 'new' | 'reply' | 'forward';
    is_draft: boolean;
    is_read: boolean;
    is_starred: boolean;
    parent_id: number | null;
    thread_id: string | null;
    sent_at: string | null;
    created_at: string;
}

export interface MailLabel {
    id: number;
    name: string;
    color: string;
    message_labels_count?: number;
}

export type MailFolder = 'inbox' | 'sent' | 'drafts' | 'starred' | 'trash';

export interface MailCounts {
    inbox: number;
    drafts: number;
    starred: number;
}
