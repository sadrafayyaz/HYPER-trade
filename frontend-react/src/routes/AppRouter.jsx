import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import Dashboard from "../pages/Dashboard/Dashboard";
import Admin from "../pages/Admin/Admin";
import Support from "../pages/Support/Support";

function hasAuthToken() {
  return Boolean(
    localStorage.getItem("hypertrade_token") ||
      localStorage.getItem("token")
  );
}

function AdminRoute() {
  return hasAuthToken()
    ? <Admin />
    : <Navigate to="/" replace />;
}

function SuperAdminRoute() {
  return hasAuthToken()
    ? <Admin />
    : <Navigate to="/" replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Login />}
        />
        <Route
          path="/register"
          element={<Register />}
        />
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />
        <Route
          path="/admin"
          element={<AdminRoute />}
        />
        <Route
          path="/super-admin"
          element={<SuperAdminRoute />}
        />
        <Route
          path="/support"
          element={<Support />}
        />
        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
