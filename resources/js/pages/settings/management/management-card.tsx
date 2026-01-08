import { Link } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';

interface ManagementCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export function ManagementCard({
  title,
  description,
  icon: Icon,
  href,
  badge,
  disabled = false,
}: ManagementCardProps) {
  const cardContent = (
    <Card
      className={`h-full transition-all duration-200 ${
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:shadow-lg hover:border-primary/50'
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 dark:bg-primary/20">
            <Icon className="size-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <CardTitle className="truncate">{title}</CardTitle>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            <CardDescription className="line-clamp-2">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (disabled) {
    return <div>{cardContent}</div>;
  }

  return (
    <Link href={href} className="block">
      {cardContent}
    </Link>
  );
}
