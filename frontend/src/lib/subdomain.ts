const PARENT_HOSTNAME = import.meta.env.VITE_PARENT_HOSTNAME || "parent.imkonschool.uz"

export const isParentDomain = () =>
  window.location.hostname === PARENT_HOSTNAME
