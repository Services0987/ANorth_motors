import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const SafeIcon = (Icon, props = {}) => {
  if (!Icon || (typeof Icon !== 'function' && typeof Icon !== 'object')) return null;
  return <Icon {...props} />;
};

