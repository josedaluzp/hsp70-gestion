// Bridge between the Auth0 React SDK (hook-based) and the non-React API client.
// AuthProvider registers Auth0's getAccessTokenSilently here on mount.

type TokenGetter = () => Promise<string>

let getter: TokenGetter | null = null

export function setAccessTokenGetter(fn: TokenGetter): void {
  getter = fn
}

export async function getAccessToken(): Promise<string | null> {
  if (!getter) return null
  try {
    return await getter()
  } catch {
    return null
  }
}
