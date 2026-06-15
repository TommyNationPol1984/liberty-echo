import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRegister } from "@/hooks/use-auth";
import { Loader2, CheckCircle2 } from "lucide-react";

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function getPasswordStrength(pw: string): StrengthLevel {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return 1;
  if (score === 2) return 2;
  if (score === 3) return 3;
  return 4;
}

const STRENGTH_META: Record<StrengthLevel, { label: string; color: string; segments: number }> = {
  0: { label: "", color: "bg-white/10", segments: 0 },
  1: { label: "Weak", color: "bg-red-500", segments: 1 },
  2: { label: "Fair", color: "bg-amber-400", segments: 2 },
  3: { label: "Strong", color: "bg-[#00E5A0]", segments: 3 },
  4: { label: "Very Strong", color: "bg-emerald-400", segments: 4 },
};

function PasswordStrengthMeter({ password }: { password: string }) {
  const level = getPasswordStrength(password);
  const meta = STRENGTH_META[level];
  const textColor = level === 1 ? "text-red-500" : level === 2 ? "text-amber-400" : level === 3 ? "text-[#00E5A0]" : "text-emerald-400";
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((seg) => (
          <div key={seg} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${seg <= meta.segments ? meta.color : "bg-white/10"}`} />
        ))}
      </div>
      {password.length > 0 && <p className={`text-xs font-medium ${textColor}`}>{meta.label}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (username.trim().length < 3) errors.username = "Username must be at least 3 characters.";
    if (password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!validate()) return;
    const payload: { username: string; password: string; email?: string } = { username: username.trim(), password };
    if (email.trim()) payload.email = email.trim();
    registerMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Account created!", description: "Welcome to Liberty Echo." });
        setLocation("/dashboard");
      },
      onError: (err: Error) => { setErrorMessage(err.message ?? "Registration failed. Please try again."); },
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#1C1C2E] px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-extrabold tracking-tight" style={{ background: "linear-gradient(90deg, #F5A623, #FFD580)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Liberty Echo
          </h1>
          <p className="text-sm font-medium tracking-widest uppercase text-[#00E5A0]">Sentient Voice Intelligence</p>
        </div>

        <div className="rounded-xl px-5 py-4 border text-sm text-white/80 leading-relaxed" style={{ borderColor: "#F5A623", backgroundColor: "rgba(245,166,35,0.10)" }}>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-[#F5A623]" />
            <span><span className="font-semibold text-[#F5A623]">Free plan includes:</span> 20K TTS chars/mo · 4.5 STT hours · 3 voice slots · No credit card required</span>
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 space-y-6 shadow-2xl">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white">Create an account</h2>
            <p className="text-sm text-white/50">Start building with your voice</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-white/70 text-sm">Username <span className="text-[#F5A623]">*</span></Label>
              <Input id="username" type="text" autoComplete="username" required value={username}
                onChange={(e) => { setUsername(e.target.value); if (validationErrors.username) setValidationErrors((p) => ({ ...p, username: "" })); }}
                placeholder="at least 3 characters"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#F5A623] focus:ring-[#F5A623]/20" />
              {validationErrors.username && <p className="text-xs text-red-400">{validationErrors.username}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-white/70 text-sm">Email <span className="text-white/30 font-normal text-xs">(optional)</span></Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#F5A623] focus:ring-[#F5A623]/20" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/70 text-sm">Password <span className="text-[#F5A623]">*</span></Label>
              <Input id="password" type="password" autoComplete="new-password" required value={password}
                onChange={(e) => { setPassword(e.target.value); if (validationErrors.password) setValidationErrors((p) => ({ ...p, password: "" })); }}
                placeholder="min 8 characters"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#F5A623] focus:ring-[#F5A623]/20" />
              {password.length > 0 && <PasswordStrengthMeter password={password} />}
              {validationErrors.password && <p className="text-xs text-red-400">{validationErrors.password}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-white/70 text-sm">Confirm Password <span className="text-[#F5A623]">*</span></Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (validationErrors.confirmPassword) setValidationErrors((p) => ({ ...p, confirmPassword: "" })); }}
                placeholder="re-enter password"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#F5A623] focus:ring-[#F5A623]/20" />
              {validationErrors.confirmPassword && <p className="text-xs text-red-400">{validationErrors.confirmPassword}</p>}
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{errorMessage}</p>
              </div>
            )}

            <Button type="submit" disabled={registerMutation.isPending}
              className="w-full font-semibold text-[#1C1C2E] bg-[#F5A623] hover:bg-[#F5A623]/90 transition-colors h-11">
              {registerMutation.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</span>
              ) : "Create Account"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-white/40">
          Already have an account?{" "}
          <Link href="/login"><span className="text-[#F5A623] hover:text-[#F5A623]/80 font-medium cursor-pointer transition-colors">Sign in</span></Link>
        </p>
      </div>
    </div>
  );
}