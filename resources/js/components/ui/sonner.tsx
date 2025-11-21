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
            'group toast pointer-events-auto group-[.toaster]:bg-background group-[.toaster]:text-foreground! group-[.toaster]:border-border group-[.toaster]:shadow-lg has-[[role=alert]]:border-0! has-[[role=alert]]:shadow-none! has-[[role=alert]]:bg-transparent!',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:rounded-md! group-[.toast]:bg-primary group-[.toast]:text-primary-foreground! pointer-events-auto',
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
