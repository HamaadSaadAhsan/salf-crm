import { Content } from '@/crm/layout/components/content';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from '@/pages/services/page-header';
import ServiceList from '@/pages/services/service-list';
import { ServiceSheet } from '@/pages/services/service-sheet';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

export interface Service {
    id: number;
    name: string;
    detail?: string;
    country_code?: string;
    country_name?: string;
    parent_id?: number;
    parent_name?: string;
    sort_order: number;
    status: 'draft' | 'active' | 'inactive' | 'archived';
    is_parent: boolean;
    children_count: number;
    active_users_count: number;
    leads_count: number;
    created_at: string;
    updated_at: string;
}

interface ServicesPageProps {
    services: Service[];
}

export default function ServicesPage({ services }: ServicesPageProps) {
    const [showServiceSheet, setShowServiceSheet] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const initialSearch = new URLSearchParams(window.location.search).get('search') ?? '';

    const handleNewService = () => {
        setSelectedService(null);
        setShowServiceSheet(true);
    };

    const handleEditService = (service: Service) => {
        setSelectedService(service);
        setShowServiceSheet(true);
    };

    const handleCloseSheet = () => {
        setShowServiceSheet(false);
        setSelectedService(null);
    };

    const servicesList = Array.isArray(services) ? services : [];

    return (
        <AppLayout>
            <Head title="Program Management" />
            <PageHeader onNewService={handleNewService} />
            <ServiceList services={servicesList} onEditService={handleEditService} initialSearch={initialSearch} />

            <ServiceSheet open={showServiceSheet} onOpenChange={handleCloseSheet} service={selectedService} />
        </AppLayout>
    );
}
