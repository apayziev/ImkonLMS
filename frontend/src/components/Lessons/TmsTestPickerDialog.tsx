import { Loader2, Unlink, ExternalLink } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { tmsApi } from "@/lib/api"
import { TMS } from "@/config"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface TmsTestPickerDialogProps {
  currentTestId: number | null
  currentTestTitle: string | null
  disabled: boolean
  onSelect: (testId: number, title: string) => void
  onRemove: () => void
}

const tmsTestMessageSchema = z.object({
  type: z.literal("tms-test-selected"),
  test_id: z.number().int().positive(),
  title: z.string().min(1),
})

// Normalized at module load (TMS.origin comes from env/build-time config).
// We compare event.origin as a plain string at runtime — opaque/sandboxed
// senders surface as the literal "null" and would have thrown on new URL().
const TMS_ORIGIN = new URL(TMS.origin).origin

export function TmsTestPickerDialog({
  currentTestId,
  currentTestTitle,
  disabled,
  onSelect,
  onRemove,
}: TmsTestPickerDialogProps) {
  const [open, setOpen] = useState(false)
  const [embedUrl, setEmbedUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Fetch embed token when dialog opens
  useEffect(() => {
    if (!open) return

    setLoading(true)
    tmsApi
      .getEmbedToken()
      .then((res) => setEmbedUrl(res.data.embed_url))
      .catch(() => toast.error("TMS tokenini olishda xatolik"))
      .finally(() => setLoading(false))
  }, [open])

  // Listen for postMessage from TMS iframe.
  // - exact-origin string match (substring match would let evil-tms.example.com
  //   pass; parsing event.origin would throw on opaque "null" senders)
  // - Zod parse on payload (iframe may be compromised; never trust shape)
  const handleMessage = useCallback(
    (event: MessageEvent<unknown>) => {
      if (event.origin !== TMS_ORIGIN) return
      const parsed = tmsTestMessageSchema.safeParse(event.data)
      if (!parsed.success) return

      onSelect(parsed.data.test_id, parsed.data.title)
      setOpen(false)
      toast.success("Test biriktirildi")
    },
    [onSelect],
  )

  useEffect(() => {
    if (!open) return
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [open, handleMessage])

  // Current test display
  if (currentTestId && !open) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 px-3 py-2 rounded-md border bg-accent/30 text-sm">
          <span className="text-muted-foreground">Test: </span>
          <span className="font-medium">{currentTestTitle || `#${currentTestId}`}</span>
        </div>
        <a
          href={`${TMS.origin}/tests/${currentTestId}/questions`}
          target="_blank"
          rel="noopener noreferrer"
          title="TMS da tahrirlash"
        >
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
        {!disabled && (
          <>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              Almashtirish
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={onRemove}
            >
              <Unlink className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          Test biriktirish
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[70vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle>Test tanlash (TMS)</DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex-1 px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : embedUrl ? (
            <iframe
              ref={iframeRef}
              src={embedUrl}
              sandbox="allow-same-origin allow-scripts allow-forms"
              className="w-full h-full rounded-md border"
              title="TMS Test Picker"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              TMS ga ulanib bo'lmadi
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
