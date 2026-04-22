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

  useEffect(() => {
    let clearSessionTimeout: number | null = null;
    let isMounted = true;

    if (token) {
      fetch(apiUrl("/api/v1/me"), {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error("AUTH_CHECK_FAILED");
          }

          return res.json();
        })
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
            localStorage.removeItem("jwt");
            setToken(null);
            setUser(null);
          }, 500);
        });
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
    fetch(apiUrl("/api/v1/me"), {
      headers: { Authorization: `Bearer ${newToken}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("PROFILE_LOAD_FAILED");
        }

        return res.json();
      })
      .then((userData) => {
        setUser(processUserData(userData));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Profile load failed after login:", err);
        localStorage.removeItem("jwt");
        setToken(null);
        setUser(null);
        setIsLoading(false);
      });
  };

  const logout = () => {
    localStorage.removeItem("jwt");
    setToken(null);
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
