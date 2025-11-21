import React from 'react';
import { Phone, Star, StarOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface QuickDialContact {
  id: string;
  name: string;
  phone_number: string;
  avatar?: string;
  is_favorite: boolean;
  call_count?: number;
  last_called_at?: string;
}

interface ContactsQuickDialProps {
  contacts: QuickDialContact[];
  onCall: (contact: QuickDialContact) => void;
  onToggleFavorite?: (contactId: string, isFavorite: boolean) => void;
  searchQuery?: string;
  className?: string;
}

export function ContactsQuickDial({
  contacts,
  onCall,
  onToggleFavorite,
  searchQuery = '',
  className,
}: ContactsQuickDialProps) {
  // Filter contacts based on search query
  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.phone_number.includes(query)
    );
  });

  // Sort: favorites first, then by call count
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    // Favorites first
    if (a.is_favorite && !b.is_favorite) {
      return -1;
    }
    if (!a.is_favorite && b.is_favorite) {
      return 1;
    }
    // Then by call count
    return (b.call_count || 0) - (a.call_count || 0);
  });

  // Get initials from name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format phone number for display
  const formatPhoneNumber = (number: string): string => {
    // Simple formatting for US numbers: (XXX) XXX-XXXX
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return number;
  };

  if (sortedContacts.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 text-center',
          className
        )}
      >
        <User className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">
          {searchQuery ? 'No contacts found' : 'No contacts yet'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {searchQuery
            ? 'Try a different search term'
            : 'Add contacts to quick dial them'}
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          'grid grid-cols-2 md:grid-cols-3 gap-3',
          className
        )}
      >
        {sortedContacts.map((contact) => (
          <div
            key={contact.id}
            className={cn(
              'relative flex flex-col items-center gap-2 p-4',
              'rounded-lg border-2 border-border/50',
              'hover:border-primary/50 hover:bg-muted/30',
              'transition-all duration-200',
              'group'
            )}
          >
            {/* Favorite Star Badge */}
            {onToggleFavorite && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() =>
                      onToggleFavorite(contact.id, !contact.is_favorite)
                    }
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'absolute top-2 right-2 h-7 w-7',
                      'opacity-0 group-hover:opacity-100',
                      contact.is_favorite && 'opacity-100',
                      'transition-opacity'
                    )}
                  >
                    {contact.is_favorite ? (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {contact.is_favorite
                      ? 'Remove from favorites'
                      : 'Add to favorites'}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Avatar */}
            <Avatar className="h-16 w-16">
              <AvatarImage src={contact.avatar} alt={contact.name} />
              <AvatarFallback className="text-lg font-semibold">
                {getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>

            {/* Contact Info */}
            <div className="text-center w-full">
              <p className="font-medium truncate">{contact.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {formatPhoneNumber(contact.phone_number)}
              </p>

              {/* Call count badge */}
              {contact.call_count && contact.call_count > 0 && (
                <Badge
                  variant="secondary"
                  className="mt-2 text-xs h-5"
                >
                  {contact.call_count} call{contact.call_count > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Call Button */}
            <Button
              onClick={() => onCall(contact)}
              size="sm"
              className={cn(
                'w-full mt-2',
                'bg-green-500 hover:bg-green-600',
                'dark:bg-green-600 dark:hover:bg-green-700',
                'transition-colors'
              )}
            >
              <Phone className="mr-2 h-4 w-4" />
              Call
            </Button>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
