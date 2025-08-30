import { Lead, LeadStatus } from "./lead";

// Base User interface
export interface User {
  id: string;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

// User with relationships and counts
export interface UserWithRelations extends User {
  active_services_count?: number;
  leads_count?: number;
  active_leads_count?: number;
  active_services?: Service[];
  services?: ServiceWithPivot[];
  leads?: Lead[];
  roles?: Role[];
}

// Service interface
export interface Service {
  id: number;
  name: string;
  detail?: string;
  country_code: string;
  country_name: string;
  parent_id: number | null;
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// Service with parent relationship
export interface ServiceWithParent extends Service {
  parent?: Service | null;
  children?: Service[];
  full_hierarchy?: string;
  is_parent?: boolean;
}

// Service with pivot data (for many-to-many relationship)
export interface ServiceWithPivot extends Service {
  pivot: ServiceUserPivot;
}

// Pivot table data
export interface ServiceUserPivot {
  service_id: number;
  user_id: number;
  assigned_at: string | null;
  status: 'active' | 'inactive' | 'pending';
  notes: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

// Lead with relationships
export interface LeadWithRelations extends Lead {
  service?: Service;
  assignedTo?: User;
  createdBy?: User;
}

// Role interface (Spatie Permission)
export interface Role {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
}

// Permission interface
export interface Permission {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
}

// API Response interfaces
export interface UserListResponse {
  data: UserWithRelations[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
  has_more: boolean;
  filters_applied: Record<string, any>;
  query_time: number; // milliseconds
}

// Filter interfaces - Comprehensive UserFilter types
export interface UserFilters {
  // Email verification
  email_verified?: 'verified' | 'unverified';
  
  // Role and permissions
  role?: string | string[];
  permission?: string;
  
  // Service assignments
  service_id?: number | number[];
  service_country?: string;
  include_child_services?: boolean;
  no_services?: boolean;
  min_services?: number;
  service_status?: 'active' | 'inactive' | 'pending';
  service_role?: string;
  
  // Date ranges
  date_from?: string;
  date_to?: string;
  verified_from?: string;
  verified_to?: string;
  
  // Lead relationships
  has_leads?: 'yes' | 'no';
  has_active_leads?: boolean;
  min_leads?: number;
  max_leads?: number;
  
  // Search and filtering
  search?: string;
  active_only?: boolean;
  recent_days?: number;
  email_domain?: string;
  exclude_ids?: number | number[];
  
  // Pagination and sorting
  page?: number;
  per_page?: number;
  sort_by?: UserSortField;
  sort_order?: 'asc' | 'desc';
  
  // Cache control
  real_time?: boolean;
}

// More detailed filter type with validation and defaults
export interface UserFilterOptions {
  emailVerification: {
    verified: 'verified';
    unverified: 'unverified';
  };
  
  serviceStatus: {
    active: 'active';
    inactive: 'inactive';
    pending: 'pending';
  };
  
  leadStatus: {
    yes: 'yes';
    no: 'no';
  };
  
  sortOrder: {
    asc: 'asc';
    desc: 'desc';
  };
}

// Individual filter types for better type safety
export interface EmailVerificationFilter {
  email_verified: 'verified' | 'unverified';
}

export interface RoleFilter {
  role: string | string[];
  permission?: string;
}

export interface ServiceFilter {
  service_id: number | number[];
  service_country?: string;
  include_child_services?: boolean;
  service_status?: 'active' | 'inactive' | 'pending';
  service_role?: string; // From JSONB metadata
}

export interface ServiceAssignmentFilter {
  no_services?: boolean;
  min_services?: number;
  max_services?: number;
}

export interface DateRangeFilter {
  date_from?: string; // ISO date string
  date_to?: string;   // ISO date string
}

export interface EmailVerificationDateFilter {
  verified_from?: string;
  verified_to?: string;
}

export interface LeadRelationshipFilter {
  has_leads?: 'yes' | 'no';
  has_active_leads?: boolean;
  min_leads?: number;
  max_leads?: number;
}

export interface SearchFilter {
  search?: string;
}

export interface ActivityFilter {
  active_only?: boolean;
  recent_days?: number;
}

export interface EmailDomainFilter {
  email_domain?: string;
}

export interface ExclusionFilter {
  exclude_ids?: number | number[];
}

export interface PaginationFilter {
  page?: number;
  per_page?: number;
}

export interface SortingFilter {
  sort_by?: UserSortField;
  sort_order?: 'asc' | 'desc';
}

export interface CacheFilter {
  real_time?: boolean;
}

// Compound filter types for specific use cases
export interface AdminUserFilters extends UserFilters {
  // Admin-specific filters
  include_inactive?: boolean;
  show_system_users?: boolean;
  audit_mode?: boolean;
}

export interface ServiceManagerFilters extends UserFilters {
  // Service manager specific filters
  managed_services_only?: boolean;
  team_members_only?: boolean;
}

export interface ReportingFilters extends UserFilters {
  // Reporting specific filters
  include_stats?: boolean;
  group_by?: 'service' | 'role' | 'country' | 'month';
  export_format?: 'csv' | 'excel' | 'pdf';
}

// Filter validation schemas
export interface UserFilterValidation {
  email_verified?: {
    enum: ['verified', 'unverified'];
  };
  role?: {
    type: 'string' | 'array';
    items?: { type: 'string' };
  };
  service_id?: {
    type: 'number' | 'array';
    items?: { type: 'number', minimum: 1 };
  };
  page?: {
    type: 'number';
    minimum: 1;
  };
  per_page?: {
    type: 'number';
    minimum: 1;
    maximum: 100;
  };
  recent_days?: {
    type: 'number';
    minimum: 1;
    maximum: 365;
  };
  min_services?: {
    type: 'number';
    minimum: 0;
  };
  min_leads?: {
    type: 'number';
    minimum: 0;
  };
}

// Filter builder utility types
export type UserFilterKey = keyof UserFilters;
export type UserFilterValue<K extends UserFilterKey> = UserFilters[K];

// Helper type for filter state management
export interface UserFilterState {
  filters: UserFilters;
  applied: Partial<UserFilters>;
  defaults: Partial<UserFilters>;
  dirty: boolean;
  valid: boolean;
  errors: Partial<Record<UserFilterKey, string>>;
}

// Filter presets for common scenarios
export interface UserFilterPresets {
  'all-users': UserFilters;
  'verified-users': UserFilters;
  'users-with-services': UserFilters;
  'users-with-leads': UserFilters;
  'recent-users': UserFilters;
  'admin-users': UserFilters;
  'inactive-users': UserFilters;
}

// Default filter values
export const DEFAULT_USER_FILTERS: UserFilters = {
  page: 1,
  per_page: 25,
  sort_by: 'created_at',
  sort_order: 'desc',
  real_time: false,
};

// Filter presets
export const USER_FILTER_PRESETS: UserFilterPresets = {
  'all-users': {},
  'verified-users': { email_verified: 'verified' },
  'users-with-services': { min_services: 1 },
  'users-with-leads': { has_leads: 'yes' },
  'recent-users': { recent_days: 30 },
  'admin-users': { role: 'admin' },
  'inactive-users': { email_verified: 'unverified', has_leads: 'no' },
};

// Filter utility functions types
export type FilterApplier<T extends UserFilters = UserFilters> = (filters: T) => void;
export type FilterValidator = (filters: UserFilters) => { valid: boolean; errors: Record<string, string> };
export type FilterSerializer = (filters: UserFilters) => string;
export type FilterDeserializer = (serialized: string) => UserFilters;

// Advanced filter types for complex queries
export interface UserAdvancedFilters extends UserFilters {
  // PostgreSQL specific filters
  metadata_query?: {
    key: string;
    value?: any;
    operator?: '=' | '!=' | 'exists' | 'not_exists' | 'contains' | 'in';
  };
  
  // Full-text search options
  search_options?: {
    fields?: ('name' | 'email')[];
    match_type?: 'partial' | 'exact' | 'fuzzy';
    case_sensitive?: boolean;
  };
  
  // Aggregation filters
  aggregations?: {
    group_by?: string[];
    having?: {
      field: string;
      operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
      value: number;
    }[];
  };
  
  // Geographic filters (if you add location fields)
  location?: {
    lat?: number;
    lng?: number;
    radius?: number;
    unit?: 'km' | 'miles';
  };
}

// Type for filter URL query parameters
export interface UserFilterQueryParams {
  [key: string]: string | string[] | undefined;
  email_verified?: string;
  role?: string | string[];
  service_id?: string | string[];
  service_country?: string;
  has_leads?: string;
  search?: string;
  page?: string;
  per_page?: string;
  sort_by?: string;
  sort_order?: string;
  date_from?: string;
  date_to?: string;
}

// Sorting fields
export type UserSortField = 
  | 'id'
  | 'name'
  | 'email'
  | 'created_at'
  | 'updated_at'
  | 'email_verified_at'
  | 'active_services_count'
  | 'leads_count'
  | 'active_leads_count';

// User stats interface
export interface UserStats {
  total_users: number;
  verified_users: number;
  unverified_users: number;
  users_with_services: number;
  users_without_services: number;
  users_with_leads: number;
  recent_users: number;
}

// Service assignment interfaces
export interface ServiceAssignmentData {
  assigned_at?: string;
  status?: 'active' | 'inactive' | 'pending';
  notes?: string;
  metadata?: {
    role?: string;
    priority?: 'low' | 'medium' | 'high';
    specializations?: string[];
    hourly_rate?: number;
    availability?: Record<string, string>;
    certifications?: string[];
    languages?: string[];
    [key: string]: any;
  };
}

// Form interfaces for creating/updating
export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role?: string[];
  service_ids?: number[];
  service_assignment_data?: ServiceAssignmentData;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  role?: string[];
}

// API Error response
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// Generic API response wrapper
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  meta?: any;
}

// Service hierarchy tree interface
export interface ServiceTreeNode extends Service {
  children: ServiceTreeNode[];
  level: number;
  path: string[];
  user_count?: number;
  assigned_users?: User[];
}

// Export data interface
export interface UserExportData {
  ID: number;
  Name: string;
  Email: string;
  'Email Verified': 'Yes' | 'No';
  Services: string;
  'Service Countries': string;
  Roles: string;
  'Created At': string;
}

// React Hook return types
export interface UseUsersReturn {
  users: UserWithRelations[];
  meta: PaginationMeta;
  stats: UserStats;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  updateFilters: (filters: Partial<UserFilters>) => void;
}

// Form validation schemas (for use with libraries like Yup or Zod)
export interface UserFormValidation {
  name: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  email: {
    required: boolean;
    format: 'email';
    unique?: boolean;
  };
  password: {
    required: boolean;
    minLength: number;
    pattern?: RegExp;
  };
}

// Constants
export const USER_STATUS_OPTIONS = ['active', 'inactive', 'pending'] as const;
export const LEAD_STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'closed'] as const;
export const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;

// Type guards
export function isUserWithRelations(user: User | UserWithRelations): user is UserWithRelations {
  return 'active_services_count' in user || 'active_services' in user;
}

export function hasActiveServices(user: UserWithRelations): boolean {
  return (user.active_services_count ?? 0) > 0;
}

export function isEmailVerified(user: User): boolean {
  return user.email_verified_at !== null;
}