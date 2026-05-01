import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"

interface SidebarUserAvatarProps {
  name: string
  photoUrl?: string | null
}

export function SidebarUserAvatar({ name, photoUrl }: SidebarUserAvatarProps) {
  return (
    <Avatar className="ring-2 ring-white/20">
      {photoUrl && <AvatarImage src={photoUrl} alt={name} />}
      <AvatarFallback className="bg-white/20 text-white font-semibold">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

export function SidebarUserCard({ name, photoUrl }: SidebarUserAvatarProps) {
  return (
    <div className="flex items-center gap-2.5 w-full min-w-0">
      <SidebarUserAvatar name={name} photoUrl={photoUrl} />
      <div className="flex flex-col items-start min-w-0">
        <p className="text-sm font-medium truncate w-full">{name}</p>
      </div>
    </div>
  )
}
