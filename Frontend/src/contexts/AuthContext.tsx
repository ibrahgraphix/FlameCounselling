import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "@/components/ui/sonner";
import { setAuthToken } from "@/services/api";

const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string) ||
  "https://flamestudentcouncil.in:5050";

export type User = {
  id: number;
  name: string;
  email: string;
  role: string; // keep flexible, we'll compare to 'admin' or 'counselor' as strings
  avatar?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<boolean>;
  isAdmin: () => boolean;
  // NEW: centralized Google login helper (returns true on success)
  googleLogin: (idToken: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => false,
  register: async () => false,
  logout: () => {},
  forgotPassword: async () => false,
  isAdmin: () => false,
  googleLogin: async () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage (persisted session)
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("mindease_user");
      // Look for token in either 'token' (new) or 'mindease_token' (legacy)
      const persistedToken =
        localStorage.getItem("token") || localStorage.getItem("mindease_token");
      if (storedUser && persistedToken) {
        const parsed = JSON.parse(storedUser) as User;
        setUser(parsed);
        // ensure our api instance has the Authorization header
        setAuthToken(persistedToken);
      } else {
        // if no valid session, ensure api has no token set
        setAuthToken(null);
      }
    } catch (error) {
      console.error("Auth init error:", error);
      localStorage.removeItem("mindease_user");
      localStorage.removeItem("token");
      localStorage.removeItem("mindease_token");
    } finally {
      setLoading(false);
    }
  }, []);

  // Login: call backend /api/auth/login and store token + user
  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        email,
        password,
      });
      const { token, counselor } = res.data;

      // IMPORTANT: use the role provided by the backend (counselor.role)
      const loggedUser: User = {
        id: counselor.id,
        name: counselor.name,
        email: counselor.email,
        role: (counselor.role as string) ?? "counselor",
      };

      // persist token + user and set headers (both global and api instance)
      try {
        // save under the key `token` which api.ts expects
        localStorage.setItem("token", token);
        setAuthToken(token);
      } catch (e) {
        console.warn("Could not persist token:", e);
      }

      localStorage.setItem("mindease_user", JSON.stringify(loggedUser));
      // also set global axios header for any code using the global axios instance
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setUser(loggedUser);
      toast.success(`Welcome back, ${loggedUser.name}!`);
      return true;
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.response) {
        if (err.response.status === 404) {
          toast.error("Email not found");
        } else if (err.response.status === 401) {
          toast.error("Password incorrect");
        } else {
          toast.error(err.response.data?.message || "Server error. Try again.");
        }
      } else {
        toast.error("Network error. Check your connection.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/register`, {
        name,
        email,
        password,
      });
      const { token, counselor } = res.data;
      const newUser: User = {
        id: counselor.id,
        name: counselor.name,
        email: counselor.email,
        role: (counselor.role as string) ?? "user",
      };

      try {
        localStorage.setItem("token", token);
        setAuthToken(token);
      } catch (e) {
        console.warn("Could not persist token:", e);
      }
      localStorage.setItem("mindease_user", JSON.stringify(newUser));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(newUser);
      toast.success("Registration successful!");
      return true;
    } catch (err: any) {
      console.error("Register error:", err);
      if (err.response && err.response.data?.message)
        toast.error(err.response.data.message);
      else toast.error("Registration failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mindease_user");
    localStorage.removeItem("token");
    localStorage.removeItem("mindease_token");
    delete axios.defaults.headers.common["Authorization"];
    setAuthToken(null);
    toast.info("You've been logged out");
  };

  const forgotPassword = async (email: string): Promise<boolean> => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/auth/forgot-password`, { email });
      toast.success("Password reset link sent to your email");
      return true;
    } catch (err: any) {
      console.error("Forgot password error:", err);
      if (err.response && err.response.status === 404) {
        toast.error("Email not found");
        return false;
      }
      toast.error("Failed to send reset link");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () => {
    if (!user) return false;
    const role = String(user.role).toLowerCase();
    return role === "admin" || role === "counselor";
  };

  const googleLogin = async (idToken: string): Promise<boolean> => {
    setLoading(true);
    try {
      const resp = await axios.post(`${API_BASE}/api/auth/google`, {
        id_token: idToken,
      });

      // Some servers may respond with success flag + data
      const data = resp?.data ?? {};
      if (!data?.success) {
        toast.error(data?.message || "Google sign-in failed");
        return false;
      }

      const { token, counselor } = data;
      if (!token || !counselor) {
        toast.error("Invalid server response for Google sign-in");
        return false;
      }

      // Only accept counselor/admin roles (safety check)
      const role = (counselor.role ?? "").toString().toLowerCase();
      if (role !== "counselor" && role !== "admin") {
        toast.error("You are not authorized to access the counselor dashboard");
        return false;
      }

      // persist token + user and set headers
      try {
        localStorage.setItem("token", token);
        setAuthToken(token);
      } catch (e) {
        console.warn("Could not persist token:", e);
      }

      const loggedUser: User = {
        id: counselor.id,
        name: counselor.name,
        email: counselor.email,
        role: role,
      };
      localStorage.setItem("mindease_user", JSON.stringify(loggedUser));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setUser(loggedUser);
      toast.success(`Welcome, ${loggedUser.name || "Counselor"}!`);
      return true;
    } catch (err: any) {
      console.error("googleLogin error:", err);
      // If backend returned an explicit 403 message, surface it
      if (err?.response?.status === 403) {
        const msg =
          err.response.data?.message ??
          "Not authorized: this account is not registered as counselor/admin";
        toast.error(msg);
        return false;
      }
      if (err?.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Google sign-in failed. Try again later.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        forgotPassword,
        isAdmin,
        googleLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
