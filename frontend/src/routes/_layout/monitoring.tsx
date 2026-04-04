import { createFileRoute } from "@tanstack/react-router"
import { Activity } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AttendanceTab, TeacherStatsTab } from "@/components/Monitoring"

export const Route = createFileRoute("/_layout/monitoring")({
  component: MonitoringPage,
  head: () => ({
    meta: [{ title: "Monitoring - IMKON LMS" }],
  }),
})

function MonitoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Monitoring
        </h1>
        <p className="text-muted-foreground text-sm">
          O'quvchilar va o'qituvchilar faoliyatini kuzatish
        </p>
      </div>

      <Tabs defaultValue="students" className="w-full">
        <TabsList>
          <TabsTrigger value="students">O'quvchilar</TabsTrigger>
          <TabsTrigger value="teachers">O'qituvchilar</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="pt-2">
          <AttendanceTab />
        </TabsContent>

        <TabsContent value="teachers" className="pt-2">
          <TeacherStatsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
