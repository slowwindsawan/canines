import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart } from 'lucide-react';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

const Signup: React.FC = () => {
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      setError('');
      await signup(data.name, data.email, data.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-300 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Heart className="h-12 w-12 text-dark-900" />
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-dark-900">Join The Canine Nutritionist</h2>
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
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-dark-800 mb-2">
                Full Name
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-colors text-sm sm:text-base"
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-700">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-800 mb-2">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-colors text-sm sm:text-base"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-700">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-800 mb-2">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-colors text-sm sm:text-base"
                placeholder="Choose a strong password"
              />
              {errors.password && (
                <p className="mt-2 text-sm text-red-700">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-dark-800 mb-2">
                Confirm Password
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-colors text-sm sm:text-base"
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-700">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-800 text-dark-900 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:from-primary-500 hover:to-primary-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-dark-700">
              Already have an account?{' '}
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