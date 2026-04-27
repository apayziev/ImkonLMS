/**
 * In-memory access-token store (XSS-resistant).
 *
 * Refresh tokens live in an httpOnly cookie set by the backend; we never touch
 * them from JS. Access tokens stay in this module and are wiped on tab close.
 * On reload `silentRefresh()` mints a fresh access token from the cookie.
 *
 * Two scopes — admin and parent — because the parent portal lives on a
 * different subdomain with its own cookie.
 */

export type TokenScope = "admin" | "parent"

let admin: string | null = null
let parent: string | null = null

export const tokenStore = {
  get: (scope: TokenScope) => (scope === "admin" ? admin : parent),
  set: (scope: TokenScope, token: string | null) => {
    if (scope === "admin") admin = token
    else parent = token
  },
  clear: (scope?: TokenScope) => {
    if (scope === undefined || scope === "admin") admin = null
    if (scope === undefined || scope === "parent") parent = null
  },
}
