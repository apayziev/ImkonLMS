import type { Control, FieldValues, Path } from "react-hook-form"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

interface ParentInfoSectionProps<T extends FieldValues> {
  control: Control<T>
  type: "father" | "mother"
}

const parentConfig = {
  father: {
    title: "Otasi ma'lumotlari",
    lastNameField: "father_last_name" as const,
    firstNameField: "father_first_name" as const,
    phoneField: "father_phone" as const,
    lastNamePlaceholder: "Karimov",
    firstNamePlaceholder: "Vali",
  },
  mother: {
    title: "Onasi ma'lumotlari",
    lastNameField: "mother_last_name" as const,
    firstNameField: "mother_first_name" as const,
    phoneField: "mother_phone" as const,
    lastNamePlaceholder: "Karimova",
    firstNamePlaceholder: "Malika",
  },
}

export function ParentInfoSection<T extends FieldValues>({
  control,
  type,
}: ParentInfoSectionProps<T>) {
  const config = parentConfig[type]

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h4 className="font-medium text-sm">{config.title}</h4>

      <div className="grid gap-4 grid-cols-2">
        <FormField
          control={control}
          name={config.lastNameField as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Familiya</FormLabel>
              <FormControl>
                <Input
                  placeholder={config.lastNamePlaceholder}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={config.firstNameField as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ism</FormLabel>
              <FormControl>
                <Input
                  placeholder={config.firstNamePlaceholder}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name={config.phoneField as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Telefon</FormLabel>
            <FormControl>
              <Input
                placeholder="+998901234567"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
