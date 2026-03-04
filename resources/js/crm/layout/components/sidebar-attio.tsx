import { usePage } from '@inertiajs/react';
import { SidebarAttioHeader } from './sidebar-attio-header';
import { SidebarAttioNav } from './sidebar-attio-nav';
import { SidebarAttioFooter } from './sidebar-attio-footer';
import { SidebarAttioSettingsNav } from './sidebar-attio-settings-nav';

export function SidebarAttio() {
  const { url } = usePage();
  const isSettings = url.startsWith('/settings');

  if (isSettings) {
    return <SidebarAttioSettingsNav />;
  }

  return (
    <>
      <SidebarAttioHeader />
      <SidebarAttioNav />
      <SidebarAttioFooter />
    </>
  );
}
