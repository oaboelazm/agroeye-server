import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Leaf } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useAuth } from "../../contexts/AuthContext";

export function SignupPage() {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signup(form);
      navigate("/login");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Leaf className="h-12 w-12 text-emerald-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-emerald-500 hover:text-emerald-400">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-border/50">
          <form className="space-y-6" onSubmit={handleSignup}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg p-3">{error}</div>
            )}
            <div>
              <Label htmlFor="username">Username</Label>
              <div className="mt-1">
                <Input id="username" name="username" type="text" required value={form.username} onChange={handleChange("username")} className="bg-muted/50 border-border" />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email address</Label>
              <div className="mt-1">
                <Input id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={handleChange("email")} className="bg-muted/50 border-border" />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <div className="mt-1">
                <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange("phone")} className="bg-muted/50 border-border" />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="mt-1">
                <Input id="password" name="password" type="password" required value={form.password} onChange={handleChange("password")} className="bg-muted/50 border-border" />
              </div>
            </div>

            <div>
              <Button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
                {isLoading ? "Creating account..." : "Sign up"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
