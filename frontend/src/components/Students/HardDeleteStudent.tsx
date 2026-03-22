import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle } from "lucide-react"

import type { StudentRead } from "@/lib/api"
import { extractErrorMessage, studentsApi } from "@/lib/api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import useCustomToast from "@/hooks/useCustomToast"
import { queryKeys } from "@/hooks/useQueryOptions"

interface HardDeleteStudentProps {
  student: StudentRead
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HardDeleteStudent({ student, open, onOpenChange }: HardDeleteStudentProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: () => studentsApi.hardDelete(student.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students })
      queryClient.invalidateQueries({ queryKey: ["deleted-students"] })
      showSuccessToast("O'quvchi bazadan butunlay o'chirildi")
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      showErrorToast(extractErrorMessage(error, "O'quvchini o'chirishda xatolik yuz berdi"))
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Ogohlantirish!
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                <strong>{student.last_name} {student.first_name}</strong> o'quvchisini{" "}
                <strong>bazadan butunlay o'chirmoqchimisiz?</strong>
              </p>
              <p className="text-red-600 font-medium">
                Bu amal qaytarib bo'lmaydi! O'quvchi bazadan butunlay o'chib ketadi.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "O'chirilmoqda..." : "Ha, butunlay o'chirish"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
