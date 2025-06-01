'use client';

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { Variants } from "framer-motion";

export default function NotFound() {
  const router = useRouter();

  const donutVariants: Variants = {
    initial: { rotate: 0, scale: 1 },
    hover: {
      rotate: 360,
      scale: 1.1,
      transition: {
        duration: 0.8,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse" as const
      }
    }
  };

  const textVariants: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  const sprinkleColors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD", "#D4A5A5"];
  
  const Sprinkle = ({ delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        y: [0, -10, 0],
        rotate: [0, 360]
      }}
      transition={{
        duration: 1,
        delay,
        repeat: Infinity,
        repeatDelay: 2
      }}
      className="absolute w-4 h-1 rounded-full"
      style={{
        backgroundColor: sprinkleColors[Math.floor(Math.random() * sprinkleColors.length)],
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        transform: `rotate(${Math.random() * 360}deg)`
      }}
    />
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5E6CC] via-[#FFE5E5] to-[#F5E6CC] p-4">
      <div className="relative">
        {/* Animated sprinkles */}
        {[...Array(15)].map((_, i) => (
          <Sprinkle key={i} delay={i * 0.1} />
        ))}

        <motion.div
          initial="initial"
          animate="animate"
          className="text-center relative z-10"
        >
          <motion.div
            initial="initial"
            whileHover="hover"
            variants={donutVariants}
            className="mb-8 relative inline-block"
          >
            <span className="text-9xl">🍩</span>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -top-4 -right-4 bg-white rounded-full px-3 py-1 shadow-lg"
            >
              <span className="text-sm font-semibold" style={{ color: "#5D4037" }}>404</span>
            </motion.div>
          </motion.div>

          <motion.h1
            variants={textVariants}
            className="text-4xl font-bold mb-4"
            style={{ color: "#5D4037" }}
          >
            Oops! This donut has gone missing
          </motion.h1>

          <motion.p
            variants={textVariants}
            className="text-lg mb-8 opacity-75"
            style={{ color: "#5D4037" }}
          >
            Looks like someone already ate the page you're looking for!
          </motion.p>

          <motion.div
            variants={textVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => router.push('/')}
              className="rounded-full px-6 py-4 text-lg font-semibold text-white shadow-xl transition-all duration-200"
              style={{ backgroundColor: "#A076F9" }}
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              Back to Home
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
} 