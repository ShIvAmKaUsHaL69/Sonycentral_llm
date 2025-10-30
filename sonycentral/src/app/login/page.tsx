"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "@/components/ui/loader";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include"
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setError(data.message || "Login failed, please try again");
      }
    } catch (err) {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-800 p-8 rounded shadow-md w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        {error && <div className="mb-4 text-red-600 text-center">{error}</div>}
        <div className="mb-4">
          <label className="block mb-1 font-medium" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block mb-1 font-medium" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition flex items-center justify-center"
          disabled={loading}
        >
          {loading ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : null}
          Login
        </button>
      </form>
    </div>
  );
} 