import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Check, Zap, Star, Building2, Globe, Server } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Tier {
  id: string;
  name: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  isCustom?: boolean;
  features: string[];
  highlighted?: boolean;
  cta: "register" | "checkout" | "enterprise";
  icon: React.ReactNode;
}

const tiers: Tier[] = [
  { id: "free", name: "Free", monthlyPrice: 0, annualPrice: 0, features: ["20K TTS chars/mo","4.5 STT hrs/mo","3 voice slots","Community support"], cta: "register", icon: <Zap className="w-5 h-5" /> },
  { id: "starter", name: "Starter", monthlyPrice: 12, annualPrice: 9.60, features: ["100K TTS chars/mo","20 STT hrs/mo","10 voice slots","Email support"], cta: "checkout", icon: <Star className="w-5 h-5" /> },
  { id: "creator", name: "Creator", monthlyPrice: 29, annualPrice: 23.20, features: ["500K TTS chars/mo","60 STT hrs/mo","25 voice slots","Music Studio access","Priority support"], highlighted: true, cta: "checkout", icon: <Star className="w-5 h-5" /> },
  { id: "pro", name: "Pro", monthlyPrice: 79, annualPrice: 63.20, features: ["2M TTS chars/mo","Unlimited STT","100 voice slots","Full API access","SLA guarantee"], cta: "checkout", icon: <Zap className="w-5 h-5" /> },
  { id: "scale", name: "Scale", monthlyPrice: 199, annualPrice: 159.20, features: ["10M TTS chars/mo","Unlimited STT","500 voice slots","Dedicated support","Priority SLA"], cta: "checkout", icon: <Globe className="w-5 h-5" /> },
  { id: "business", name: "Business", monthlyPrice: 499, annualPrice: 399.20, features: ["Unlimited TTS","Unlimited STT","Unlimited voices","White-label","SSO integration","Dedicated account manager"], cta: "checkout", icon: <Building2 className="w-5 h-5" /> },
  { id: "enterprise", name: "Enterprise", monthlyPrice: null, annualPrice: null, isCustom: true, features: ["All Business features","Custom SLA","On-premise deployment","Custom integrations","24/7 premium support"], cta: "enterprise", icon: <Server className="w-5 h-5" /> },
];

function getPriceEnvKey(planId: string, isAnnual: boolean): string {
  return `VITE_STRIPE_PRICE_${planId.toUpperCase()}_${isAnnual ? "ANNUAL" : "MONTHLY"}`;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) throw new Error("Checkout failed");
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => { window.location.href = data.url; },
  });

  function handleCta(tier: Tier) {
    if (tier.cta === "register") { setLocation("/register"); return; }
    if (tier.cta === "enterprise") { window.location.href = "mailto:sales@libertyecho.com"; return; }
    if (!user) { setLocation(`/register?plan=${tier.id}`); return; }
    const envKey = getPriceEnvKey(tier.id, annual);
    const priceId = (import.meta.env as Record<string, string>)[envKey];
    if (!priceId) { console.error(`Missing env var: ${envKey}`); return; }
    checkoutMutation.mutate(priceId);
  }

  function formatPrice(tier: Tier): string {
    if (tier.isCustom) return "Custom";
    const price = annual ? tier.annualPrice : tier.monthlyPrice;
    if (price === 0) return "$0";
    return `$${price?.toFixed(2)}`;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#1C1C2E" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link href="/">
          <span className="text-2xl font-bold cursor-pointer" style={{ background: "linear-gradient(90deg, #F5A623, #FFD580)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Liberty Echo
          </span>
        </Link>
        {!user ? (
          <Link href="/login"><Button variant="ghost" className="text-white hover:text-[#F5A623]">Sign In</Button></Link>
        ) : (
          <Link href="/dashboard"><Button variant="ghost" className="text-white hover:text-[#F5A623]">Dashboard</Button></Link>
        )}
      </nav>

      {/* Hero */}
      <div className="text-center pt-16 pb-10 px-4">
        <h1 className="text-5xl font-extrabold text-white mb-4">Simple, transparent pricing</h1>
        <p className="text-white/60 text-lg max-w-xl mx-auto mb-8">Start free. Scale as you grow. No hidden fees.</p>
        <div className="flex items-center justify-center gap-4">
          <Label className="text-white/70 text-sm">Monthly</Label>
          <Switch checked={annual} onCheckedChange={setAnnual} className="data-[state=checked]:bg-[#F5A623]" />
          <Label className="text-white/70 text-sm flex items-center gap-2">
            Annual
            <Badge className="text-xs" style={{ backgroundColor: "#00E5A0", color: "#1C1C2E" }}>Save 20%</Badge>
          </Label>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl p-6 flex flex-col gap-4 transition-transform hover:-translate-y-1 ${tier.highlighted ? "border-2" : "border border-white/10"}`}
              style={{ backgroundColor: tier.highlighted ? "#252540" : "#23233A", borderColor: tier.highlighted ? "#F5A623" : undefined }}
            >
              {tier.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="text-xs px-3 py-1 font-semibold" style={{ backgroundColor: "#F5A623", color: "#1C1C2E" }}>Most Popular</Badge>
                </div>
              )}
              <div className="flex items-center gap-2" style={{ color: "#F5A623" }}>
                {tier.icon}
                <span className="font-semibold text-lg text-white">{tier.name}</span>
              </div>
              <div>
                <span className="text-4xl font-extrabold text-white">{formatPrice(tier)}</span>
                {!tier.isCustom && tier.monthlyPrice !== 0 && (
                  <span className="text-white/40 text-sm ml-1">/mo</span>
                )}
                {annual && !tier.isCustom && tier.monthlyPrice !== 0 && (
                  <p className="text-xs text-[#00E5A0] mt-1">billed annually</p>
                )}
              </div>
              <ul className="flex flex-col gap-2 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#00E5A0" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleCta(tier)}
                disabled={checkoutMutation.isPending}
                className="w-full font-semibold mt-2"
                style={
                  tier.highlighted
                    ? { backgroundColor: "#F5A623", color: "#1C1C2E" }
                    : { backgroundColor: "rgba(255,255,255,0.08)", color: "white" }
                }
              >
                {tier.cta === "enterprise" ? "Contact Sales" : tier.cta === "register" ? "Get Started Free" : "Subscribe"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* PAYG section */}
      <div className="max-w-3xl mx-auto px-4 pb-20">
        <div className="rounded-2xl border border-white/10 p-8" style={{ backgroundColor: "#23233A" }}>
          <h2 className="text-xl font-bold text-white mb-2">Pay-as-you-go rates</h2>
          <p className="text-white/50 text-sm mb-6">Billed monthly, no subscription required. Applied automatically when you exceed your plan limits.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: "Extra TTS", rate: "$0.004 / 1K chars" },
              { label: "Extra STT", rate: "$0.006 / min" },
              { label: "Extra voice slots", rate: "$2.00 / slot / mo" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-2xl font-bold" style={{ color: "#F5A623" }}>{item.rate}</p>
                <p className="text-sm text-white/50 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}