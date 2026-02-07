import { LeadTag } from '@/components/tag-selector';
import { Task } from './task';
import { ISODateString } from 'next-auth';

export interface Lead {
    id: string;
    name: string;
    email: string;
    phone?: string;
    occupation?: string;
    address?: string;
    city?: string;
    country?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    inquiry_status: LeadStatus;
    advisor_stage?: 'new' | 'contacted' | 'meeting' | 'contract_signed' | 'initial_payment' | 'won' | 'lost';
    priority: LeadPriority;
    inquiry_type?: LeadInquiryType;
    lead_score: number;
    budget?: LeadBudget;
    formatted_budget?: string;
    custom_fields?: Record<string, any>;
    detail?: string;
    service?: { data: Service };
    source?: { data?: LeadSource };
    status: { data: Status };
    assigned_to?: { data: User };
    created_by?: User;
    qualified_by?: { data: User };
    qualified_at?: string;
    owner?: User;
    days_since_created: number;
    is_hot_lead: boolean;
    next_follow_up_at?: string;
    next_task?: Task | null;
    tasks?: { data: Task[] };
    last_activity_at?: string;
    viewed_at?: string;
    created_at: string;
    raw_created_at: ISODateString;
    updated_at: string;
    raw_updated_at: ISODateString;
    activities?: { data: LeadActivity[] };
    has_attachment?: boolean;
    labels?: [];
    tags?: LeadTag[];
    notes?: LeadNote[];
    urls: {
        show: string;
        edit: string;
    };
}

export type Status = {
    id: number;
    name: LeadStatus;
};

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'assigned_to_advisor' | 'requalify' | 'proposal' | 'won' | 'lost' | 'nurturing' | 'converted';

export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

export type LeadInquiryType = 'phone' | 'email' | 'web' | 'referral' | 'social' | 'advertisement';

export interface LeadBudget {
    amount: number;
    currency: string;
    frequency?: 'one-time' | 'monthly' | 'yearly';
}

export type CustomFieldValue = string | number | boolean | string[] | number[] | null | undefined;

export type CustomFields = {
    family_size?: number;
    children_ages?: number[];
    current_citizenships?: string[];
    investment_experience?: string;
    urgency?: string;
    preferred_regions?: string[];
    language_spoken?: string;
    travel_frequency?: string;
    [key: string]: CustomFieldValue;
};

export interface Service {
    id: number;
    name: string;
    detail?: string;
    country_code?: string;
    country_name?: string;
    parent_id?: number;
    sort_order?: number;
    status?: string;
    is_parent: boolean;
    full_hierarchy: string;
    parent?: Service;
    children?: Service[];
    created_at?: string;
    updated_at?: string;
}

export interface LeadSource {
    id: number;
    name: string;
    slug: string;
    type?: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    roles?: Array<{
        id: number;
        name: string;
        guard_name: string;
    }>;
}

export interface LeadActivity {
    id: string;
    lead_id?: string;
    type: string;
    status: string;
    subject: string;
    description: string | null;
    notes?: string | null;
    duration_minutes?: number | null;
    category?: string;
    due_at?: string;
    scheduled_at?: string;
    user?: User | { data?: User };
    metadata?: Record<string, any>;
    attachments?: Array<{
        original_name: string;
        file_name: string;
        file_path: string;
        file_size: number;
        mime_type: string;
        uploaded_at: string;
    }>;
    created_at: string;
    created_by?: User;
}

export interface LeadNote {
    id: string;
    content: string;
    is_private: boolean;
    created_at: string;
    created_by: User;
}

// API Response Types
export interface ApiResponse<T> {
    data: T;
    meta?: ApiMeta;
    cache_info?: CacheInfo;
}

export interface ApiMeta {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
    has_more: boolean;
    filters_applied: Record<string, any>;
    query_time: number;
}

export interface CacheInfo {
    cached: boolean;
    cache_key: string;
    ttl: number;
}

export interface LeadFilters {
    page?: number;
    per_page?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    search?: string;
    status?: LeadStatus[];
    priority?: LeadPriority;
    assigned_to?: string;
    source_id?: number;
    service_id?: number;
    date_from?: string;
    date_to?: string;
    min_score?: number;
    max_score?: number;
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    hot_leads?: boolean;
    active_only?: boolean;
    real_time?: boolean;
    type?: string;
}

export interface LeadStats {
    total_leads: number;
    period_leads: number;
    status_breakdown: Record<LeadStatus, number>;
    priority_breakdown: Record<LeadPriority, number>;
    source_breakdown: Record<string, number>;
    avg_lead_score: number;
    hot_leads_count: number;
    unassigned_count: number;
    conversion_rate: number;
    daily_trend: Record<string, number>;
}

export type Meta = {
    current_page: number;
    filters_applied: any[];
    from: number;
    has_more: boolean;
    last_page: number;
    per_page: number;
    query_time: number;
    to: number;
    total: number;
};
