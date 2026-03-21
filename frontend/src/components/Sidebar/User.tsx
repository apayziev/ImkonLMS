import { ChevronsUpDown, LogOut } from "lucide-react"

import type { UserRead } from "@/lib/api"
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
import useAuth from "@/hooks/useAuth"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function UserInfo({ fullName }: { fullName?: string | null }) {
  return (
    <div className="flex items-center gap-2.5 w-full min-w-0">
      <Avatar className="size-8 ring-2 ring-white/20">
        <AvatarFallback className="bg-white/20 text-white font-semibold">
          {getInitials(fullName || "User")}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-start min-w-0">
        <p className="text-sm font-medium truncate w-full">{fullName}</p>
      </div>
    </div>
  )
}

export function User({ user }: { user: UserRead }) {
  const { logout } = useAuth()
  const { isMobile, setOpenMobile, state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const handleLogout = () => {
    if (isMobile) setOpenMobile(false)
    logout()
  }

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
                <Avatar className="size-8 ring-2 ring-white/20">
                  <AvatarFallback className="bg-white/20 text-white font-semibold">
                    {getInitials(user.full_name || "User")}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <>
                  <UserInfo fullName={user.full_name} />
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
              <UserInfo fullName={user.full_name} />
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
