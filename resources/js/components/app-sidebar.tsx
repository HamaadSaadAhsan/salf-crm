import * as React from "react"
import {
  AudioWaveform,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  LayoutGrid,
  Map,
  PieChart,
  Settings2,
  Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { dashboard } from '@/routes';
import { IconTools } from '@tabler/icons-react';

// This is sample data.
const data = {
  teams: [
    {
      name: import.meta.env.VITE_APP_NAME || 'Laravel',
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Development Team",
      logo: AudioWaveform,
      plan: "Pro",
    },
    {
      name: "Marketing Team",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      href: dashboard().url,
      icon: LayoutGrid,
      isActive: true,
      items: [
        {
          title: "Overview",
          href: dashboard().url,
        },
        {
          title: "Analytics",
          href: "#",
        },
        {
          title: "Reports",
          href: "#",
        },
      ],
    },
    {
      title: "Leads",
      href: '/leads',
      icon: Users,
      items: [
        {
          title: "All Leads",
          href: "/leads",
        },
        {
          title: "New Leads",
          href: "#",
        },
        {
          title: "Qualified",
          href: "#",
        },
        {
          title: "Lost",
          href: "#",
        },
      ],
    },
    {
      title: "Management",
      href: "#",
      icon: Bot,
      items: [
        {
          title: "Users",
          href: "#",
        },
        {
          title: "Roles",
          href: "#",
        },
        {
          title: "Permissions",
          href: "#",
        },
      ],
    },
    {
      title: "Integrations",
      href: "/integrations",
      icon: IconTools,
      items: [
        {
          title: "Overview",
          href: "/integrations",
            icon: PieChart
        },
        {
          title: "Calendar",
          href: "/integrations/calendar",
        },
        {
          title: "Facebook",
          href: "/integrations/facebook",
        },
      ],
    },
    {
      title: "Settings",
      href: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          href: "#",
        },
        {
          title: "Security",
          href: "#",
        },
        {
          title: "Integrations",
          href: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design System",
      href: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      href: "#",
      icon: PieChart,
    },
    {
      name: "Travel Booking",
      href: "#",
      icon: Map,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
