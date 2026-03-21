import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"

export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center flex-col p-4">
      <div className="flex flex-col items-center justify-center p-4">
        <span className="text-6xl md:text-8xl font-bold leading-none mb-4">404</span>
        <span className="text-2xl font-bold mb-2">Afsuski!</span>
      </div>
      <p className="text-lg text-muted-foreground mb-4 text-center">
        Siz qidirayotgan sahifa topilmadi.
      </p>
      <Link to="/">
        <Button className="mt-4">Orqaga qaytish</Button>
      </Link>
    </div>
  )
}
