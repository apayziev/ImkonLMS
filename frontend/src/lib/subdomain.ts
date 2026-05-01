const PARENT_HOSTNAME =
  import.meta.env.VITE_PARENT_HOSTNAME || "parent.imkonschool.uz"
const TEACHER_HOSTNAME =
  import.meta.env.VITE_TEACHER_HOSTNAME || "teacher.imkonschool.uz"

export const isParentDomain = () => window.location.hostname === PARENT_HOSTNAME

export const isTeacherDomain = () =>
  window.location.hostname === TEACHER_HOSTNAME
