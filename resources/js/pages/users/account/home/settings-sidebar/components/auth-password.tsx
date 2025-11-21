import { FormEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';

const AuthPassword = () => {
  const { data, setData, post, processing, errors, reset } = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();

    post(route('account.password.update'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Password updated successfully');
        reset();
      },
      onError: () => {
        toast.error('Failed to update password');
      },
    });
  };

  return (
    <Card>
      <CardHeader id="auth_password">
        <CardTitle>Password</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-5">
            <div className="w-full">
              <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                <Label className="flex w-full max-w-56">Current Password</Label>
                <Input
                  type="password"
                  placeholder="Your current password"
                  value={data.current_password}
                  onChange={(e) => setData('current_password', e.target.value)}
                />
              </div>
              {errors.current_password && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.current_password}
                </p>
              )}
            </div>
            <div className="w-full">
              <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                <Label className="flex w-full max-w-56">New Password</Label>
                <Input
                  type="password"
                  placeholder="New password"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">{errors.password}</p>
              )}
            </div>
            <div className="w-full">
              <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                <Label className="flex w-full max-w-56">
                  Confirm New Password
                </Label>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={data.password_confirmation}
                  onChange={(e) =>
                    setData('password_confirmation', e.target.value)
                  }
                />
              </div>
              {errors.password_confirmation && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.password_confirmation}
                </p>
              )}
            </div>
            <div className="flex justify-end pt-2.5">
              <Button type="submit" disabled={processing}>
                {processing ? 'Updating...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export { AuthPassword };