import { copyToClipboard } from "../clipboard";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import toast after mock so we get the mocked version
import { toast } from "sonner";

describe("copyToClipboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls writeText and shows success toast on success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    await copyToClipboard("hello world");

    expect(writeText).toHaveBeenCalledWith("hello world");
    expect(toast.success).toHaveBeenCalledWith("Copied!");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("uses custom success message when provided", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    await copyToClipboard("some text", "Link copied!");

    expect(toast.success).toHaveBeenCalledWith("Link copied!");
  });

  it("shows error toast when writeText rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    await copyToClipboard("hello world");

    expect(toast.error).toHaveBeenCalledWith(
      "Failed to copy — try selecting and copying manually"
    );
    expect(toast.success).not.toHaveBeenCalled();
  });
});
