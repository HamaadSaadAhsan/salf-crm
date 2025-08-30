import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

// Types
export interface FacebookPage {
    id: string;
    name: string;
    page_id: string;
    access_token: string;
}

export interface FacebookForm {
    id: string;
    name: string;
    external_id: string;
    page_id: string;
    status: string;
    created_time: string;
    questions: any[];
}

export interface FacebookIntegrationConfig {
    appId: string;
    appSecret: string;
    pageId: string;
    accessToken: string;
    enableMessaging: boolean;
    enablePosts: boolean;
    enableInsights: boolean;
    enableLeadGen: boolean;
    webhook_verify_token: string;
}

export interface HealthStatus {
    api: boolean;
    webhooks: boolean;
    permissions: boolean;
    lastChecked: Date;
}

export interface SyncStatus {
    isRunning: boolean;
    lastRun?: Date;
    status: 'idle' | 'running' | 'success' | 'error';
    progress?: number;
    error?: string;
}

export interface IntegrationError {
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
    resolved: boolean;
}

interface FacebookIntegrationState {
    // Connection Status
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
    lastSyncAt: Date | null;
    
    // Integration Config
    config: FacebookIntegrationConfig;
    isConfigured: boolean;
    
    // Health Monitoring
    healthStatus: HealthStatus;
    
    // Pages & Forms
    pages: FacebookPage[];
    selectedPage: FacebookPage | null;
    forms: FacebookForm[];
    
    // Sync Status
    syncStatus: {
        pages: SyncStatus;
        leadForms: SyncStatus;
        leads: SyncStatus;
    };
    
    // Errors & Notifications
    errors: IntegrationError[];
    warnings: IntegrationError[];
    
    // UI State
    isLoading: boolean;
    activeTab: string;
}

type FacebookIntegrationAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_CONNECTION_STATUS'; payload: 'disconnected' | 'connecting' | 'connected' | 'error' }
    | { type: 'SET_CONFIG'; payload: Partial<FacebookIntegrationConfig> }
    | { type: 'SET_PAGES'; payload: FacebookPage[] }
    | { type: 'SELECT_PAGE'; payload: FacebookPage }
    | { type: 'SET_FORMS'; payload: FacebookForm[] }
    | { type: 'UPDATE_SYNC_STATUS'; payload: { type: keyof FacebookIntegrationState['syncStatus']; status: SyncStatus } }
    | { type: 'ADD_ERROR'; payload: IntegrationError }
    | { type: 'REMOVE_ERROR'; payload: string }
    | { type: 'SET_ACTIVE_TAB'; payload: string }
    | { type: 'UPDATE_HEALTH_STATUS'; payload: Partial<HealthStatus> }
    | { type: 'SET_LAST_SYNC'; payload: Date };

// Initial State
const initialState: FacebookIntegrationState = {
    connectionStatus: 'disconnected',
    lastSyncAt: null,
    config: {
        appId: '',
        appSecret: '',
        pageId: '',
        accessToken: '',
        enableMessaging: false,
        enablePosts: false,
        enableInsights: false,
        enableLeadGen: false,
        webhook_verify_token: '',
    },
    isConfigured: false,
    healthStatus: {
        api: false,
        webhooks: false,
        permissions: false,
        lastChecked: new Date(),
    },
    pages: [],
    selectedPage: null,
    forms: [],
    syncStatus: {
        pages: { isRunning: false, status: 'idle' },
        leadForms: { isRunning: false, status: 'idle' },
        leads: { isRunning: false, status: 'idle' },
    },
    errors: [],
    warnings: [],
    isLoading: false,
    activeTab: 'setup',
};

// Reducer
function facebookIntegrationReducer(
    state: FacebookIntegrationState,
    action: FacebookIntegrationAction
): FacebookIntegrationState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
            
        case 'SET_CONNECTION_STATUS':
            return { ...state, connectionStatus: action.payload };
            
        case 'SET_CONFIG':
            return {
                ...state,
                config: { ...state.config, ...action.payload },
                isConfigured: Object.values({ ...state.config, ...action.payload }).some(v => v !== '' && v !== false),
            };
            
        case 'SET_PAGES':
            return { ...state, pages: action.payload };
            
        case 'SELECT_PAGE':
            return { 
                ...state, 
                selectedPage: action.payload,
                config: {
                    ...state.config,
                    pageId: action.payload.page_id,
                    accessToken: action.payload.access_token,
                }
            };
            
        case 'SET_FORMS':
            return { ...state, forms: action.payload };
            
        case 'UPDATE_SYNC_STATUS':
            return {
                ...state,
                syncStatus: {
                    ...state.syncStatus,
                    [action.payload.type]: action.payload.status,
                },
            };
            
        case 'ADD_ERROR':
            const errorList = action.payload.type === 'error' ? 'errors' : 'warnings';
            return {
                ...state,
                [errorList]: [...state[errorList], action.payload],
            };
            
        case 'REMOVE_ERROR':
            return {
                ...state,
                errors: state.errors.filter(e => e.id !== action.payload),
                warnings: state.warnings.filter(e => e.id !== action.payload),
            };
            
        case 'SET_ACTIVE_TAB':
            return { ...state, activeTab: action.payload };
            
        case 'UPDATE_HEALTH_STATUS':
            return {
                ...state,
                healthStatus: {
                    ...state.healthStatus,
                    ...action.payload,
                    lastChecked: new Date(),
                },
            };
            
        case 'SET_LAST_SYNC':
            return { ...state, lastSyncAt: action.payload };
            
        default:
            return state;
    }
}

// Context
const FacebookIntegrationContext = createContext<{
    state: FacebookIntegrationState;
    dispatch: React.Dispatch<FacebookIntegrationAction>;
    actions: {
        loadConfig: () => Promise<void>;
        saveConfig: (config: Partial<FacebookIntegrationConfig>) => Promise<boolean>;
        testConnection: () => Promise<boolean>;
        fetchPages: () => Promise<void>;
        selectPage: (page: FacebookPage) => void;
        fetchForms: (pageId: string) => Promise<void>;
        syncLeadForms: () => Promise<void>;
        syncLeads: (formId?: string) => Promise<void>;
        checkHealth: () => Promise<void>;
        clearError: (errorId: string) => void;
        setActiveTab: (tab: string) => void;
    };
} | null>(null);

// Provider Component
export function FacebookIntegrationProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(facebookIntegrationReducer, initialState);

    // Actions
    const loadConfig = useCallback(async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await axios.get('/integrations/facebook');
            
            if (response.data.success && response.data.exists) {
                const config = response.data.integration.config;
                dispatch({ type: 'SET_CONFIG', payload: config });
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
                toast.success('Facebook configuration loaded');
            } else {
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
            }
        } catch (error: any) {
            console.error('Failed to load Facebook configuration', error);
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
            dispatch({
                type: 'ADD_ERROR',
                payload: {
                    id: Date.now().toString(),
                    type: 'error',
                    message: 'Failed to load Facebook configuration',
                    timestamp: new Date(),
                    resolved: false,
                },
            });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    const saveConfig = useCallback(async (config: Partial<FacebookIntegrationConfig>): Promise<boolean> => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await axios.post('/integrations/facebook', config);
            
            if (response.data.success) {
                dispatch({ type: 'SET_CONFIG', payload: config });
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
                toast.success('Facebook integration saved successfully');
                return true;
            } else {
                throw new Error(response.data.message || 'Failed to save configuration');
            }
        } catch (error: any) {
            console.error('Failed to save Facebook configuration', error);
            dispatch({
                type: 'ADD_ERROR',
                payload: {
                    id: Date.now().toString(),
                    type: 'error',
                    message: error.response?.data?.message || 'Failed to save configuration',
                    timestamp: new Date(),
                    resolved: false,
                },
            });
            toast.error('Failed to save Facebook configuration');
            return false;
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    const testConnection = useCallback(async (): Promise<boolean> => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await axios.post('/integrations/facebook/test-connection');
            
            if (response.data.success) {
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
                dispatch({
                    type: 'UPDATE_HEALTH_STATUS',
                    payload: {
                        api: response.data.tests?.api_connectivity?.status === 'passed',
                        permissions: response.data.tests?.page_access?.status === 'passed',
                        webhooks: response.data.tests?.messaging_permissions?.status === 'passed',
                    },
                });
                toast.success('Facebook connection test successful');
                return true;
            } else {
                throw new Error('Connection test failed');
            }
        } catch (error: any) {
            console.error('Facebook connection test failed', error);
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
            dispatch({
                type: 'ADD_ERROR',
                payload: {
                    id: Date.now().toString(),
                    type: 'error',
                    message: 'Facebook connection test failed',
                    timestamp: new Date(),
                    resolved: false,
                },
            });
            toast.error('Facebook connection test failed');
            return false;
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    const fetchPages = useCallback(async () => {
        dispatch({ type: 'UPDATE_SYNC_STATUS', payload: { type: 'pages', status: { isRunning: true, status: 'running' } } });
        try {
            const response = await axios.get('/integrations/facebook/pages');
            
            if (response.data.success) {
                dispatch({ type: 'SET_PAGES', payload: response.data.pages });
                dispatch({ type: 'UPDATE_SYNC_STATUS', payload: { type: 'pages', status: { isRunning: false, status: 'success', lastRun: new Date() } } });
                toast.success(`Loaded ${response.data.pages.length} Facebook pages`);
            } else {
                throw new Error(response.data.message || 'Failed to fetch pages');
            }
        } catch (error: any) {
            console.error('Failed to fetch Facebook pages', error);
            dispatch({ type: 'UPDATE_SYNC_STATUS', payload: { type: 'pages', status: { isRunning: false, status: 'error', error: error.message } } });
            dispatch({
                type: 'ADD_ERROR',
                payload: {
                    id: Date.now().toString(),
                    type: 'error',
                    message: 'Failed to fetch Facebook pages',
                    timestamp: new Date(),
                    resolved: false,
                },
            });
            toast.error('Failed to fetch Facebook pages');
        }
    }, []);

    const selectPage = useCallback((page: FacebookPage) => {
        dispatch({ type: 'SELECT_PAGE', payload: page });
        toast.success(`Selected page: ${page.name}`);
    }, []);

    const fetchForms = useCallback(async (pageId: string) => {
        dispatch({ type: 'UPDATE_SYNC_STATUS', payload: { type: 'leadForms', status: { isRunning: true, status: 'running' } } });
        try {
            const response = await axios.post('/integrations/facebook/forms', { page_id: pageId });
            
            if (response.data.success) {
                dispatch({ type: 'SET_FORMS', payload: response.data.forms });
                dispatch({ type: 'UPDATE_SYNC_STATUS', payload: { type: 'leadForms', status: { isRunning: false, status: 'success', lastRun: new Date() } } });
                toast.success(`Loaded ${response.data.forms.length} lead forms`);
            } else {
                throw new Error(response.data.message || 'Failed to fetch forms');
            }
        } catch (error: any) {
            console.error('Failed to fetch Facebook forms', error);
            dispatch({ type: 'UPDATE_SYNC_STATUS', payload: { type: 'leadForms', status: { isRunning: false, status: 'error', error: error.message } } });
            dispatch({
                type: 'ADD_ERROR',
                payload: {
                    id: Date.now().toString(),
                    type: 'error',
                    message: 'Failed to fetch lead forms',
                    timestamp: new Date(),
                    resolved: false,
                },
            });
            toast.error('Failed to fetch lead forms');
        }
    }, []);

    const syncLeadForms = useCallback(async () => {
        dispatch({ type: 'UPDATE_SYNC_STATUS', payload: { type: 'leadForms', status: { isRunning: true, status: 'running' } } });
        try {
            const response = await axios.post('/integrations/facebook/sync-lead-forms');
            
            if (response.data.success) {
                dispatch({ type: 'UPDATE_SYNC_STATUS', payload: { type: 'leadForms', status: { isRunning: false, status: 'success', lastRun: new Date() } } });
                dispatch({ type: 'SET_LAST_SYNC', payload: new Date() });
                toast.success(`Successfully synced ${response.data.count} lead forms`);
            } else {
                throw new Error(response.data.message || 'Failed to sync lead forms');
            }
        } catch (error: any) {
            console.error('Failed to sync lead forms', error);
            dispatch({ type: 'UPDATE_SYNC_STATUS', payload: { type: 'leadForms', status: { isRunning: false, status: 'error', error: error.message } } });
            dispatch({
                type: 'ADD_ERROR',
                payload: {
                    id: Date.now().toString(),
                    type: 'error',
                    message: 'Failed to sync lead forms',
                    timestamp: new Date(),
                    resolved: false,
                },
            });
            toast.error('Failed to sync lead forms');
        }
    }, []);

    const syncLeads = useCallback(async (formId?: string) => {
        dispatch({ type: 'UPDATE_SYNC_STATUS', payload: { type: 'leads', status: { isRunning: true, status: 'running' } } });
        try {
            const response = await axios.post('/integrations/facebook/sync-leads', formId ? { form_id: formId } : {});
            
            if (response.data.success) {
                dispatch({ type: 'UPDATE_SYNC_STATUS', payload: { type: 'leads', status: { isRunning: false, status: 'success', lastRun: new Date() } } });
                dispatch({ type: 'SET_LAST_SYNC', payload: new Date() });
                toast.success(`Successfully synced ${response.data.count} leads`);
            } else {
                throw new Error(response.data.message || 'Failed to sync leads');
            }
        } catch (error: any) {
            console.error('Failed to sync leads', error);
            dispatch({ type: 'UPDATE_SYNC_STATUS', payload: { type: 'leads', status: { isRunning: false, status: 'error', error: error.message } } });
            dispatch({
                type: 'ADD_ERROR',
                payload: {
                    id: Date.now().toString(),
                    type: 'error',
                    message: 'Failed to sync leads',
                    timestamp: new Date(),
                    resolved: false,
                },
            });
            toast.error('Failed to sync leads');
        }
    }, []);

    const checkHealth = useCallback(async () => {
        try {
            const response = await axios.post('/integrations/facebook/test-connection');
            
            if (response.data.success) {
                dispatch({
                    type: 'UPDATE_HEALTH_STATUS',
                    payload: {
                        api: response.data.tests?.api_connectivity?.status === 'passed',
                        permissions: response.data.tests?.page_access?.status === 'passed',
                        webhooks: response.data.tests?.messaging_permissions?.status === 'passed',
                    },
                });
            }
        } catch (error) {
            dispatch({
                type: 'UPDATE_HEALTH_STATUS',
                payload: {
                    api: false,
                    permissions: false,
                    webhooks: false,
                },
            });
        }
    }, []);

    const clearError = useCallback((errorId: string) => {
        dispatch({ type: 'REMOVE_ERROR', payload: errorId });
    }, []);

    const setActiveTab = useCallback((tab: string) => {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
    }, []);

    // Load config on mount
    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    // Health check interval
    useEffect(() => {
        const interval = setInterval(checkHealth, 5 * 60 * 1000); // Check every 5 minutes
        return () => clearInterval(interval);
    }, [checkHealth]);

    const contextValue = {
        state,
        dispatch,
        actions: {
            loadConfig,
            saveConfig,
            testConnection,
            fetchPages,
            selectPage,
            fetchForms,
            syncLeadForms,
            syncLeads,
            checkHealth,
            clearError,
            setActiveTab,
        },
    };

    return (
        <FacebookIntegrationContext.Provider value={contextValue}>
            {children}
        </FacebookIntegrationContext.Provider>
    );
}

// Custom Hook
export function useFacebookIntegration() {
    const context = useContext(FacebookIntegrationContext);
    if (!context) {
        throw new Error('useFacebookIntegration must be used within a FacebookIntegrationProvider');
    }
    return context;
}