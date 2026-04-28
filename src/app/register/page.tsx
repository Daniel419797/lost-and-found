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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { passwordSchema, PASSWORD_POLICY_HINT } from "@/lib/passwordPolicy";
import { authApi } from "@/services/auth";
import { MapPin, Package, Search, ShieldCheck } from "lucide-react";

const schema = z
  .object({
    displayName: z.string().min(1, "Display name is required").max(100),
    email: z.string().email("Enter a valid email address"),
    role: z.enum(["student", "staff"]).default("student"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      displayName: "",
      email: "",
      role: "student",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      await authApi.register({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
        role: values.role,
      });
      toast.success("Account created! Please log in.");
      router.push("/login");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Registration failed. Please try again.";
      toast.error(msg);
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

          <p className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            University Lost &amp; Found Management
          </p>
          <h1 className="mt-4 font-heading text-4xl leading-tight md:text-5xl">
            Find what you lost,
            <br />
            return what you found.
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            CampusLostFound is the central hub for your university campus. Report, search, and
            claim your belongings in minutes.
          </p>

          <div className="mt-8 space-y-4">
            <article className="flex items-start gap-3 rounded-xl border p-3">
              <span className="rounded-md bg-muted p-2">
                <Search className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Search Instantly</p>
                <p className="text-sm text-muted-foreground">
                  Browse all found items on campus filtered by category, date, and location.
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
                  AI-assisted matching connects lost item reports to found item logs.
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
                  Staff-reviewed claim process ensures items are returned to the right person.
                </p>
              </div>
            </article>
          </div>

          <div className="mt-8 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background">
              1
            </span>
            Report Lost
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background">
              2
            </span>
            Find Match
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background">
              3
            </span>
            Claim &amp; Collect
          </div>
        </section>

        {/* Right panel */}
        <section className="border-l bg-muted/35 p-6 md:p-10">
          <Card className="border-0 bg-background shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>Join the campus community lost &amp; found network.</CardDescription>
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

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>University Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="jane@university.ac.uk" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>I am a…</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="staff">Staff / Faculty</SelectItem>
                          </SelectContent>
                        </Select>
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
                          <Input type="password" placeholder="Strong password" {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Repeat your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account…" : "Create Account"}
                  </Button>
                </form>
              </Form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  Log in here
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
