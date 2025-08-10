import React from 'react';
import { useAuth } from '../context/AuthContext';
import { membershipTiers } from '../data/mockData';
import { Crown, Check, Star } from 'lucide-react';

const Tiers: React.FC = () => {
  const { user } = useAuth();

  const getTierIcon = (tierId: string) => {
    switch (tierId) {
      case 'starter': return '🌱';
      case 'deepdive': return '🎯';
      case 'custom': return '👑';
      default: return '📋';
    }
  };

  return (
    <div className="min-h-screen bg-primary-200 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Crown className="h-12 w-12 text-dark-900" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-900 mb-2">
            Membership Tiers
          </h1>
          <p className="text-base sm:text-lg text-dark-700 px-4">
            Choose the perfect plan for your dog's health journey
          </p>
        </div>

        {/* Current Tier Banner */}
        {user && (
          <div className="bg-gradient-to-r from-primary-100 to-primary-300 border border-primary-500 rounded-xl p-4 sm:p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="text-3xl">
                  {getTierIcon(user.membershipTier)}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-dark-900">
                    Current Plan: {membershipTiers.find(t => t.id === user.membershipTier)?.name}
                  </h3>
                  <p className="text-sm sm:text-base text-dark-700">
                    You're getting the most out of your {user.membershipTier} membership!
                  </p>
                </div>
              </div>
              <div className="flex justify-center sm:block">
                <div className="flex items-center space-x-2 bg-primary-400 text-dark-900 px-4 py-2 rounded-full text-sm font-medium">
                  <Star className="h-4 w-4" />
                  <span>Active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {membershipTiers.map((tier) => {
            const isCurrentTier = user?.membershipTier === tier.id;
            const isRecommended = tier.recommended;

            return (
              <div
                key={tier.id}
                className={`relative bg-white rounded-xl shadow-sm border-2 transition-all duration-200 hover:shadow-lg ${
                  isCurrentTier 
                    ? 'border-primary-800 ring-2 ring-primary-300' 
                    : isRecommended
                    ? 'border-primary-500'
                    : 'border-primary-400 hover:border-primary-500'
                }`}
              >
                {/* Recommended Badge */}
                {isRecommended && !isCurrentTier && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary-800 text-white px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-medium">
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Current Tier Badge */}
                {isCurrentTier && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary-900 text-white px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-medium">
                      Your Current Gut Plan
                    </div>
                  </div>
                )}

                <div className="p-6 sm:p-8">
                  {/* Tier Header */}
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">{getTierIcon(tier.id)}</div>
                    <h3 className="text-xl sm:text-2xl font-bold text-dark-900 mb-2">{tier.name}</h3>
                    <div className="text-2xl sm:text-3xl font-bold text-dark-800 mb-1">{tier.price}</div>
                    <div className="text-sm text-dark-600">per dog</div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4 mb-8">
                    {tier.features.map((feature, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <Check className="h-5 w-5 text-dark-800 flex-shrink-0 mt-0.5" />
                        <span className="text-dark-700 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <button
                    disabled={isCurrentTier}
                    className={`w-full py-2 sm:py-3 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] text-sm sm:text-base ${
                      isCurrentTier
                        ? 'bg-primary-300 text-dark-500 cursor-not-allowed'
                        : isRecommended
                        ? 'bg-gradient-to-r from-primary-600 to-primary-800 hover:from-primary-500 hover:to-primary-700 text-dark-900'
                        : 'bg-gradient-to-r from-primary-700 to-primary-900 hover:from-primary-600 hover:to-primary-800 text-white'
                    }`}
                  >
                    {isCurrentTier ? 'Your Current Gut Plan' : 'Upgrade to ' + tier.name}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-12 sm:mt-16 bg-white rounded-xl shadow-sm border border-primary-400 p-6 sm:p-8">
          <h3 className="text-lg sm:text-xl font-bold text-dark-900 mb-6 text-center">
            Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div>
              <h4 className="font-semibold text-dark-900 mb-2">Can I change my plan anytime?</h4>
              <p className="text-dark-700 text-sm">
                Yes, you can upgrade or downgrade your membership at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-dark-900 mb-2">What if I have multiple dogs?</h4>
              <p className="text-dark-700 text-sm">
                Each dog requires a separate plan to ensure personalized protocols and tracking.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-dark-900 mb-2">Is there a money-back guarantee?</h4>
              <p className="text-dark-700 text-sm">
                We offer a 30-day money-back guarantee if you're not satisfied with your plan.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-dark-900 mb-2">Do you work with veterinarians?</h4>
              <p className="text-dark-700 text-sm">
                Our Custom tier includes direct access to licensed veterinarians for consultations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tiers;