// src/components/AuthModal.tsx
// Global Authentication Modal replacing inline login forms.
// Intercepts guest checkouts if disabled, allows choosing WhatsApp/Email.

import { useState, useEffect, useRef } from "react";
import { User, Mail, Smartphone, X } from "lucide-react";
import { sendCustomerOtp, verifyCustomerOtp, getCustomerSession, logoutCustomer, type CustomerInfo } from "@/lib/api/customer-auth";

type VerificationMethod = "email" | "phone";
type Step = "method_select" | "input" | "otp" | "authenticated";

export default function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [method, setMethod] = useState<VerificationMethod>("email");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");

  // Settings injected globally, default assumes email
  const [allowedMethods, setAllowedMethods] = useState<"email" | "phone" | "both">("email");

  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Check session and settings on mount
  useEffect(() => {
    // Note: In a real app we might fetch global store settings here 
    // to restrict allowedMethods to phone/email based on Admin config.
    setAllowedMethods("both"); // Defaulting to both for the UI flexiblity

    getCustomerSession().then((state) => {
      if (state.authenticated && state.customer) {
        setCustomer(state.customer);
        setStep("authenticated");
        dispatchLoginEvent(state.customer);
      }
    });

    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-auth-modal", handleOpen);
    return () => window.removeEventListener("open-auth-modal", handleOpen);
  }, []);

  const dispatchLoginEvent = (customerData: CustomerInfo) => {
    window.dispatchEvent(new CustomEvent("customer-login", {
      detail: {
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        customerId: customerData.customerId,
      }
    }));
  };

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

  const validateIdentifier = () => {
    if (method === "email") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());
    } else {
      // Basic phone validation (allowing digits and + sign)
      return /^\+?[0-9]{10,15}$/.test(identifier.trim());
    }
  };

  const handleSendOtp = async () => {
    if (!validateIdentifier()) {
      setError(`Please enter a valid ${method === "email" ? "email address" : "phone number"}`);
      return;
    }
    setLoading(true);
    setError("");
    const res = await sendCustomerOtp(method, identifier.trim());
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
      setError("Enter the 6-digit verification code");
      return;
    }
    setLoading(true);
    setError("");
    const res = await verifyCustomerOtp(method, identifier.trim(), otp.trim());
    setLoading(false);

    if (res.success && res.customer) {
      setCustomer(res.customer);
      setStep("authenticated");
      dispatchLoginEvent(res.customer);
      // Automatically close modal after 1.5s on success
      setTimeout(() => setIsOpen(false), 1500);
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
    setStep("input");
    setIdentifier("");
    setOtp("");
    window.dispatchEvent(new CustomEvent("customer-logout"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            {step === "authenticated" ? "Welcome back" : "Sign In"}
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* State: Authenticated */}
        {step === "authenticated" && customer && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-lg border border-green-100">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <User className="h-6 w-6 text-green-600" />
              </div>
              <p className="font-medium text-gray-900">{customer.name}</p>
              <p className="text-sm text-gray-500 mt-1">{customer.phone || customer.email}</p>
            </div>
            <div className="flex gap-3">
              <a
                href="/account"
                className="flex-1 flex justify-center items-center h-10 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Go to Dashboard
              </a>
              <button
                onClick={handleLogout}
                className="flex-1 h-10 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        )}

        {/* State: Method Selection or Input */}
        {step === "input" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Access your orders, track shipments, and checkout faster.
            </p>

            {allowedMethods === "both" && (
              <div className="flex rounded-lg border border-gray-200 p-1 mb-4 bg-gray-50">
                <button
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${method === "email" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  onClick={() => { setMethod("email"); setError(""); setIdentifier(""); }}
                >
                  <Mail className="h-4 w-4" /> Email
                </button>
                <button
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${method === "phone" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  onClick={() => { setMethod("phone"); setError(""); setIdentifier(""); }}
                >
                  <Smartphone className="h-4 w-4" /> WhatsApp
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                {method === "email" ? "Email address" : "WhatsApp Number"}
              </label>
              <input
                type={method === "email" ? "email" : "tel"}
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                placeholder={method === "email" ? "you@example.com" : "+8801700000000"}
                className="w-full h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all"
                autoFocus
              />
            </div>

            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

            <button
              onClick={handleSendOtp}
              disabled={loading || !identifier.trim()}
              className="w-full h-11 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-50 hover:bg-gray-800 transition-colors mt-2"
            >
              {loading ? "Please wait..." : "Continue"}
            </button>
          </div>
        )}

        {/* State: OTP Verification */}
        {step === "otp" && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                {method === "email" ? <Mail className="h-6 w-6 text-blue-600" /> : <Smartphone className="h-6 w-6 text-green-600" />}
              </div>
              <p className="text-sm text-gray-600">
                We've sent a 6-digit code to
              </p>
              <p className="font-semibold text-gray-900">{identifier}</p>
            </div>

            <div className="space-y-2">
              <input
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                placeholder="• • • • • •"
                className="w-full h-12 text-center text-lg tracking-[0.5em] rounded-lg border border-gray-300 bg-white px-3 font-mono focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all"
              />
            </div>

            {error && <p className="text-xs text-center text-red-500 font-medium">{error}</p>}

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full h-11 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-50 hover:bg-gray-800 transition-colors"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => { setStep("input"); setOtp(""); setError(""); }}
                className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                Change {method}
              </button>

              {countdown > 0 ? (
                <span className="text-xs text-gray-400">Resend code in {countdown}s</span>
              ) : (
                <button
                  onClick={handleSendOtp}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Resend code
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
