import { Link as RouterLink, useRouterState } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export type Item = {
  icon: LucideIcon
  title: string
  path: string
}

interface MainProps {
  items: Item[]
  label?: string
}

export function Main({ items, label }: MainProps) {
  const { isMobile, setOpenMobile, state } = useSidebar()
  const router = useRouterState()
  const currentPath = router.location.pathname
  const isCollapsed = !isMobile && state === "collapsed"

  const handleMenuClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarGroup className={isCollapsed ? "px-0" : "px-2"}>
      {label && !isCollapsed && (
        <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/40 px-3.5 mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu className={`gap-2 ${isCollapsed ? "items-center" : ""}`}>
          {items.map((item) => {
            const isActive = currentPath === item.path

            return (
              <SidebarMenuItem
                key={item.path}
                className={isCollapsed ? "flex justify-center w-full" : ""}
              >
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  asChild
                  size={isCollapsed ? "default" : "lg"}
                  className={`rounded-lg transition-all duration-200 hover:scale-[1.02] ${isCollapsed ? "w-10 h-10 p-0 flex items-center justify-center" : ""}`}
                >
                  <RouterLink
                    to={item.path}
                    onClick={handleMenuClick}
                    className={isCollapsed ? "flex items-center justify-center" : ""}
                  >
                    <item.icon className="size-5" />
                    {!isCollapsed && (
                      <span className="font-medium text-base">{item.title}</span>
                    )}
                  </RouterLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
