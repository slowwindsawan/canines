import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Heart, CheckCircle2, XCircle } from "lucide-react";
import { publicRequest } from "../env"; // your helper

// ---------- validation schema ----------
const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

// ---------- OTPInput component (6-digit rounded squares) ----------
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
  // create refs for each input
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);

  React.useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
      inputsRef.current[0].select();
    }
  }, [autoFocus]);

  // current digits array
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
        // clear current
        setDigit(idx, "");
      } else if (idx > 0) {
        // move back and clear
        const prev = inputsRef.current[idx - 1];
        prev?.focus();
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
    // if user pasted multiple digits into one box, distribute
    if (val.length > 1) {
      const arr = digits.slice();
      for (let i = 0; i < val.length && idx + i < length; i++) {
        arr[idx + i] = val[i];
      }
      onChange(arr.join(""));
      // focus next empty
      const nextIdx = Math.min(length - 1, idx + val.length);
      inputsRef.current[nextIdx]?.focus();
      return;
    }
    setDigit(idx, val);
    // move focus if a digit entered
    if (val && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const txt = e.clipboardData.getData("text").replace(/\s+/g, "").replace(/[^0-9]/g, "");
    if (!txt) return;
    const arr = digits.slice();
    for (let i = 0; i < txt.length && i < length; i++) {
      arr[i] = txt[i];
    }
    onChange(arr.join(""));
    // focus after last pasted digit
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
          style={{
            // a tiny visual nudge for modern look
            boxShadow: "0 6px 18px rgba(11, 22, 39, 0.06)",
          }}
        />
      ))}
    </div>
  );
}

// ---------- component ----------
const Signup: React.FC = () => {
  const navigate = useNavigate();

  // flows: 'form' -> 'verify' -> 'success'
  const [flowStep, setFlowStep] = React.useState<"form" | "verify" | "success">(
    "form"
  );
  const [error, setError] = React.useState<string>("");
  const [status, setStatus] = React.useState<string>("");

  // keep signupPayload until verification (so resend can call signup again)
  const [signupPayload, setSignupPayload] = React.useState<
    { username: string; email: string; password: string; name: string } | null
  >(null);

  // OTP UI state
  const [otp, setOtp] = React.useState<string>("");
  const [resendCooldown, setResendCooldown] = React.useState<number>(0); // seconds
  const RESEND_COOLDOWN_SECONDS = 30;
  const OTP_TTL_MINUTES = 10; // display only

  // react-hook-form for signup
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    watch,
    reset,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
  });

  const password = watch("password") || "";

  const passwordChecks = [
    { label: "At least 8 characters", test: password.length >= 8 },
    { label: "One uppercase letter", test: /[A-Z]/.test(password) },
    { label: "One number", test: /[0-9]/.test(password) },
    { label: "One special character", test: /[^A-Za-z0-9]/.test(password) },
  ];

  // countdown for resend cooldown
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

  // -------- signup submit ----------
  const onSubmit = async (data: SignupFormData) => {
    setError("");
    setStatus("Creating account...");

    const payload = {
      username: data.name,
      email: data.email,
      password: data.password,
      name: data.name,
    };

    try {
      const result = await publicRequest("/auth/signup", "POST", payload);

      if (result && result.success) {
        // move to verify UI
        setSignupPayload(payload);
        setStatus(
          `OTP sent to ${data.email}. Please enter the code (expires in ${OTP_TTL_MINUTES} minutes).`
        );
        setFlowStep("verify");
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        const message = result?.message || result?.detail || "Signup failed";
        setError(message);
        setStatus("");
      }
    } catch (err: any) {
      const serverDetail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message;
      setError(serverDetail || "Something went wrong. Please try again.");
      setStatus("");
    }
  };

  // -------- verify OTP ----------
  const verifyOtp = async () => {
    setError("");
    if (!signupPayload) {
      setError("Missing signup data. Please start again.");
      setFlowStep("form");
      return;
    }
    if (!otp || otp.trim().length === 0) {
      setError("Please enter the OTP code.");
      return;
    }

    // enforce exactly 6 digits
    if (!/^\d{6}$/.test(otp)) {
      setError("OTP must be exactly 6 digits.");
      return;
    }

    setStatus("Verifying OTP...");

    try {
      const result = await publicRequest("/auth/verify-otp", "POST", {
        email: signupPayload.email,
        otp: otp.trim(),
      });

      if (result && result.success) {
        setStatus("Verification successful. Redirecting to login...");
        setFlowStep("success");

        // clear sensitive state (password)
        setSignupPayload(null);
        setOtp("");

        setTimeout(() => navigate("/login"), 1400);
      } else {
        const message = result?.message || result?.detail || "OTP verification failed";
        setError(message);
        setStatus("");
      }
    } catch (err: any) {
      const serverDetail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message;
      setError(serverDetail || "Failed to verify OTP. Try again.");
      setStatus("");
    }
  };

  // -------- resend OTP (calls signup again) ----------
  const resendOtp = async () => {
    setError("");
    if (!signupPayload) {
      setError("Missing signup data. Please start again.");
      setFlowStep("form");
      return;
    }

    if (resendCooldown > 0) return;

    setStatus("Resending OTP...");
    try {
      // call signup again to refresh OTP on server (your backend updates pending record)
      const result = await publicRequest("/auth/signup", "POST", signupPayload);
      if (result && result.success) {
        setStatus(`OTP resent to ${signupPayload.email}.`);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        const message = result?.message || result?.detail || "Failed to resend OTP";
        setError(message);
        setStatus("");
      }
    } catch (err: any) {
      const serverDetail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message;
      setError(serverDetail || "Failed to resend OTP. Try again later.");
      setStatus("");
    }
  };

  // go back to edit signup details
  const editDetails = () => {
    // if we have previous values, prefill the form
    if (signupPayload) {
      reset({
        name: signupPayload.name,
        email: signupPayload.email,
        password: signupPayload.password,
        confirmPassword: signupPayload.password,
      });
    }
    setError("");
    setStatus("");
    setFlowStep("form");
  };

  // ---------- UI ----------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-300 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Heart className="h-12 w-12 text-dark-900" />
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-dark-900">
            Join The Canine Nutritionist
          </h2>
          <p className="mt-2 text-sm sm:text-base text-dark-700">
            Start your dog's personalized health journey today
          </p>
        </div>

        {/* ---------- FORM STEP ---------- */}
        {flowStep === "form" && (
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {status && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                  {status}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-dark-800 mb-2">
                  Full Name
                </label>
                <input
                  {...register("name")}
                  type="text"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-600"
                  placeholder="Enter your full name"
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-700">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-dark-800 mb-2">
                  Email Address
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-600"
                  placeholder="Enter your email"
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-700">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-dark-800 mb-2">
                  Password
                </label>
                <input
                  {...register("password")}
                  type="password"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-600"
                  placeholder="Choose a strong password"
                  aria-invalid={!!errors.password}
                />
                <ul className="mt-2 space-y-1 text-sm">
                  {passwordChecks.map((check, idx) => (
                    <li
                      key={idx}
                      className={`flex items-center gap-2 ${
                        check.test ? "text-green-600" : "text-gray-500"
                      }`}
                    >
                      {check.test ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      {check.label}
                    </li>
                  ))}
                </ul>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-700">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-dark-800 mb-2">
                  Confirm Password
                </label>
                <input
                  {...register("confirmPassword")}
                  type="password"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-600"
                  placeholder="Confirm your password"
                  aria-invalid={!!errors.confirmPassword}
                />
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-700">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-200 
                ${!isValid || isSubmitting
                  ? "bg-gray-300 cursor-not-allowed text-gray-600"
                  : "bg-gradient-to-r from-primary-600 to-primary-800 text-dark-900 hover:from-primary-500 hover:to-primary-700 transform hover:scale-[1.02]"
                }`}
              >
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-dark-700">
                Already have an account?{" "}
                <Link to="/login" className="text-dark-800 hover:text-dark-900 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* ---------- VERIFY STEP (uses OTPInput) ---------- */}
        {flowStep === "verify" && signupPayload && (
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Verify your email</h3>
              <p className="text-sm text-dark-700">
                We've sent a one-time code to <strong>{signupPayload.email}</strong>.
                Enter it below to finish creating your account.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {status && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                  {status}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-dark-800 mb-2">
                  OTP Code
                </label>

                {/* replaced single text input with OTPInput */}
                <OTPInput
                  length={6}
                  value={otp}
                  onChange={(v) => setOtp(v)}
                  autoFocus={true}
                  disabled={false}
                />

                <p className="mt-2 text-xs text-dark-500 text-center">
                  Enter the 6-digit code. It will expire in {OTP_TTL_MINUTES} minutes.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={verifyOtp}
                  disabled={!/^\d{6}$/.test(otp)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-800 text-dark-900 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Verify
                </button>

                <button
                  onClick={resendOtp}
                  disabled={resendCooldown > 0}
                  className={`px-4 py-2 rounded-lg border ${resendCooldown > 0 ? "text-gray-500 border-gray-200 cursor-not-allowed" : "text-dark-800 border-gray-300 hover:bg-gray-50"}`}
                >
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend OTP"}
                </button>
              </div>

              <div className="pt-2 text-sm text-dark-700">
                <button onClick={editDetails} className="text-sm text-primary-600 hover:underline">
                  Edit details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- SUCCESS STEP ---------- */}
        {flowStep === "success" && (
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 text-center">
            <h3 className="text-lg font-semibold">Signup complete 🎉</h3>
            <p className="mt-2 text-sm text-dark-700">
              Your account was created successfully. Redirecting to the login page...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Signup;
