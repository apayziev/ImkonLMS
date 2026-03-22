import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type GradeRead, extractErrorMessage, gradesApi } from "@/lib/api"
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

interface DeleteGradeProps {
  grade: GradeRead
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteGrade({ grade, open, onOpenChange }: DeleteGradeProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const gradeName =
    grade.level === 0 ? "Bog'cha" : `${grade.level}-sinf ${grade.section}`

  const mutation = useMutation({
    mutationFn: () => gradesApi.delete(grade.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] })
      showSuccessToast("Sinf muvaffaqiyatli o'chirildi")
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      showErrorToast(extractErrorMessage(error, "Sinf o'chirishda xatolik yuz berdi"))
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sinfni o'chirish</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{gradeName}</strong> sinfini o'chirmoqchimisiz? Bu amalni
            qaytarib bo'lmaydi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
