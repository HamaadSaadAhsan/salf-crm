import { type PropsWithChildren } from 'react';

export default function SettingsLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex w-full flex-col items-center-safe">
            {children}
        </div>
    );
}
