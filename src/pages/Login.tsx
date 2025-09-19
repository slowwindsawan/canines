import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "react-router-dom";
import { publicRequest } from "../env"; // use publicRequest for login
import logo from "../components/logo.png";
import dog1 from "../assets/Romeo-Badman-7.png";

//
// Integrated Login + Password Reset (no extra route).
// - States: "login" | "reset-request" | "reset-verify"
// - Reuses OTPInput (6-digit rounded square UI)
//

/* -------------------- validation schemas -------------------- */
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const emailSchema = z.object({ email: z.string().email("Please enter a valid email address") });

const resetSchema = z
  .object({
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type EmailForm = z.infer<typeof emailSchema>;
type ResetForm = z.infer<typeof resetSchema>;

/* -------------------- OTPInput (6-digit rounded squares) -------------------- */
function OTPInput({
  length = 6,
  value = "",
  onChange,
  autoFocus = true,
  disabled = false,
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);

  React.useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
      inputsRef.current[0].select();
    }
  }, [autoFocus]);

  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const setDigit = (index: number, digit: string) => {
    const safe = digit.replace(/[^0-9]/g, "");
    const arr = digits.slice();
    arr[index] = safe.slice(0, 1);
    onChange(arr.join(""));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    const key = e.key;
    if (key === "Backspace") {
      if (digits[idx]) {
        setDigit(idx, "");
      } else if (idx > 0) {
        inputsRef.current[idx - 1]?.focus();
        setDigit(idx - 1, "");
      }
      e.preventDefault();
      return;
    }
    if (key === "ArrowLeft" && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
      e.preventDefault();
      return;
    }
    if (key === "ArrowRight" && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus();
      e.preventDefault();
      return;
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (!val) {
      setDigit(idx, "");
      return;
    }
    // distribute pasted long input
    if (val.length > 1) {
      const arr = digits.slice();
      for (let i = 0; i < val.length && idx + i < length; i++) {
        arr[idx + i] = val[i];
      }
      onChange(arr.join(""));
      const nextIdx = Math.min(length - 1, idx + val.length);
      inputsRef.current[nextIdx]?.focus();
      return;
    }
    setDigit(idx, val);
    if (val && idx < length - 1) inputsRef.current[idx + 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const txt = e.clipboardData
      .getData("text")
      .replace(/\s+/g, "")
      .replace(/[^0-9]/g, "");
    if (!txt) return;
    const arr = digits.slice();
    for (let i = 0; i < txt.length && i < length; i++) arr[i] = txt[i];
    onChange(arr.join(""));
    const focusIdx = Math.min(length - 1, txt.length - 1);
    inputsRef.current[focusIdx]?.focus();
  };

  return (
    <div className="flex gap-3 justify-center" role="group" aria-label={`${length}-digit OTP`}>
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => (inputsRef.current[idx] = el)}
          value={digits[idx] || ""}
          onChange={(e) => onInput(e, idx)}
          onKeyDown={(e) => onKeyDown(e, idx)}
          onPaste={onPaste}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${idx + 1}`}
          className={`w-12 h-12 sm:w-14 sm:h-14 text-center text-lg sm:text-xl font-medium rounded-xl shadow-sm border focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all ${
            disabled ? "bg-gray-100 text-gray-400" : "bg-white"
          }`}
          style={{ boxShadow: "0 6px 18px rgba(11, 22, 39, 0.06)" }}
        />
      ))}
    </div>
  );
}

/* -------------------- main component -------------------- */
const Login: React.FC = () => {
  const location = useLocation();

  // UI flow state: show login card or password reset (request/verify) cards
  const [flow, setFlow] = React.useState<"login" | "reset-request" | "reset-verify">("login");

  // login states
  const [error, setError] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // reset states
  const [resetStatus, setResetStatus] = React.useState<string>("");
  const [resetError, setResetError] = React.useState<string>("");
  const [emailForReset, setEmailForReset] = React.useState<string>("");

  const [otp, setOtp] = React.useState<string>("");
  const [resendCooldown, setResendCooldown] = React.useState<number>(0);
  const RESEND_COOLDOWN_SECONDS = 30;
  const OTP_TTL_MINUTES = 10;

  // countdown for resend
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const { register: regEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErrors } } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  });

  const {
    register: regReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const from = (location.state as any)?.from?.pathname || "/dashboard";

  /* -------------------- LOGIN submit -------------------- */
  const onLogin = handleSubmit(async (data: LoginFormData) => {
    setError("");
    setIsLoading(true);
    try {
      const result = await publicRequest("/auth/login", "POST", data);
      if (!result.access_token) throw new Error(result.message || "Login failed");

      localStorage.setItem("jwt_token", result.access_token);
      if (result.user) localStorage.setItem("user_data", JSON.stringify(result.user));

      // use location from or direct to dashboard
      window.location.href = from;
    } catch (err: any) {
      console.error("Login error:", err);
      const message = err?.response?.data?.detail || err?.message || "Invalid email or password";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  });

  /* -------------------- RESET: request OTP -------------------- */
  const onRequestOtp = handleEmailSubmit(async (data: EmailForm) => {
    setResetError("");
    setResetStatus("Requesting OTP...");
    try {
      const res = await publicRequest("/auth/forgot-password", "POST", { email: data.email });
      // regardless of server internal existence, proceed to verify UI
      setEmailForReset(data.email);
      setResetStatus(`If an account exists, an OTP was sent to ${data.email}.`);
      setFlow("reset-verify");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtp("");
    } catch (err: any) {
      console.error("Request OTP error:", err);
      setResetError(err?.response?.data?.detail || "Failed to request OTP. Try again.");
      setResetStatus("");
    }
  });

  /* -------------------- RESET: verify OTP + set new password -------------------- */
  const onResetPassword = handleResetSubmit(async (data: ResetForm) => {
    setResetError("");
    if (!/^\d{6}$/.test(otp)) {
      setResetError("OTP must be exactly 6 digits.");
      return;
    }
    setResetStatus("Resetting password...");
    try {
      const payload = { email: emailForReset, otp: otp.trim(), new_password: data.new_password };
      const res = await publicRequest("/auth/reset-password", "POST", payload);
      if (res && res.success) {
        setResetStatus("Password reset successful. You can sign in now.");
        // after a short pause switch back to login
        setTimeout(() => {
          setFlow("login");
          setResetStatus("");
          setOtp("");
        }, 1200);
      } else {
        const m = res?.message || res?.detail || "Failed to reset password";
        setResetError(m);
        setResetStatus("");
      }
    } catch (err: any) {
      console.error("Reset error:", err);
      const m = err?.response?.data?.detail || "Failed to reset password. Try again.";
      setResetError(m);
      setResetStatus("");
    }
  });

  const resendOtp = async () => {
    setResetError("");
    if (!emailForReset) {
      setResetError("No email present. Please start again.");
      setFlow("reset-request");
      return;
    }
    if (resendCooldown > 0) return;
    setResetStatus("Resending OTP...");
    try {
      await publicRequest("/auth/forgot-password", "POST", { email: emailForReset });
      setResetStatus(`If an account exists, an OTP was resent to ${emailForReset}.`);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtp("");
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      setResetError(err?.response?.data?.detail || "Failed to resend OTP. Try later.");
      setResetStatus("");
    }
  };

  const goToResetRequest = () => {
    // switch to reset request card
    setError("");
    setIsLoading(false);
    setResetError("");
    setResetStatus("");
    setEmailForReset("");
    setOtp("");
    setFlow("reset-request");
  };

  const backToLogin = () => {
    setError("");
    setResetError("");
    setResetStatus("");
    setOtp("");
    setEmailForReset("");
    setFlow("login");
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="font-albert min-h-screen flex items-center justify-center bg-gradient-to-br py-6 px-4 sm:px-6 lg:px-8" style={{ background: "#f0f0ec" }}>
      <div className="max-w-md w-full space-y-8">
        {/* Logo & Welcome */}
        <div className="text-center translate-y-[34px]">
          <img className="w-[300px] md:w-[300px] m-auto mb-4" src={logo} alt="Logo" />
          <div className="grid grid-cols-3 items-center bg-transparent py-0 px-2 rounded-xl">
            <div className="col-span-1">
              <img src={dog1} alt="Dog" className="w-full aspect-square object-cover rounded-lg" />
            </div>
            <div className="col-span-1 w-[250px]">
              <h2 className="mt-4 text-md font-bold text-dark-900 text-left" style={{ width: "185px", fontFamily: "sans-serif" }}>
                Welcome to The Gut Fix Companion
              </h2>
              <p className="text-left text-sm text-gray-600 font-light" style={{ width: "250px", fontFamily: "sans-serif" }}>
                A dog nutritionist in your pocket, 24/7.
              </p>
            </div>
          </div>
        </div>

        {/* -------------------- LOGIN CARD -------------------- */}
        {flow === "login" && (
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8" style={{ fontFamily: "sans-serif" }}>
            <form className="space-y-6" onSubmit={onLogin}>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-dark-800 mb-2">Email Address</label>
                <input {...register("email")} type="email" className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-colors text-sm sm:text-base" placeholder="Enter your email" />
                {errors.email && <p className="mt-2 text-sm text-red-700">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-dark-800 mb-2">Password</label>
                <input {...register("password")} type="password" className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-colors text-sm sm:text-base" placeholder="Enter your password" />
                {errors.password && <p className="mt-2 text-sm text-red-700">{errors.password.message}</p>}
              </div>

              <div className="flex justify-between items-center">
                <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-primary-600 to-primary-800 text-dark-900 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:from-primary-500 hover:to-primary-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base">
                  {isLoading ? "Signing In..." : "Sign in to continue your dog’s health journey →"}
                </button>
              </div>

              <div className="mt-3 flex flex-col justify-between items-center text-sm">
                <span className="mb-2"><font className="text-gray-600">New here? Let’s start fixing your dog’s gut.</font><Link to="/signup" className="text-blue-600 hover:text-dark-900 font-medium">Sign up</Link></span>
                <button type="button" onClick={goToResetRequest} className="text-red-600 hover:underline mt-2">Forgot password?</button>
              </div>
            </form>
          </div>
        )}

        {/* -------------------- RESET: request OTP CARD -------------------- */}
        {flow === "reset-request" && (
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8" style={{ fontFamily: "sans-serif" }}>
            {resetError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{resetError}</div>}
            {resetStatus && <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">{resetStatus}</div>}

            <form className="space-y-4" onSubmit={onRequestOtp}>
              <div>
                <label className="block text-sm font-medium text-dark-800 mb-2">Email Address</label>
                <input {...regEmail("email")} type="email" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-600" placeholder="Enter your email" />
                {emailErrors.email && <p className="mt-2 text-sm text-red-700">{emailErrors.email.message}</p>}
              </div>

              <div className="flex gap-3">
                <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-800 text-dark-900 font-medium">Send Code</button>
                <button type="button" onClick={backToLogin} className="px-4 py-2 rounded-lg border text-dark-800 border-gray-300 hover:bg-gray-50">Back</button>
              </div>
            </form>
          </div>
        )}

        {/* -------------------- RESET: verify + set new password CARD -------------------- */}
        {flow === "reset-verify" && (
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8" style={{ fontFamily: "sans-serif" }}>
            {resetError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{resetError}</div>}
            {resetStatus && <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">{resetStatus}</div>}

            <div className="space-y-4">
              <p className="text-sm text-dark-700">We've sent a code to <strong>{emailForReset}</strong>. Enter it below and choose a new password.</p>

              <div>
                <label className="block text-sm font-medium text-dark-800 mb-2">OTP Code</label>
                <OTPInput length={6} value={otp} onChange={(v) => setOtp(v)} autoFocus={true} disabled={false} />
                <p className="mt-2 text-xs text-dark-500 text-center">Enter the 6-digit code. It will expire in {OTP_TTL_MINUTES} minutes.</p>
              </div>

              <form className="space-y-3" onSubmit={onResetPassword}>
                <div>
                  <label className="block text-sm font-medium text-dark-800 mb-2">New Password</label>
                  <input {...regReset("new_password")} type="password" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-600" placeholder="Choose a new password" />
                  {resetErrors.new_password && <p className="mt-2 text-sm text-red-700">{resetErrors.new_password.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-800 mb-2">Confirm New Password</label>
                  <input {...regReset("confirm_password")} type="password" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-600" placeholder="Confirm new password" />
                  {resetErrors.confirm_password && <p className="mt-2 text-sm text-red-700">{resetErrors.confirm_password.message}</p>}
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={!/^\d{6}$/.test(otp)} className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-800 text-dark-900 font-medium disabled:opacity-60 disabled:cursor-not-allowed">Reset Password</button>

                  <button onClick={resendOtp} type="button" disabled={resendCooldown > 0} className={`px-4 py-2 rounded-lg border ${resendCooldown > 0 ? "text-gray-500 border-gray-200 cursor-not-allowed" : "text-dark-800 border-gray-300 hover:bg-gray-50"}`}>
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend OTP"}
                  </button>
                </div>

                <div className="pt-2 text-sm text-dark-700">
                  <button onClick={() => { setFlow("reset-request"); setOtp(""); }} type="button" className="text-sm text-primary-600 hover:underline">Edit email</button>
                  <button onClick={backToLogin} type="button" className="ml-4 text-sm text-primary-600 hover:underline">Back to login</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;
