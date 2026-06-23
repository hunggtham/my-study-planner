import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { useToast } from "../context/ToastContext";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const { showToast } = useToast();
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;
        showToast("Đăng ký thành công! Bạn có thể đăng nhập ngay.", "success");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card
        style={{
          width: "100%",
          maxWidth: "440px",
          animation: "slideUp 0.5s ease backwards",
        }}
      >
        <CardHeader style={{ textAlign: "center", paddingBottom: 0 }}>
          <CardTitle
            style={{
              fontSize: "2rem",
              background: "linear-gradient(to right, #60a5fa, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {isSignUp ? "Đăng Ký" : "Đăng Nhập"}
          </CardTitle>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            Cloud-Synced Study Planner
          </p>
        </CardHeader>
        <CardContent style={{ paddingTop: "2rem" }}>
          {error && (
            <div
              style={{
                background: "var(--danger-bg)",
                color: "var(--danger)",
                padding: "0.75rem",
                borderRadius: "var(--radius-sm)",
                marginBottom: "1.5rem",
                border: "1px solid var(--danger)",
                opacity: 0.8,
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleAuth}>
            <label className="field">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@example.com"
              />
            </label>
            <label className="field">
              Mật khẩu
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Mật khẩu (ít nhất 6 ký tự)"
              />
            </label>

            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              style={{ width: "100%", marginTop: "1rem" }}
            >
              {loading
                ? "Đang xử lý..."
                : isSignUp
                  ? "Tạo tài khoản"
                  : "Đăng nhập"}
            </Button>
          </form>

          <p
            style={{
              marginTop: "1.5rem",
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
              textAlign: "center",
            }}
          >
            {isSignUp ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              style={{ color: "var(--primary)", padding: 0 }}
            >
              {isSignUp ? "Đăng nhập" : "Đăng ký ngay"}
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
