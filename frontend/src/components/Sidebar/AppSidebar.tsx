import { Home, Users } from "lucide-react"

import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { User } from "./User"

const menuItems: Item[] = [
  { icon: Home, title: "Bosh sahifa", path: "/" },
  { icon: Users, title: "O'quvchilar", path: "/students" },
]

export function AppSidebar() {
  const { user } = useAuth()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={menuItems} />
      </SidebarContent>
      <SidebarFooter>
        {user && <User user={user} />}
      </SidebarFooter>
    </Sidebar>
  )
}
