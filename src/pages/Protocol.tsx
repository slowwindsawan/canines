import React from 'react';
import { Link } from 'react-router-dom';
import mockProtocols from '../data/mockData';
import { useDog } from '../context/DogContext';
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  Pill, 
  Heart,
  Dog,
  Plus
} from 'lucide-react';

const Protocol: React.FC = () => {
  const { selectedDog } = useDog();
  const protocol = selectedDog ? mockProtocols.find(p => p.dogId === selectedDog.id) : null;

  // If no dog is selected, show selection prompt
  if (!selectedDog) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Dog className="h-10 w-10 text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Select a Pet</h1>
            <p className="text-lg text-gray-600 mb-8">
              Choose a pet from your dashboard to view their personalized health protocol
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02]"
            >
              <span>Go to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If dog is selected but no protocol exists, show assessment prompt
  if (!protocol) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-10 w-10 text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Protocol Not Available</h1>
            <p className="text-lg text-gray-600 mb-2">
              {selectedDog.name} doesn't have a health protocol yet
            </p>
            <p className="text-gray-600 mb-8">
              Complete a health assessment to generate a personalized protocol
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/intake"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02]"
              >
                <Plus className="h-5 w-5" />
                <span>Start Health Assessment</span>
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {selectedDog.name}'s Health Protocol
          </h1>
          <p className="text-lg text-gray-600">
            Custom plan for your {selectedDog.breed}
          </p>
          <div className="mt-4 inline-flex items-center space-x-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium">
            <Calendar className="h-4 w-4" />
            <span>Created on {new Date(protocol.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Meal Plan */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Clock className="h-6 w-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Daily Meal Plan</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                  Breakfast
                </h3>
                <p className="text-gray-700">{protocol.mealPlan.breakfast}</p>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  Dinner
                </h3>
                <p className="text-gray-700">{protocol.mealPlan.dinner}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Meals per day:</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {protocol.mealPlan.mealsPerDay}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Supplements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Pill className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">Supplement Protocol</h2>
            </div>
            
            <div className="space-y-4">
              {protocol.supplements.map((supplement, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 font-medium">{supplement}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Always consult with your veterinarian before starting any new supplements.
              </p>
            </div>
          </div>
        </div>

        {/* Lifestyle Tips */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Heart className="h-6 w-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-gray-900">Lifestyle Recommendations</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {protocol.lifestyleTips.map((tip, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-emerald-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Next Steps</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <p className="text-gray-700">Start implementing the meal plan gradually over 7-10 days</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <p className="text-gray-700">Begin supplement routine as recommended</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <p className="text-gray-700">Track your dog's progress weekly using our tracker</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
              <p className="text-gray-700">
                Schedule follow-up assessment in 4 weeks
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2">
              <span>📄</span>
              <span>Download Plan (PDF)</span>
            </button>
            <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2">
              <span>📅</span>
              <span>Book Consultation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Protocol;