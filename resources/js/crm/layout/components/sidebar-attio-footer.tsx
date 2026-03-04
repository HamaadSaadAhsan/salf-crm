import { CircleHelp, UserRoundPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SidebarAttioFooter() {
  return (
    <div className="shrink-0 border-t border-border flex items-center justify-between h-(--sidebar-footer-height) gap-(--sidebar-space-x) px-(--sidebar-space-x) overflow-hidden">
      <Button
        variant="ghost"
        className="grow shrink-0 text-muted-foreground hover:bg-accent hover:text-sidebar-foreground"
      >
        <UserRoundPlus className="size-4" />
        <span>Invite</span>
      </Button>
      <div className="h-4 w-px bg-border" />
      <Button
        variant="ghost"
        className="grow shrink-0 text-muted-foreground hover:bg-accent hover:text-sidebar-foreground"
      >
        <CircleHelp className="size-4" />
        <span>Help</span>
      </Button>
    </div>
  );
}
