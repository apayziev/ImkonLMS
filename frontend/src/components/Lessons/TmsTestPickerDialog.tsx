/**
 * TmsTestPickerDialog — iframe-based TMS test picker for homework integration.
 *
 * Flow:
 * 1. On open: LMS backend calls TMS to get embed token
 * 2. TMS test picker is loaded in iframe
 * 3. Teacher selects a test → TMS sends postMessage
 * 4. Dialog calls onSelect with { test_id, title }
 */
import { ExternalLink, Loader2, Unlink } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TMS } from "@/config"
import { tmsApi } from "@/lib/api"

interface TmsTestPickerDialogProps {
  currentTestId: number | null
  currentTestTitle: string | null
  disabled: boolean
  onSelect: (testId: number, title: string) => void
  onRemove: () => void
}

interface TmsTestMessage {
  type: "tms-test-selected"
  test_id: number
  title: string
}

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

  // Listen for postMessage from TMS iframe
  const handleMessage = useCallback(
    (event: MessageEvent<TmsTestMessage>) => {
      // Strict origin check — substring match would let attacker spoof
      // origins like "https://tms.example.com.evil.com".
      if (event.origin !== TMS.origin) return
      if (event.data?.type !== "tms-test-selected") return

      onSelect(event.data.test_id, event.data.title)
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
          <span className="font-medium">
            {currentTestTitle || `#${currentTestId}`}
          </span>
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
