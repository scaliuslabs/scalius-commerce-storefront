// src/components/CustomerLoginWidget.tsx
// Compact optional customer login widget for the cart page.
// Customers can log in via email OTP to pre-fill their checkout form.
// Dispatches custom window events on login/logout instead of prop callbacks.

import React, { useState, useEffect, useRef } from "react";
import { sendCustomerOtp, verifyCustomerOtp, getCustomerSession, logoutCustomer, type CustomerInfo } from "@/lib/api/customer-auth";

type Step = "idle" | "email" | "otp" | "authenticated";

export default function CustomerLoginWidget() {
  const [step, setStep] = useState<Step>("idle");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Check existing session on mount
  useEffect(() => {
    getCustomerSession().then((state) => {
      if (state.authenticated && state.customer) {
        setCustomer(state.customer);
        setStep("authenticated");
        window.dispatchEvent(new CustomEvent("customer-login", { detail: {
          email: state.customer.email,
          name: state.customer.name,
          phone: state.customer.phone,
          customerId: state.customer.customerId,
        } }));
      }
    });
  }, []);

  const startCountdown = (seconds: number) => {
    setCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(countdownRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    setError("");
    const res = await sendCustomerOtp(email.trim());
    setLoading(false);
    if (res.success) {
      setStep("otp");
      startCountdown(120);
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } else {
      setError(res.error || "Failed to send code");
      if (res.retryAfter) startCountdown(res.retryAfter);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setLoading(true);
    setError("");
    const res = await verifyCustomerOtp(email.trim(), otp.trim());
    setLoading(false);
    if (res.success && res.customer) {
      setCustomer(res.customer);
      setStep("authenticated");
      window.dispatchEvent(new CustomEvent("customer-login", { detail: {
        email: res.customer.email,
        name: res.customer.name,
        phone: res.customer.phone,
        customerId: res.customer.customerId,
      } }));
    } else {
      setError(res.error || "Invalid code");
      if (res.attemptsLeft !== undefined && res.attemptsLeft <= 2) {
        setError(`${res.error || "Invalid code"} (${res.attemptsLeft} attempt${res.attemptsLeft !== 1 ? "s" : ""} left)`);
      }
    }
  };

  const handleLogout = async () => {
    await logoutCustomer();
    setCustomer(null);
    setStep("idle");
    setEmail("");
    setOtp("");
    setExpanded(false);
    window.dispatchEvent(new CustomEvent("customer-logout"));
  };

  // Authenticated state
  if (step === "authenticated" && customer) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-bold">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">Signed in as {customer.name}</p>
            <p className="text-xs text-green-600 dark:text-green-400">{customer.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  // Collapsed "Login" prompt
  if (!expanded && step === "idle") {
    return (
      <button
        onClick={() => { setExpanded(true); setStep("email"); }}
        className="w-full text-left rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Sign in to pre-fill your details <span className="text-primary font-medium">→</span>
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Quick sign in</p>
        <button
          onClick={() => { setExpanded(false); setStep("idle"); setError(""); }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {step === "email" && (
        <>
          <p className="text-xs text-muted-foreground">Enter your email and we'll send you a code</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
              placeholder="your@email.com"
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {loading ? "…" : "Send code"}
            </button>
          </div>
        </>
      )}

      {step === "otp" && (
        <>
          <p className="text-xs text-muted-foreground">
            Code sent to <strong>{email}</strong>
          </p>
          <div className="flex gap-2">
            <input
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              placeholder="000000"
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm font-mono tracking-[0.3em] focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {loading ? "…" : "Verify"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setStep("email"); setOtp(""); setError(""); }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              ← Change email
            </button>
            {countdown > 0 ? (
              <p className="text-xs text-muted-foreground">Resend in {countdown}s</p>
            ) : (
              <button
                onClick={handleSendOtp}
                className="text-xs text-primary hover:underline"
              >
                Resend code
              </button>
            )}
          </div>
        </>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
