import { useEffect, useState } from "react";
import type { User } from "@/feature/user/types/user";
import { apiUrl } from "@/shared/lib/backend-url";
import { AuthContext } from "./auth-context";

function processUserData(user: User) {
  return {
    ...user,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("jwt")
  );
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(() => token !== null);

  const fetchUserProfile = (authToken: string) =>
    fetch(apiUrl("/api/v1/me"), {
      headers: { Authorization: `Bearer ${authToken}` },
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error("AUTH_CHECK_FAILED");
      }

      return (await res.json()) as User;
    });

  const clearSession = () => {
    localStorage.removeItem("jwt");
    setToken(null);
    setUser(null);
    setIsLoading(false);
  };

  useEffect(() => {
    let clearSessionTimeout: number | null = null;
    let isMounted = true;

    if (token) {
      fetchUserProfile(token)
        .then((userData) => {
          if (!isMounted) return;
          setUser(processUserData(userData));
          setIsLoading(false);
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error("Auth check failed:", err);
          setIsLoading(false);
          clearSessionTimeout = window.setTimeout(() => {
            if (!isMounted) return;
            clearSession();
          }, 500);
        });
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
      if (clearSessionTimeout !== null) {
        window.clearTimeout(clearSessionTimeout);
      }
    };
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem("jwt", newToken);
    setToken(newToken);
    setIsLoading(true);
    fetchUserProfile(newToken)
      .then((userData) => {
        setUser(processUserData(userData));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Profile load failed after login:", err);
        clearSession();
      });
  };

  const logout = () => {
    clearSession();
  };

  const refreshUser = async (): Promise<User | null> => {
    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const userData = await fetchUserProfile(token);
      const processedUser = processUserData(userData);
      setUser(processedUser);
      return processedUser;
    } catch (err) {
      console.error("Profile refresh failed:", err);
      clearSession();
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
