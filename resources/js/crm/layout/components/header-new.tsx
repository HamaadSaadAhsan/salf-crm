import { CirclePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeaderNew() {
  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground hover:bg-accent hover:border-accent"
      >
        <CirclePlus className="size-4" />
        New
      </Button>
    </div>
  );
}
