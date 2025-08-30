import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import ReactQueryProvider from '@/providers/react-query-provider';
import { Toaster } from "@/components/ui/sonner"

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
        <ReactQueryProvider>
            {children}
        </ReactQueryProvider>
        <Toaster richColors position="bottom-right" closeButton />
    </AppLayoutTemplate>
);
