import { ChevronsUpDown, LogOut } from "lucide-react"

import type { UserRead } from "@/lib/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { SidebarUserAvatar, SidebarUserCard } from "./UserCard"

export function User({ user }: { user: UserRead }) {
  const { logout } = useAuth()
  const { isMobile, setOpenMobile, state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const handleLogout = () => {
    if (isMobile) setOpenMobile(false)
    logout()
  }

  const name = user.full_name || "User"

  return (
    <SidebarMenu className={isCollapsed ? "px-0 pb-2 items-center" : "px-2 pb-2"}>
      <SidebarMenuItem className={isCollapsed ? "flex justify-center w-full" : ""}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size={isCollapsed ? "default" : "lg"}
              className={`rounded-lg data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground ${isCollapsed ? "w-10 h-10 p-0 flex items-center justify-center" : ""}`}
            >
              {isCollapsed ? (
                <SidebarUserAvatar name={name} photoUrl={user.photo_url} />
              ) : (
                <>
                  <SidebarUserCard name={name} photoUrl={user.photo_url} />
                  <ChevronsUpDown className="ml-auto size-4 text-white/60" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <SidebarUserCard name={name} photoUrl={user.photo_url} />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              variant="destructive"
            >
              <LogOut />
              Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
