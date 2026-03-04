import * as React from 'react';
import { Toaster as Sonner } from 'sonner';
import { useAppearance } from '@/hooks/use-appearance';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { appearance = 'system' } = useAppearance();

  return (
    <Sonner
      theme={appearance as ToasterProps['theme']}
      className="group toaster !z-[100] pointer-events-none [&_[data-type=success]>[data-icon]]:text-success [&_[data-type=success]_[data-title]]:text-success [&_[data-type=info]_[data-title]]:text-info [&_[data-type=error]>[data-icon]]:text-destructive [&_[data-type=error]_[data-title]]:text-destructive"
      toastOptions={{
        classNames: {
          toast:
            'group toast pointer-events-auto group-[.toaster]:bg-white group-[.toaster]:dark:bg-[rgb(31,33,37)] group-[.toaster]:text-foreground! group-[.toaster]:border-0! group-[.toaster]:[box-shadow:rgba(255,255,255,0)_0_0_0_1px_inset,rgba(28,40,64,0.04)_0_0_0_1px,rgba(28,40,64,0.12)_0_4px_8px_-4px,rgba(24,41,75,0.16)_0_4px_12px_-2px] group-[.toaster]:dark:[box-shadow:rgb(47,48,51)_0_0_0_1px_inset,rgba(0,0,0,0.16)_0_0_0_1px,rgba(0,0,0,0.48)_0_4px_8px_-4px,rgba(0,0,0,0.64)_0_4px_12px_-2px] group-[.toaster]:rounded-xl! has-[[role=alert]]:border-0! has-[[role=alert]]:shadow-none! has-[[role=alert]]:bg-transparent!',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:rounded-md! group-[.toast]:bg-primary group-[.toast]:text-primary-foreground! group-[.toast[data-type=warning]]:bg-amber-600 group-[.toast[data-type=warning]]:text-white! group-[.toast[data-type=error]]:bg-destructive group-[.toast[data-type=error]]:text-white! group-[.toast[data-type=success]]:bg-emerald-600 group-[.toast[data-type=success]]:text-white! pointer-events-auto',
          cancelButton:
            'group-[.toast]:rounded-md! group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground! pointer-events-auto',
          closeButton: 'pointer-events-auto',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
