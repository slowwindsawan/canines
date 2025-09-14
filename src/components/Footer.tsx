import React from 'react';
import { Heart } from 'lucide-react';
import logo from "./logo.png"

const Footer: React.FC = () => {
  return (
    <footer className="bg-primary-200 border-t border-primary-400">
      <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <span className="text-lg font-semibold text-dark-900"><img className="w-[150px] sm:w-[200px]" src={logo} /></span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-dark-700">
            <a href="#" className="hover:text-dark-900 transition-colors"><b className='text-gray-600'>Support:</b> admin@thecaninenutritionist.com</a>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-primary-400">
          <p className="text-center text-xs sm:text-sm text-dark-600">
            © 2025 The Canine Nutritionist. All rights reserved. From the bowl up — nutrition that heals.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;