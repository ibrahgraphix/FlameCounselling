// src/pages/Login.tsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import axios from "axios";
import { setAuthToken } from "@/services/api";
import { toast } from "@/components/ui/sonner";
import { useDetectDarkMode } from "@/components/ui/card";

declare global {
  interface Window {
    google?: any;
    __googleScriptInjected__?: boolean;
  }
}

// ADD THIS AS BACKEND URL https://c22d755b01d1a5.lhr.life
// front end http://192.168.8.10:7070
const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string) ||
  "https://c22d755b01d1a5.lhr.life";
const VITE_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as
  | string
  | undefined;

// Theme constants
const PRIMARY = "#1e3a8a";
const SECONDARY = "#3b82f6";
const GRADIENT = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";

const Login: React.FC = () => {
  const isDark = useDetectDarkMode();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [googleInitError, setGoogleInitError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const success = await login(email, password);
      if (success) {
        navigate("/admin", { replace: true });
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) {
      toast.error("Google sign-in failed");
      return;
    }
    const idToken = response.credential;
    try {
      const resp = await axios.post(`${API_BASE}/api/auth/google`, {
        id_token: idToken,
      });
      if (!resp?.data?.success) {
        toast.error("Google sign-in failed on server");
        return;
      }

      const { token, counselor } = resp.data;
      if (!token || !counselor) {
        toast.error("Invalid server response for Google sign-in");
        return;
      }

      try {
        localStorage.setItem("token", token);
        setAuthToken(token);
      } catch (e) {
        console.warn("Could not persist token:", e);
      }

      const loggedUser = {
        id: counselor.id,
        name: counselor.name,
        email: counselor.email,
        role: counselor.role ?? "counselor",
      };
      localStorage.setItem("mindease_user", JSON.stringify(loggedUser));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      toast.success(`Welcome, ${loggedUser.name || "Counselor"}!`);
      window.location.href = "/admin";
    } catch (err: any) {
      console.error("Google signin backend error:", err);
      toast.error(err?.response?.data?.message || "Google sign-in failed");
    }
  };

  const injectGoogleScript = () => {
    if (typeof window === "undefined") return;
    if (window.__googleScriptInjected__) return;

    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      console.warn("Failed to load Google Identity Services script");
      setGoogleInitError("Failed to load Google script");
    };
    document.head.appendChild(s);
    window.__googleScriptInjected__ = true;
  };

  useEffect(() => {
    if (!VITE_GOOGLE_CLIENT_ID) {
      setGoogleInitError(
        "Google Client ID not configured (set VITE_GOOGLE_CLIENT_ID)"
      );
      return;
    }

    let cancelled = false;
    injectGoogleScript();

    const maxWaitMs = 8000;
    const intervalMs = 200;
    let waited = 0;

    const tryInit = () => {
      if (cancelled) return;

      if (typeof window !== "undefined" && window.google?.accounts) {
        try {
          try {
            window.google.accounts.id.initialize({
              client_id: VITE_GOOGLE_CLIENT_ID,
              callback: handleGoogleCredentialResponse,
            });
          } catch (e) {
            // already initialized maybe
            console.debug("google.accounts.id.initialize already called:", e);
          }

          if (googleButtonRef.current) {
            try {
              window.google.accounts.id.renderButton(googleButtonRef.current, {
                theme: "outline",
                size: "large",
                shape: "rectangular",
                width: "100%",
                text: "signin_with",
                type: "standard",
                logo_alignment: "left",
              });
              setGoogleReady(true);
              setGoogleInitError(null);
            } catch (err) {
              console.error("renderButton error:", err);
              setGoogleInitError("Could not render Google button");
            }
          } else {
            setGoogleReady(true);
            setGoogleInitError("Button container missing");
          }
        } catch (err) {
          console.error("Error initializing Google IDS:", err);
          setGoogleInitError("Google initialization error");
        }
        return;
      }

      waited += intervalMs;
      if (waited >= maxWaitMs) {
        setGoogleInitError("Google Identity Services not available");
        return;
      }
      setTimeout(tryInit, intervalMs);
    };

    tryInit();
    return () => {
      cancelled = true;
    };
  }, []);

  const onManualGoogleClick = () => {
    if (typeof window === "undefined") return;
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch (err) {
        console.error("google prompt failed:", err);
        toast.error("Google sign-in currently unavailable");
      }
    } else {
      toast.error("Google sign-in not initialized. Check console for errors.");
    }
  };

  const bgColor = isDark ? "bg-gray-900" : "bg-white";
  const cardBg = isDark ? "bg-gray-800" : "bg-white";
  const textColor = isDark ? "text-gray-300" : "text-gray-700";
  const mutedText = isDark ? "text-gray-500" : "text-gray-600";
  const errorBg = isDark
    ? "bg-red-900/20 border-red-800 text-red-300"
    : "bg-red-100 border-red-300 text-red-700";
  const errorBorder = isDark ? "border-red-800" : "border-red-300";

  // Scoped CSS fixes for the rendered Google button to avoid "two-layer" look.
  // We keep this small and targeted — overrides only the GSI classes we need.
  const googleCssOverrides = `
    /* container wrapper - align and ensure full width */
    .mindease-google-wrapper { width: 100%; display: flex; align-items: center; }

    /* The GSI button uses .g_id_signin on the outer control. Tidy its appearance. */
    .mindease-google-wrapper .g_id_signin {
      box-shadow: 0 2px 10px rgba(16,24,40,0.06) !important;
      border: 1px solid rgba(0,0,0,0.06) !important;
      border-radius: 0.5rem !important;
      background: #ffffff !important;
      height: 44px !important;
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 12px !important;
      overflow: visible !important;
    }

    /* Make sure the logo is aligned and scale is consistent */
    .mindease-google-wrapper .g_id_signin svg { height: 18px !important; width: 18px !important; margin-right: 10px !important; }

    /* Improve label weight */
    .mindease-google-wrapper .g_id_signin span { font-weight: 600 !important; color: rgba(0,0,0,0.85) !important; }

    /* prevent parent from showing duplicate border/shadow */
    .mindease-google-outer { border: none !important; box-shadow: none !important; background: transparent !important; padding: 0 !important; }
  `;

  return (
    <div
      className={`h-screen w-screen flex items-center justify-center p-4 ${bgColor}`}
      style={{ background: GRADIENT }}
    >
      {/* inject the small scoped overrides */}
      <style>{googleCssOverrides}</style>

      <div className="w-full max-w-sm">
        <Card
          className={`border shadow-xl rounded-3xl ${cardBg} w-full border-gray-200 dark:border-gray-700`}
          style={{
            borderRadius: "1.5rem",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: "500px",
          }}
        >
          {/* header */}
          <CardHeader className="py-6 px-6 flex-shrink-0">
            <div className="flex flex-col items-center justify-center">
              <img
                src="/Assets/FLAME.png"
                alt="FLAME Logo"
                className="h-24 w-24 object-contain mb-4"
              />
              <div
                style={{ color: "#000000" }}
                className="text-3xl font-bold leading-tight text-center mb-2"
              >
                FlameCounseling
              </div>
              <div className={`text-base ${mutedText} text-center`}>
                Please Enter your credentials
              </div>
            </div>
          </CardHeader>

          {/* content: make this a full-height flex column so inner parts stretch */}
          <CardContent
            className="flex-1 px-6 pb-6 pt-0"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "1.25rem",
            }}
          >
            {/* form area - let it grow to fill vertical space */}
            <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
              {error && (
                <div
                  className={`p-3 rounded-2xl border ${errorBg} ${errorBorder} text-sm shadow-sm`}
                  role="alert"
                >
                  <div className="flex items-center">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className={`text-base ${textColor}`}>
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-lg h-12"
                  style={{ borderColor: "rgba(0,0,0,0.08)" }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className={`text-base ${textColor}`}>
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-lg h-12"
                  style={{ borderColor: "rgba(0,0,0,0.08)" }}
                />
              </div>

              <div>
                <Button
                  type="submit"
                  className="w-full rounded-lg text-white h-12 font-medium"
                  style={{
                    background: GRADIENT,
                    boxShadow: "0 4px 12px rgba(16,78,150,0.12)",
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </div>

              {/* divider */}
              <div className="flex items-center gap-2 my-0">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  or
                </div>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* ===== Google area (Styled) ===== */}
              <div className="w-full">
                {/* outer wrapper - remove outer chrome so the GSI button looks like one layer */}
                <div
                  className="mindease-google-outer"
                  style={{ width: "100%" }}
                >
                  <div
                    className="mindease-google-wrapper"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {/* GSI will render directly into this div.
                        Important: keep padding 0 here so GSI button isn't doubled by container padding. */}
                    <div
                      ref={googleButtonRef}
                      id="google-signin-button"
                      className="w-full"
                      aria-hidden={googleInitError ? "true" : "false"}
                      style={{
                        minHeight: 44,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    />
                  </div>
                </div>

                {/* fallback if GSI fails */}
                {googleInitError && (
                  <div className="mt-3">
                    <button
                      onClick={onManualGoogleClick}
                      className="w-full inline-flex items-center justify-center gap-3 px-4 py-2 h-12 rounded-lg bg-white dark:bg-gray-800 text-neutral-700 dark:text-gray-300 transition-all shadow-sm hover:shadow-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                      aria-label="Sign in with Google (fallback)"
                      type="button"
                    >
                      {/* Google colors icon (kept inline SVG) */}
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          fill="#EA4335"
                          d="M12 10.2v3.6h5.1c-.2 1-.9 2-2 2.8l.0 1.9c2-1.8 3.1-4.6 3.1-8.3 0-.7-.1-1.4-.2-2.1H12z"
                        />
                        <path
                          fill="#34A853"
                          d="M6.3 13.1c-.3-1-.3-2 .0-2.9l-1.9-1.5C2.9 9.9 2.5 11.4 2.5 13.1s.5 3.1 1.9 4.4l1.9-1.4z"
                        />
                        <path
                          fill="#4A90E2"
                          d="M12 22c2.6 0 4.8-.9 6.4-2.6l-3-2.3c-.8.6-1.8 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1L3.5 16.8C4.7 19.8 8.1 22 12 22z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M19.9 2.4L12 9.8l-2.5-2.1C11 6.9 11.9 6.6 12.9 6.6c1.5 0 2.9.6 3.9 1.9l3.1-3.6z"
                        />
                      </svg>

                      <span className="text-sm font-medium">
                        Sign in with Google
                      </span>
                    </button>

                    <div className="mt-2 text-xs text-red-500 text-center">
                      Google Sign-in not available: {googleInitError}
                    </div>
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
