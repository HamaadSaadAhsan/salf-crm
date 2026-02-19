import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeaderHelp() {
  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        mode="icon"
        className="text-muted-foreground hover:text-foreground hover:bg-accent hover:border-accent"
      >
        <CircleHelp className="size-4" />
      </Button>
    </div>
  );
}
