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
} from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { motion, AnimatePresence, useAnimation } from "framer-motion"
import { useRouter } from "next/navigation"
import { useState, useCallback, useEffect, useMemo } from "react"

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
  { text: "Za skvělý obsah! ��", lang: "cs" }
];

const FallingDonut = ({ onCatch }: { onCatch: (x: number, y: number) => void }) => {
  const controls = useAnimation();
  const isLeftSide = Math.random() < 0.5;
  const startX = isLeftSide ? 
    Math.random() * 20 : 
    80 + Math.random() * 20;
  const duration = 6 + Math.random() * 6;
  const [isCaught, setIsCaught] = useState(false);

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
        pointerEvents: isCaught ? "none" : "auto" 
      }}
      onClick={handleClick}
      whileHover={{ scale: 1.2 }}
    >
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
  const [donuts, setDonuts] = useState<number[]>([]);
  const [popups, setPopups] = useState<{ id: number; x: number; y: number; amount: number }[]>([]);
  const [nextId, setNextId] = useState(0);

  // Add new donuts periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // Add multiple donuts at once for a more dense effect
      const newDonuts = Array(3).fill(0).map(() => Date.now() + Math.random());
      setDonuts(prev => [...prev, ...newDonuts]);
    }, 2000); // Increased from 1000ms to 2000ms for slower spawns

    return () => clearInterval(interval);
  }, []);

  // Remove old donuts
  useEffect(() => {
    const cleanup = setInterval(() => {
      setDonuts(prev => prev.filter(d => Date.now() - d < 14000)); // Increased from 7000ms to 14000ms for longer lifetime
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  const handleCatch = useCallback((x: number, y: number) => {
    const amount = (Math.random() * 30).toFixed(2);
    const id = nextId;
    
    // Remove any existing popups before adding new one
    setPopups([{ id, x, y, amount: parseFloat(amount) }]);
    setNextId(prev => prev + 1);

    // Remove popup after animation
    setTimeout(() => {
      setPopups([]);
    }, 1000);
  }, [nextId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5E6CC] via-[#FFE5E5] to-[#F5E6CC]">
      {/* Falling Donuts */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="relative w-full h-full pointer-events-auto">
          {donuts.map(key => (
            <FallingDonut key={key} onCatch={handleCatch} />
          ))}
        </div>
      </div>

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
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="max-w-4xl mx-auto text-center"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          <motion.div 
            className="flex justify-center items-center mb-6"
            variants={fadeInUp}
          >
            <span className="text-lg font-medium bg-gradient-to-r from-[#A076F9] to-[#40C5E0] bg-clip-text text-transparent">
              Sprinkle Some Magic into Web3 Creativity ✨
            </span>
          </motion.div>

          <motion.h1 
            className="text-5xl md:text-6xl font-bold mb-6 leading-tight"
            variants={fadeInUp}
            style={{ color: "#5D4037" }}
          >
            The Sweetest Way to Support Creativity in <span style={{ color: "#A076F9" }}>Web3</span>
          </motion.h1>

          <motion.p 
            className="text-xl mb-8 max-w-2xl mx-auto leading-relaxed"
            variants={fadeInUp}
            style={{ color: "#5D4037" }}
          >
            Fans donate seamlessly from any blockchain. Creators receive USDC on Flow. Sweet and simple.
          </motion.p>

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
                onClick={() => router.push('/dashboard')}
              >
                Dashboard
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>

          <motion.div 
            className="relative max-w-3xl mx-auto"
            variants={fadeInUp}
          >
            <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Coins,
                    color: "#40C5E0",
                    title: "Any Crypto",
                    description: "From any blockchain"
                  },
                  {
                    icon: ArrowRightLeft,
                    color: "#A076F9",
                    title: "1inch Cross-chain Swap",
                    description: "Seamless Bridging: Fast, secure cross-chain swaps using escrow functionality."
                  },
                  {
                    icon: Gift,
                    color: "#FFCAD4",
                    title: "USDC Delivery",
                    description: "Direct to creators"
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
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: item.color }}
                    >
                      <item.icon className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>
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
              Your Donnut, Made Fresh in 3 Simple Steps
            </h2>
            <p className="text-xl opacity-75" style={{ color: "#5D4037" }}>
              The magic behind every sweet donation
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Coins,
                color: "#40C5E0",
                step: "Step 1",
                title: "Pick Your Crypto & Message",
                description: "Fans choose any token, any chain, and add a personal touch to their donation."
              },
              {
                icon: ArrowRightLeft,
                color: "#A076F9",
                step: "Step 2",
                title: "1inch Cross-chain Swap",
                description: "We instantly convert to USDC and bridge to Flow using 1inch Cross-chain Swap (Fusion+)."
              },
              {
                icon: Gift,
                color: "#FFCAD4",
                step: "Step 3",
                title: "Sweet Delivery",
                description: "Creators get USDC directly on Flow, hassle-free and ready to use."
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
            >
              <h2 className="text-3xl font-bold mb-8" style={{ color: "#5D4037" }}>
                A Treat for Fans Too! 🎉
              </h2>
              <div className="space-y-6">
                {[
                  {
                    icon: Coins,
                    color: "#40C5E0",
                    title: "Donate with Any Crypto",
                    description: "Use Bitcoin, Ethereum, or any token from any blockchain"
                  },
                  {
                    icon: Mail,
                    color: "#FFCAD4",
                    title: "Email Verification",
                    description: "Easy Web2 Onboarding: Simple email verification."
                  },
                  {
                    icon: Heart,
                    color: "#A076F9",
                    title: "Personalize Your Support",
                    description: "Add messages that last forever on Filecoin"
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
                  >
                    Send a Donnut
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
                    description: "Your funds, your control. Direct deposits to your Flow wallet."
                  },
                  {
                    icon: Zap,
                    color: "#A076F9",
                    title: "Lightning Fast",
                    description: "Instant cross-chain swaps and settlements."
                  },
                  {
                    icon: Globe,
                    color: "#FFCAD4",
                    title: "Global Reach",
                    description: "Accept support from fans worldwide, any token, any chain."
                  },
                  {
                    icon: FileText,
                    color: "#40C5E0",
                    title: "Smart Analytics",
                    description: "Track donations and engagement in real-time."
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
                    onClick={() => router.push('/dashboard')}
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
                <p className="text-sm opacity-75" style={{ color: "#5D4037" }}>
                  Every donation tracked on Blockscout for complete visibility
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
                  Fan messages stored immutably on Filecoin forever
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
              onClick={() => router.push('/dashboard')}
            >
              Creator Dashboard
              <ChevronRight className="ml-2 h-5 w-5" />
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

      <Footer />
    </div>
  )
}
