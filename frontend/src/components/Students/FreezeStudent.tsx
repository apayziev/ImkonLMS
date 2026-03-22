import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Snowflake } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import type { StudentRead } from "@/lib/api"
import { extractErrorMessage, studentsApi } from "@/lib/api"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/ui/loading-button"
import { Textarea } from "@/components/ui/textarea"
import { queryKeys } from "@/hooks/useQueryOptions"

interface FreezeStudentProps {
  student: StudentRead
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FreezeStudent({ student, open, onOpenChange }: FreezeStudentProps) {
  const [reason, setReason] = useState("")
  const [departureDate, setDepartureDate] = useState("")
  const queryClient = useQueryClient()

  const freezeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await studentsApi.freeze(student.id, {
        reason: reason.trim() || null,
        departure_date: departureDate || null,
      })
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: queryKeys.students })
      queryClient.invalidateQueries({ queryKey: ["deleted-students"] })
      onOpenChange(false)
      setReason("")
      setDepartureDate("")
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, "Muzlatishda xatolik yuz berdi"))
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-blue-500" />
            O'quvchini muzlatish
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{student.full_name}</strong> ni muzlatmoqchimisiz?
            <br />
            <br />
            Muzlatilgan o'quvchi:
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>Faol o'quvchilar ro'yxatida ko'rinmaydi</li>
              <li>Keyinchalik qayta faollashtirilishi mumkin</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Maktabdan ketgan sana</Label>
            <DatePicker
              value={departureDate}
              onChange={(date) => setDepartureDate(date ? date.toISOString().split("T")[0] : "")}
            />
          </div>
          <div className="space-y-2">
            <Label>Sababi (ixtiyoriy)</Label>
            <Textarea
              placeholder="Masalan: Boshqa maktabga o'tdi, oilaviy sabab..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <LoadingButton
            onClick={() => freezeMutation.mutate()}
            loading={freezeMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Snowflake className="mr-2 h-4 w-4" />
            Muzlatish
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface UnfreezeStudentProps {
  student: StudentRead
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UnfreezeStudent({ student, open, onOpenChange }: UnfreezeStudentProps) {
  const today = new Date().toISOString().split("T")[0]
  const [returnDate, setReturnDate] = useState(today)
  const queryClient = useQueryClient()

  const monthNames = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
  ]

  const getPaymentStartMonth = (dateStr: string) => {
    const d = new Date(dateStr)
    if (d.getDate() <= 15) {
      return monthNames[d.getMonth()]
    }
    const nextMonth = d.getMonth() === 11 ? 0 : d.getMonth() + 1
    return monthNames[nextMonth]
  }

  const unfreezeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await studentsApi.unfreeze(student.id, {
        return_date: returnDate || today,
      })
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: queryKeys.students })
      onOpenChange(false)
      setReturnDate(today)
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, "Faollashtirishda xatolik yuz berdi"))
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-green-500" />
            O'quvchini faollashtirish
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{student.full_name}</strong> ni qayta faollashtirilsinmi?
          </AlertDialogDescription>
        </AlertDialogHeader>

        {(student.frozen_at || student.frozen_reason || student.departure_date) && (
          <div className="rounded-md bg-muted p-3 space-y-2 text-sm">
            {student.frozen_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Muzlatilgan sana:</span>
                <span className="font-medium">{new Date(student.frozen_at).toLocaleDateString("uz-UZ")}</span>
              </div>
            )}
            {student.departure_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ketgan sana:</span>
                <span className="font-medium">{new Date(student.departure_date).toLocaleDateString("uz-UZ")}</span>
              </div>
            )}
            {student.frozen_reason && (
              <div>
                <span className="text-muted-foreground">Sababi:</span>
                <p className="mt-1">{student.frozen_reason}</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Maktabga qaytib kelgan sana</Label>
          <DatePicker
            value={returnDate}
            onChange={(date) => setReturnDate(date ? date.toISOString().split("T")[0] : "")}
          />
          {returnDate && (
            <p className="text-sm text-muted-foreground">
              To'lov <strong className="text-green-600">{getPaymentStartMonth(returnDate)}</strong> oyidan boshlanadi
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Agar oy boshida (1-15 kunlari) qaytsa - shu oydan, oy oxirida (16+) qaytsa - keyingi oydan
          </p>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <LoadingButton
            onClick={() => unfreezeMutation.mutate()}
            loading={unfreezeMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            Faollashtirish
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
