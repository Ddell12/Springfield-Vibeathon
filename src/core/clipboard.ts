import { toast } from "sonner";

export async function copyToClipboard(
  text: string,
  successMessage = "Copied!"
) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Failed to copy — try selecting and copying manually");
  }
}
