'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';


function LeafPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-10 -right-10 w-72 h-72 bg-brand-400/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/3 -left-20 w-96 h-96 bg-brand-300/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-20 right-1/4 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl"></div>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(user.defaultRoute);
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-lg shadow-md' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md overflow-hidden border border-gray-100">
              <img src="/skrapo-logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-bold text-gray-800">Skrapo</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="px-4 py-2 sm:px-5 sm:py-2.5 text-brand-700 font-bold hover:bg-brand-50 rounded-full transition-all text-sm sm:text-base border border-brand-100/50 sm:border-transparent"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 sm:px-6 sm:py-2.5 bg-brand-500 text-white font-bold rounded-full hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 hover:-translate-y-0.5 text-sm sm:text-base"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <LeafPattern />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 rounded-full mb-6">
                <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span>
                <span className="text-brand-700 text-sm font-medium">Eco-friendly scrap management</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                Turn Your Scrap Into{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-700">
                  Green Value
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-lg leading-relaxed">
                Schedule doorstep scrap pickups with certified Scrap Champions. 
                Easy, reliable, and sustainable waste management at your fingertips.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="group px-8 py-4 bg-brand-500 text-white font-bold rounded-2xl hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-1 text-lg flex items-center gap-2"
                >
                  Schedule a Pickup
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <a
                  href="#how-it-works"
                  className="px-8 py-4 border-2 border-brand-200 text-brand-700 font-bold rounded-2xl hover:bg-brand-50 hover:border-brand-300 transition-all text-lg"
                >
                  Learn More
                </a>
              </div>
              <div className="mt-10 flex items-center gap-8">
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-brand-600">500+</div>
                  <div className="text-sm text-gray-500">Pickups Done</div>
                </div>
                <div className="w-px h-12 bg-gray-200"></div>
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-brand-600">50+</div>
                  <div className="text-sm text-gray-500">Scrap Champions</div>
                </div>
                <div className="w-px h-12 bg-gray-200"></div>
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-brand-600">4.8</div>
                  <div className="text-sm text-gray-500">User Rating</div>
                </div>
              </div>
            </div>
            <div className="animate-slide-right hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-400 to-brand-600 rounded-3xl rotate-3 opacity-20"></div>
                <div className="relative bg-gradient-to-br from-brand-50 to-white rounded-3xl p-10 border border-brand-100 shadow-2xl">
                  <div className="flex flex-col items-center">
                    <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-6 animate-float shadow-xl border border-gray-100 overflow-hidden">
                      <img src="/skrapo-logo.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full">
                      {[
                        { icon: '📦', label: 'Paper', color: 'bg-amber-50 border-amber-200' },
                        { icon: '🧴', label: 'Plastic', color: 'bg-blue-50 border-blue-200' },
                        { icon: '🔩', label: 'Metal', color: 'bg-gray-50 border-gray-200' },
                        { icon: '🥛', label: 'Milk Covers', color: 'bg-green-50 border-green-200' },
                      ].map((item, index) => (
                        <div
                          key={item.label}
                          className={`${item.color} border rounded-xl p-4 text-center transition-transform hover:scale-105 animate-fade-in`}
                          style={{ animationDelay: `${(index + 1) * 150}ms` }}
                        >
                          <span className="text-2xl">{item.icon}</span>
                          <p className="text-sm font-medium text-gray-700 mt-1">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-gradient-to-b from-brand-50/50 to-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-brand-100 text-brand-700 rounded-full text-sm font-semibold mb-4">
              How It Works
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Simple as <span className="text-brand-500">1-2-3</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From scheduling to pickup, we make scrap collection effortless
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Schedule Pickup',
                description: 'Choose your scrap types, pick a convenient time slot, and submit your request in seconds.',
                icon: '📅',
                gradient: 'from-brand-400 to-brand-600',
              },
              {
                step: '02',
                title: 'Scrap Champion Assigned',
                description: 'Our admin team assigns a certified Scrap Champion near your location for the pickup.',
                icon: '🏆',
                gradient: 'from-brand-500 to-brand-700',
              },
              {
                step: '03',
                title: 'Doorstep Collection',
                description: 'Your Scrap Champion arrives at your door, weighs the scrap, and pays you instantly.',
                icon: '🚪',
                gradient: 'from-brand-600 to-brand-800',
              },
            ].map((item, index) => (
              <div
                key={item.step}
                className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  {item.icon}
                </div>
                <div className="absolute top-6 right-6 text-5xl font-extrabold text-brand-100 group-hover:text-brand-200 transition-colors">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-brand-100 text-brand-700 rounded-full text-sm font-semibold mb-4">
              For Everyone
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Built for Every Role
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you&apos;re a customer, admin, or scrap champion — Skrapo has you covered
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                role: 'Customer',
                icon: '🏠',
                description: 'Schedule pickups from your doorstep. Track your orders and provide feedback.',
                features: ['Easy scheduling', 'Order tracking', 'Rate & review'],
                color: 'brand',
                link: '/register?role=customer',
              },
              {
                role: 'Admin',
                icon: '⚙️',
                description: 'Manage orders, assign Scrap Champions, and monitor operations seamlessly.',
                features: ['Order management', 'Champion allocation', 'Analytics dashboard'],
                color: 'brand',
                link: '/register?role=admin',
              },
              {
                role: 'Scrap Champion',
                icon: '🏆',
                description: 'Accept pickup jobs, earn money, and build your reputation in the community.',
                features: ['Job notifications', 'Route optimization', 'Performance stats'],
                color: 'brand',
                link: '/register?role=scrapChamp',
              },
            ].map((item) => (
              <div
                key={item.role}
                className="group relative bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-brand-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{item.role}</h3>
                <p className="text-gray-600 mb-6">{item.description}</p>
                <ul className="space-y-2 mb-8">
                  {item.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-gray-700">
                      <svg className="w-5 h-5 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={item.link}
                  className="inline-flex items-center gap-2 text-brand-600 font-semibold hover:text-brand-700 group-hover:gap-3 transition-all"
                >
                  Get Started
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-brand-500 to-brand-700 rounded-3xl p-12 lg:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
            </div>
            <div className="relative">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">
                Ready to Go Green?
              </h2>
              <p className="text-brand-100 text-lg mb-8 max-w-lg mx-auto">
                Join thousands of users who are making a difference by recycling their scrap responsibly.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-700 font-bold rounded-2xl hover:bg-brand-50 transition-all shadow-xl hover:-translate-y-1 text-lg"
              >
                Create Your Account
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center overflow-hidden border border-gray-100">
                <img src="/skrapo-logo.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-bold text-white">Skrapo</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-white transition-colors">Register</Link>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} Skrapo. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
