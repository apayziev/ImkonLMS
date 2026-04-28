"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          title: "!text-base !font-semibold",
          description: "!text-sm",
          success: "!bg-[var(--imkon-teal)] !text-white !border-[var(--imkon-teal-dark)]",
          error: "!bg-[var(--imkon-red)] !text-white !border-[var(--imkon-maroon)]",
          warning: "!bg-[var(--imkon-purple)] !text-white !border-[var(--imkon-purple-dark)]",
          info: "!bg-[var(--imkon-purple-dark)] !text-white !border-[var(--imkon-maroon)]",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
