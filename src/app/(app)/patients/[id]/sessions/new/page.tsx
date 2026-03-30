import { SessionNoteEditor } from "@/features/session-notes/components/session-note-editor";

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionNoteEditor patientId={id} />;
}
