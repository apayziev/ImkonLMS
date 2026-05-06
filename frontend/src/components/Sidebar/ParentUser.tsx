import { ChevronsUpDown, LogOut } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { getInitials } from "@/lib/utils"

function ParentInfo({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5 w-full min-w-0">
      <Avatar className="size-8 ring-2 ring-white/20">
        <AvatarFallback className="bg-white/20 text-white font-semibold">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-start min-w-0">
        <p className="text-sm font-medium truncate w-full">{name}</p>
      </div>
    </div>
  )
}

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
    <SidebarMenu
      className={isCollapsed ? "px-0 pb-2 items-center" : "px-2 pb-2"}
    >
      <SidebarMenuItem
        className={isCollapsed ? "flex justify-center w-full" : ""}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size={isCollapsed ? "default" : "lg"}
              className={`rounded-lg data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground ${isCollapsed ? "w-10 h-10 p-0 flex items-center justify-center" : ""}`}
            >
              {isCollapsed ? (
                <Avatar className="size-8 ring-2 ring-white/20">
                  <AvatarFallback className="bg-white/20 text-white font-semibold">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <>
                  <ParentInfo name={displayName} />
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
              <ParentInfo name={displayName} />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-500 hover:text-red-600 focus:text-red-600 hover:bg-red-50 focus:bg-red-50"
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
