import { Link } from "@tanstack/react-router"
import { cn } from "@/lib/utils"

const logoWhite = "/images/logo/imkon-logo-white-red.png"
const logoIcon = "/images/icons/red-icon.png"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
  linkTo?: string
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
  linkTo = "/",
}: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        <img
          src={logoWhite}
          alt="IMKON"
          className={cn(
            "h-16 w-auto group-data-[collapsible=icon]:hidden",
            className,
          )}
        />
        <img
          src={logoIcon}
          alt="IMKON"
          className={cn(
            "h-8 w-8 hidden group-data-[collapsible=icon]:block",
            className,
          )}
        />
      </>
    ) : variant === "icon" ? (
      <img src={logoIcon} alt="IMKON" className={cn("h-8 w-8", className)} />
    ) : (
      <img src={logoWhite} alt="IMKON" className={cn("w-auto", className)} />
    )

  if (!asLink) return content

  return <Link to={linkTo}>{content}</Link>
}
