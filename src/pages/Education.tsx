import React from 'react';
import { mockArticles } from '../data/mockData';
import { BookOpen, ArrowRight, Star, Clock } from 'lucide-react';

const Education: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [selectedArticle, setSelectedArticle] = React.useState<string | null>(null);

  const categories = [
    { id: 'all', name: 'All Articles' },
    { id: 'Digestive Health', name: 'Digestive Health' },
    { id: 'Supplements', name: 'Supplements' },
    { id: 'Lifestyle', name: 'Lifestyle' },
    { id: 'Nutrition', name: 'Nutrition' },
  ];

  const filteredArticles = selectedCategory === 'all' 
    ? mockArticles 
    : mockArticles.filter(article => article.category === selectedCategory);

  const featuredArticles = mockArticles.filter(article => article.featured);

  if (selectedArticle) {
    const article = mockArticles.find(a => a.id === selectedArticle);
    if (article) {
      return (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSelectedArticle(null)}
              className="mb-6 flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span>Back to Articles</span>
            </button>

            <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="mb-6">
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                    {article.category}
                  </span>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>5 min read</span>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>
                <p className="text-lg text-gray-600">{article.summary}</p>
              </div>

              <div className="prose prose-emerald max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {article.content || `
                    This is where the full article content would appear. In a real application, this would contain 
                    comprehensive information about ${article.title.toLowerCase()}.

                    Our expert veterinarians and canine nutritionists have compiled this information to help you 
                    better understand your dog's health needs. Each article is research-backed and designed to 
                    provide practical, actionable advice for dog owners.

                    Key topics covered include:
                    • Understanding the fundamentals
                    • Practical implementation strategies  
                    • Common mistakes to avoid
                    • When to consult your veterinarian
                    • Success stories from other pet parents

                    Remember that every dog is unique, and what works for one may not work for another. Always 
                    consult with your veterinarian before making significant changes to your dog's diet or 
                    health routine.
                  `}
                </p>
              </div>
            </article>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <BookOpen className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Educational Resources
          </h1>
          <p className="text-lg text-gray-600">
            Expert guidance for your dog's health and wellbeing
          </p>
        </div>

        {/* Featured Articles */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Star className="h-6 w-6 text-yellow-500 mr-2" />
            Featured Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredArticles.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedArticle(article.id)}
              >
                <div className="p-6">
                  <div className="flex items-center space-x-2 text-sm text-emerald-600 mb-3">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs">
                      {article.category}
                    </span>
                    <Star className="h-4 w-4 text-yellow-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {article.summary}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>5 min read</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-emerald-500'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* All Articles */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {selectedCategory === 'all' ? 'All Articles' : `${selectedCategory} Articles`}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedArticle(article.id)}
              >
                <div className="p-6">
                  <div className="flex items-center space-x-2 text-sm mb-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      {article.category}
                    </span>
                    {article.featured && <Star className="h-4 w-4 text-yellow-500" />}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {article.summary}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>5 min read</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600">Try selecting a different category.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Education;