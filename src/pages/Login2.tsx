import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Heart } from "lucide-react";
import logo from "../components/logo.png";
import dog1 from "../assets/Romeo-Badman-7.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = React.useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const from = location.state?.from?.pathname || "/dashboard";

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError("");
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  return (
    <div
      className="font-albert min-h-screen flex items-center justify-center bg-gradient-to-br py-6 px-4 sm:px-6 lg:px-8"
      style={{ background: "#f0f0ec" }}
    >
      <div className="max-w-md w-full space-y-8">
        <div className="text-center translate-y-[34px]">
          <img
            className="w-[300px] md:w-[300px] m-auto mb-25px mb-4"
            src={logo}
          />
          <div className="w-[400px] m-auto text-center">
            <h2
              className="mt-4 text-md font-bold text-dark-900"
              style={{fontFamily: "sans-serif" }}
            >
              Welcome to The Gut Fix Companion
            </h2>
            <p
              className="text-sm text-gray-600 font-light"
              style={{ fontFamily: "sans-serif" }}
            >
              A dog nutritionist in your pocket, 24/7.
            </p>
          </div>
          <div className="grid grid-cols-1 items-center bg-transparent py-0 px-2 rounded-xl">
            {/* Left: Dog Image */}
            <div className="col-span-1">
              <img
                src={dog1} // Replace with actual dog image URL
                alt="Dog"
                style={{height:"200px", width:"auto", margin:"auto"}}
                className="w-full aspect-square object-cover rounded-lg"
              />
            </div>
            {/* <div className="col-span-1 w-[250px]">
              <h2
                className="mt-4 text-md font-bold text-dark-900 text-left"
                style={{ width: "250px", fontFamily: "sans-serif" }}
              >
                Welcome to The Gut Fix Companion
              </h2>
              <p
                className="text-left text-sm text-gray-600 font-light"
                style={{ width: "250px", fontFamily: "sans-serif" }}
              >
                A dog nutritionist in your pocket, 24/7.
              </p>
            </div> */}
          </div>
        </div>

        <div
          className="bg-white rounded-xl shadow-lg p-6 sm:p-8"
          style={{ fontFamily: "sans-serif" }}
        >
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="bg-primary-200 border border-primary-400 text-dark-800 px-4 py-3 rounded-lg text-xs sm:text-sm">
              <strong>Demo credentials:</strong> demo@example.com / demo123
            </div>

            <div className="bg-primary-100 border border-primary-300 text-dark-800 px-4 py-3 rounded-lg text-xs sm:text-sm">
              <strong>Admin Demo:</strong>
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="ml-2 underline hover:no-underline font-medium"
              >
                Access Admin Dashboard
              </button>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-dark-800 mb-2"
              >
                Email Address
              </label>
              <input
                {...register("email")}
                type="email"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-colors text-sm sm:text-base"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-700">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-dark-800 mb-2"
              >
                Password
              </label>
              <input
                {...register("password")}
                type="password"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-colors text-sm sm:text-base"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-2 text-sm text-red-700">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-800 text-dark-900 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:from-primary-500 hover:to-primary-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base"
            >
              {isLoading
                ? "Signing In..."
                : "Sign in to continue your dog’s health journey →"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-dark-700">
              New here? Let’s start fixing your dog’s gut.
              <br />
              <Link
                to="/signup"
                className="text-dark-800 hover:text-dark-900 font-medium"
              >
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
