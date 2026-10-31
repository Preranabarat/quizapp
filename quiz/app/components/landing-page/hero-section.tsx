"use client";

import { Inter } from "next/font/google";
import { motion, type Variants } from "framer-motion";

import { Button } from "../ui/button";
import Link from "next/link";
import BlurIn from "../ui/blur-in";
import AnimatedShinyText from "../ui/animated-shiny-text";

const inter = Inter({ subsets: ["latin"] });

export default function Component() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  return (
    <section
      className={`relative w-full flex justify-center ${inter.className}`}
    >
      <motion.div
        className="container flex h-[60vh] md:min-h-[75vh] max-w-6xl flex-col items-center pt-24 px-4  text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="mb-16 inline-flex items-center rounded-full border border-gray-800 bg-gray-900/50 px-3 py-1"
        >
          <div className="relative mr-2 flex items-center">
            <div className="absolute size-2 animate-ping rounded-full bg-green-400/60"></div>
            <div className="relative size-2 rounded-full bg-green-400"></div>
          </div>
          <AnimatedShinyText className="transition-transform ease-out duration-300 hover:text-neutral-600 dark:hover:text-neutral-400">
            <span className="mr-2 text-sm text-green-400">
              Challenge Your Friends
            </span>
          </AnimatedShinyText>
          {/* <Button
            variant="ghost"
            className="h-6 items-center gap-1 rounded-full px-2 py-0 text-sm text-gray-400 hover:bg-gray-900 hover:text-gray-300"
          >
            How to Play
            <ArrowRight className="h-3 w-3" />
          </Button> */}
        </motion.div>

        <motion.div variants={itemVariants}>
          <BlurIn
            word="Quiz Battle Triumph"
            className="myfont mb-6 max-w-4xl text-5xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 md:text-6xl lg:text-7xl"
          />
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="mb-12 myfont2 max-w-2xl text-lg text-gray-400 md:text-xl"
        >
          Engage in epic quiz battles with your friends in real-time. Test your
          knowledge, climb the leaderboard, and prove you&apos;re the ultimate quiz
          champion in this friendly competition platform.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link href={"/login"}>
            <Button
              size="lg"
              className="h-12 rounded-lg bg-[#00E599] px-8 text-md text-white font-semibold hover:bg-[#00E5BF]"
            >
              Create Battle Room
            </Button>
          </Link>
          {/* <Button
            variant="outline"
            size="lg"
            className="h-12 rounded-lg border-gray-800 bg-transparent px-8 text-white"
          >
            Join Battle
          </Button> */}
        </motion.div>
      </motion.div>
    </section>
  );
}
