import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

function readToken() {
  return (
    localStorage.getItem("hypertrade_token") ||
    localStorage.getItem("token") ||
    null
  );
}

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("hypertrade_user") || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser());
  const [token, setToken] = useState(readToken());

  function login(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("hypertrade_token", data.token);
    localStorage.setItem("hypertrade_user", JSON.stringify(data.user || {}));
    setToken(data.token);
    setUser(data.user || null);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("hypertrade_token");
    localStorage.removeItem("hypertrade_user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
