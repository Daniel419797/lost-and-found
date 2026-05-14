"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { passwordSchema } from "@/lib/passwordPolicy";
import { authApi } from "@/services/auth";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  Landmark,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const schema = z
  .object({
    displayName: z.string().min(1, "Full name is required").max(100),
    studentStaffId: z.string().min(3, "Enter your student or staff ID").max(40),
    department: z.string().min(1, "Select a department"),
    email: z.string().email("Enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptPolicy: z.boolean().refine((value) => value, "You must agree before registering"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const CAMPUS_IMAGE =
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1800&q=80";

const departments = [
  "Student Affairs",
  "Engineering",
  "Computer Science",
  "Business",
  "Arts & Humanities",
  "Health Sciences",
  "Campus Security",
  "Administration",
];

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      displayName: "",
      studentStaffId: "",
      department: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptPolicy: false,
    },
  });

  const email = useWatch({ control: form.control, name: "email" });
  const confirmPasswordState = form.getFieldState("confirmPassword", form.formState);
  const emailLooksInstitutional = /@[^@\s]+\.[^@\s]+$/.test(email);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      await authApi.register({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
        role: "student",
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

  return (
    <main className="grid min-h-screen bg-[#f8f9f9] text-[#101417] lg:grid-cols-[0.9fr_1fr]">
      <section
        className="relative hidden min-h-screen bg-cover bg-center lg:block"
        style={{ backgroundImage: `url(${CAMPUS_IMAGE})` }}
      >
        <div className="absolute inset-0 bg-[#e4eeee]/72 backdrop-blur-[2px]" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-10">
          <div className="max-w-[520px] text-center">
            <div className="mx-auto mb-5 flex w-fit items-center justify-center text-[#007a6c]">
              <div className="relative">
                <Landmark className="size-14" strokeWidth={2.6} />
                <span className="absolute -right-3 bottom-0 flex size-7 items-center justify-center rounded-full bg-[#007a6c] text-white">
                  <ShieldCheck className="size-4" />
                </span>
              </div>
            </div>
            <h1 className="font-heading text-[2rem] font-bold leading-tight tracking-normal">
              Campus Lost &amp; Found
            </h1>
            <p className="mx-auto mt-4 max-w-[520px] text-base leading-7 text-[#2f3f42]">
              Join the centralized institutional recovery network. Secure your items and
              contribute to our community&apos;s trust system.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen flex-col justify-center px-4 py-6 sm:px-6 lg:px-10 xl:px-12">
        <div className="mx-auto w-full max-w-[590px]">
          <div className="mb-5 flex items-center justify-center gap-2 text-[#007a6c] lg:hidden">
            <Landmark className="size-7" />
            <span className="font-heading text-xl font-bold tracking-normal">
              Campus Lost &amp; Found
            </span>
          </div>

          <div className="rounded-lg border border-[#dfe4e3] bg-white p-5 shadow-[0_8px_22px_rgba(24,39,42,0.06)] sm:p-6 lg:p-8">
            <div>
              <h2 className="font-heading text-[1.45rem] font-bold tracking-normal">
                Register Account
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-[#273235]">
                Please provide your institutional details to access the network.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold text-[#101417]">Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#596366]" />
                          <Input
                            placeholder="Jane Doe"
                            className="h-10 rounded-md border-[#b8c6c4] bg-white pl-10 text-sm text-[#101417] placeholder:text-[#697477] focus-visible:border-[#007a6c] focus-visible:ring-[#007a6c]/20"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="studentStaffId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-[#101417]">
                          Student/Staff ID
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IdCard className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#596366]" />
                            <Input
                              placeholder="e.g. 10012345"
                              className="h-10 rounded-md border-[#b8c6c4] bg-white pl-10 text-sm text-[#101417] placeholder:text-[#697477] focus-visible:border-[#007a6c] focus-visible:ring-[#007a6c]/20"
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
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-[#101417]">
                          Department
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 w-full rounded-md border-[#b8c6c4] bg-white px-3 text-sm text-[#101417] focus-visible:border-[#007a6c] focus-visible:ring-[#007a6c]/20">
                              <div className="flex min-w-0 items-center gap-2">
                                <Building2 className="size-4 shrink-0 text-[#596366]" />
                                <SelectValue placeholder="Select Department" />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments.map((department) => (
                              <SelectItem key={department} value={department}>
                                {department}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#596366]" />
                          <Input
                            type="email"
                            placeholder="jane.doe@university.edu"
                            className="h-10 rounded-md border-[#006d62] bg-white pl-10 pr-10 text-sm text-[#101417] placeholder:text-[#697477] focus-visible:border-[#007a6c] focus-visible:ring-[#007a6c]/20"
                            {...field}
                          />
                          {emailLooksInstitutional && (
                            <CheckCircle2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#007a6c]" />
                          )}
                        </div>
                      </FormControl>
                      {emailLooksInstitutional && (
                        <p className="text-sm font-medium text-[#007a6c]">Email domain verified.</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-[#101417]">
                          Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#596366]" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="********"
                              className="h-10 rounded-md border-[#b8c6c4] bg-white px-10 text-sm tracking-[0.12em] text-[#101417] placeholder:text-[#697477] focus-visible:border-[#007a6c] focus-visible:ring-[#007a6c]/20"
                              {...field}
                            />
                            <button
                              type="button"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#596366] transition hover:text-[#101417]"
                              onClick={() => setShowPassword((current) => !current)}
                            >
                              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className={`text-sm font-bold ${
                            confirmPasswordState.error ? "text-red-700" : "text-[#101417]"
                          }`}
                        >
                          Confirm Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockKeyhole
                              className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${
                                confirmPasswordState.error ? "text-red-700" : "text-[#596366]"
                              }`}
                            />
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="******"
                              className={`h-10 rounded-md bg-white px-10 text-sm tracking-[0.12em] text-[#101417] placeholder:text-[#697477] ${
                                confirmPasswordState.error
                                  ? "border-red-500 bg-red-50 focus-visible:border-red-500 focus-visible:ring-red-200"
                                  : "border-[#b8c6c4] focus-visible:border-[#007a6c] focus-visible:ring-[#007a6c]/20"
                              }`}
                              {...field}
                            />
                            <button
                              type="button"
                              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#596366] transition hover:text-[#101417]"
                              onClick={() => setShowConfirmPassword((current) => !current)}
                            >
                              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                            {confirmPasswordState.error && (
                              <AlertCircle className="absolute right-10 top-1/2 size-4 -translate-y-1/2 text-red-600" />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="acceptPolicy"
                  render={({ field }) => (
                    <FormItem>
                      <label className="flex items-start gap-3 text-sm leading-6 text-[#2f3f42]">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          className="mt-1 size-4 rounded border-[#b8c6c4] accent-[#007a6c]"
                        />
                        <span>
                          I agree to the{" "}
                          <Link href="/register" className="font-bold text-[#006d62]">
                            Institutional Policy
                          </Link>{" "}
                          and{" "}
                          <Link href="/register" className="font-bold text-[#006d62]">
                            Data Handling Guidelines
                          </Link>
                          .
                        </span>
                      </label>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t border-[#dfe4e3] pt-4">
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      href="/login"
                      className="text-sm font-semibold text-[#505a5c] transition hover:text-[#006d62]"
                    >
                      Back to Login
                    </Link>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="h-10 min-w-[190px] rounded-md bg-[#007a6c] px-5 text-sm font-bold text-white shadow-[0_3px_7px_rgba(0,89,80,0.22)] hover:bg-[#006d62]"
                    >
                      {isLoading ? "Registering..." : "Register Account"}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </div>

          <footer className="mx-auto mt-5 max-w-[590px] text-center text-xs text-[#273235]">
            <p>&copy; 2024 Institutional Recovery Network. All rights reserved.</p>
            <div className="mt-3 flex justify-center gap-5">
              <Link href="/register" className="hover:text-[#006d62]">
                Help Center
              </Link>
              <Link href="/register" className="hover:text-[#006d62]">
                Contact IT
              </Link>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
