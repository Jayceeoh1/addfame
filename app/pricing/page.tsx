'use client'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600">
            Choose the plan that works best for your needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Starter Plan */}
          <div className="border border-gray-200 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
            <p className="text-gray-600 mb-6">Perfect for getting started</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">$0</span>
              <span className="text-gray-600">/month</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-gray-700">
                <span className="mr-3">✓</span>
                Up to 5 collaborations
              </li>
              <li className="flex items-center text-gray-700">
                <span className="mr-3">✓</span>
                Basic analytics
              </li>
              <li className="flex items-center text-gray-700">
                <span className="mr-3">✓</span>
                Email support
              </li>
            </ul>
            <button className="w-full bg-gray-100 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-200">
              Get Started
            </button>
          </div>

          {/* Professional Plan */}
          <div className="border-2 border-orange-400 rounded-lg p-8 relative">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-orange-400 text-white px-4 py-1 rounded-full text-sm font-semibold">
              Most Popular
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Professional</h3>
            <p className="text-gray-600 mb-6">For growing businesses</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">$99</span>
              <span className="text-gray-600">/month</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-gray-700">
                <span className="mr-3">✓</span>
                Unlimited collaborations
              </li>
              <li className="flex items-center text-gray-700">
                <span className="mr-3">✓</span>
                Advanced analytics
              </li>
              <li className="flex items-center text-gray-700">
                <span className="mr-3">✓</span>
                Priority support
              </li>
              <li className="flex items-center text-gray-700">
                <span className="mr-3">✓</span>
                Custom integrations
              </li>
            </ul>
            <button className="w-full bg-orange-400 text-white py-3 rounded-lg font-semibold hover:bg-orange-500">
              Start Free Trial
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="border border-gray-200 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
            <p className="text-gray-600 mb-6">For large-scale operations</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">Custom</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-gray-700">
                <span className="mr-3">✓</span>
                Everything in Professional
              </li>
              <li className="flex items-center text-gray-700">
                <span className="mr-3">✓</span>
                Dedicated account manager
              </li>
              <li className="flex items-center text-gray-700">
                <span className="mr-3">✓</span>
                Custom SLA
              </li>
              <li className="flex items-center text-gray-700">
                <span className="mr-3">✓</span>
                White-label options
              </li>
            </ul>
            <button className="w-full bg-gray-100 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-200">
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
