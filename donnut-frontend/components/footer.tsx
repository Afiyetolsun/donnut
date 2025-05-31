export function Footer() {
  return (
    <footer className="border-t border-opacity-20 border-gray-400 bg-white bg-opacity-50 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <img src="/logo.svg" alt="Donnut logo" className="w-8 h-8 rounded-full mr-2" />
              <span className="text-2xl font-bold" style={{ color: "#5D4037" }}>
                donnut
              </span>
            </div>
            <p className="text-sm" style={{ color: "#5D4037" }}>
              The Sweetest Way to Support Creativity in Web3
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "#5D4037" }}>Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-sm hover:opacity-75" style={{ color: "#5D4037" }}>
                  Home
                </a>
              </li>
              <li>
                <a href="/dashboard" className="text-sm hover:opacity-75" style={{ color: "#5D4037" }}>
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/dashboard/create-link" className="text-sm hover:opacity-75" style={{ color: "#5D4037" }}>
                  Create Link
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "#5D4037" }}>Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="/privacy" className="text-sm hover:opacity-75" style={{ color: "#5D4037" }}>
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-sm hover:opacity-75" style={{ color: "#5D4037" }}>
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-opacity-20 border-gray-400 text-center text-sm" style={{ color: "#5D4037" }}>
          © {new Date().getFullYear()} Donnut. All rights reserved.
        </div>
      </div>
    </footer>
  );
} 