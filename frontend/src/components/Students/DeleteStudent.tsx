import { useMutation, useQueryClient } from "@tanstack/react-query"
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

interface DeleteStudentProps {
  student: StudentRead
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteStudent({ student, open, onOpenChange }: DeleteStudentProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: () => studentsApi.delete(student.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students })
      showSuccessToast("O'quvchi muvaffaqiyatli o'chirildi")
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      showErrorToast(extractErrorMessage(error, "O'quvchi o'chirishda xatolik yuz berdi"))
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>O'quvchini o'chirish</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{student.full_name}</strong> ni o'chirishni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
