import { useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Check, CheckCircle2, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Role {
  id: number;
  name: string;
}

interface NewUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles?: Role[];
}

export function NewUserSheet({ open, onOpenChange, roles = [] }: NewUserSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  const selectedRoleObj = roles.find((r) => r.name === selectedRole);

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', password_confirmation: '' });
    setSelectedRole('');
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const payload: Record<string, unknown> = { ...formData };
    if (selectedRole) {
      payload.roles = [selectedRole];
    }

    try {
      await axios.post('/api/users', payload);
      setSuccess('User created successfully!');
      resetForm();
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
        router.reload({ only: ['users'] });
      }, 1500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      const errors = axiosErr.response?.data?.errors;
      const errorMessage =
        errors?.email?.[0] ||
        errors?.name?.[0] ||
        errors?.password?.[0] ||
        errors?.roles?.[0] ||
        axiosErr.response?.data?.message ||
        'Failed to create user. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: { target: { name: string; value: string } }) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <Sheet open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetForm(); }}>
      <SheetContent className="sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create New User</SheetTitle>
          <SheetDescription>
            Add a new user to the system. Fill in the details below.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6 mb-6">
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password_confirmation">Confirm Password</Label>
            <Input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              placeholder="••••••••"
              value={formData.password_confirmation}
              onChange={handleChange}
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={rolePopoverOpen}
                  className="w-full justify-between"
                  disabled={isLoading}
                >
                  <span className="truncate">
                    {selectedRoleObj ? selectedRoleObj.name : 'Select a role...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 z-102" align="start">
                <Command>
                  <CommandInput placeholder="Search roles..." />
                  <CommandList>
                    <CommandEmpty>No role found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__none__"
                        onSelect={() => {
                          setSelectedRole('');
                          setRolePopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            !selectedRole ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span className="text-muted-foreground">No role</span>
                      </CommandItem>
                      {roles.map((role) => (
                        <CommandItem
                          key={role.id}
                          value={role.name}
                          onSelect={() => {
                            setSelectedRole(role.name);
                            setRolePopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedRole === role.name ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {role.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <SheetFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange(false); resetForm(); }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create User'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
