import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { AlertTriangle, Clock, MapPin, MessageSquare, Shield, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChildSelector } from "@/components/Common/ChildSelector"
import { useSelectedChild } from "@/hooks/useSelectedChild"
import { parentApi } from "@/lib/api"

export const Route = createFileRoute("/parent/_parent/discipline")({
  component: DisciplinePage,
  head: () => ({
    meta: [{ title: "Intizom - Ota-ona paneli" }],
  }),
})

function DisciplinePage() {
  const { children, selectedChildId, setSelectedChildId } = useSelectedChild()

  const { data, isLoading } = useQuery({
    queryKey: ["parent-discipline-full", selectedChildId],
    queryFn: async () => {
      const { data } = await parentApi.discipline(selectedChildId)
      return data
    },
    enabled: selectedChildId > 0,
  })

  const violations = data?.violations ?? []
  const yellowCards = data?.yellow_cards ?? []
  const totalPoints = data?.total_violation_points ?? 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Intizom</h1>
          <p className="text-muted-foreground text-sm">Qoidabuzarliklar va ogohlantirishlar</p>
        </div>

        <ChildSelector children={children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4 text-center space-y-2">
                  <Skeleton className="h-8 w-16 mx-auto" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 2 }).map((_, j) => (
                  <Skeleton key={j} className="h-16 w-full rounded-lg" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{totalPoints}</p>
                <p className="text-xs text-muted-foreground">Jami ball</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{violations.length}</p>
                <p className="text-xs text-muted-foreground">Qoidabuzarlik</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{yellowCards.length}</p>
                <p className="text-xs text-muted-foreground">Sariq kartochka</p>
              </CardContent>
            </Card>
          </div>

          {/* Yellow cards */}
          {yellowCards.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-5 text-yellow-600" />
                  Sariq kartochkalar ({yellowCards.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {yellowCards.map((yc, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                    <AlertTriangle className="size-5 text-yellow-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{yc.reason || "Sabab ko'rsatilmagan"}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          {yc.issued_by}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(yc.created_at).toLocaleDateString("uz-UZ")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Violations */}
          {violations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="size-5 text-orange-600" />
                  Qoidabuzarliklar ({violations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {violations.map((v, i) => (
                  <div key={i} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm font-medium">{v.violation_type}</p>
                      <Badge variant="secondary">{v.points} ball</Badge>
                    </div>
                    {v.note && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-start gap-1">
                        <MessageSquare className="size-3 mt-0.5 shrink-0" />
                        {v.note}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        {v.reported_by}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(v.occurred_at).toLocaleDateString("uz-UZ")}
                      </span>
                      {v.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {v.location}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Shield className="size-12 mx-auto mb-3 opacity-50" />
                <p>Qoidabuzarlik qayd etilmagan</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
