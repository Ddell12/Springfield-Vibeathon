import { SessionNoteEditor } from "@/features/session-notes/components/session-note-editor";

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string; noteId: string }>;
}) {
  const { id, noteId } = await params;
  return <SessionNoteEditor patientId={id} noteId={noteId} />;
}
