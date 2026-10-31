"use client";

import { Check } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

export default function PricingCards() {
  const plans = [
    {
      name: "Starter",
      description: "Perfect for trying out quiz battles",
      price: "Free",
      period: "",
      features: [
        "1 Battle Room",
        "Basic Statistics",
        "Standard Support",
        "Community Categories",
      ],
      buttonText: "Get Started",
      buttonVariant: "default" as const,
    },
    {
      name: "Plus",
      description: "Great for regular quiz masters",
      price: "$5",
      period: "/month",
      features: [
        "10 Battle Rooms",
        "Basic Statistics",
        "Priority Support",
        "Community Categories",
        "Ad-free Experience",
      ],
      popular: true,
      buttonText: "Get Plus",
      buttonVariant: "default" as const,
    },
    {
      name: "Pro",
      description: "For serious quiz enthusiasts",
      price: "$19",
      period: "/month",
      features: [
        "50 Battle Rooms",
        "Advanced Statistics",
        "Priority Support",
        "Custom Categories",
        "Ad-free Experience",
      ],
      buttonText: "Go Pro",
      buttonVariant: "default" as const,
    },
  ];

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-4 py-12">
      {/* Enhanced Professional Header */}
      <div className="text-center space-y-8 mb-16">
        <div className="space-y-4">
          <div className="inline-block border border-emerald-500/20 px-4 py-1.5 rounded-full text-sm bg-emerald-500/10 text-emerald-300 font-medium tracking-wide">
            Pricing Plans
          </div>
          <h2 className="text-3xl myfont2 md:text-4xl text-white font-bold tracking-tight">
            Choose your plan
          </h2>
          <p className="text-sm myfont2 md:text-lg text-zinc-400 max-w-2xl mx-auto">
            Select the perfect plan for your quiz battle journey. Start with our
            free tier and scale as your community grows.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-emerald-400 font-medium">Monthly billing</span>
          <div className="h-4 w-px bg-zinc-800" />
          <span className="text-zinc-400">Cancel anytime</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl w-full">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative w-full overflow-hidden bg-gradient-to-b from-zinc-900 to-black border-zinc-800 p-8 group transition-all duration-300 hover:border-emerald-500/50 hover:translate-y-[-4px] ${
              plan.popular ? "ring-2 ring-emerald-500" : ""
            }`}
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {plan.popular && (
              <div className="absolute -right-12 top-8 rotate-45 bg-emerald-500 px-12 py-1.5 text-sm font-medium tracking-wide">
                Most Popular
              </div>
            )}

            <div className="relative space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {plan.name}
                </h3>
                <p className="text-sm text-zinc-400">{plan.description}</p>
              </div>

              <div className="flex items-baseline text-white pt-2 pb-4">
                <span className="text-5xl font-bold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-zinc-400 ml-2 text-sm">
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-4 text-sm text-zinc-300">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0 stroke-[2.5px]" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="pt-6">
                <Button
                  className={`w-full font-medium tracking-wide ${"bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20"}`}
                  variant={plan.buttonVariant}
                >
                  {plan.buttonText}
                </Button>
              </div>

              {plan.price !== "Free" && (
                <p className="text-xs text-zinc-500 text-center pt-4">
                  30-day money-back guarantee
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
