import { Camera, Loader2, User, X } from "lucide-react"
import { useRef } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { validatePhotoFile, getPhotoUrl } from "./studentSchema"

interface StudentAvatarInputProps {
  photoUrl?: string | null
  previewUrl?: string | null
  firstName?: string
  lastName?: string
  isLoading?: boolean
  isDeleting?: boolean
  onFileSelect: (file: File) => void
  onPhotoDelete?: () => void
}

export function StudentAvatarInput({
  photoUrl,
  previewUrl,
  firstName,
  lastName,
  isLoading = false,
  isDeleting = false,
  onFileSelect,
  onPhotoDelete,
}: StudentAvatarInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const error = validatePhotoFile(file)
    if (error) {
      toast.error(error)
      return
    }

    onFileSelect(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const displayUrl = previewUrl || getPhotoUrl(photoUrl)
  const firstInitial = lastName?.[0]?.toUpperCase() || ""
  const lastInitial = firstName?.[0]?.toUpperCase() || ""
  const hasInitials = firstInitial || lastInitial
  const hasPhoto = displayUrl !== undefined && displayUrl !== null
  const isProcessing = isLoading || isDeleting

  return (
    <div className="flex flex-col items-center pb-2">
      <div className="relative group">
        <Avatar className="h-20 w-20">
          <AvatarImage src={displayUrl} />
          <AvatarFallback className="bg-[#6720FF] text-white text-2xl">
            {hasInitials ? (
              <>
                {firstInitial}
                {lastInitial}
              </>
            ) : (
              <User className="h-8 w-8" />
            )}
          </AvatarFallback>
        </Avatar>
        {!isProcessing ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Camera className="h-6 w-6 text-white" />
          </button>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
        {hasPhoto && onPhotoDelete && !isProcessing && (
          <button
            type="button"
            onClick={onPhotoDelete}
            className="absolute -top-1 -right-1 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
