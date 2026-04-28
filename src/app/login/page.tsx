"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authApi } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import { MapPin, Package, Search, ShieldCheck } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setLockoutMessage(null);
    try {
      const res = await authApi.login(values);
      login(res.data.data.token, res.data.data.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as {
        response?: { status?: number; data?: { message?: string; retryAfter?: string } };
      };
      if (error.response?.status === 429) {
        const retryAfter = error.response.data?.retryAfter;
        const msg = retryAfter
          ? `Account locked. Try again after ${new Date(retryAfter).toLocaleTimeString()}.`
          : "Account locked for 15 minutes due to too many failed attempts.";
        setLockoutMessage(msg);
      } else {
        toast.error(error.response?.data?.message ?? "Invalid email or password.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startOAuth = (provider: "google") => {
    const url = authApi.getOAuthStartUrl(provider);
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.08),_transparent_35%),hsl(var(--background))] px-4 py-8 md:px-6">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border bg-background/90 shadow-xl backdrop-blur md:grid-cols-[1.08fr_0.92fr]">
        {/* Left panel */}
        <section className="relative p-8 md:p-10">
          <div className="mb-8 flex items-center gap-2">
            <span className="rounded-md bg-foreground p-1.5 text-background">
              <MapPin className="h-4 w-4" />
            </span>
            <p className="font-semibold">CampusLostFound</p>
          </div>

          <h1 className="font-heading text-4xl leading-tight md:text-5xl">Welcome back</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Sign in to report lost items, log found items, and track your claims.
          </p>

          <div className="mt-8 space-y-4">
            <article className="flex items-start gap-3 rounded-xl border p-3">
              <span className="rounded-md bg-muted p-2">
                <Search className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Instant Search</p>
                <p className="text-sm text-muted-foreground">
                  Browse all found items on campus and filter by category, date, and location.
                </p>
              </div>
            </article>
            <article className="flex items-start gap-3 rounded-xl border p-3">
              <span className="rounded-md bg-muted p-2">
                <Package className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Smart Matching</p>
                <p className="text-sm text-muted-foreground">
                  AI-assisted matching of lost items to found reports to reunite you with your belongings.
                </p>
              </div>
            </article>
            <article className="flex items-start gap-3 rounded-xl border p-3">
              <span className="rounded-md bg-muted p-2">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Verified Claims</p>
                <p className="text-sm text-muted-foreground">
                  Staff-reviewed claim process ensures items are returned to their rightful owners.
                </p>
              </div>
            </article>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">© 2026 CampusLostFound</p>
        </section>

        {/* Right panel */}
        <section className="border-l bg-muted/35 p-6 md:p-10">
          <Card className="border-0 bg-background shadow-sm">
            <CardHeader className="text-center">
              <div className="mb-2 flex justify-center">
                <span className="rounded-md bg-foreground p-1.5 text-background">
                  <MapPin className="h-4 w-4" />
                </span>
              </div>
              <CardTitle className="text-2xl">Sign in to your account</CardTitle>
              <CardDescription>Welcome to CampusLostFound</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => startOAuth("google")}
                >
                  Continue with Google
                </Button>
              </div>

              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              {lockoutMessage && (
                <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                  {lockoutMessage}
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@university.ac.uk" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Logging in…" : "Log In"}
                  </Button>
                </form>
              </Form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  Register here
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
