import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { membershipTiers } from '../data/mockData';
import Tiers from './Tiers'
import { 
  User, 
  Settings, 
  CreditCard, 
  Bell, 
  Shield, 
  Crown,
  Check,
  X,
  Edit3,
  Save,
  Calendar,
  AlertTriangle
} from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

const preferencesSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  marketingEmails: z.boolean(),
});

const paymentMethodSchema = z.object({
  type: z.enum(['card', 'paypal']),
  last4: z.string().optional(),
  brand: z.string().optional(),
  expiryMonth: z.number().min(1).max(12).optional(),
  expiryYear: z.number().min(2024).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PreferencesFormData = z.infer<typeof preferencesSchema>;
type PaymentMethodFormData = z.infer<typeof paymentMethodSchema>;

const Account: React.FC = () => {
  const { user, updateProfile, updateSubscription, cancelSubscription, updatePaymentMethod, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'payment' | 'preferences'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
    },
  });

  const preferencesForm = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: user?.preferences || {
      emailNotifications: true,
      smsNotifications: false,
      marketingEmails: true,
    },
  });

  const paymentForm = useForm<PaymentMethodFormData>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: user?.paymentMethod || {
      type: 'card',
      last4: '',
      brand: '',
      expiryMonth: 1,
      expiryYear: 2024,
    },
  });

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'subscription', name: 'Subscription', icon: Crown },
    { id: 'payment', name: 'Payment', icon: CreditCard },
    { id: 'preferences', name: 'Preferences', icon: Bell },
  ];

  const onProfileSubmit = async (data: ProfileFormData) => {
    await updateProfile(data);
    setIsEditing(false);
  };

  const onPreferencesSubmit = async (data: PreferencesFormData) => {
    await updateProfile({ preferences: data });
  };

  const onPaymentSubmit = async (data: PaymentMethodFormData) => {
    await updatePaymentMethod(data);
  };

  const handleSubscriptionChange = async (tier: typeof user.membershipTier) => {
    if (user && tier !== user.membershipTier) {
      await updateSubscription(tier);
    }
  };

  const handleCancelSubscription = async () => {
    await cancelSubscription();
    setShowCancelConfirm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trialing': return 'bg-blue-100 text-blue-800';
      case 'past_due': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-primary-200 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-900 mb-2">Account Settings</h1>
          <p className="text-base sm:text-lg text-dark-700">Manage your profile, subscription, and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1 sm:space-y-2">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-400 text-dark-900 border border-primary-500'
                        : 'text-dark-700 hover:bg-primary-300'
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow-sm border border-primary-400 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-dark-900">Profile Information</h2>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center space-x-1 sm:space-x-2 text-dark-800 hover:text-dark-900 transition-colors text-sm sm:text-base"
                  >
                    {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                    <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                  </button>
                </div>

                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-dark-800 mb-2">Full Name</label>
                      <input
                        {...profileForm.register('name')}
                        disabled={!isEditing}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 disabled:bg-primary-100 disabled:text-dark-600 text-sm sm:text-base"
                      />
                      {profileForm.formState.errors.name && (
                        <p className="mt-2 text-sm text-red-700">{profileForm.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-800 mb-2">Email Address</label>
                      <input
                        {...profileForm.register('email')}
                        disabled={!isEditing}
                        type="email"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 disabled:bg-primary-100 disabled:text-dark-600 text-sm sm:text-base"
                      />
                      {profileForm.formState.errors.email && (
                        <p className="mt-2 text-sm text-red-700">{profileForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-800 mb-2">Phone Number</label>
                      <input
                        {...profileForm.register('phone')}
                        disabled={!isEditing}
                        type="tel"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 disabled:bg-primary-100 disabled:text-dark-600 text-sm sm:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-800 mb-2">Member Since</label>
                      <input
                        value={new Date(user.joinDate).toLocaleDateString()}
                        disabled
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg bg-primary-100 text-dark-600 text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  {/* Address Section */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-dark-900 mb-4">Address</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-dark-800 mb-2">Street Address</label>
                        <input
                          {...profileForm.register('address.street')}
                          disabled={!isEditing}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 disabled:bg-primary-100 disabled:text-dark-600 text-sm sm:text-base"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-dark-800 mb-2">City</label>
                        <input
                          {...profileForm.register('address.city')}
                          disabled={!isEditing}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 disabled:bg-primary-100 disabled:text-dark-600 text-sm sm:text-base"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-dark-800 mb-2">State</label>
                        <input
                          {...profileForm.register('address.state')}
                          disabled={!isEditing}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 disabled:bg-primary-100 disabled:text-dark-600 text-sm sm:text-base"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-dark-800 mb-2">ZIP Code</label>
                        <input
                          {...profileForm.register('address.zipCode')}
                          disabled={!isEditing}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 disabled:bg-primary-100 disabled:text-dark-600 text-sm sm:text-base"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-dark-800 mb-2">Country</label>
                        <input
                          {...profileForm.register('address.country')}
                          disabled={!isEditing}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 disabled:bg-primary-100 disabled:text-dark-600 text-sm sm:text-base"
                        />
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex justify-center sm:justify-end">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-gradient-to-r from-primary-600 to-primary-800 text-dark-900 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:from-primary-500 hover:to-primary-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 text-sm sm:text-base"
                      >
                        <Save className="h-4 w-4" />
                        <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
                <Tiers/>
            )}

            {/* Payment Tab */}
            {activeTab === 'payment' && (
              <div className="bg-white rounded-xl shadow-sm border border-primary-400 p-6">
                <h2 className="text-xl font-bold text-dark-900 mb-6">Payment Method</h2>

                {user.paymentMethod && (
                  <div className="mb-6 p-4 bg-primary-100 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <CreditCard className="h-8 w-8 text-dark-600" />
                        <div>
                          <p className="font-medium text-dark-900">
                            {user.paymentMethod.brand} ending in {user.paymentMethod.last4}
                          </p>
                          <p className="text-sm text-dark-700">
                            Expires {user.paymentMethod.expiryMonth}/{user.paymentMethod.expiryYear}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        Active
                      </span>
                    </div>
                  </div>
                )}

                <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-dark-800 mb-2">Payment Type</label>
                    <select
                      {...paymentForm.register('type')}
                      className="w-full px-4 py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                    >
                      <option value="card">Credit/Debit Card</option>
                      <option value="paypal">PayPal</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-dark-800 mb-2">Card Brand</label>
                      <input
                        {...paymentForm.register('brand')}
                        placeholder="e.g., Visa, Mastercard"
                        className="w-full px-4 py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-800 mb-2">Last 4 Digits</label>
                      <input
                        {...paymentForm.register('last4')}
                        placeholder="1234"
                        maxLength={4}
                        className="w-full px-4 py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-800 mb-2">Expiry Month</label>
                      <select
                        {...paymentForm.register('expiryMonth', { valueAsNumber: true })}
                        className="w-full px-4 py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                          <option key={month} value={month}>{month.toString().padStart(2, '0')}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-800 mb-2">Expiry Year</label>
                      <select
                        {...paymentForm.register('expiryYear', { valueAsNumber: true })}
                        className="w-full px-4 py-3 border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                      >
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-primary-600 to-primary-800 text-dark-900 px-6 py-3 rounded-lg font-medium hover:from-primary-500 hover:to-primary-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? 'Updating...' : 'Update Payment Method'}
                  </button>
                </form>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="bg-white rounded-xl shadow-sm border border-primary-400 p-6">
                <h2 className="text-xl font-bold text-dark-900 mb-6">Notification Preferences</h2>

                <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-primary-400 rounded-lg">
                      <div>
                        <h3 className="font-medium text-dark-900">Email Notifications</h3>
                        <p className="text-sm text-dark-700">Receive updates about your dog's health protocols</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          {...preferencesForm.register('emailNotifications')}
                          type="checkbox"
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-primary-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-primary-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-800"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-primary-400 rounded-lg">
                      <div>
                        <h3 className="font-medium text-dark-900">SMS Notifications</h3>
                        <p className="text-sm text-dark-700">Get text messages for urgent health alerts</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          {...preferencesForm.register('smsNotifications')}
                          type="checkbox"
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-primary-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-primary-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-800"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-primary-400 rounded-lg">
                      <div>
                        <h3 className="font-medium text-dark-900">Marketing Emails</h3>
                        <p className="text-sm text-dark-700">Receive tips, articles, and product updates</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          {...preferencesForm.register('marketingEmails')}
                          type="checkbox"
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-primary-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-primary-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-800"></div>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-primary-600 to-primary-800 text-dark-900 px-6 py-3 rounded-lg font-medium hover:from-primary-500 hover:to-primary-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? 'Saving...' : 'Save Preferences'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Cancel Subscription Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-bold text-dark-900">Cancel Subscription</h3>
              </div>
              <p className="text-dark-700 mb-6">
                Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelSubscription}
                  disabled={isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 bg-primary-400 hover:bg-primary-500 text-dark-800 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;