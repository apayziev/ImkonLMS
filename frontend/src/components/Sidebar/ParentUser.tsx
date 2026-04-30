import { ChevronsUpDown, LogOut } from "lucide-react"

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
import useParentAuth from "@/hooks/useParentAuth"
import { SidebarUserAvatar, SidebarUserCard } from "./UserCard"

export function ParentUser() {
  const { parent, logout } = useParentAuth()
  const { isMobile, setOpenMobile, state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const handleLogout = () => {
    if (isMobile) setOpenMobile(false)
    logout()
  }

  if (!parent) return null

  const displayName = parent.name || parent.phone

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
                <SidebarUserAvatar name={displayName} />
              ) : (
                <>
                  <SidebarUserCard name={displayName} subtitle="Ota-ona" />
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
              <SidebarUserCard name={displayName} />
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
