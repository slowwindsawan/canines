import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, CheckCircle2, XCircle } from 'lucide-react';
import { publicRequest } from '../env';  // ✅ use helper

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = React.useState<string>('');
  const [status, setStatus] = React.useState<string>(''); // ✅ signup status

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: "onChange", // ✅ enables real-time validation
  });

  const password = watch("password") || "";

  const passwordChecks = [
    { label: "At least 8 characters", test: password.length >= 8 },
    { label: "One uppercase letter", test: /[A-Z]/.test(password) },
    { label: "One number", test: /[0-9]/.test(password) },
    { label: "One special character", test: /[^A-Za-z0-9]/.test(password) },
  ];

  const onSubmit = async (data: SignupFormData) => {
    try {
      setError('');
      setStatus('Creating account...');

      const result = await publicRequest("/auth/signup", "POST", {
        username: data.name,
        email: data.email,
        password: data.password,
      });

      console.log(result)

      if (result.success) {
        setStatus("Signup successful! Redirecting...");
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(result.message || "Signup failed");
        setStatus('');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
      setStatus('');
    }
  };

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
                {...register('name')}
                type="text"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-600"
                placeholder="Enter your full name"
              />
              {errors.name && <p className="mt-2 text-sm text-red-700">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-dark-800 mb-2">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-600"
                placeholder="Enter your email"
              />
              {errors.email && <p className="mt-2 text-sm text-red-700">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-dark-800 mb-2">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-600"
                placeholder="Choose a strong password"
              />
              {/* Live password guide */}
              <ul className="mt-2 space-y-1 text-sm">
                {passwordChecks.map((check, idx) => (
                  <li key={idx} className={`flex items-center gap-2 ${check.test ? "text-green-600" : "text-gray-500"}`}>
                    {check.test ? <CheckCircle2 size={16}/> : <XCircle size={16}/>}
                    {check.label}
                  </li>
                ))}
              </ul>
              {errors.password && <p className="mt-2 text-sm text-red-700">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-dark-800 mb-2">
                Confirm Password
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-600"
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && <p className="mt-2 text-sm text-red-700">{errors.confirmPassword.message}</p>}
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
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
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
      </div>
    </div>
  );
};

export default Signup;
