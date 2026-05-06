import { BookOpen, CalendarDays, ClipboardList, Home } from "lucide-react"

import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { type Item, Main } from "./Main"
import { ParentUser } from "./ParentUser"

const parentMenuItems: Item[] = [
  { icon: Home, title: "Bosh sahifa", path: "/parent" },
  { icon: ClipboardList, title: "Davomat", path: "/parent/attendance" },
  { icon: CalendarDays, title: "Dars jadvali", path: "/parent/timetable" },
  { icon: BookOpen, title: "Uyga vazifa", path: "/parent/homework" },
]

export function ParentSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" linkTo="/parent" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={parentMenuItems} />
      </SidebarContent>
      <SidebarFooter>
        <ParentUser />
      </SidebarFooter>
    </Sidebar>
  )
}
