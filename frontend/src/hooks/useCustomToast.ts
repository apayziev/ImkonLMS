import { toast } from "sonner"

const useCustomToast = () => {
  const showSuccessToast = (description: string) => {
    toast.success("Muvaffaqiyatli!", { description })
  }

  const showErrorToast = (description: string) => {
    toast.error("Xatolik yuz berdi!", { description })
  }

  const showWarningToast = (description: string) => {
    toast.warning("Diqqat!", { description })
  }

  return { showSuccessToast, showErrorToast, showWarningToast }
}

export default useCustomToast
