import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Star,
  Coins,
  ArrowRightLeft,
  Gift,
  Heart,
  Shield,
  Zap,
  Globe,
  Mail,
  FileText,
  Eye,
  ChevronRight,
  Menu,
} from "lucide-react"
import Link from "next/link"

export default function DonnutLanding() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5E6CC" }}>
      {/* Navigation */}
      <nav className="border-b border-opacity-20 border-gray-400 bg-white bg-opacity-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <img src="/logo.svg" alt="Donnut logo" className="w-8 h-8 rounded-full mr-2" />
                <span className="text-2xl font-bold" style={{ color: "#5D4037" }}>
                  donnut
                </span>
              </div>
              <div className="hidden md:flex space-x-6">
                <Link
                  href="#how-it-works"
                  className="text-sm font-medium hover:opacity-75"
                  style={{ color: "#5D4037" }}
                >
                  How it Works
                </Link>
                <Link href="#for-fans" className="text-sm font-medium hover:opacity-75" style={{ color: "#5D4037" }}>
                  For Fans
                </Link>
                <Link
                  href="#for-creators"
                  className="text-sm font-medium hover:opacity-75"
                  style={{ color: "#5D4037" }}
                >
                  For Creators
                </Link>
                <Link
                  href="#transparency"
                  className="text-sm font-medium hover:opacity-75"
                  style={{ color: "#5D4037" }}
                >
                  Transparency
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                className="hidden sm:inline-flex border-2 rounded-full"
                style={{ borderColor: "#A076F9", color: "#A076F9" }}
              >
                Creator Login
              </Button>
              <Button className="rounded-full text-white font-semibold" style={{ backgroundColor: "#A076F9" }}>
                Send a Donnut
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center items-center mb-6">
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-current text-yellow-400" />
              ))}
            </div>
            <span className="ml-3 text-sm font-medium" style={{ color: "#5D4037" }}>
              Loved by 10,000+ Web3 creators
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight" style={{ color: "#5D4037" }}>
            The Sweetest Way to Support Creativity in <span style={{ color: "#A076F9" }}>Web3</span>
          </h1>

          <p className="text-xl mb-8 max-w-2xl mx-auto leading-relaxed" style={{ color: "#5D4037" }}>
            Fans donate seamlessly from any blockchain. Creators receive USDC on Flow. Sweet and simple.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button
              size="lg"
              className="rounded-full px-8 py-6 text-lg font-semibold text-white shadow-xl transition-all duration-200 transform hover:scale-105 hover:shadow-2xl"
              style={{ backgroundColor: "#A076F9" }}
            >
              Send a Donnut Now
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 py-6 text-lg font-semibold border-2"
              style={{ borderColor: "#A076F9", color: "#A076F9" }}
            >
              I'm a Creator
            </Button>
          </div>

          <div className="relative max-w-3xl mx-auto">
            <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-3xl p-8 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#40C5E0" }}
                  >
                    <Coins className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                    Any Crypto
                  </h3>
                  <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                    From any blockchain
                  </p>
                </div>
                <div className="text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#A076F9" }}
                  >
                    <ArrowRightLeft className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                    1inch Cross-chain Swap
                  </h3>
                  <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                    Seamless Bridging: Fast, secure cross-chain swaps using escrow functionality.
                  </p>
                </div>
                <div className="text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#FFCAD4" }}
                  >
                    <Gift className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                    USDC Delivery
                  </h3>
                  <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                    Direct to creators
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-white bg-opacity-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#5D4037" }}>
              Your Donnut, Made Fresh in 3 Simple Steps
            </h2>
            <p className="text-xl opacity-75" style={{ color: "#5D4037" }}>
              The magic behind every sweet donation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div
                  className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#40C5E0" }}
                >
                  <Coins className="w-10 h-10 text-white" />
                </div>
                <Badge className="mb-4 rounded-full" style={{ backgroundColor: "#40C5E0", color: "white" }}>
                  Step 1
                </Badge>
                <h3 className="text-xl font-bold mb-4" style={{ color: "#5D4037" }}>
                  Pick Your Crypto & Message
                </h3>
                <p style={{ color: "#5D4037" }}>
                  Fans choose any token, any chain, and add a personal touch to their donation.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div
                  className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#A076F9" }}
                >
                  <ArrowRightLeft className="w-10 h-10 text-white" />
                </div>
                <Badge className="mb-4 rounded-full" style={{ backgroundColor: "#A076F9", color: "white" }}>
                  Step 2
                </Badge>
                <h3 className="text-xl font-bold mb-4" style={{ color: "#5D4037" }}>
                  1inch Cross-chain Swap
                </h3>
                <p style={{ color: "#5D4037" }}>
                  We instantly convert to USDC and bridge to Flow using 1inch Cross-chain Swap (Fusion+).
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div
                  className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#FFCAD4" }}
                >
                  <Gift className="w-10 h-10 text-white" />
                </div>
                <Badge className="mb-4 rounded-full" style={{ backgroundColor: "#FFCAD4", color: "white" }}>
                  Step 3
                </Badge>
                <h3 className="text-xl font-bold mb-4" style={{ color: "#5D4037" }}>
                  Sweet Delivery
                </h3>
                <p style={{ color: "#5D4037" }}>Creators get USDC directly on Flow, hassle-free and ready to use.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* For Fans */}
            <div id="for-fans">
              <h2 className="text-3xl font-bold mb-8" style={{ color: "#5D4037" }}>
                A Treat for Fans Too! 🎉
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#40C5E0" }}
                  >
                    <Coins className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                      Donate with Any Crypto
                    </h3>
                    <p className="opacity-75" style={{ color: "#5D4037" }}>
                      Use Bitcoin, Ethereum, or any token from any blockchain
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#FFCAD4" }}
                  >
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                      Email Verification
                    </h3>
                    <p className="opacity-75" style={{ color: "#5D4037" }}>
                      Easy Web2 Onboarding: Simple email verification.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#A076F9" }}
                  >
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                      Personalize Your Support
                    </h3>
                    <p className="opacity-75" style={{ color: "#5D4037" }}>
                      Add messages that last forever on Filecoin
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#40C5E0" }}
                  >
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                      Bonus Sprinkles
                    </h3>
                    <p className="opacity-75" style={{ color: "#5D4037" }}>
                      Random chance for exclusive NFT rewards!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* For Creators */}
            <div id="for-creators">
              <h2 className="text-3xl font-bold mb-8" style={{ color: "#5D4037" }}>
                Sweeten Your Stream, Simplify Your Income 🚀
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#A076F9" }}
                  >
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                      One Token, Zero Fuss
                    </h3>
                    <p className="opacity-75" style={{ color: "#5D4037" }}>
                      Receive everything as USDC on Flow - no managing multiple tokens
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#40C5E0" }}
                  >
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                      Expand Your Audience
                    </h3>
                    <p className="opacity-75" style={{ color: "#5D4037" }}>
                      Web2-friendly onboarding brings new supporters
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#FFCAD4" }}
                  >
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                      Build Deeper Fan Connections
                    </h3>
                    <p className="opacity-75" style={{ color: "#5D4037" }}>
                      Permanent messages create lasting relationships
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#A076F9" }}
                  >
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                      Transparent & Fair
                    </h3>
                    <p className="opacity-75" style={{ color: "#5D4037" }}>
                      Every transaction visible on Blockscout
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white bg-opacity-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#5D4037" }}>
              Baked with the Best Web3 Ingredients
            </h2>
            <p className="text-xl opacity-75" style={{ color: "#5D4037" }}>
              Powered by leading technology for the sweetest experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div
                  className="w-12 h-12 mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#40C5E0" }}
                >
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold mb-2" style={{ color: "#5D4037" }}>
                  1inch Fusion+
                </h3>
                <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                  Optimal Conversions: Get the best rates, less fees.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div
                  className="w-12 h-12 mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#A076F9" }}
                >
                  <ArrowRightLeft className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold mb-2" style={{ color: "#5D4037" }}>
                  1inch Cross-chain Swap
                </h3>
                <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                  Seamless Bridging: Fast, secure cross-chain swaps using escrow functionality.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div
                  className="w-12 h-12 mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#FFCAD4" }}
                >
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold mb-2" style={{ color: "#5D4037" }}>
                  Email Verification
                </h3>
                <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                  Easy Web2 Onboarding: Simple email verification.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div
                  className="w-12 h-12 mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#40C5E0" }}
                >
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold mb-2" style={{ color: "#5D4037" }}>
                  Filecoin
                </h3>
                <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                  Messages That Last: Your kind words, stored forever.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div
                  className="w-12 h-12 mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#A076F9" }}
                >
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold mb-2" style={{ color: "#5D4037" }}>
                  Pyth Entropy
                </h3>
                <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                  Lucky Donnuts: Random NFT bonuses for fans!
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div
                  className="w-12 h-12 mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#FFCAD4" }}
                >
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold mb-2" style={{ color: "#5D4037" }}>
                  Blockscout
                </h3>
                <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                  Total Transparency: See every transaction, live.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Transparency Section */}
      <section id="transparency" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6" style={{ color: "#5D4037" }}>
            Our Recipe for Trust
          </h2>
          <p className="text-xl mb-8 opacity-75" style={{ color: "#5D4037" }}>
            Clearly crafted, openly shared. Every transaction is visible and every message is permanent.
          </p>
          <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-3xl p-8 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#40C5E0" }}
                >
                  <Eye className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                  Transaction Transparency
                </h3>
                <p className="text-sm opacity-75 mb-4" style={{ color: "#5D4037" }}>
                  Every donation tracked on Blockscout for complete visibility
                </p>
                <Button
                  variant="outline"
                  className="rounded-full border-2"
                  style={{ borderColor: "#40C5E0", color: "#40C5E0" }}
                >
                  View on Blockscout
                </Button>
              </div>
              <div className="text-center">
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#A076F9" }}
                >
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                  Permanent Messages
                </h3>
                <p className="text-sm opacity-75 mb-4" style={{ color: "#5D4037" }}>
                  Fan messages stored immutably on Filecoin forever
                </p>
                <Button
                  variant="outline"
                  className="rounded-full border-2"
                  style={{ borderColor: "#A076F9", color: "#A076F9" }}
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white bg-opacity-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6" style={{ color: "#5D4037" }}>
            Ready to Share Some Sweetness?
          </h2>
          <p className="text-xl mb-8 opacity-75" style={{ color: "#5D4037" }}>
            Join the donnut revolution and start supporting your favorite creators today!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button
              size="lg"
              className="rounded-full px-8 py-6 text-lg font-semibold text-white shadow-xl transition-all duration-200 transform hover:scale-105 hover:shadow-2xl"
              style={{ backgroundColor: "#A076F9" }}
            >
              Send a Donnut
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 py-6 text-lg font-semibold border-2"
              style={{ borderColor: "#A076F9", color: "#A076F9" }}
            >
              Creator Sign Up
            </Button>
          </div>

          <div className="max-w-md mx-auto">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Creator's Page"
                className="rounded-full border-2 flex-1"
                style={{ borderColor: "#A076F9" }}
              />
              <Button className="rounded-full px-6 text-white" style={{ backgroundColor: "#A076F9" }}>
                Go
              </Button>
            </div>
            <p className="text-sm mt-2 opacity-75" style={{ color: "#5D4037" }}>
              Find and support your favorite creator instantly
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
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
                <Link href="#" className="block opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                  How it Works
                </Link>
                <Link href="#" className="block opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                  For Creators
                </Link>
                <Link href="#" className="block opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
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
              © 2024 donnut. All rights reserved. Made with <img src="/logo.svg" alt="Donnut logo" className="inline w-5 h-5 align-text-bottom mx-1" /> for the Web3 community.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
