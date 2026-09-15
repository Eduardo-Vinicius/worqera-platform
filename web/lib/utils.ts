import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function pairCount(o: { itemCount?: number; items?: unknown[] }) {
  return Number(o.itemCount || o.items?.length || 1)
}
