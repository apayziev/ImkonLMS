import {
  Calendar,
  GraduationCap,
  MapPin,
  Phone,
  Snowflake,
  User,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { StudentRead } from "@/lib/api"
import { formatDate, getInitials } from "@/lib/utils"
import { getPhotoUrl } from "./studentSchema"

interface StudentDetailDrawerProps {
  student: StudentRead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  gradeName?: string
}

export function StudentDetailDrawer({
  student,
  open,
  onOpenChange,
  gradeName,
}: StudentDetailDrawerProps) {
  if (!student) return null

  const getStatusBadge = () => {
    if (student.is_frozen) {
      return (
        <Badge className="bg-blue-500/20 text-blue-600 gap-1">
          <Snowflake className="h-3 w-3" />
          Muzlatilgan
        </Badge>
      )
    }
    return (
      <Badge variant={student.is_active ? "default" : "destructive"}>
        {student.is_active ? "Faol" : "Nofaol"}
      </Badge>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={getPhotoUrl(student.photo_url)}
                alt={student.full_name}
              />
              <AvatarFallback className="bg-[#6720FF] text-white text-2xl">
                {getInitials(student.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-xl">{student.full_name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                {gradeName && (
                  <Badge variant="secondary" className="gap-1">
                    <GraduationCap className="h-3 w-3" />
                    {gradeName}
                  </Badge>
                )}
                {getStatusBadge()}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Shaxsiy ma'lumotlar */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Shaxsiy ma'lumotlar
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Hujjat raqami
                </span>
                <span className="text-sm font-mono">{student.document_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Jinsi</span>
                <span className="text-sm">
                  {student.gender === "male"
                    ? "O'g'il"
                    : student.gender === "female"
                      ? "Qiz"
                      : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Tug'ilgan sana
                </span>
                <span className="text-sm">
                  {formatDate(student.birth_date)}
                </span>
              </div>
              {student.phone_number && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Telefon</span>
                  <a
                    href={`tel:${student.phone_number}`}
                    className="text-sm text-[#6720FF] hover:underline"
                  >
                    {student.phone_number}
                  </a>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Ota-ona ma'lumotlari */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Ota-ona ma'lumotlari
            </h4>
            <div className="space-y-3">
              {(student.father_first_name || student.father_last_name) && (
                <div className="rounded-lg border p-3 space-y-2">
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Otasi
                  </span>
                  <p className="text-sm font-medium">
                    {[student.father_last_name, student.father_first_name]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                  {student.father_phone && (
                    <a
                      href={`tel:${student.father_phone}`}
                      className="text-sm text-[#6720FF] hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      {student.father_phone}
                    </a>
                  )}
                </div>
              )}

              {(student.mother_first_name || student.mother_last_name) && (
                <div className="rounded-lg border p-3 space-y-2">
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Onasi
                  </span>
                  <p className="text-sm font-medium">
                    {[student.mother_last_name, student.mother_first_name]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                  {student.mother_phone && (
                    <a
                      href={`tel:${student.mother_phone}`}
                      className="text-sm text-[#6720FF] hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      {student.mother_phone}
                    </a>
                  )}
                </div>
              )}

              {!student.father_first_name &&
                !student.father_last_name &&
                !student.mother_first_name &&
                !student.mother_last_name && (
                  <p className="text-sm text-muted-foreground">
                    Ma'lumot kiritilmagan
                  </p>
                )}
            </div>
          </div>

          <Separator />

          {/* Manzil */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Manzil
            </h4>
            <p className="text-sm">
              {student.address || "Ma'lumot kiritilmagan"}
            </p>
          </div>

          <Separator />

          {/* O'qish ma'lumotlari */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              O'qish ma'lumotlari
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Qabul qilingan sana
                </span>
                <span className="text-sm">
                  {formatDate(student.enrollment_date)}
                </span>
              </div>
              {student.is_frozen && (
                <>
                  <Separator />
                  <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                      <Snowflake className="h-4 w-4" />
                      Muzlatilgan
                    </div>
                    {student.frozen_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Muzlatilgan sana
                        </span>
                        <span>{formatDate(student.frozen_at)}</span>
                      </div>
                    )}
                    {student.departure_date && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Ketgan sana
                        </span>
                        <span>{formatDate(student.departure_date)}</span>
                      </div>
                    )}
                    {student.frozen_reason && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Sababi: </span>
                        <span>{student.frozen_reason}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
