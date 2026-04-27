/**
 * In-memory access-token store (XSS-resistant).
 *
 * Refresh tokens live in an httpOnly cookie set by the backend; we never touch them
 * from JS. Access tokens stay in this module and are wiped on tab close. On reload
 * the app calls `silentRefresh()` to mint a fresh access token from the cookie.
 *
 * Two scopes — admin (default) and parent — because the parent portal lives on a
 * different subdomain with its own cookie.
 */

export type TokenScope = "admin" | "parent"

const tokens: Record<TokenScope, string | null> = {
  admin: null,
  parent: null,
}

export const tokenStore = {
  get(scope: TokenScope): string | null {
    return tokens[scope]
  },
  set(scope: TokenScope, token: string | null): void {
    tokens[scope] = token
  },
  clear(scope?: TokenScope): void {
    if (scope) {
      tokens[scope] = null
    } else {
      tokens.admin = null
      tokens.parent = null
    }
  },
}
