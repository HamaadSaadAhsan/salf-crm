import { FormEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useForm, usePage } from '@inertiajs/react';
import { toast } from 'sonner';

const AuthEmail = () => {
  const { auth } = usePage().props as any;
  const user = auth?.user || {};

  const { data, setData, post, processing, errors } = useForm({
    email: user.email || '',
    is_active: true,
    is_primary: true,
  });

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();

    post(route('account.profile.update'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Email updated successfully');
      },
      onError: () => {
        toast.error('Failed to update email');
      },
    });
  };

  return (
    <Card className="pb-2.5">
      <CardHeader id="auth_email">
        <CardTitle>Email</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 pt-7.5">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-5">
            <div className="w-full">
              <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                <Label className="flex w-full max-w-56">Email</Label>
                <div className="flex flex-col items-start grow gap-7.5 w-full">
                  <Input
                    className="input"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email}</p>
                  )}
                  <div className="flex items-center gap-7.5">
                    <Label
                      htmlFor="is_active"
                      className="text-foreground text-sm"
                    >
                      Active
                    </Label>
                    <Switch
                      id="is_active"
                      checked={data.is_active}
                      onCheckedChange={(checked) =>
                        setData('is_active', checked)
                      }
                      size="sm"
                    />
                    <Label
                      htmlFor="is_primary"
                      className="text-foreground text-sm"
                    >
                      Primary
                    </Label>
                    <Switch
                      id="is_primary"
                      checked={data.is_primary}
                      onCheckedChange={(checked) =>
                        setData('is_primary', checked)
                      }
                      size="sm"
                    />
                  </div>
                  <span className="form-info text-foreground text-sm font-normal">
                    Input your email, designate as primary for priority updates.
                    Toggle to seamlessly customize your communication
                    preferences
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
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

export { AuthEmail };