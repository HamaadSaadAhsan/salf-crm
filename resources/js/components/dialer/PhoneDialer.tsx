import React, { useState } from 'react';
import { X, Phone, Clock, Users } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DialPad } from './DialPad';
import { RecentCallsList, type CallLog } from './RecentCallsList';
import { ContactsQuickDial, type QuickDialContact } from './ContactsQuickDial';

interface PhoneDialerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialedNumber: string;
  onDigitPress: (digit: string) => void;
  onBackspace: () => void;
  onClearNumber: () => void;
  onCall: () => void;
  recentCalls?: CallLog[];
  quickDialContacts?: QuickDialContact[];
  onCallBack?: (call: CallLog) => void;
  onContactCall?: (contact: QuickDialContact) => void;
  onToggleFavorite?: (contactId: string, isFavorite: boolean) => void;
  className?: string;
}

export function PhoneDialer({
  open,
  onOpenChange,
  dialedNumber,
  onDigitPress,
  onBackspace,
  onClearNumber,
  onCall,
  recentCalls = [],
  quickDialContacts = [],
  onCallBack,
  onContactCall,
  onToggleFavorite,
  className,
}: PhoneDialerProps) {
  const [activeTab, setActiveTab] = useState('dial');
  const [searchQuery, setSearchQuery] = useState('');

  const handleClose = () => {
    onOpenChange(false);
    setSearchQuery('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          'h-[90vh] max-h-[800px] p-0',
          'sm:max-w-md sm:mx-auto sm:rounded-t-2xl',
          'backdrop-blur-xl bg-background/95',
          'border-t border-border/50',
          '[&>button[data-slot=sheet-close]]:hidden', // Hide default close button
          className
        )}
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-semibold">Phone</SheetTitle>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <SheetDescription className="sr-only">
            Phone dialer interface for making calls
          </SheetDescription>
        </SheetHeader>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col h-[calc(100%-80px)]"
        >
          <TabsList className="w-full grid grid-cols-3 mx-6 my-4 w-[calc(100%-48px)]">
            <TabsTrigger value="dial" className="gap-2">
              <Phone className="h-4 w-4" />
              Dial
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-2">
              <Clock className="h-4 w-4" />
              Recent
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <Users className="h-4 w-4" />
              Contacts
            </TabsTrigger>
          </TabsList>

          {/* Dial Tab */}
          <TabsContent
            value="dial"
            className="flex-1 px-6 pb-6 overflow-y-auto"
          >
            <DialPad
              dialedNumber={dialedNumber}
              onDigitPress={onDigitPress}
              onBackspace={onBackspace}
              onCall={onCall}
              className="max-w-sm mx-auto"
            />
          </TabsContent>

          {/* Recent Calls Tab */}
          <TabsContent
            value="recent"
            className="flex-1 px-6 pb-6 overflow-y-auto"
          >
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Search recent calls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <RecentCallsList
              calls={recentCalls}
              onCallBack={(call) => {
                if (onCallBack) {
                  onCallBack(call);
                }
              }}
              filter="all"
            />
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent
            value="contacts"
            className="flex-1 px-6 pb-6 overflow-y-auto"
          >
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <ContactsQuickDial
              contacts={quickDialContacts}
              onCall={(contact) => {
                if (onContactCall) {
                  onContactCall(contact);
                }
              }}
              onToggleFavorite={onToggleFavorite}
              searchQuery={searchQuery}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
