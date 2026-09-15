import { useState } from "react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldAlert, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Props {
  children: React.ReactNode;
}

export default function AdminGate({ children }: Props) {
  const { loading, isAdmin, isAuthenticated } = useRequireAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Verifying access…
      </div>
    );
  }

  if (!isAuthenticated) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoggingIn(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const msg = error.message || "Authentication failed";
          if (msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("504")) {
            toast.error("Servidor temporariamente indisponível. Tente novamente em alguns minutos.");
          } else {
            toast.error(msg);
          }
        }
      } catch (err: any) {
        toast.error("Erro de conexão. Verifique sua internet e tente novamente.");
      }
      setLoggingIn(false);
    };

    return (
      <div className="flex items-center justify-center py-16">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 p-6 rounded-xl bg-card border border-border shadow-sm">
          <div className="flex flex-col items-center gap-2 mb-2">
            <Lock className="h-8 w-8 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Admin Login</h2>
            <p className="text-xs text-muted-foreground text-center">This section requires admin authentication.</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-primary">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background border-border text-foreground mt-1 focus-visible:ring-memory-accent"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-primary">Password</Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background border-border text-foreground focus-visible:ring-memory-accent pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={loggingIn}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loggingIn ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Sign In
          </Button>
        </form>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <ShieldAlert className="h-10 w-10 text-destructive opacity-60" />
        <p className="text-sm font-medium">Access denied — admin role required.</p>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => supabase.auth.signOut()}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
