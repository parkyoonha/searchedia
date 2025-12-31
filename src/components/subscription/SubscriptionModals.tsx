import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";

interface PricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPro: () => void;
}

export function PricingDialog({ open, onOpenChange, onSelectPro }: PricingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Choose your plan</DialogTitle>
          <DialogDescription className="text-center">
            Unlock the full potential of LexiGrid AI
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6 py-6">
          {/* Free Plan */}
          <div className="border rounded-xl p-6 flex flex-col gap-4 hover:border-slate-300 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">Free</h3>
                <p className="text-slate-500 text-sm">For trying things out</p>
              </div>
              <Badge variant="outline">Current</Badge>
            </div>
            <div className="text-3xl font-bold">$0<span className="text-sm font-normal text-slate-500">/mo</span></div>
            <ul className="space-y-2 text-sm text-slate-600 flex-1">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> No login required</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> 10 Free credits</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Basic export</li>
            </ul>
            <Button variant="outline" disabled className="w-full">Current Plan</Button>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-indigo-600 rounded-xl p-6 flex flex-col gap-4 relative bg-indigo-50/10">
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg text-indigo-900">Pro</h3>
                <p className="text-indigo-600/80 text-sm">For power users</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-indigo-900">$29<span className="text-sm font-normal text-slate-500">/mo</span></div>
            <ul className="space-y-2 text-sm text-slate-700 flex-1">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600" /> Unlimited generation</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600" /> Priority processing</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600" /> Advanced export</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600" /> Cloud Sync</li>
            </ul>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={onSelectPro}>Upgrade to Pro</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PaymentDialog({ open, onOpenChange, onSuccess }: PaymentDialogProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate payment
    setTimeout(() => {
        setLoading(false);
        onSuccess();
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Secure Payment</DialogTitle>
          <DialogDescription>
            Upgrade to Pro Plan - $29.00/month
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handlePay} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Card Information</Label>
                <div className="relative">
                    <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="0000 0000 0000 0000" className="pl-9" required />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Expiry</Label>
                    <Input placeholder="MM/YY" required />
                </div>
                <div className="space-y-2">
                    <Label>CVC</Label>
                    <Input placeholder="123" required />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Name on Card</Label>
                <Input placeholder="John Doe" required />
            </div>

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Processing...' : 'Pay $29.00'}
            </Button>
            <p className="text-xs text-center text-slate-400 flex items-center justify-center gap-1">
                <span className="bg-slate-100 rounded px-1">🔒</span> 256-bit SSL Secured
            </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface LoginDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLogin: (email: string) => void;
}

export function LoginDialog({ open, onOpenChange, onLogin }: LoginDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isSignUp) {
                // Sign up
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (error) throw error;

                toast.success("Check your email for the confirmation link!");
                setIsSignUp(false);
            } else {
                // Sign in
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                if (data.user) {
                    onLogin(data.user.email || email);
                    toast.success("Logged in successfully!");
                }
            }
        } catch (error: any) {
            toast.error(error.message || "Authentication failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });

            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message || "Google login failed");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isSignUp ? "Create Account" : "Welcome Back"}</DialogTitle>
                    <DialogDescription>
                        {isSignUp ? "Sign up for a Pro account" : "Login to access your Pro account"}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEmailLogin} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Password</Label>
                        <Input
                            type="password"
                            placeholder={isSignUp ? "Create a password (min 6 characters)" : "Enter your password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isLoading ? "Processing..." : (isSignUp ? "Sign Up" : "Login")}
                    </Button>
                    <div className="text-center text-sm">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-indigo-600 hover:text-indigo-700 underline"
                        >
                            {isSignUp ? "Already have an account? Login" : "Don't have an account? Sign up"}
                        </button>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-muted-foreground">Or</span>
                        </div>
                    </div>
                    <Button variant="outline" type="button" className="w-full" onClick={handleGoogleLogin}>
                        Continue with Google
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
