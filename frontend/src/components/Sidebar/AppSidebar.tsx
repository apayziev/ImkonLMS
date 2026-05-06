import {
  Activity,
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  Home,
  Settings,
  Users,
} from "lucide-react"
import { useMemo } from "react"

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

const adminMenuItems: Item[] = [
  { icon: Home, title: "Bosh sahifa", path: "/" },
  { icon: GraduationCap, title: "O'quvchilar", path: "/students" },
  { icon: Users, title: "O'qituvchilar", path: "/teachers" },
  { icon: Activity, title: "Monitoring", path: "/monitoring" },
  { icon: CalendarDays, title: "Dars jadvali", path: "/timetable" },
  { icon: Settings, title: "Sozlamalar", path: "/settings" },
]

const teacherMenuItems: Item[] = [
  { icon: BookOpen, title: "Dars jadvali", path: "/lessons" },
  { icon: FileText, title: "Dars rejasi", path: "/lesson-plan" },
]

export function AppSidebar() {
  const { user } = useAuth()
  const menuItems = useMemo(
    () => (user?.role === "teacher" ? teacherMenuItems : adminMenuItems),
    [user?.role],
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={menuItems} />
      </SidebarContent>
      <SidebarFooter>{user && <User user={user} />}</SidebarFooter>
    </Sidebar>
  )
}
