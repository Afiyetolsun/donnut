import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(label: string): string {
  // Convert to lowercase and replace spaces with dashes
  const baseSlug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace any non-alphanumeric chars with dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes

  // Add a longer random string to ensure uniqueness
  const randomString = Math.random().toString(36).substring(2, 12);
  
  return `${baseSlug}-${randomString}`;
}
