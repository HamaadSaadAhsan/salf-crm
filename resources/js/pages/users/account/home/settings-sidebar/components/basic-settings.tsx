import { FormEventHandler, useState } from 'react';
import { AvatarInput } from '@/partials/common/avatar-input';
import { format } from 'date-fns';
import { CalendarDays, CalendarIcon, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateInput, TimeField } from '@/components/ui/datefield';
import { Input, InputAddon, InputGroup } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { SharedData } from '@/types';

const BasicSettings = () => {
  const { props: {auth} } = usePage<SharedData>();
  const user = auth?.user || {};

  const { data, setData, post, processing, errors } = useForm({
    name: user.name || '',
    company: user.company || '',
    phone: user.phone || '',
    extension: user.extension || '',
    birth_date: user.birth_date || null,
    availability_date: null,
    availability_time: '10:00',
    dismissal_time: null,
    visibility: user.visibility || 'public',
    availability: user.availability || false,
    avatar: null as File | null,
  });

  const [date, setDate] = useState<Date | undefined>(
    data.birth_date ? new Date(data.birth_date) : new Date(1984, 0, 20)
  );
  const [availabilityDate, setAvailabilityDate] = useState<Date | undefined>(
    new Date()
  );

  const availabilityTimeSlots = [
    { time: '09:00', available: false },
    { time: '09:30', available: false },
    { time: '10:00', available: true },
    { time: '10:30', available: true },
    { time: '11:00', available: true },
    { time: '11:30', available: true },
    { time: '12:00', available: false },
    { time: '12:30', available: true },
    { time: '13:00', available: true },
    { time: '13:30', available: true },
    { time: '14:00', available: true },
    { time: '14:30', available: false },
    { time: '15:00', available: false },
    { time: '15:30', available: true },
    { time: '16:00', available: true },
    { time: '16:30', available: true },
    { time: '17:00', available: true },
    { time: '17:30', available: true },
    { time: '18:00', available: true },
    { time: '18:30', available: true },
    { time: '19:00', available: true },
    { time: '19:30', available: true },
    { time: '20:00', available: true },
    { time: '20:30', available: true },
    { time: '21:00', available: true },
    { time: '21:30', available: true },
    { time: '22:00', available: true },
    { time: '22:30', available: true },
    { time: '23:00', available: true },
    { time: '23:30', available: true },
    { time: '24:00', available: true },
  ];

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();

    const formData = {
      ...data,
      birth_date: date ? format(date, 'yyyy-MM-dd') : null,
      availability_date: availabilityDate
        ? format(availabilityDate, 'yyyy-MM-dd')
        : null,
    };

    post(route('account.profile.update'), {
      data: formData,
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Profile updated successfully');
      },
      onError: () => {
        toast.error('Failed to update profile');
      },
    });
  };

  return (
    <Card className="pb-2.5">
      <CardHeader id="basic_settings">
        <CardTitle>Basic Settings</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-5">
            <div className="flex items-center flex-wrap gap-2.5">
              <Label className="flex w-full max-w-56">Photo</Label>
              <div className="flex items-center justify-between flex-wrap grow gap-2.5">
                <span className="text-sm text-secondary-foreground">
                  150x150px JPEG, PNG Image
                </span>
                <AvatarInput />
              </div>
            </div>
            <div className="w-full">
              <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                <Label className="flex w-full items-center gap-1 max-w-56">
                  Name
                </Label>
                <Input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
              )}
            </div>
            <div className="w-full">
              <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                <Label className="flex w-full items-center gap-1 max-w-56">
                  Birth Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      mode="input"
                      variant="outline"
                      id="date"
                      className={cn(
                        'w-full data-[state=open]:border-primary',
                        !date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarDays className="-ms-0.5" />
                      {date ? (
                        format(date, 'LLL dd, y')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="single"
                      defaultMonth={date}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="w-full">
              <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                <Label className="flex w-full items-center gap-1 max-w-56">
                  Availability Date & Time
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="grow relative">
                      <Button
                        type="button"
                        variant="outline"
                        mode="input"
                        placeholder={!date}
                        className="w-full"
                      >
                        <CalendarIcon />
                        {date ? (
                          format(date, 'PPP') +
                          (data.availability_time
                            ? ` - ${data.availability_time}`
                            : '')
                        ) : (
                          <span>Pick a date and time</span>
                        )}
                      </Button>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex max-sm:flex-col">
                      <Calendar
                        mode="single"
                        selected={availabilityDate}
                        onSelect={(newDate) => {
                          if (newDate) {
                            setAvailabilityDate(newDate);
                            setData('availability_time', '');
                          }
                        }}
                        className="p-2 sm:pe-5"
                        disabled={[{ before: new Date() }]}
                      />
                      <div className="relative w-full max-sm:h-48 sm:w-40">
                        <div className="absolute inset-0 py-4 max-sm:border-t">
                          <ScrollArea className="h-full sm:border-s">
                            <div className="space-y-3">
                              <div className="flex h-5 shrink-0 items-center px-5">
                                <p className="text-sm font-medium">
                                  {date
                                    ? format(date, 'EEEE, d')
                                    : 'Pick a date'}
                                </p>
                              </div>
                              <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                                {availabilityTimeSlots.map(
                                  ({ time: timeSlot, available }) => (
                                    <Button
                                      key={timeSlot}
                                      variant={
                                        data.availability_time === timeSlot
                                          ? 'primary'
                                          : 'outline'
                                      }
                                      size="sm"
                                      className="w-full"
                                      onClick={() =>
                                        setData('availability_time', timeSlot)
                                      }
                                      disabled={!available}
                                    >
                                      {timeSlot}
                                    </Button>
                                  )
                                )}
                              </div>
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="w-full">
              <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                <Label className="flex w-full items-center gap-1 max-w-56">
                  Company
                </Label>
                <Input
                  type="text"
                  value={data.company}
                  onChange={(e) => setData('company', e.target.value)}
                />
              </div>
              {errors.company && (
                <p className="text-sm text-red-600 mt-1">{errors.company}</p>
              )}
            </div>

            <div className="w-full">
              <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                <Label className="flex w-full items-center gap-1 max-w-56">
                  Dismissal Time
                </Label>
                <InputGroup className="w-full">
                  <InputAddon mode="icon">
                    <Clock3 />
                  </InputAddon>
                  <TimeField>
                    <DateInput />
                  </TimeField>
                </InputGroup>
              </div>
            </div>
            <div className="w-full">
              <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                <Label className="flex w-full items-center gap-1 max-w-56">
                  Phone number
                </Label>
                <Input
                  type="text"
                  placeholder="Enter phone"
                  value={data.phone}
                  onChange={(e) => setData('phone', e.target.value)}
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
              )}
            </div>
            <div className="w-full">
              <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                <Label className="flex w-full items-center gap-1 max-w-56">
                  Extension (PBX/SIP)
                </Label>
                <Input
                  type="text"
                  placeholder="Enter extension number (e.g., 201)"
                  value={data.extension}
                  onChange={(e) => setData('extension', e.target.value)}
                />
              </div>
              {errors.extension && (
                <p className="text-sm text-red-600 mt-1">{errors.extension}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1 lg:ml-[14.5rem]">
                For CRO users only. This extension will be used for making calls through the system.
              </p>
            </div>
            <div className="flex items-center flex-wrap gap-2.5">
              <Label className="flex w-full max-w-56">Visibility</Label>
              <div className="grow">
                <Select
                  value={data.visibility}
                  onValueChange={(value) => setData('visibility', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-2.5">
              <Label className="flex w-full max-w-56">Availability</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="auto-update" className="text-sm">

                </Label>
                <Switch
                  checked={data.availability}
                  onCheckedChange={(checked) =>
                    setData('availability', checked)
                  }
                  size="sm"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2.5">
              <Button type="submit" disabled={processing}>
                {processing ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export { BasicSettings };
