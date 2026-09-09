"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthClient, UserProfile } from "../lib/authClient";
import { AggarlyChatBridgeClient } from "../lib/chatBridgeClient";

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ status: string; mfaToken?: string }>;
  loginWithMfa: (mfaToken: string, totpCode: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    username: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => Promise<void>;
  loginWithOAuth: (token: string, refreshToken?: string, userOverride?: Partial<UserProfile>) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  resendVerificationEmail: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const token = AuthClient.getToken();
    if (!token && !AuthClient.hasValidCredentials()) {
      setUser(null);
      return;
    }
    // 1. Immediately read cached local user to avoid UI flash
    const localUser = AuthClient.getCurrentUser();
    if (localUser) {
      setUser(localUser);
    }
    // 2. Fetch fresh real profile from backend GET /api/v1/users/me
    const backendProfile = await AuthClient.fetchCurrentProfile();
    if (backendProfile) {
      setUser(backendProfile);
    } else {
      // Non-fatal profile fetch failure (e.g. network glitch, server restarting).
      // ONLY set user to null if credentials were confirmed 100% invalid and purged!
      if (!AuthClient.hasValidCredentials()) {
        setUser(null);
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const token = AuthClient.getToken();
        if (!token && !AuthClient.hasValidCredentials()) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        const localUser = AuthClient.getCurrentUser();
        if (localUser) {
          setUser(localUser);
        }

        const backendProfile = await AuthClient.fetchCurrentProfile();
        if (backendProfile) {
          setUser(backendProfile);
        } else {
          // If profile fetch failed, only wipe state if credentials are dead
          if (!AuthClient.hasValidCredentials()) {
            setUser(null);
          }
        }
      } catch (err) {
        console.warn("Auth initialization non-fatal warning (retaining cached credentials):", err);
        if (!AuthClient.hasValidCredentials()) {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // 1. Cross-tab storage event synchronization
    const handleStorage = (e: StorageEvent) => {
      // Detected explicit logout in another tab or window
      if (
        e.key === "aggarly_logout_sync" ||
        (e.key === "aggarly_jwt_token" && !e.newValue)
      ) {
        if (!AuthClient.hasValidCredentials()) {
          setUser(null);
          AggarlyChatBridgeClient.clearSession();
          window.dispatchEvent(new Event("aggarly_auth_cleared"));
        }
        return;
      }
      // Detected login in another tab
      if (e.key === "aggarly_jwt_token" && e.newValue) {
        refreshUser();
      }
    };

    // 2. Cross-tab BroadcastChannel synchronization
    let authChannel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        authChannel = new BroadcastChannel("aggarly_auth_sync");
        authChannel.onmessage = (event) => {
          if (event.data?.type === "AUTH_LOGOUT") {
            setUser(null);
            AggarlyChatBridgeClient.clearSession();
            window.dispatchEvent(new Event("aggarly_auth_cleared"));
          } else if (event.data?.type === "AUTH_LOGIN") {
            refreshUser();
          }
        };
      } catch {}
    }

    const handleAuthCleared = () => {
      setUser(null);
      AggarlyChatBridgeClient.clearSession();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("aggarly_auth_cleared", handleAuthCleared);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("aggarly_auth_cleared", handleAuthCleared);
      authChannel?.close();
    };
  }, []);

  const login = async (email: string, pass: string): Promise<{ status: string; mfaToken?: string }> => {
    const data = await AuthClient.login(email, pass);
    if (data.status === "MFA_REQUIRED") {
      // Return without refreshing user — real JWT not issued yet
      return { status: "MFA_REQUIRED", mfaToken: data.token };
    }
    // AUTH_SUCCESS — token already persisted by AuthClient.login
    await refreshUser();
    return { status: "AUTH_SUCCESS" };
  };

  const loginWithMfa = async (mfaToken: string, totpCode: string): Promise<void> => {
    await AuthClient.validateMfa(mfaToken, totpCode);
    await refreshUser();
  };

  const register = async (data: {
    email: string;
    password: string;
    username: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => {
    await AuthClient.register(data);
    await refreshUser();
  };

  const loginWithOAuth = async (token: string, refreshToken?: string, userOverride?: Partial<UserProfile>) => {
    const loggedInUser = AuthClient.handleOAuthSuccess(token, refreshToken, userOverride);
    setUser(loggedInUser);
    const backendProfile = await AuthClient.fetchCurrentProfile();
    if (backendProfile) {
      setUser(backendProfile);
    }
  };

  const logout = async () => {
    try {
      await AuthClient.logout();
    } catch (e) {
      console.warn("Logout error:", e);
    } finally {
      setUser(null);
      AggarlyChatBridgeClient.clearSession();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("aggarly_auth_cleared"));
        window.location.href = "/";
      }
    }
  };

  const verifyEmail = async (code: string) => {
    await AuthClient.verifyEmail(code, user?.email);
    await refreshUser();
  };

  const resendVerificationEmail = async () => {
    return await AuthClient.resendEmailVerification(user?.email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithMfa,
        register,
        loginWithOAuth,
        logout,
        refreshUser,
        verifyEmail,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
