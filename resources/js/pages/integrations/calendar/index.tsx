import React, {useState} from "react";
import {router, Head} from "@inertiajs/react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Alert, AlertDescription} from "@/components/ui/alert";
import Logo from "@/components/logo";
import {Separator} from "@/components/ui/separator";
import { PlusIcon } from "lucide-react";
import { PageProps } from '@/types/global';
import axios from "axios";

interface CalendarIntegrationPageProps extends PageProps {
    authUrl?: string;
}

export default function CalendarIntegrationPage({ authUrl }: CalendarIntegrationPageProps) {
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (authUrl) {
            // If we already have the auth URL from props, use it directly
            window.location.href = authUrl;
        } else {
            // Otherwise, make a request to get the auth URL using axios
            try {
                setIsLoading(true);
                const response = await axios.post('/calendar/authorize');

                if (response.data?.auth_url) {
                    window.location.href = response.data.auth_url;
                }
            } catch (error) {
                setError('Failed to initiate calendar connection');
                setIsLoading(false);
            }
        }
    };

    const handleSkip = () => {
        router.visit('/integrations');
    };

    return (
        <>
            <Head title="Calendar Integration" />
            <div className="flex min-h-screen flex-col items-center justify-center p-4">


            <Card className="w-full max-w-md h-full max-h-[616px] text-center">
                <div className="flex items-center gap-3 justify-center-safe text-center">
                    <Logo width={90} height={90}/>
                    <PlusIcon className="text-[#9CA3AF]" size={40} />
                    <div className="">
                        <svg width="75" height="75" viewBox="0 0 81 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_176_98)">
                                <path d="M61.5528 18.9472L42.6056 16.842L19.4476 18.9472L17.342 40L19.4472 61.0528L40.5 63.6844L61.5528 61.0528L63.658 39.474L61.5528 18.9472Z" fill="white"/>
                                <path d="M28.0844 51.6104C26.5108 50.5472 25.4212 48.9948 24.8264 46.942L28.4792 45.4368C28.8108 46.7 29.3896 47.6788 30.216 48.3736C31.0372 49.0684 32.0372 49.4104 33.2056 49.4104C34.4004 49.4104 35.4268 49.0472 36.2844 48.3208C37.142 47.5944 37.574 46.668 37.574 45.5472C37.574 44.4 37.1212 43.4628 36.216 42.7368C35.3108 42.0108 34.174 41.6472 32.816 41.6472H30.7056V38.0316H32.6C33.7684 38.0316 34.7528 37.716 35.5528 37.0844C36.3528 36.4528 36.7528 35.5896 36.7528 34.4896C36.7528 33.5108 36.3948 32.7316 35.6792 32.1476C34.9636 31.5636 34.058 31.2688 32.958 31.2688C31.8844 31.2688 31.0316 31.5532 30.4 32.1268C29.7684 32.7004 29.3104 33.4056 29.0212 34.2372L25.4056 32.732C25.8844 31.374 26.7636 30.174 28.0528 29.1372C29.3424 28.1004 30.9896 27.5792 32.9896 27.5792C34.4684 27.5792 35.8 27.8636 36.9792 28.4372C38.158 29.0108 39.0844 29.8056 39.7528 30.816C40.4212 31.8316 40.7528 32.9688 40.7528 34.2316C40.7528 35.5212 40.4424 36.6104 39.8212 37.5052C39.2 38.4 38.4368 39.084 37.5316 39.5632V39.7788C38.7264 40.2788 39.7 41.042 40.4684 42.0684C41.2316 43.0948 41.6156 44.3212 41.6156 45.7528C41.6156 47.1844 41.2524 48.4632 40.526 49.5844C39.7996 50.7056 38.7944 51.5896 37.5208 52.2316C36.242 52.8736 34.8052 53.2 33.2104 53.2C31.3632 53.2052 29.658 52.6736 28.0844 51.6104Z" fill="#1A73E8"/>
                                <path d="M50.4999 33.4844L46.5103 36.3844L44.5051 33.3424L51.6999 28.1528H54.4579V52.6316H50.4999V33.4844Z" fill="#1A73E8"/>
                                <path d="M61.5527 80L80.4999 61.0528L71.0263 56.8424L61.5527 61.0528L57.3423 70.5264L61.5527 80Z" fill="#EA4335"/>
                                <path d="M15.2368 70.5264L19.4472 80H61.5524V61.0528H19.4472L15.2368 70.5264Z" fill="#34A853"/>
                                <path d="M6.8156 0C3.3264 0 0.5 2.8264 0.5 6.3156V61.0524L9.9736 65.2628L19.4472 61.0524V18.9472H61.5524L65.7628 9.4736L61.5528 0H6.8156Z" fill="#4285F4"/>
                                <path d="M0.5 61.0528V73.6844C0.5 77.174 3.3264 80 6.8156 80H19.4472V61.0528H0.5Z" fill="#188038"/>
                                <path d="M61.5527 18.9472V61.0524H80.4999V18.9472L71.0263 14.7368L61.5527 18.9472Z" fill="#FBBC04"/>
                                <path d="M80.4999 18.9472V6.3156C80.4999 2.826 77.6735 0 74.1843 0H61.5527V18.9472H80.4999Z" fill="#1967D2"/>
                            </g>
                            <defs>
                                <clipPath id="clip0_176_98">
                                    <rect width="80" height="80" fill="white" transform="translate(0.5)"/>
                                </clipPath>
                            </defs>
                        </svg>
                    </div>
                </div>
                <CardHeader>
                    <h1 className="text-xl font-bold">Sync your tickets to your calendar</h1>
                    <CardTitle className="text-sm font-normal">By connecting your email with calendar, {"you'll"} be able to instantly see followups on your tickets as an event in calendar. Only you can see the content you sync.</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 h-full">
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Button className="w-full cursor-pointer">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_127_55)">
                                    <path d="M4.38832 8.23062C4.77823 7.10998 5.53071 6.13493 6.53842 5.44459C7.54613 4.75425 8.7576 4.38387 9.99999 4.38629C11.4083 4.38629 12.6817 4.86129 13.6817 5.63871L16.5917 2.875C14.8183 1.40646 12.5458 0.5 9.99999 0.5C6.05832 0.5 2.66499 2.63592 1.03333 5.76458L4.38832 8.23062Z" fill="#EA4335"/>
                                    <path d="M13.3667 14.7603C12.4584 15.3168 11.3051 15.6137 10.0001 15.6137C8.76261 15.6161 7.55572 15.2487 6.55025 14.5634C5.54478 13.8782 4.79167 12.9099 4.39755 11.7955L1.03088 14.2235C1.85692 15.8119 3.13527 17.1483 4.72074 18.081C6.3062 19.0137 8.13522 19.5053 10.0001 19.5C12.4442 19.5 14.7792 18.6743 16.5284 17.125L13.3676 14.7603H13.3667Z" fill="#34A853"/>
                                    <path d="M16.5283 17.125C18.3575 15.5037 19.545 13.0907 19.545 10C19.545 9.43792 19.4542 8.83388 19.3183 8.27258H10V11.9435H15.3633C15.0992 13.1778 14.3883 14.1333 13.3675 14.7603L16.5283 17.125Z" fill="#4A90E2"/>
                                    <path d="M4.3976 11.7955C4.19373 11.2167 4.09016 10.6103 4.09093 10C4.09093 9.38092 4.1951 8.78638 4.38843 8.23063L1.03343 5.76458C0.347079 7.08088 -0.00673329 8.53108 9.70454e-05 10C9.70454e-05 11.52 0.37093 12.9529 1.03093 14.2235L4.3976 11.7955Z" fill="#FBBC05"/>
                                </g>
                                <defs>
                                    <clipPath id="clip0_127_55">
                                        <rect width="20" height="19" fill="white" transform="translate(0 0.5)"/>
                                    </clipPath>
                                </defs>
                            </svg>
                            {isLoading ? "Connecting..." : "Continue with Google"}

                        </Button>
                    </form>
                </CardContent>
                <Separator orientation="horizontal"/>
                <CardFooter className="flex p-1 justify-center-safe">
                    <p className="text-sm">
                        <Button variant="link" className="cursor-pointer" onClick={handleSkip}>
                            {"I'll"} setup later
                        </Button>
                    </p>
                </CardFooter>
            </Card>
            </div>
        </>
    );
}
