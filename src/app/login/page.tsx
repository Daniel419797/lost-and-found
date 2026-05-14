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
import { authApi } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import { Landmark, LockKeyhole, LogIn, Mail } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

const CAMPUS_IMAGE =
  "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=2200&q=80";

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

  return (
    <main
      className="min-h-screen bg-cover bg-center px-4 py-6 text-[#101417]"
      style={{ backgroundImage: `url(${CAMPUS_IMAGE})` }}
    >
      <div className="fixed inset-0 -z-0 bg-[#dbe7e7]/70 backdrop-blur-[2px]" />
      <div className="relative z-10 flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <section className="w-full max-w-[440px] overflow-hidden rounded-lg border border-[#d7dfdd] bg-white shadow-[0_14px_34px_rgba(24,39,42,0.16)]">
          <div className="h-1.5 bg-[#007a6c]" />
          <div className="px-6 py-8 sm:px-8">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#008a7d] text-[#004f48]">
              <Landmark className="size-7" strokeWidth={2.4} />
            </div>

            <div className="mt-5 text-center">
              <h1 className="font-heading text-[1.9rem] font-bold leading-tight tracking-normal text-[#101417]">
                Campus Recovery
              </h1>
              <p className="mx-auto mt-2 max-w-[310px] text-sm leading-6 text-[#505a5c]">
                Secure access to the institutional lost &amp; found network.
              </p>
            </div>

            {lockoutMessage && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {lockoutMessage}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-7 space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold text-[#101417]">
                        University Email
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6d7476]" />
                          <Input
                            type="email"
                            placeholder="netid@university.edu"
                            className="h-11 rounded-md border-[#afbfbd] bg-white pl-10 text-sm tracking-normal text-[#101417] placeholder:text-[#b4b9ba] focus-visible:border-[#007a6c] focus-visible:ring-[#007a6c]/20"
                            {...field}
                          />
                        </div>
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
                      <div className="flex items-center justify-between gap-4">
                        <FormLabel className="text-sm font-bold text-[#101417]">
                          Password
                        </FormLabel>
                        <Link
                          href="/login"
                          className="text-sm font-semibold text-[#006d62] hover:text-[#00584f]"
                        >
                          Forgot Password?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6d7476]" />
                          <Input
                            type="password"
                            placeholder="********"
                            className="h-11 rounded-md border-[#afbfbd] bg-white pl-10 text-sm tracking-[0.14em] text-[#101417] placeholder:text-[#aaa] focus-visible:border-[#007a6c] focus-visible:ring-[#007a6c]/20"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 w-full rounded-md bg-[#007a6c] text-sm font-bold text-white shadow-none hover:bg-[#006d62]"
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                  <LogIn className="ml-2 size-4" />
                </Button>
              </form>
            </Form>

            <div className="mt-7 border-t border-[#e0e4e3] pt-5 text-center text-sm text-[#505a5c]">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-bold text-[#006d62] hover:text-[#00584f]">
                Register
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
