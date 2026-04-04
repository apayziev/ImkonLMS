import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/attendance")({
  beforeLoad: () => {
    throw redirect({ to: "/monitoring" })
  },
  component: () => null,
})
