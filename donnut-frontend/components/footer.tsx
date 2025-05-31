import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-opacity-20 border-gray-400 bg-white bg-opacity-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <img src="/logo.svg" alt="Donnut logo" className="w-8 h-8 rounded-full mr-2" />
              <span className="text-2xl font-bold" style={{ color: "#5D4037" }}>
                donnut
              </span>
            </div>
            <p className="opacity-75 mb-4" style={{ color: "#5D4037" }}>
              The sweetest connection in Web3. Supporting creators, one donnut at a time.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                Twitter
              </Link>
              <Link href="#" className="opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                GitHub
              </Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4" style={{ color: "#5D4037" }}>
              Product
            </h4>
            <div className="space-y-2">
              <Link href="/#how-it-works" className="block opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                How it Works
              </Link>
              <Link href="/#for-creators" className="block opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                For Creators
              </Link>
              <Link href="/#for-fans" className="block opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                For Fans
              </Link>
              <Link href="#" className="block opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                Pricing
              </Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4" style={{ color: "#5D4037" }}>
              Support
            </h4>
            <div className="space-y-2">
              <Link href="#" className="block opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                Help Center
              </Link>
              <Link href="#" className="block opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                Terms of Service
              </Link>
              <Link href="#" className="block opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                Privacy Policy
              </Link>
              <Link href="#" className="block opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                Contact
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-opacity-20 border-gray-400 mt-8 pt-8 text-center">
          <p className="opacity-75" style={{ color: "#5D4037" }}>
            © {new Date().getFullYear()} donnut. All rights reserved. Made with <img src="/logo.svg" alt="Donnut logo" className="inline w-5 h-5 align-text-bottom mx-1" /> for the Web3 community.
          </p>
        </div>
      </div>
    </footer>
  )
} 