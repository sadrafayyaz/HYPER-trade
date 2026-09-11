import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const API_URL = "http://localhost:3000";
const LOGO_URL = "/hyper-trade-logo.png";

function extractToken(data) {
  return (
    data?.token ||
    data?.accessToken ||
    data?.access_token ||
    data?.data?.token ||
    data?.data?.accessToken ||
    data?.data?.access_token ||
    data?.result?.token ||
    data?.result?.accessToken ||
    data?.result?.access_token ||
    null
  );
}

function extractUser(data) {
  return (
    data?.user ||
    data?.data?.user ||
    data?.result?.user ||
    null
  );
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            data?.data?.message ||
            `Login failed with status ${response.status}.`
        );
      }

      if (data?.success === false) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to login."
        );
      }

      const token = extractToken(data);
      const user = extractUser(data);

      if (!token) {
        console.error(
          "Login response does not contain a token:",
          data
        );

        throw new Error(
          "Authentication token was not returned by the server."
        );
      }

      localStorage.setItem(
        "hypertrade_token",
        token
      );

      if (user) {
        localStorage.setItem(
          "hypertrade_user",
          JSON.stringify(user)
        );
      }

      window.dispatchEvent(
        new Event("hypertrade-authenticated")
      );

      navigate("/dashboard", {
        replace: true,
      });
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err?.message ||
          "Unable to connect to Hyper Trade."
      );
    } finally {
      setLoading(false);
    }
  }

  function goToRegister() {
    navigate("/register");
  }

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-glow login-glow-blue" />
        <div className="login-glow login-glow-purple" />
      </div>

      <main className="login-container">
        <section className="login-card">
          <div className="login-brand">
            <img
              src={LOGO_URL}
              alt="Hyper Trade"
              className="login-logo"
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";
              }}
            />

            <div className="login-logo-fallback">
              <div className="fallback-h">
                H
              </div>

              <div className="fallback-chart">
                ↗
              </div>
            </div>

            <h1>Hyper Trade</h1>

            <p>
              Professional Crypto Trading
              Platform
            </p>
          </div>

          <div className="login-heading">
            <h2>Welcome Back</h2>

            <p>
              Sign in to continue trading
              securely.
            </p>
          </div>

          {error && (
            <div className="login-error">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >
            <div className="form-group">
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="Enter your email"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <div className="password-label">
                <label htmlFor="password">
                  Password
                </label>
              </div>

              <div className="password-wrapper">
                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  disabled={loading}
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="login-divider">
            <span />
            <p>OR</p>
            <span />
          </div>

          <button
            type="button"
            className="register-button"
            onClick={goToRegister}
            disabled={loading}
          >
            Create New Account
          </button>

          <div className="login-security">
            <span className="security-icon">
              ✓
            </span>

            <span>
              Secure authentication powered
              by Hyper Trade
            </span>
          </div>

          <div className="login-footer">
            <p>
              © {new Date().getFullYear()}{" "}
              Hyper Trade
            </p>

            <p>
              Professional Digital Asset
              Exchange
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}