import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert("Đăng ký thành công! Bạn có thể đăng nhập ngay.");
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
      <div className="login-box">
        <h2>{isSignUp ? "Đăng Ký" : "Đăng Nhập"}</h2>
        <p className="login-subtitle">Cloud-Synced Study Planner</p>

        {error && <div className="error-message">{error}</div>}

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

          <button type="submit" disabled={loading} className="primary-btn">
            {loading
              ? "Đang xử lý..."
              : isSignUp
                ? "Tạo tài khoản"
                : "Đăng nhập"}
          </button>
        </form>

        <p className="switch-auth">
          {isSignUp ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-btn"
          >
            {isSignUp ? "Đăng nhập" : "Đăng ký ngay"}
          </button>
        </p>
      </div>
    </div>
  );
};
