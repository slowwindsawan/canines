import React, { useEffect, useRef, useState } from "react";
// Usage note: adjust the jwtRequest import path to your project structure
import { jwtRequest } from "./env";
import { useAuth } from "./context/AuthContext";

export default function FeedbackPopup({ open, onClose }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const dialogRef = useRef(null);

  useEffect(()=>{
    setEmail(user?.email)
    setName(user?.name)
  },[])

  useEffect(() => {
    if (!open) return;
    setError("");
    setSuccess("");
    // focus first input
    const t = setTimeout(
      () => dialogRef.current?.querySelector("textarea, input")?.focus(),
      50
    );
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const validate = () => {
    setError("");
    if (!message || message.trim().length < 10) {
      setError("Please enter a message (at least 10 characters).");
      return false;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please provide a valid email or leave it empty.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        name: name?.trim() || undefined,
        email: email?.trim() || undefined,
        message: message.trim(),
        meta: {
          url: typeof window !== "undefined" ? window.location.href : undefined,
          ts: new Date().toISOString(),
        },
      };

      const res = await jwtRequest("/feedback", "POST", payload);

      if (res?.success) {
        setSuccess("Thanks — your feedback was sent successfully.");
        setName("");
        setEmail("");
        setMessage("");
        // optionally close after short delay
        setTimeout(() => {
          setSuccess("");
          onClose();
        }, 1400);
      } else {
        // try to show reason from server
        setError(
          res?.error ||
            res?.message ||
            "Failed to send feedback. Please try again."
        );
      }
    } catch (err) {
      console.error("Feedback submit error:", err);
      setError(err?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    // backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      onMouseDown={(e) => {
        // close when clicking backdrop (but not when clicking inside)
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ backdropFilter: "blur(10px)" }}
    >
      {/* dim overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* card */}
      <div
        ref={dialogRef}
        className={`relative z-10 max-w-lg w-full rounded-2xl shadow-lg p-6 md:p-8 border
          bg-brand-offwhite text-brand-midgrey`}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-brand-charcoal">
              Send feedback
            </h3>
            <p className="mt-1 text-sm text-brand-midgrey/80">
              We read every message — thank you!
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close feedback dialog"
            className="ml-auto rounded-md p-2 hover:opacity-90"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </header>

        <form className="mt-4" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="text-sm mb-1 block">Name</label>
            <input
              value={user?.name}
              disabled
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-md p-2 border border-transparent focus:border-brand-charcoal/60 bg-white text-sm"
            />
          </div>

          <div className="mb-3">
            <label className="text-sm mb-1 block">Email</label>
            <input
              onChange={(e) => setEmail(e.target.value)}
              value={user?.email}
              disabled
              placeholder="you@example.com"
              className="w-full rounded-md p-2 border border-transparent focus:border-brand-charcoal/60 bg-white text-sm"
            />
          </div>

          <div className="mb-3">
            <label className="text-sm mb-1 block">Your feedback</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Tell us what happened, or what you'd like to see improved..."
              className="w-full rounded-md p-3 border border-transparent focus:border-brand-charcoal/60 bg-white text-sm"
              required
            />
          </div>

          {/* error / success */}
          {error && (
            <div className="mb-3 rounded-md p-3 bg-red-600/10 text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-3 rounded-md p-3 bg-green-600/10 text-green-600 text-sm">
              {success}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading||!message||!email||!name}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold
                ${
                  loading ? "opacity-80 cursor-wait" : "hover:brightness-95"
                } bg-brand-charcoal text-white`}
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
              ) : (
                "Send feedback"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setName("");
                setEmail("");
                setMessage("");
                setError("");
                setSuccess("");
              }}
              className="text-sm px-3 py-2 rounded-md bg-transparent hover:underline"
            >
              Reset
            </button>
          </div>
        </form>

        <footer className="mt-4 text-center text-xs text-brand-midgrey/70">
          Thanks for helping make the product better ✨
        </footer>
      </div>
    </div>
  );
}
