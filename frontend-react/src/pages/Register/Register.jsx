import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3000";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!form.password) {
      setError("Please enter a password.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || undefined,
            password: form.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed."
        );
      }

      setSuccess("Account created successfully.");

      setForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
      });

      setTimeout(() => {
        navigate("/");
      }, 1200);
    } catch (error) {
      console.error("Registration error:", error);

      setError(
        error.message ||
          "Unable to create account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050816] px-4 text-white">

      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-8 shadow-2xl">

        <div className="text-center">

          <h1 className="text-3xl font-bold">
            Create an Account
          </h1>

          <p className="mt-2 text-zinc-400">
            Join Hyper Trade
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4"
        >

          <input
            name="fullName"
            type="text"
            value={form.fullName}
            onChange={handleChange}
            placeholder="Full Name"
            disabled={loading}
            className="w-full rounded-xl border border-zinc-700 bg-transparent px-4 py-3 outline-none transition focus:border-blue-500 disabled:opacity-50"
          />

          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            disabled={loading}
            className="w-full rounded-xl border border-zinc-700 bg-transparent px-4 py-3 outline-none transition focus:border-blue-500 disabled:opacity-50"
          />

          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone Number (optional)"
            disabled={loading}
            className="w-full rounded-xl border border-zinc-700 bg-transparent px-4 py-3 outline-none transition focus:border-blue-500 disabled:opacity-50"
          />

          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password (minimum 8 characters)"
            disabled={loading}
            className="w-full rounded-xl border border-zinc-700 bg-transparent px-4 py-3 outline-none transition focus:border-blue-500 disabled:opacity-50"
          />

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>

        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">

          Already have an account?{" "}

          <Link
            to="/"
            className="font-semibold text-blue-400 hover:text-blue-300"
          >
            Login
          </Link>

        </div>

      </div>

    </div>
  );
}