import { ISODateString } from "next-auth";
import {LeadTag} from "@/components/tag-selector";

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
    priority: LeadPriority;
    inquiry_type?: LeadInquiryType;
    lead_score: number;
    budget?: LeadBudget;
    formatted_budget?: string;
    custom_fields?: Record<string, any>;
    detail?: string;
    service?: { data: Service };
    source: { data?: LeadSource } | LeadSource;
    status: { data: Status}
    assigned_to?: User;
    created_by?: User;
    days_since_created: number;
    is_hot_lead: boolean;
    next_follow_up_at?: string;
    last_activity_at?: string;
    created_at: string;
    raw_created_at: ISODateString;
    updated_at: string;
    activities?: LeadActivity[];
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
    id: number
    name: LeadStatus
}

export type LeadStatus =
    | 'new'
    | 'contacted'
    | 'qualified'
    | 'proposal'
    | 'won'
    | 'lost'
    | 'nurturing';

export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

export type LeadInquiryType =
    | 'phone'
    | 'email'
    | 'web'
    | 'referral'
    | 'social'
    | 'advertisement';

export interface LeadBudget {
    amount: number;
    currency: string;
    frequency?: 'one-time' | 'monthly' | 'yearly';
}

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
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

export interface LeadActivity {
    id: string;
    type: string;
    description: string;
    user?: User;
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
    created_by: User;
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
