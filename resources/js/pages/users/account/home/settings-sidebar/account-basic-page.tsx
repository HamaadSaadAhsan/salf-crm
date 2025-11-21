import { Fragment } from 'react';
import { PageNavbar } from '@/pages/users/account/page-navbar';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Link } from '@inertiajs/react';
// import { useSettings } from '@/providers/settings-provider';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/common/container';
import { AccountSettingsSidebarContent } from '.';
import AppLayout from '@/layouts/app-layout';

export default function AccountSettingsSidebarPage() {
  // const { settings } = useSettings();

  return (
    <Fragment>
      <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle />
              <ToolbarDescription>
                Intuitive Access to In-Depth Customization
              </ToolbarDescription>
            </ToolbarHeading>
            <ToolbarActions>
              <Button variant="outline">
                <Link href="#">Public Profile</Link>
              </Button>
              <Button>
                <Link href="#">Get Started</Link>
              </Button>
            </ToolbarActions>
          </Toolbar>
          <AccountSettingsSidebarContent />
        </Container>
    </Fragment>
  );
}
