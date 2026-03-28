import { useMutation } from "@tanstack/react-query"
import { Loader2, Paperclip, Trash2, Upload } from "lucide-react"
import { useRef } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export interface FileItem {
  id: number
  file_url: string
  original_name: string
  file_size: number
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUploadSection({
  files,
  disabled,
  onUpload,
  onDelete,
  label = "Materiallar",
  accept,
  multiple = true,
}: {
  files: FileItem[]
  disabled: boolean
  onUpload: (file: File) => Promise<unknown>
  onDelete: (fileId: number) => Promise<unknown>
  label?: string
  accept?: string
  multiple?: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useMutation({
    mutationFn: onUpload,
    onSuccess: () => toast.success("Fayl yuklandi"),
    onError: () => toast.error("Fayl yuklashda xatolik"),
  })

  const deleteMutation = useMutation({
    mutationFn: onDelete,
    onSuccess: () => toast.success("Fayl o'chirildi"),
    onError: () => toast.error("Fayl o'chirishda xatolik"),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return
    for (const file of Array.from(selected)) {
      uploadMutation.mutate(file)
    }
    e.target.value = ""
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-4 w-4" />
          {label} ({files.length})
        </label>
        {!disabled && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple={multiple}
              accept={accept}
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              Fayl yuklash
            </Button>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
            >
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={m.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate font-medium hover:underline text-primary"
              >
                {m.original_name}
              </a>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatFileSize(m.file_size)}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(m.id)}
                  disabled={deleteMutation.isPending}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="O'chirish"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
