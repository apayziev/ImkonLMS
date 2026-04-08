export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t text-center text-sm text-muted-foreground py-4">
      © {currentYear} IMKON Liderlar Maktabi. Barcha huquqlar himoyalangan.
    </footer>
  )
}
