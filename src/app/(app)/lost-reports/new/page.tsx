"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bell,
  Calendar,
  Clock3,
  Contact,
  FileText,
  ImagePlus,
  type LucideIcon,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  Search,
  Send,
  UserCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { lostReportsApi } from "@/services/lostReports";
import { uploadsApi } from "@/services/uploads";
import { cn } from "@/lib/utils";
import type { ItemCategory } from "@/types";

const CATEGORIES: ItemCategory[] = [
  "Electronics",
  "Clothing",
  "Accessories",
  "Documents",
  "Keys",
  "Bags",
  "Sports",
  "Books",
  "Food",
  "Other",
];

const ACCEPTED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const schema = z.object({
  itemTitle: z.string().min(1, "Item title is required").max(200),
  category: z.enum([
    "Electronics",
    "Clothing",
    "Accessories",
    "Documents",
    "Keys",
    "Bags",
    "Sports",
    "Books",
    "Food",
    "Other",
  ]),
  color: z.string().max(50).optional(),
  brand: z.string().max(100).optional(),
  description: z.string().min(1, "Description is required").max(1000),
  dateLost: z.string().min(1, "Date is required"),
  approximateTime: z.string().optional(),
  locationLost: z.string().min(1, "Location is required").max(300),
});

type FormValues = z.infer<typeof schema>;
type ContactPreference = "Email" | "SMS Text" | "App Push";

export default function ReportLostItemPage() {
  const router = useRouter();
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [contactPreference, setContactPreference] = useState<ContactPreference>("Email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoPreviewUrlRef = useRef("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      itemTitle: "",
      category: "Other",
      color: "",
      brand: "",
      description: "",
      dateLost: "",
      approximateTime: "",
      locationLost: "",
    },
  });

  useEffect(() => {
    return () => {
      if (photoPreviewUrlRef.current) {
        URL.revokeObjectURL(photoPreviewUrlRef.current);
      }
    };
  }, []);

  const updatePhotoPreview = (file: File | null) => {
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
      photoPreviewUrlRef.current = "";
    }

    if (!file) {
      setPhotoPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    photoPreviewUrlRef.current = url;
    setPhotoPreviewUrl(url);
  };

  const resetPhotoInput = () => {
    updatePhotoPreview(null);
    setSelectedPhoto(null);
    setPhotoInputKey((key) => key + 1);
  };

  const handlePhotoSelected = (file: File | null) => {
    if (!file) {
      updatePhotoPreview(null);
      setSelectedPhoto(null);
      return;
    }

    if (!ACCEPTED_PHOTO_TYPES.has(file.type)) {
      toast.error("Photo must be a JPEG, PNG, or WebP image.");
      resetPhotoInput();
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Photo must be 5MB or smaller.");
      resetPhotoInput();
      return;
    }

    updatePhotoPreview(file);
    setSelectedPhoto(file);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const uploadedPhoto = selectedPhoto ? await uploadsApi.uploadItemPhoto(selectedPhoto) : null;
      const details = [
        values.description,
        values.approximateTime ? `Approximate time lost: ${values.approximateTime}` : "",
        `Contact preference: ${contactPreference}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      await lostReportsApi.create({
        itemTitle: values.itemTitle,
        category: values.category,
        color: values.color || undefined,
        brand: values.brand || undefined,
        description: details,
        imageUrls: uploadedPhoto ? [uploadedPhoto.url] : undefined,
        locationLost: values.locationLost,
        dateLost: values.dateLost,
      });

      toast.success("Lost report submitted.");
      router.push("/lost-reports");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to submit report. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] min-h-screen overflow-y-auto bg-[#f7f8f8] text-[#101417]">
      <header className="sticky top-0 z-10 border-b border-[#c9d4d2] bg-[#f7f8f8]/95 backdrop-blur">
        <div className="mx-auto flex h-[60px] max-w-[1220px] items-center justify-between px-6">
          <Link href="/dashboard" className="font-heading text-xl font-bold text-[#006056]">
            Campus Lost &amp; Found
          </Link>
          <div className="flex items-center gap-7 text-[#006056]">
            <Bell className="size-5" />
            <UserCircle className="size-6" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-5 py-12">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-heading text-[2rem] font-bold leading-tight tracking-normal">
              Report Lost Item
            </h1>
            <p className="mt-3 text-lg text-[#505a5c]">
              Provide detailed information to help us locate your missing property.
            </p>
          </div>
          <Link
            href="/lost-reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#273235] hover:text-[#006d62]"
          >
            <X className="size-4" />
            Cancel
          </Link>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-7">
            <section className="grid overflow-hidden rounded-xl border border-[#b8c6c4] bg-white md:grid-cols-[240px_minmax(0,1fr)]">
              <label className="flex min-h-[195px] cursor-pointer flex-col items-center justify-center border-b border-[#b8c6c4] bg-[#f0f1f1] p-6 text-center md:border-b-0 md:border-r">
                <input
                  key={photoInputKey}
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  type="file"
                  onChange={(event) => handlePhotoSelected(event.target.files?.[0] ?? null)}
                />
                {photoPreviewUrl ? (
                  <span
                    aria-label="Selected item photo"
                    className="mb-4 size-24 rounded-lg bg-cover bg-center"
                    role="img"
                    style={{ backgroundImage: `url(${JSON.stringify(photoPreviewUrl)})` }}
                  />
                ) : (
                  <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#dfe3e4] text-[#5f686b]">
                    <ImagePlus className="size-8" />
                  </span>
                )}
                <span className="font-bold">Upload Image</span>
                <span className="mt-2 text-sm text-[#505a5c]">JPG, PNG up to 5MB</span>
              </label>

              <div className="space-y-5 p-6">
                <FormField
                  control={form.control}
                  name="itemTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-[0.12em]">Item Title</FormLabel>
                      <FormControl>
                        <Input className="h-12" placeholder="e.g., Matte Black Hydro Flask" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-[0.12em]">Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 w-full">
                            <SelectValue placeholder="Select a category..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="rounded-xl border border-[#b8c6c4] bg-white p-6">
              <SectionTitle icon={FileText} title="Item Specifics" />
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-[0.12em]">Primary Color</FormLabel>
                      <FormControl>
                        <Input className="h-12" placeholder="e.g., Black, Navy Blue" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-[0.12em]">Brand / Make</FormLabel>
                      <FormControl>
                        <Input className="h-12" placeholder="e.g., Apple, North Face" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="mt-5">
                    <FormLabel className="text-xs font-bold uppercase tracking-[0.12em]">Detailed Description</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[95px]"
                        placeholder="Describe any unique features, scratches, stickers, or identifying marks..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="rounded-xl border border-[#b8c6c4] bg-white p-6">
              <SectionTitle icon={MapPin} title="When & Where" />
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dateLost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-[0.12em]">Date Lost</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input className="h-12 pr-10" type="date" {...field} />
                          <Calendar className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#505a5c]" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="approximateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-[0.12em]">Approximate Time</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input className="h-12 pr-10" type="time" {...field} />
                          <Clock3 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#505a5c]" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="locationLost"
                render={({ field }) => (
                  <FormItem className="mt-5">
                    <FormLabel className="text-xs font-bold uppercase tracking-[0.12em]">Last Known Location</FormLabel>
                    <FormControl>
                      <div className="flex h-12 overflow-hidden rounded-lg border border-[#b8c6c4] bg-white focus-within:border-[#007a6c] focus-within:ring-3 focus-within:ring-[#007a6c]/20">
                        <span className="flex w-12 items-center justify-center border-r border-[#b8c6c4] text-[#505a5c]">
                          <Search className="size-5" />
                        </span>
                        <input
                          className="min-w-0 flex-1 px-3 text-base outline-none placeholder:text-[#687173]"
                          placeholder="e.g., Library 2nd Floor, Main Quad..."
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="mt-5 overflow-hidden rounded-lg border border-[#c9d4d2] bg-[#dbe7e5]">
                <div className="relative h-[185px] bg-[linear-gradient(135deg,#9ac1bd_0_20%,#e7efef_20%_35%,#cfe3c1_35%_48%,#eef2ed_48%_62%,#b9d7cc_62%_75%,#f0f2ed_75%_100%)]">
                  <div className="absolute inset-x-[14%] inset-y-0 bg-white/45" />
                  <div className="absolute left-1/2 top-6 flex size-20 -translate-x-1/2 items-center justify-center rounded-full bg-[#42aaa6] text-white shadow-lg">
                    <MapPin className="size-12 fill-current" />
                  </div>
                  <button
                    type="button"
                    className="absolute bottom-4 left-4 inline-flex h-9 items-center gap-2 rounded-md bg-white px-4 text-sm text-[#182224] shadow-sm"
                  >
                    <Navigation className="size-4 text-[#007a6c]" />
                    Select area on map
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[#b8c6c4] bg-white p-6">
              <SectionTitle icon={Contact} title="Contact Preference" />
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <ContactButton
                  active={contactPreference === "Email"}
                  icon={Mail}
                  label="Email"
                  onClick={() => setContactPreference("Email")}
                />
                <ContactButton
                  active={contactPreference === "SMS Text"}
                  icon={MessageSquare}
                  label="SMS Text"
                  onClick={() => setContactPreference("SMS Text")}
                />
                <ContactButton
                  active={contactPreference === "App Push"}
                  icon={Bell}
                  label="App Push"
                  onClick={() => setContactPreference("App Push")}
                />
              </div>
            </section>

            <div className="flex flex-col items-center gap-5 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-[54px] w-full max-w-[300px] rounded-lg bg-[#007a6c] text-base font-bold text-white hover:bg-[#006e62]"
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
                <Send className="ml-2 size-5" />
              </Button>
              <p className="max-w-[520px] text-center text-sm text-[#505a5c]">
                By submitting this report, you confirm the details are accurate to the best of your knowledge.
              </p>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <h2 className="flex items-center gap-3 font-heading text-[1.45rem] font-bold tracking-normal text-[#101417]">
      <Icon className="size-5 text-[#007a6c]" />
      {title}
    </h2>
  );
}

function ContactButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: ContactPreference;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-20 flex-col items-center justify-center gap-2 rounded-lg border text-sm font-medium transition",
        active
          ? "border-[#007a6c] bg-[#e3f1ef] text-[#006d62]"
          : "border-[#b8c6c4] bg-white text-[#101417] hover:border-[#007a6c]",
      )}
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}
