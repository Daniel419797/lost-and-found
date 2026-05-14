"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bell,
  Camera,
  Save,
  UserCircle,
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
import { foundReportsApi } from "@/services/foundReports";
import { uploadsApi } from "@/services/uploads";
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

const STORAGE_LOCATIONS = [
  "Campus Security Desk",
  "Library Front Desk",
  "Student Affairs Office",
  "Department Office",
  "Campus Police Office",
];

const CONTACT_OPTIONS = ["Email Only", "App Notification", "Email and App"] as const;
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
  dateFound: z.string().min(1, "Date is required"),
  description: z.string().max(1000).optional(),
  brand: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  locationFound: z.string().min(1, "Location is required").max(300),
  custodyLocation: z.string().min(1, "Storage location is required").max(300),
  contactPreference: z.enum(CONTACT_OPTIONS),
});

type FormValues = z.infer<typeof schema>;

export default function ReportFoundItemPage() {
  const router = useRouter();
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoPreviewUrlRef = useRef("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      itemTitle: "",
      category: "Other",
      dateFound: "",
      description: "",
      brand: "",
      color: "",
      locationFound: "",
      custodyLocation: "",
      contactPreference: "Email Only",
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
      const description = [
        values.description,
        `Contact preference: ${values.contactPreference}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      await foundReportsApi.create({
        itemTitle: values.itemTitle,
        category: values.category,
        dateFound: values.dateFound,
        description: description || undefined,
        brand: values.brand || undefined,
        color: values.color || undefined,
        imageUrls: uploadedPhoto ? [uploadedPhoto.url] : undefined,
        locationFound: values.locationFound,
        custodyLocation: values.custodyLocation,
      });

      toast.success("Found report submitted.");
      router.push("/found-reports");
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
    <div className="mx-auto max-w-[1220px]">
      <div className="flex min-h-[50px] items-center justify-between border-b border-[#c9d4d2] pb-5">
        <h1 className="font-heading text-[1.9rem] font-bold tracking-normal text-[#101417]">
          Report Found Item
        </h1>
        <div className="flex items-center gap-7 text-[#006056]">
          <Bell className="size-5" />
          <UserCircle className="size-7" />
        </div>
      </div>

      <p className="mt-9 text-xl text-[#273235]">
        Please provide accurate details to help return this item to its owner quickly.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_355px]">
          <main className="space-y-8">
            <section className="rounded-xl border border-[#e0e5e4] bg-white p-8 shadow-sm">
              <h2 className="font-heading text-[1.75rem] font-bold tracking-normal text-[#101417]">
                Basic Information
              </h2>
              <div className="mt-6 space-y-6">
                <FormField
                  control={form.control}
                  name="itemTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-bold">Item Title *</FormLabel>
                      <FormControl>
                        <Input className="h-12 text-lg" placeholder="e.g., Blue Hydro Flask, Keys with lanyard" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-bold">Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 w-full text-lg">
                              <SelectValue placeholder="Select category..." />
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
                  <FormField
                    control={form.control}
                    name="dateFound"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-bold">Date Found *</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-lg" type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[#e0e5e4] bg-white p-8 shadow-sm">
              <h2 className="font-heading text-[1.75rem] font-bold tracking-normal text-[#101417]">
                Description &amp; Details
              </h2>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="mt-6">
                    <FormLabel className="text-lg font-bold">Detailed Description</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[125px] text-lg"
                        placeholder="Describe any unique features, damage, stickers, or contents..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-bold">Brand/Make</FormLabel>
                      <FormControl>
                        <Input className="h-12 text-lg" placeholder="e.g., Apple, North Face" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-bold">Primary Color</FormLabel>
                      <FormControl>
                        <Input className="h-12 text-lg" placeholder="e.g., Black, Silver" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="rounded-xl border border-[#e0e5e4] bg-white p-8 shadow-sm">
              <h2 className="font-heading text-[1.75rem] font-bold tracking-normal text-[#101417]">
                Location Details
              </h2>
              <FormField
                control={form.control}
                name="locationFound"
                render={({ field }) => (
                  <FormItem className="mt-6">
                    <FormLabel className="text-lg font-bold">Exact Location Found *</FormLabel>
                    <FormControl>
                      <Input className="h-12 text-lg" placeholder="e.g., Library 2nd Floor, Room 204 desk" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-[#505a5c]">Be as specific as possible to help verify ownership.</p>
                  </FormItem>
                )}
              />
            </section>
          </main>

          <aside className="space-y-8">
            <section className="rounded-xl border border-[#e0e5e4] bg-white p-8 shadow-sm">
              <h2 className="font-heading text-[1.75rem] font-bold tracking-normal text-[#101417]">Photo</h2>
              <label className="mt-6 flex min-h-[175px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#b8c6c4] bg-[#f7f8f8] p-6 text-center">
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
                  <Camera className="mb-4 size-11 text-[#273235]" />
                )}
                <span className="text-lg font-bold">Click or drag image here</span>
                <span className="mt-2 text-base text-[#505a5c]">PNG, JPG up to 5MB</span>
              </label>
            </section>

            <section className="rounded-xl border border-[#e0e5e4] bg-white p-8 shadow-sm">
              <h2 className="font-heading text-[1.75rem] font-bold tracking-normal text-[#101417]">Logistics</h2>
              <div className="mt-6 space-y-6">
                <FormField
                  control={form.control}
                  name="custodyLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-bold">Current Storage Location *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 w-full text-lg">
                            <SelectValue placeholder="Where is the item now?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STORAGE_LOCATIONS.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPreference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-bold">Contact Preference</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 w-full text-lg">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CONTACT_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
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

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-[62px] w-full rounded-lg bg-[#007a6c] text-xl font-bold text-white hover:bg-[#006e62]"
            >
              <Save className="mr-3 size-6" />
              {isSubmitting ? "Submitting..." : "Submit Found Report"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/found-reports")}
              disabled={isSubmitting}
              className="h-[58px] w-full rounded-lg border-[#b8c6c4] bg-white text-xl font-bold text-[#101417]"
            >
              Cancel
            </Button>
          </aside>
        </form>
      </Form>
    </div>
  );
}
