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
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
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

interface PreLoginConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (intent: 'save' | 'discard') => void;
}

export function PreLoginConfirmDialog({ open, onOpenChange, onConfirm }: PreLoginConfirmDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save your work?</DialogTitle>
          <DialogDescription>
            You have unsaved work. Would you like to save it to your account before logging in?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 grid grid-cols-1 gap-3">
          <Button
            className="w-full"
            onClick={() => onConfirm('save')}
          >
            Save Work & Log In
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onConfirm('discard')}
          >
            Discard & Log In
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
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
                    <DialogTitle>Searchedia</DialogTitle>
                    <DialogDescription>
                        Login to continue your project.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6">
                    <Button variant="outline" type="button" className="w-full flex items-center justify-center gap-2" onClick={handleGoogleLogin}>
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
