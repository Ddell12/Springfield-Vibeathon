import { PageViewer } from "@/components/PageViewer";

interface StoryPage {
  image: string;
  text: string;
  audioUrl?: string;
}

interface SocialStoryProps {
  title: string;
  pages: StoryPage[];
  onPageChange?: (index: number) => void;
  onComplete?: () => void;
}

export function SocialStory({ title, pages, onPageChange, onComplete }: SocialStoryProps) {
  const handlePageChange = (index: number) => {
    onPageChange?.(index);
    if (index === pages.length - 1) {
      onComplete?.();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="tool-title text-xl">{title}</h2>
      <PageViewer pages={pages} onPageChange={handlePageChange} />
    </div>
  );
}
