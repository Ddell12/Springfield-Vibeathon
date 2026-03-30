import { NotesPage } from "@/features/sessions/components/notes-page";

export default function NotesRoute({ params }: { params: Promise<{ id: string }> }) {
  return <NotesPage paramsPromise={params} />;
}
