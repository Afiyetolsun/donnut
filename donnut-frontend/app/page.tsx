'use client';

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { WalletButton } from "@/components/WalletButton"
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
  DollarSign,
} from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { motion, AnimatePresence, useAnimation, useInView } from "framer-motion"
import { useRouter } from "next/navigation"
import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { usePrivy } from '@privy-io/react-auth';
import { useWalletChain } from '@/hooks/useWalletChain';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

// Add multilingual cheering phrases
const cheerPhrases = [
  // English
  { text: "Keep creating! 🎨", lang: "en" },
  { text: "Love your work! ❤️", lang: "en" },
  { text: "Thanks for inspiring! ✨", lang: "en" },
  { text: "For your amazing content! 🌟", lang: "en" },
  // Russian
  { text: "На развитие канала! 🎨", lang: "ru" },
  { text: "Спасибо за контент! ❤️", lang: "ru" },
  { text: "Продолжай творить! ✨", lang: "ru" },
  { text: "За твое творчество! 🌟", lang: "ru" },
  // German
  { text: "Für deine Kreativität! 🎨", lang: "de" },
  { text: "Mach weiter so! ❤️", lang: "de" },
  { text: "Danke für die Inspiration! ✨", lang: "de" },
  { text: "Für deine tolle Arbeit! 🌟", lang: "de" },
  // Chinese
  { text: "支持你的创作！🎨", lang: "zh" },
  { text: "继续加油！❤️", lang: "zh" },
  { text: "感谢分享！✨", lang: "zh" },
  { text: "为你的精彩内容！🌟", lang: "zh" },
  // Ukrainian
  { text: "На розвиток проекту! 🎨", lang: "uk" },
  { text: "Дякую за творчість! ❤️", lang: "uk" },
  { text: "Продовжуй надихати! ✨", lang: "uk" },
  { text: "За чудовий контент! 🌟", lang: "uk" },
  // Czech
  { text: "Na podporu tvorby! 🎨", lang: "cs" },
  { text: "Díky za inspiraci! ❤️", lang: "cs" },
  { text: "Pokračuj v tom! ✨", lang: "cs" },
  { text: "Za skvělý obsah! 🌟", lang: "cs" }
];

const FallingDonut = ({ onCatch }: { onCatch: (x: number, y: number) => void }) => {
  const controls = useAnimation();
  const isLeftSide = Math.random() < 0.5;
  const startX = isLeftSide ? 
    Math.random() * 20 : 
    80 + Math.random() * 20;
  const duration = 6 + Math.random() * 6;
  const [isCaught, setIsCaught] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const showClickMe = useMemo(() => Math.random() < 0.1, []); // 10% chance to show "Click me!"

  useEffect(() => {
    controls.start({
      y: ["0vh", "100vh"],
      x: [
        `${startX}vw`,
        `${startX + (Math.random() * 10 - 5)}vw`
      ],
      transition: {
        duration,
        ease: "linear",
        times: [0, 1]
      }
    });
  }, []);

  const handleClick = (event: React.MouseEvent) => {
    if (!isCaught) {
      setIsCaught(true);
      controls.stop();
      onCatch(event.clientX, event.clientY);
      controls.start({
        opacity: 0,
        scale: 0,
        transition: { duration: 0.3 }
      });
    }
  };

  return (
    <motion.div
      animate={controls}
      initial={{ opacity: 1 }}
      style={{ 
        position: "absolute", 
        cursor: "pointer", 
        fontSize: "2rem",
        pointerEvents: isCaught ? "none" : "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem"
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.2 }}
    >
      {showClickMe && (
        <motion.div
          animate={{ 
            opacity: isHovered ? 1 : 0.7,
            y: isHovered ? 0 : 5,
            scale: isHovered ? 1.1 : 1
          }}
          transition={{ duration: 0.2 }}
          className="text-sm font-medium text-white bg-black/50 px-2 py-1 rounded-full"
        >
          Click me!
        </motion.div>
      )}
      🍩
    </motion.div>
  );
};

const DonationPopup = ({ x, y, amount }: { x: number, y: number, amount: number }) => {
  const cheer = useMemo(() => 
    cheerPhrases[Math.floor(Math.random() * cheerPhrases.length)],
    []
  );
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, x: "-50%" }}
      animate={{ opacity: 1, y: -50 }}
      exit={{ opacity: 0, y: -100 }}
      transition={{ duration: 0.5 }}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 50,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        textAlign: "center"
      }}
    >
      <div className="text-xl font-medium whitespace-nowrap">
        {cheer.text}
      </div>
      <div className="text-2xl font-bold whitespace-nowrap">
        +${amount.toFixed(2)}
      </div>
    </motion.div>
  );
};

export default function DonnutLanding() {
  const router = useRouter()
  const [donuts, setDonuts] = useState<{ id: string; timestamp: number }[]>([]);
  const [popups, setPopups] = useState<{ id: number; x: number; y: number; amount: number }[]>([]);
  const [nextId, setNextId] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const howItWorksRef = useRef(null);
  const isHowItWorksInView = useInView(howItWorksRef);
  const { user, authenticated } = usePrivy();
  const { isLoading: isChainLoading } = useWalletChain();

  // Set isHydrated to true after initial render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Add new donuts periodically
  useEffect(() => {
    if (!isHydrated) return;

    const interval = setInterval(() => {
      // Add multiple donuts at once for a more dense effect
      const newDonuts = Array(3).fill(0).map((_, index) => ({
        id: `${Date.now()}-${Math.random()}-${index}`,
        timestamp: Date.now()
      }));
      setDonuts(prev => [...prev, ...newDonuts]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isHydrated]);

  // Remove old donuts
  useEffect(() => {
    if (!isHydrated) return;

    const cleanup = setInterval(() => {
      setDonuts(prev => prev.filter(d => Date.now() - d.timestamp < 14000));
    }, 1000);

    return () => clearInterval(cleanup);
  }, [isHydrated]);

  const handleCatch = useCallback((x: number, y: number) => {
    if (!isHydrated) return;
    
    const amount = (Math.random() * 30).toFixed(2);
    const id = nextId;
    
    // Remove any existing popups before adding new one
    setPopups([{ id, x, y, amount: parseFloat(amount) }]);
    setNextId(prev => prev + 1);

    // Remove popup after animation
    setTimeout(() => {
      setPopups([]);
    }, 1000);
  }, [nextId, isHydrated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5E6CC] via-[#FFE5E5] to-[#F5E6CC]">
      {/* Donation Popups */}
      <AnimatePresence>
        {popups.map(popup => (
          <DonationPopup
            key={popup.id}
            x={popup.x}
            y={popup.y}
            amount={popup.amount}
          />
        ))}
      </AnimatePresence>

      <Header />

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 relative">
        {/* Falling Donuts */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="relative w-full h-full">
            {donuts.map(donut => (
              <FallingDonut key={donut.id} onCatch={handleCatch} />
            ))}
          </div>
        </div>

        <motion.div 
          className="max-w-4xl mx-auto text-center relative z-10"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          <motion.div 
            className="flex justify-center items-center mb-4"
            variants={fadeInUp}
          >
            <span className="text-lg font-medium bg-gradient-to-r from-[#A076F9] to-[#40C5E0] bg-clip-text text-transparent">
              Cross-Chain Donations Made Simple ✨
            </span>
          </motion.div>

          <motion.h1 
            className="text-5xl md:text-6xl font-bold mb-3 leading-tight"
            variants={fadeInUp}
            style={{ color: "#5D4037" }}
          >
            Support Creators with <br /> <span style={{ color: "#A076F9" }}>Any Crypto</span>
          </motion.h1>

          <motion.p 
            className="text-xl mb-4 max-w-2xl mx-auto leading-relaxed"
            variants={fadeInUp}
            style={{ color: "#5D4037" }}
          >
            Donate with any crypto on the chain. Creators receive USDC on their preferred chain. Powered by 1inch Fusion+ for the best rates.
          </motion.p>

          <motion.p 
            className="text-sm mb-8 max-w-2xl mx-auto leading-relaxed opacity-60"
            variants={fadeInUp}
            style={{ color: "#5D4037" }}
          >
            Currently supporting:
          </motion.p>

          <motion.div 
            className="flex justify-center items-center gap-4 mb-12"
            variants={fadeInUp}
          >
            <img src="/chains/ethereum.svg" alt="Ethereum" className="w-8 h-8 opacity-80 hover:opacity-100 transition-opacity" />
            <img src="/chains/arbitrum.svg" alt="Arbitrum" className="w-8 h-8 opacity-80 hover:opacity-100 transition-opacity" />
            <img src="/chains/optimism.svg" alt="Optimism" className="w-8 h-8 opacity-80 hover:opacity-100 transition-opacity" />
            <img src="/chains/polygon.svg" alt="Polygon" className="w-8 h-8 opacity-80 hover:opacity-100 transition-opacity" />
          </motion.div>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
            variants={fadeInUp}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                className="rounded-full px-8 py-6 text-lg font-semibold text-white shadow-xl transition-all duration-200"
                style={{ backgroundColor: "#A076F9" }}
                onClick={() => router.push('/send')}
              >
                Send a Donnut Now
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 py-6 text-lg font-semibold border-2"
                style={{ borderColor: "#A076F9", color: "#A076F9" }}
                onClick={() => router.push('/creator-dashboard')}
              >
                Creator Dashboard
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>

          <motion.div 
            className="relative max-w-3xl mx-auto"
            variants={fadeInUp}
          >
            <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    icon: "blockscout",
                    color: "#40C5E0",
                    title: "All Tokens",
                    description: "We discover all available tokens through Blockscout on a given chain."
                  },
                  {
                    icon: "1inch",
                    color: "#A076F9",
                    title: "1inch Fusion+",
                    description: "Seamless cross-chain swaps with optimal rates"
                  },
                  {
                    icon: "usdc",
                    color: "#FFCAD4",
                    title: "USDC Delivery",
                    description: "Direct to creators on their preferred chain"
                  }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.2 }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                      className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <a 
                        href={item.icon === "blockscout" ? "https://www.blockscout.com/" : 
                             item.icon === "1inch" ? "https://1inch.io/fusion/" : 
                             "https://www.circle.com/usdc"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-full flex items-center justify-center"
                      >
                        <img 
                          src={`/${item.icon}.svg`} 
                          alt={item.title} 
                          className="w-10 h-10"
                        />
                      </a>
                    </motion.div>
                    <h3 className="font-semibold mb-1 text-base" style={{ color: "#5D4037" }}>
                      {item.title}
                    </h3>
                    <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                      {item.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-white bg-opacity-50 backdrop-blur-sm">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div 
            className="text-center mb-16"
            variants={fadeInUp}
          >
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#5D4037" }}>
              How Donnut Works
            </h2>
            <p className="text-xl opacity-75" style={{ color: "#5D4037" }}>
              Simple, secure, and efficient cross-chain donations
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                color: "#40C5E0",
                step: "Step 1",
                title: "Creator Generates Link",
                description: "Creators can create multiple labeled donation links for different purposes or campaigns. Each link is easily shareable and trackable."
              },
              {
                icon: Coins,
                color: "#A076F9",
                step: "Step 2",
                title: "Select & Donate",
                description: "Supporters follow the link, choose their preferred token and chain, and send their donation. We discover all available tokens through Blockscout."
              },
              {
                icon: DollarSign,
                color: "#FFCAD4",
                step: "Step 3",
                title: "Automatic Delivery & Analytics",
                description: "The donation is automatically converted to USDC and delivered to the creator's preferred chain."
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -10 }}
              >
                <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                  <CardContent className="p-8 text-center">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: item.color }}
                    >
                      <item.icon className="w-10 h-10 text-white" />
                    </motion.div>
                    <Badge className="mb-4 rounded-full" style={{ backgroundColor: item.color, color: "white" }}>
                      {item.step}
                    </Badge>
                    <h3 className="text-xl font-bold mb-4" style={{ color: "#5D4037" }}>
                      {item.title}
                    </h3>
                    <p style={{ color: "#5D4037" }}>
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* For Fans */}
            <motion.div 
              id="for-fans"
              variants={fadeInUp}
              className="bg-white bg-opacity-60 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <h2 className="text-3xl font-bold mb-8" style={{ color: "#5D4037" }}>
                For Supporters 🎁
              </h2>
              <div className="space-y-6">
                {[
                  {
                    icon: Coins,
                    color: "#40C5E0",
                    title: "Any Token, Any Chain",
                    description: "Donate with any cryptocurrency from our supported chains. We continuously work on extending chain support."
                  },
                  {
                    icon: Mail,
                    color: "#FFCAD4",
                    title: "Simple Verification",
                    description: "No login required. Just connect your wallet and verify the payment link on our website."
                  },
                  {
                    icon: Heart,
                    color: "#A076F9",
                    title: "Personal Touch",
                    description: "Add a personal message to your donation to show your support and appreciation."
                  }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start space-x-4"
                    variants={fadeInUp}
                    whileHover={{ x: 10 }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    >
                      <item.icon className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                        {item.title}
                      </h3>
                      <p className="opacity-75" style={{ color: "#5D4037" }}>
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="mt-8"
                >
                  <Button
                    size="lg"
                    className="w-full rounded-full text-white font-semibold shadow-xl"
                    style={{ backgroundColor: "#A076F9" }}
                    onClick={() => router.push('/send')}
                  >
                    Send a Donnut Now
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            {/* For Creators */}
            <motion.div 
              variants={fadeInUp}
              className="bg-white bg-opacity-60 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <h2 className="text-3xl font-bold mb-8" style={{ color: "#5D4037" }}>
                For Creators 🎨
              </h2>
              <div className="space-y-6">
                {[
                  {
                    icon: Shield,
                    color: "#40C5E0",
                    title: "Secure & Non-Custodial",
                    description: "Your funds, your control. Direct deposits to your wallet on your preferred chain."
                  },
                  {
                    icon: Zap,
                    color: "#A076F9",
                    title: "Optimal Rates",
                    description: "Get the best conversion rates with 1inch Fusion+ and minimal fees."
                  },
                  {
                    icon: Globe,
                    color: "#FFCAD4",
                    title: "Global Support",
                    description: "Accept donations from fans worldwide using any token on our supported chains."
                  }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start space-x-4"
                    variants={fadeInUp}
                    whileHover={{ x: 10 }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    >
                      <item.icon className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
                        {item.title}
                      </h3>
                      <p className="opacity-75" style={{ color: "#5D4037" }}>
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="mt-8"
                >
                  <Button
                    size="lg"
                    className="w-full rounded-full text-white font-semibold shadow-xl"
                    style={{ backgroundColor: "#A076F9" }}
                    onClick={() => router.push('/creator-dashboard')}
                  >
                    Creator Dashboard
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white bg-opacity-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#5D4037" }}>
              Built with Web3's Best
            </h2>
            <p className="text-xl opacity-75" style={{ color: "#5D4037" }}>
              Powered by leading technology for seamless cross-chain donations
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
                  Seamless cross-chain swaps with optimal rates and minimal fees.
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
                  EVM Networks
                </h3>
                <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                  Support for major EVM chains with continuous expansion.
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
                  Real-time chain data and token discovery with spam filtering.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div
                  className="w-12 h-12 mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#40C5E0" }}
                >
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold mb-2" style={{ color: "#5D4037" }}>
                  Cross-chain Support
                </h3>
                <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                  Seamless donations across different EVM networks.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div
                  className="w-12 h-12 mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#A076F9" }}
                >
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold mb-2" style={{ color: "#5D4037" }}>
                  Multiple Links
                </h3>
                <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                  Create and manage multiple labeled donation links for different purposes.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div
                  className="w-12 h-12 mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#FFCAD4" }}
                >
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold mb-2" style={{ color: "#5D4037" }}>
                  Creator Dashboard
                </h3>
                <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                  Track all donations and transactions with detailed analytics.
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
            Complete Transparency
          </h2>
          <p className="text-xl mb-8 opacity-75" style={{ color: "#5D4037" }}>
            Every transaction is tracked and verified through Blockscout. Trust is built on transparency.
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
                <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                  Every donation tracked and verified through Blockscout
                </p>
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
                <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                  Fan messages stored immutably on chain forever
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white bg-opacity-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6" style={{ color: "#5D4037" }}>
            Ready to Support Creators?
          </h2>
          <p className="text-xl mb-8 opacity-75" style={{ color: "#5D4037" }}>
            Join Donnut and make cross-chain donations simple and efficient!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                className="rounded-full px-8 py-6 text-lg font-semibold text-white shadow-xl transition-all duration-200 transform hover:scale-105 hover:shadow-2xl"
                style={{ backgroundColor: "#A076F9" }}
                onClick={() => router.push('/send')}
              >
                Send a Donnut Now
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 py-6 text-lg font-semibold border-2"
                style={{ borderColor: "#A076F9", color: "#A076F9" }}
                onClick={() => router.push('/creator-dashboard')}
              >
                Creator Dashboard
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
