import * as React from 'react';
import { Toaster as Sonner } from 'sonner';
import { useAppearance } from '@/hooks/use-appearance';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { appearance = 'system' } = useAppearance();

  return (
    <Sonner
      theme={appearance as ToasterProps['theme']}
      className="group toaster !z-[100] pointer-events-none [&_[data-type=success]>[data-icon]]:text-emerald-500 [&_[data-type=success]_[data-title]]:text-emerald-600 dark:[&_[data-type=success]_[data-title]]:text-emerald-400 [&_[data-type=info]>[data-icon]]:text-blue-500 [&_[data-type=info]_[data-title]]:text-blue-600 dark:[&_[data-type=info]_[data-title]]:text-blue-400 [&_[data-type=error]>[data-icon]]:text-red-500 [&_[data-type=error]_[data-title]]:text-red-600 dark:[&_[data-type=error]_[data-title]]:text-red-400 [&_[data-type=warning]>[data-icon]]:text-amber-500 [&_[data-type=warning]_[data-title]]:text-amber-600 dark:[&_[data-type=warning]_[data-title]]:text-amber-400"
      toastOptions={{
        classNames: {
          toast:
            'group toast pointer-events-auto group-[.toaster]:bg-white group-[.toaster]:dark:bg-[rgb(31,33,37)] group-[.toaster]:text-foreground! group-[.toaster]:border-0! group-[.toaster]:[box-shadow:rgba(255,255,255,0)_0_0_0_1px_inset,rgba(28,40,64,0.04)_0_0_0_1px,rgba(28,40,64,0.12)_0_4px_8px_-4px,rgba(24,41,75,0.16)_0_4px_12px_-2px] group-[.toaster]:dark:[box-shadow:rgb(47,48,51)_0_0_0_1px_inset,rgba(0,0,0,0.16)_0_0_0_1px,rgba(0,0,0,0.48)_0_4px_8px_-4px,rgba(0,0,0,0.64)_0_4px_12px_-2px] group-[.toaster]:rounded-xl! has-[[role=alert]]:border-0! has-[[role=alert]]:shadow-none! has-[[role=alert]]:bg-transparent! data-[type=error]:border-l-[3px]! data-[type=error]:border-l-red-500! data-[type=error]:rounded-l-none! data-[type=success]:border-l-[3px]! data-[type=success]:border-l-emerald-500! data-[type=success]:rounded-l-none! data-[type=warning]:border-l-[3px]! data-[type=warning]:border-l-amber-500! data-[type=warning]:rounded-l-none! data-[type=info]:border-l-[3px]! data-[type=info]:border-l-blue-500! data-[type=info]:rounded-l-none!',
          description: 'group-[.toast]:text-muted-foreground group-[.toast]:text-sm!',
          actionButton:
            'group-[.toast]:rounded-md! group-[.toast]:bg-primary group-[.toast]:text-primary-foreground! group-[.toast[data-type=warning]]:bg-amber-600 group-[.toast[data-type=warning]]:text-white! group-[.toast[data-type=error]]:bg-red-600 group-[.toast[data-type=error]]:text-white! group-[.toast[data-type=success]]:bg-emerald-600 group-[.toast[data-type=success]]:text-white! pointer-events-auto',
          cancelButton:
            'group-[.toast]:rounded-md! group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground! pointer-events-auto',
          closeButton: 'pointer-events-auto',
          title: 'group-[.toast]:font-semibold! group-[.toast]:text-sm!',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
