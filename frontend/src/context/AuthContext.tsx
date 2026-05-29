import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { AuthContext, type User } from "./authTypes";
import { setAccessTokenGetter } from "../services/authToken";

export type { User, AuthState } from "./authTypes";
export { AuthContext } from "./authTypes";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    isLoading,
    isAuthenticated,
    getAccessTokenSilently,
    loginWithRedirect,
    logout: auth0Logout,
  } = useAuth0();

  const [user, setUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Register Auth0's token getter for the non-React API client.
  useEffect(() => {
    setAccessTokenGetter(() => getAccessTokenSilently());
  }, [getAccessTokenSilently]);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) {
      setUser(null);
      setProfileLoading(false);
      return;
    }
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setUser(null);
        return;
      }
      setUser(await res.json());
    } catch {
      setUser(null);
    } finally {
      setProfileLoading(false);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    if (!isLoading) refreshUser();
  }, [isLoading, refreshUser]);

  const login = useCallback(() => {
    void loginWithRedirect();
  }, [loginWithRedirect]);

  const signup = useCallback(() => {
    void loginWithRedirect({ authorizationParams: { screen_hint: "signup" } });
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  }, [auth0Logout]);

  const loading = isLoading || profileLoading;

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
