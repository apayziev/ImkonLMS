import { X } from "lucide-react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export function PhotoZoomDialog({
  photoUrl,
  fullName,
  open,
  onOpenChange,
}: {
  photoUrl: string
  fullName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="flex items-center justify-center bg-transparent border-none shadow-none p-0 max-w-sm [&>button]:hidden">
        <VisuallyHidden><DialogTitle>{fullName}</DialogTitle></VisuallyHidden>
        <div className="relative">
          <img
            src={photoUrl}
            alt={fullName}
            className="rounded-xl max-h-[80vh] max-w-full object-contain"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-white/90 dark:bg-black/70 flex items-center justify-center shadow hover:bg-white transition-colors"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
