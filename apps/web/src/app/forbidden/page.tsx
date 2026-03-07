'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

function RecycleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 19H5L8 13L11 19H9L10 21H14L8 10L2 21H6L7 19Z" fill="currentColor" />
      <path d="M17 19H19L16 13L13 19H15L14 21H10L16 10L22 21H18L17 19Z" fill="currentColor" />
      <path d="M12 3L15 9H9L12 3ZM12 1L7 10H17L12 1Z" fill="currentColor" />
    </svg>
  );
}

export default function ForbiddenPage() {
  const { user, isAuthenticated } = useAuth();

  const homeRoute = user?.defaultRoute || '/';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-brand-50/30 flex items-center justify-center px-6">
      <div className="text-center animate-fade-in max-w-lg">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-6xl font-extrabold text-gray-900 mb-4">403</h1>
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Access Forbidden</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          You don&apos;t have permission to access this page. 
          {user && (
            <span> Your current role is <strong className="text-brand-600">{user.role}</strong>.</span>
          )}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {isAuthenticated ? (
            <Link
              href={homeRoute}
              className="px-6 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go to My Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-6 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
            >
              Sign In
            </Link>
          )}
          <Link
            href="/"
            className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            Back to Home
          </Link>
        </div>
        <div className="mt-12 flex items-center justify-center gap-2 text-gray-400">
          <div className="w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center">
            <RecycleIcon className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-medium">Skrapo</span>
        </div>
      </div>
    </div>
  );
}
