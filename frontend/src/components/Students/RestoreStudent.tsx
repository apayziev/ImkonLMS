import { useMutation, useQueryClient } from "@tanstack/react-query"
import { RotateCcw } from "lucide-react"

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

interface RestoreStudentProps {
  student: StudentRead
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RestoreStudent({ student, open, onOpenChange }: RestoreStudentProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: () => studentsApi.restore(student.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students })
      queryClient.invalidateQueries({ queryKey: ["deleted-students"] })
      showSuccessToast("O'quvchi muvaffaqiyatli tiklandi")
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      showErrorToast(extractErrorMessage(error, "O'quvchini tiklashda xatolik yuz berdi"))
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-green-600" />
            O'quvchini tiklash
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{student.last_name} {student.first_name}</strong> o'quvchisini tiklashni xohlaysizmi?
            O'quvchi qayta faol holatga o'tkaziladi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            className="bg-green-600 text-white hover:bg-green-700"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Tiklanmoqda..." : "Tiklash"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
