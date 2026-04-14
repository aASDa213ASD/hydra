import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/feature/auth/hooks/use-auth";

export default function LogoutPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    logout();
    navigate("/", { replace: true });
  }, [logout, navigate]);

  return null;
}
