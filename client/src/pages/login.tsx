import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLogin } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    loginMutation.mutate(
      { username, password },
      {
        onSuccess: () => {
          toast({ title: "Welcome back", description: "You have successfully signed in." });
          setLocation("/dashboard");
        },
        onError: (err: Error) => {
          setErrorMessage(err.message ?? "Invalid credentials. Please try again.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#1C1C2E] px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1
            className="text-5xl font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(90deg, #F5A623, #FFD580)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Liberty Echo
          </h1>
          <p className="text-sm font-medium tracking-widest uppercase text-[#00E5A0]">
            Sentient Voice Intelligence
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 space-y-6 shadow-2xl">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white">Sign in</h2>
            <p className="text-sm text-white/50">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-white/70 text-sm">Username</Label>
              <Input
                id="username" type="text" autoComplete="username" required
                value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#F5A623] focus:ring-[#F5A623]/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/70 text-sm">Password</Label>
              <Input
                id="password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••••"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#F5A623] focus:ring-[#F5A623]/20"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <input
                id="remember-me" type="checkbox" checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[#F5A623] cursor-pointer"
              />
              <Label htmlFor="remember-me" className="text-white/60 text-sm cursor-pointer select-none">
                Remember me
              </Label>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{errorMessage}</p>
              </div>
            )}

            <Button
              type="submit" disabled={loginMutation.isPending}
              className="w-full font-semibold text-[#1C1C2E] bg-[#F5A623] hover:bg-[#F5A623]/90 transition-colors h-11"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                </span>
              ) : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-white/40">
          Don't have an account?{" "}
          <Link href="/register">
            <span className="text-[#F5A623] hover:text-[#F5A623]/80 font-medium cursor-pointer transition-colors">Sign up</span>
          </Link>
        </p>
      </div>
    </div>
  );
}