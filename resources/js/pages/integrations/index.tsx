import React, {useState, useEffect, useMemo} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Switch} from "@/components/ui/switch";
import {Loader2, Search} from "lucide-react";
import {Link, router, useForm} from "@inertiajs/react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import axios from "axios";
import { Head } from '@inertiajs/react';
import { PageProps } from '@/types/global';
import AppLayout from '@/layouts/app-layout';

// Type for integration items
interface Integration {
    id: string;
    name: string;
    icon: string;
    description: string;
    status: "active" | "inactive";
    setup?: boolean;
    type?: "calendar";
    testButton?: boolean;
    isLoading?: boolean;
    link?: boolean;
}

interface IntegrationsPageProps extends PageProps {
    integrations?: Integration[];
    calendarStatus?: {
        isLinked: boolean;
        isLoading: boolean;
    };
}

export default function IntegrationsPage({ integrations: initialIntegrations, calendarStatus }: IntegrationsPageProps) {
    // Filter state
    const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
    const [calendarIsLoading, setCalendarIsLoading] = useState<boolean>(false);
    const [calendarLinked, setCalendarLinked] = useState<boolean>(calendarStatus?.isLinked || false);

    const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, "active" | "inactive">>({
        facebook: "active",
        whatsapp: "active",
        calendar: "inactive"
    });

    // Memoized integrations data
    const integrations = useMemo<Integration[]>(() => [
        {
            id: "facebook",
            name: "Facebook",
            icon: "/facebook-icon.png", // In a real app, you'd use actual icon paths
            description: "Manage posts, engagement, and automate replies.",
            status: integrationStatuses.facebook,
            link: true,
            setup: true, // This indicates the integration has a dedicated setup page
        },
        {
            id: "whatsapp",
            name: "WhatsApp",
            icon: "/whatsapp-icon.png",
            description: "Send updates, offer support, real-time communication.",
            status: integrationStatuses.whatsapp,
        },
        (calendarLinked ? {
            id: "calendar",
            name: "Calendar",
            icon: "/calendar-icon.png",
            description: "Sync and manage your calendar events.",
            status: "active",
            type: "calendar",
            setup: false,
            link: true,
        } : {
            id: "calendar",
            name: "Google Calendar",
            icon: "/calendar-icon.png",
            description: "Sync and manage your calendar events.",
            status: "inactive",
            isLoading: calendarIsLoading,
            link: false,
            setup: false,
            testButton: false
        })
    ], [calendarIsLoading, calendarLinked, integrationStatuses.facebook, integrationStatuses.whatsapp]);

    const { data: calendarForm, setData, post, processing } = useForm({});

    useEffect(() => {
        // Only check calendar status if not provided via props
        if (!calendarStatus) {
            const checkCalendarIntegration = async () => {
                try {
                    setCalendarIsLoading(true);
                    const {data} = await axios.get('/calendar/status');

                    if (data?.isLinked) {
                        setCalendarLinked(true);
                        setIntegrationStatuses(prev => ({
                            ...prev,
                            calendar: "active"
                        }));
                    }
                    setCalendarIsLoading(false);
                } catch (error) {
                    setCalendarIsLoading(false);
                    console.error('Failed to check calendar integration:', error);
                }
            };

            checkCalendarIntegration();
        }
    }, [calendarStatus]);

    // Filter integrations based on current filter
    const filteredIntegrations = integrations.filter((integration) => {
        if (filter === "all") return true;
        return integration.status === filter;
    });

    // Toggle integration status - using Inertia for server-side updates
    const toggleIntegrationStatus = (id: string) => {
        const currentStatus = integrationStatuses[id];
        const newStatus = currentStatus === "active" ? "inactive" : "active";

        // Update local state immediately for better UX
        setIntegrationStatuses(prev => ({
            ...prev,
            [id]: newStatus
        }));

        // Send to server via Inertia
        router.patch(`/integrations/${id}/toggle`, {
            status: newStatus
        }, {
            preserveState: true,
            preserveScroll: true,
            onError: () => {
                // Revert on error
                setIntegrationStatuses(prev => ({
                    ...prev,
                    [id]: currentStatus
                }));
            }
        });
    };

    const connectCalendar = async () => {
        setCalendarIsLoading(true);
        try {
            const response = await axios.post('/calendar/authorize');

            const authUrl = response.data.auth_url;
            if (authUrl && typeof authUrl === 'string') {
                window.location.href = authUrl;
            }
        } catch (error) {
            setCalendarIsLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Integrations" />
            <div className="flex flex-col min-h-screen bg-black text-white p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold">Integrations</h1>
                <div className="flex gap-4">
                    <Button variant="outline" className="bg-transparent border-gray-700 text-white">
                        Export
                    </Button>
                    <Button className="bg-white text-black hover:bg-gray-200">
                        Create new
                    </Button>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6">
                <Tabs defaultValue="all" onValueChange={(value) => setFilter(value as any)}>
                    <TabsList className="bg-gray-900">
                        <TabsTrigger value="all" className="data-[state=active]:bg-gray-800">All</TabsTrigger>
                        <TabsTrigger value="active" className="data-[state=active]:bg-gray-800">Active</TabsTrigger>
                        <TabsTrigger value="inactive" className="data-[state=active]:bg-gray-800">Inactive</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18}/>
                    <Input
                        className="w-80 bg-gray-900 border-gray-800 pl-10 text-white"
                        placeholder="Search"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredIntegrations.map((integration) => (
                    <div
                        key={integration.id}
                        className="bg-gray-900 rounded-lg overflow-hidden"
                    >
                        <div className="p-6 border-b border-gray-800">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                                        {integration.id === "facebook" && (
                                            <div
                                                className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                                     className="h-7 w-7 text-white fill-current">
                                                    <path
                                                        d="M9.19795 21.5H13.198V13.4901H16.8021L17.198 9.50977H13.198V7.5C13.198 6.94772 13.6457 6.5 14.198 6.5H17.198V2.5H14.198C11.4365 2.5 9.19795 4.73858 9.19795 7.5V9.50977H7.19795L6.80206 13.4901H9.19795V21.5Z"/>
                                                </svg>
                                            </div>
                                        )}
                                        {integration.id === "whatsapp" && (
                                            <WhatsAppIcon/>
                                        )}

                                        {integration.id === "calendar" && (
                                            <div className="w-12 h-12 flex items-center justify-center">
                                                <svg width="75" height="75" viewBox="0 0 81 80" fill="none"
                                                     xmlns="http://www.w3.org/2000/svg">
                                                    <g clipPath="url(#clip0_176_98)">
                                                        <path
                                                            d="M61.5528 18.9472L42.6056 16.842L19.4476 18.9472L17.342 40L19.4472 61.0528L40.5 63.6844L61.5528 61.0528L63.658 39.474L61.5528 18.9472Z"
                                                            fill="white"/>
                                                        <path
                                                            d="M28.0844 51.6104C26.5108 50.5472 25.4212 48.9948 24.8264 46.942L28.4792 45.4368C28.8108 46.7 29.3896 47.6788 30.216 48.3736C31.0372 49.0684 32.0372 49.4104 33.2056 49.4104C34.4004 49.4104 35.4268 49.0472 36.2844 48.3208C37.142 47.5944 37.574 46.668 37.574 45.5472C37.574 44.4 37.1212 43.4628 36.216 42.7368C35.3108 42.0108 34.174 41.6472 32.816 41.6472H30.7056V38.0316H32.6C33.7684 38.0316 34.7528 37.716 35.5528 37.0844C36.3528 36.4528 36.7528 35.5896 36.7528 34.4896C36.7528 33.5108 36.3948 32.7316 35.6792 32.1476C34.9636 31.5636 34.058 31.2688 32.958 31.2688C31.8844 31.2688 31.0316 31.5532 30.4 32.1268C29.7684 32.7004 29.3104 33.4056 29.0212 34.2372L25.4056 32.732C25.8844 31.374 26.7636 30.174 28.0528 29.1372C29.3424 28.1004 30.9896 27.5792 32.9896 27.5792C34.4684 27.5792 35.8 27.8636 36.9792 28.4372C38.158 29.0108 39.0844 29.8056 39.7528 30.816C40.4212 31.8316 40.7528 32.9688 40.7528 34.2316C40.7528 35.5212 40.4424 36.6104 39.8212 37.5052C39.2 38.4 38.4368 39.084 37.5316 39.5632V39.7788C38.7264 40.2788 39.7 41.042 40.4684 42.0684C41.2316 43.0948 41.6156 44.3212 41.6156 45.7528C41.6156 47.1844 41.2524 48.4632 40.526 49.5844C39.7996 50.7056 38.7944 51.5896 37.5208 52.2316C36.242 52.8736 34.8052 53.2 33.2104 53.2C31.3632 53.2052 29.658 52.6736 28.0844 51.6104Z"
                                                            fill="#1A73E8"/>
                                                        <path
                                                            d="M50.4999 33.4844L46.5103 36.3844L44.5051 33.3424L51.6999 28.1528H54.4579V52.6316H50.4999V33.4844Z"
                                                            fill="#1A73E8"/>
                                                        <path
                                                            d="M61.5527 80L80.4999 61.0528L71.0263 56.8424L61.5527 61.0528L57.3423 70.5264L61.5527 80Z"
                                                            fill="#EA4335"/>
                                                        <path
                                                            d="M15.2368 70.5264L19.4472 80H61.5524V61.0528H19.4472L15.2368 70.5264Z"
                                                            fill="#34A853"/>
                                                        <path
                                                            d="M6.8156 0C3.3264 0 0.5 2.8264 0.5 6.3156V61.0524L9.9736 65.2628L19.4472 61.0524V18.9472H61.5524L65.7628 9.4736L61.5528 0H6.8156Z"
                                                            fill="#4285F4"/>
                                                        <path
                                                            d="M0.5 61.0528V73.6844C0.5 77.174 3.3264 80 6.8156 80H19.4472V61.0528H0.5Z"
                                                            fill="#188038"/>
                                                        <path
                                                            d="M61.5527 18.9472V61.0524H80.4999V18.9472L71.0263 14.7368L61.5527 18.9472Z"
                                                            fill="#FBBC04"/>
                                                        <path
                                                            d="M80.4999 18.9472V6.3156C80.4999 2.826 77.6735 0 74.1843 0H61.5527V18.9472H80.4999Z"
                                                            fill="#1967D2"/>
                                                    </g>
                                                    <defs>
                                                        <clipPath id="clip0_176_98">
                                                            <rect width="80" height="80" fill="white"
                                                                  transform="translate(0.5)"/>
                                                        </clipPath>
                                                    </defs>
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-semibold">{integration.name}</h3>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-400 hover:text-white"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                         fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                         strokeLinejoin="round" className="w-5 h-5">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                </Button>
                            </div>
                            <p className="mt-3 text-gray-400 text-sm">{integration.description}</p>
                        </div>
                        <div className="flex items-center justify-between p-4">
                            {integration.setup && (
                                <Link href={`/integrations/${integration.id}`}>
                                    <Button variant="ghost"
                                            className="text-sm text-gray-400 flex items-center gap-2 hover:text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                             viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                             strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                            <path
                                                d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                        Configure
                                    </Button>
                                </Link>
                            )}

                            {!integration.link ? (
                                <Button onClick={connectCalendar} variant="ghost"
                                        className="text-sm text-gray-400 flex items-center gap-2 hover:text-white cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                         fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                         strokeLinejoin="round" className="w-4 h-4">
                                        <path
                                            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    Connect
                                </Button>
                            ) : (
                                <Button onClick={() => {}} variant="ghost"
                                        className="text-sm text-gray-400 flex items-center gap-2 hover:text-white cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                         fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                         strokeLinejoin="round" className="w-4 h-4">
                                        <path
                                            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    Disconnect
                                </Button>
                            )}

                            <Switch
                                checked={integration.status === "active"}
                                onCheckedChange={() => toggleIntegrationStatus(integration.id)}
                            />
                        </div>
                    </div>
                ))}
            </div>
            </div>
        </AppLayout>
    );
}
