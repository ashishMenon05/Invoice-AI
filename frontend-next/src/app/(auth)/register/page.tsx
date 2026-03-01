"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Loader2 } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

const Register = () => {
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { register, loginWithGoogle } = useAuth();
  const navigate = useRouter();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      setError("");
      setLoading(true);
      try {
        await loginWithGoogle(credentialResponse.credential);
      } catch (err) {
        setError("Google authentication failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!orgName.trim()) { setError("Company name is required"); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    try {
      await register(email, password, orgName.trim());
      navigate.push("/client/dashboard");
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Registration failed — check your details and try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Get started with InvoiceAI</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} type="text" placeholder="Acme Corp" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@company.com" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Account
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="flex w-full justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Login Widget Failed')}
                useOneTap
                theme="filled_black"
                shape="rectangular"
              />
            </div>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
