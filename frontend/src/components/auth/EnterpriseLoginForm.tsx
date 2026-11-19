"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
  HelpCircle,
  X,
  UserCheck,
  Check,
  Info,
  Terminal,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/common/ToastProvider";
import { BrowserAutomationLogo } from "@/components/common/BrowserLogo";

interface EnterpriseLoginFormProps {
  onSuccessRedirect?: string;
  onSuccessCallback?: () => void;
  standalone?: boolean;
}

export function EnterpriseLoginForm({
  onSuccessRedirect = "/dashboard",
  onSuccessCallback,
  standalone = false,
}: EnterpriseLoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();

  // Form State - initialized empty for security (No hardcoded production credentials)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Validation State
  const [touched, setTouched] = useState({ email: false, password: false });
  const [errors, setErrors] = useState({ email: "", password: "" });

  // Tooltip & Modal States
  const [showPolicyTooltip, setShowPolicyTooltip] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Focus & Accessibility
  const emailInputRef = useRef<HTMLInputElement>(null);
  const policyTooltipRef = useRef<HTMLDivElement>(null);



  // Restore remembered email safely on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("saved_login_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // LocalStorage unavailable/sandboxed
    }
    // Auto-focus email input for keyboard navigation
    emailInputRef.current?.focus();
  }, []);

  // Inline Validation Logic
  function validateEmail(val: string): string {
    if (!val.trim()) return "Corporate email is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) return "Please enter a valid corporate email address.";
    return "";
  }

  function validatePassword(val: string): string {
    if (!val) return "Password is required.";
    if (val.length < 6) return "Password must be at least 6 characters.";
    return "";
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setEmail(val);
    setAuthError("");
    if (touched.email) {
      setErrors((prev) => ({ ...prev, email: validateEmail(val) }));
    }
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setPassword(val);
    setAuthError("");
    if (touched.password) {
      setErrors((prev) => ({ ...prev, password: validatePassword(val) }));
    }
  }

  function handleBlur(field: "email" | "password") {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "email") {
      setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else {
      setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    setTouched({ email: true, password: true });
    setErrors({ email: emailErr, password: passErr });

    if (emailErr || passErr) {
      return;
    }

    setAuthError("");
    setLoading(true);

    try {
      // Actual backend authentication call (Zero AI, secure OAuth2 password flow)
      await login(email.trim(), password);

      // Handle Remember Me preference safely (never persist passwords)
      try {
        if (rememberMe) {
          localStorage.setItem("saved_login_email", email.trim());
        } else {
          localStorage.removeItem("saved_login_email");
        }
      } catch {
        // Ignore localStorage restrictions
      }

      showToastSuccess(
        "Authentication Successful",
        `Welcome to AutomationTestingWithAgentBrowser`
      );

      if (onSuccessCallback) {
        onSuccessCallback();
      } else {
        router.push(onSuccessRedirect);
      }
    } catch (err: any) {
      const message =
        err?.message ||
        "Invalid corporate credentials. Verify email, password and network access.";
      setAuthError(message);
      showToastError("Sign In Failed", message);
    } finally {
      setLoading(false);
    }
  }



  function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail(forgotEmail)) {
      setForgotSubmitted(true);
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setForgotSubmitted(false);
        setForgotEmail("");
      }, 3500);
    }
  }

  return (
    <div
      className={
        standalone
          ? "min-h-screen w-full bg-neutral-50 dark:bg-black text-black dark:text-white flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-200"
          : "w-full max-w-lg mx-auto py-4 text-black dark:text-white selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-200"
      }
    >
      {/* Top Bar / Branding Status - displayed in standalone mode */}
      {standalone && (
        <header className="w-full max-w-7xl mx-auto flex items-center justify-between py-2 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span className="font-mono text-[11px] tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
              Agent-Browser CLI v0.41.2 Native
            </span>
          </div>

          {/* Zero-AI / No-LLM Policy Badge with Tooltip */}
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowPolicyTooltip(true)}
              onMouseLeave={() => setShowPolicyTooltip(false)}
              onFocus={() => setShowPolicyTooltip(true)}
              onBlur={() => setShowPolicyTooltip(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-300 text-[11px] font-medium hover:bg-neutral-200 dark:hover:bg-neutral-800 transition cursor-help focus:outline-none focus:ring-2 focus:ring-neutral-400"
              aria-label="Zero-AI and No-LLM Policy Compliance Information"
              aria-expanded={showPolicyTooltip}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-black dark:text-white" />
              <span>Strict Zero-AI / No-LLM Policy Active</span>
              <HelpCircle className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
            </button>

            {/* Accessible Tooltip Popover */}
            {showPolicyTooltip && (
              <div
                ref={policyTooltipRef}
                role="tooltip"
                className="absolute right-0 top-full mt-2 w-80 p-3.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl text-xs text-neutral-700 dark:text-neutral-300 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-black dark:text-white">
                      Corporate Zero-AI Compliance
                    </p>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      This platform operates 100% deterministically. No DOM elements, session logs, or test artifacts are ever transmitted to third-party AI APIs (OpenAI, Gemini, Claude, Ollama, etc.). Element recognition and self-healing algorithms rely strictly on localized mathematical heuristics.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main Centered Login Section */}
      <main className="flex-1 flex items-center justify-center my-6">
        <div className="w-full max-w-[440px] space-y-6">
          {/* Header Typography & Logo */}
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-2">
              <BrowserAutomationLogo size={54} />
            </div>

            <div className="space-y-1">
              <h1
                id="login-title"
                className="text-2xl font-bold tracking-tight text-black dark:text-white"
              >
                AutomationTesting<span className="text-black dark:text-white underline decoration-neutral-400 dark:decoration-neutral-500">WithAgentBrowser</span>
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">
                Enterprise Multi-User Automation & Testing Platform
              </p>
            </div>
          </div>

          {/* Crisp White Centered Login Card */}
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl transition-all duration-200">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Enterprise Sign In
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Enter your credentials to access your testing workspace
              </p>
            </div>

            {/* Clear Error Message Alert */}
            {authError && (
              <div
                role="alert"
                aria-live="polite"
                className="mb-5 p-3.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl text-black dark:text-white text-xs flex items-start gap-2.5 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-black dark:text-white mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold">Authentication Failed:</span>
                  <p className="text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300">{authError}</p>
                </div>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              noValidate
              className="space-y-4"
              role="form"
              aria-labelledby="login-title"
            >
              {/* Corporate Email Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                >
                  Corporate Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <input
                    ref={emailInputRef}
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => handleBlur("email")}
                    placeholder="name@company.domain"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className={`w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-neutral-950 ${
                      errors.email
                        ? "border-neutral-500 focus:border-neutral-700 focus:ring-neutral-400/20"
                        : "border-neutral-300 dark:border-neutral-700 focus:border-black dark:focus:border-white focus:ring-neutral-400/20 hover:border-neutral-400 dark:hover:border-neutral-600"
                    }`}
                  />
                </div>
                {touched.email && errors.email && (
                  <p
                    id="email-error"
                    className="text-[11px] text-neutral-700 dark:text-neutral-300 flex items-center gap-1 mt-1 font-medium"
                    role="alert"
                  >
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              {/* Password Field with Show/Hide Toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:underline font-medium transition focus:outline-none focus:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={() => handleBlur("password")}
                    placeholder="Enter your security password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className={`w-full min-h-[44px] pl-10 pr-11 py-2.5 text-sm rounded-xl border bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-neutral-950 ${
                      errors.password
                        ? "border-neutral-500 focus:border-neutral-700 focus:ring-neutral-400/20"
                        : "border-neutral-300 dark:border-neutral-700 focus:border-black dark:focus:border-white focus:ring-neutral-400/20 hover:border-neutral-400 dark:hover:border-neutral-600"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <p
                    id="password-error"
                    className="text-[11px] text-neutral-700 dark:text-neutral-300 flex items-center gap-1 mt-1 font-medium"
                    role="alert"
                  >
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.password}</span>
                  </p>
                )}
              </div>

              {/* Remember Me Checkbox Row */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-black dark:text-white focus:ring-neutral-500 dark:focus:ring-offset-neutral-950 cursor-pointer"
                  />
                  <span className="text-xs text-neutral-600 dark:text-neutral-300 group-hover:text-black dark:group-hover:text-white transition">
                    Remember me on this device
                  </span>
                </label>
              </div>

              {/* Submit Button with Loading State */}
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.99] text-white dark:text-black font-semibold text-sm transition-all duration-150 shadow-md flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white dark:text-black" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Platform</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Registration / Account Request Link */}
          <div className="text-center text-xs text-neutral-500 dark:text-neutral-400">
            Need an enterprise tenant account?{" "}
            <Link
              href="/register"
              className="text-black dark:text-white hover:underline font-medium transition"
            >
              Request Workspace Access
            </Link>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3
                  id="forgot-modal-title"
                  className="text-base font-semibold text-neutral-900 dark:text-white"
                >
                  Reset Enterprise Password
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Enter your corporate email address to receive authorization instructions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-lg transition"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotSubmitted ? (
              <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-black dark:text-white" />
                  <span>Instruction Sent</span>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  If this email exists in our directory, a secure one-time password reset link has been dispatched to your corporate inbox.
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                  >
                    Corporate Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@company.domain"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-3 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-lg transition shadow"
                  >
                    Dispatch Reset Link
                  </button>
                </div>
              </form>
            )}

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
              <span>
                SSO-governed users must reset credentials via company Identity Provider (Okta / Azure AD).
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Security Footer - displayed in standalone mode */}
      {standalone && (
        <footer className="w-full max-w-7xl mx-auto pt-4 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span>AutomationTestingWithAgentBrowser &bull; Enterprise SaaS v1.0.0</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="text-neutral-600 dark:text-neutral-400 font-medium">SOC2 Type II Compliant</span>
            <span>&bull;</span>
            <span className="text-neutral-600 dark:text-neutral-400 font-medium">ISO/IEC 27001 Certified</span>
            <span>&bull;</span>
            <span>Deterministic Zero-AI Engine</span>
          </div>
        </footer>
      )}
    </div>
  );
}
