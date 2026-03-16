"use client";

import NotesTab from "@/components/NotesTab";

export default function WorkerNotesSection({ workerId }: { workerId: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mt-6">
      <NotesTab entityType="worker" entityId={workerId} />
    </div>
  );
}
