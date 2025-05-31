import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-opacity-20 border-gray-400 bg-white bg-opacity-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center mb-4">
            <img src="/logo.svg" alt="Donnut logo" className="w-6 h-6 rounded-full mr-2" />
            <span className="text-xl font-bold" style={{ color: "#5D4037" }}>
              donnut
            </span>
          </div>
          <div className="mb-4">
            <Link href="/#how-it-works" className="opacity-75 hover:opacity-100 transition-opacity" style={{ color: "#5D4037" }}>
              How it Works
            </Link>
          </div>
          <div className="space-y-2 text-sm opacity-75" style={{ color: "#5D4037" }}>
            <p>Made with <img src="/logo.svg" alt="Donnut logo" className="inline w-4 h-4 mx-1" /> for the Web3 community</p>
            <p>© {new Date().getFullYear()} donnut. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
} 