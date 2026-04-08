import { Link, useRouter } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"

interface ErrorComponentProps {
  error?: Error | unknown
  homePath?: string
}

export function ErrorComponent({ error, homePath = "/" }: ErrorComponentProps) {
  const router = useRouter()
  const errorMessage = error instanceof Error ? error.message : undefined

  return (
    <div className="flex min-h-screen items-center justify-center flex-col p-4">
      <div className="flex flex-col items-center justify-center p-4">
        <span className="text-6xl md:text-8xl font-bold leading-none mb-4">Xatolik</span>
        <span className="text-2xl font-bold mb-2">Afsuski!</span>
      </div>
      <p className="text-lg text-muted-foreground mb-4 text-center">
        {errorMessage || "Nimadir xato ketdi. Iltimos, qaytadan urinib ko'ring."}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.invalidate()}>
          Qayta urinish
        </Button>
        <Link to={homePath}>
          <Button>Bosh sahifaga</Button>
        </Link>
      </div>
    </div>
  )
}
