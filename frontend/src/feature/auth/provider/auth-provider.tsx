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
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("jwt");
    let clearSessionTimeout: number | null = null;
    let isMounted = true;

    if (stored) {
      setToken(stored);
      fetch(apiUrl("/api/v1/me"), {
        headers: { Authorization: `Bearer ${stored}` },
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
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
      if (clearSessionTimeout !== null) {
        window.clearTimeout(clearSessionTimeout);
      }
    };
  }, []);

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
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
