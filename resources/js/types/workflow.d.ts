// types/workflow.ts
export interface WorkflowFieldMapping {
  id: number;
  source_field: string;
  target_field: string;
  field_type: 'text' | 'number' | 'email' | 'phone' | 'url' | 'date';
  transformation_rules: Record<string, any>;
  required: boolean;
}

export interface WorkflowStepConnection {
  id: number;
  to_step_id: number;
  conditions: Record<string, any>;
}

export interface WorkflowStep {
  id: number;
  step_type: 'trigger' | 'action';
  service: string;
  operation: string;
  order: number;
  configuration: Record<string, any>;
  enabled: boolean;
  field_mappings: WorkflowFieldMapping[];
  connections?: WorkflowStepConnection[];
  created_at: string;
  updated_at: string;
}

export interface Workflow {
  id: number;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'inactive';
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  steps: WorkflowStep[];
  executions_count: number;
  last_execution?: string;
}

export interface WorkflowsResponse {
  success: boolean;
  data: Workflow[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  }
}

export interface WorkflowResponse {
  success: boolean;
  data: Workflow;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
}

// UI Types for the component
export interface WorkflowListItem {
  id: number;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'inactive';
  trigger: {
    type: string;
    name: string;
    service: string;
  };
  actions: Array<{
    type: string;
    name: string;
    service: string;
  }>;
  lastRun: string;
  totalRuns: number;
  successRate: number;
  createdAt: string;
}
