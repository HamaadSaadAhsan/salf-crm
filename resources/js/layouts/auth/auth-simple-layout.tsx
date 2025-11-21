import Logo from '@/components/logo';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { home } from '@/routes';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <Card className="mx-auto w-full max-w-md">
                <CardHeader className="flex flex-col text-center border-0 pt-8">
                    <div className="flex justify-center">
                        <Link href={home()}>
                            <Logo height={100} width={100} />
                        </Link>
                    </div>
                    {title && (
                        <div className="mt-6 text-center">
                            <h1 className="text-2xl font-semibold">{title}</h1>
                            {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
                        </div>
                    )}
                </CardHeader>
                <CardContent>{children}</CardContent>
            </Card>
        </div>
    );
}
