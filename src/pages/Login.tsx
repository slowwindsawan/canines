import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "react-router-dom";
import { publicRequest } from "../env"; // use publicRequest for login
import logo from "../components/logo.png";
import dog1 from "../assets/Romeo-Badman-7.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const location = useLocation();
  const [error, setError] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const from = location.state?.from?.pathname || "/dashboard";

  const onSubmit = handleSubmit(async (data: LoginFormData) => {
    setError("");
    setIsLoading(true);

    try {
      // Use publicRequest from env.js
      const result = await publicRequest("/auth/login", "POST", data);

      if (!result.access_token) throw new Error(result.message || "Login failed");

      // Save JWT and user info
      localStorage.setItem("jwt_token", result.access_token);
      if (result.user) localStorage.setItem("user_data", JSON.stringify(result.user));

      // Navigate to the original page or dashboard
      window.location.href="/dashboard";
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.response.data?.detail || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  });

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

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8" style={{ fontFamily: "sans-serif" }}>
          <form className="space-y-6" onSubmit={onSubmit}>
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

            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-primary-600 to-primary-800 text-dark-900 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:from-primary-500 hover:to-primary-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base">
              {isLoading ? "Signing In..." : "Sign in to continue your dog’s health journey →"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-dark-700">
              New here? Let’s start fixing your dog’s gut.
              <br />
              <Link to="/signup" className="hover:text-dark-900 font-medium text-blue-600">
                &nbsp;Sign up here →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
