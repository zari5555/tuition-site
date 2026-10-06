"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseKarachiDateTime } from "@/lib/timezone";

export async function requestReschedule(sessionId: string, formData: FormData) {
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const dateStr = formData.get("date") as string;
  const reason = formData.get("reason") as string;
  if (!startTime || !endTime || !dateStr) return;

  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: { tuition: { include: { sessions: true } } }
  });
  if (!session) return;

  const proposedStart = parseKarachiDateTime(dateStr, startTime);
  const proposedEnd = parseKarachiDateTime(dateStr, endTime);

  // Check for conflicts with other scheduled sessions in the same tuition
  const hasConflict = session.tuition.sessions.some(s => {
    if (s.id === sessionId) return false;
    if (!["SCHEDULED", "RESCHEDULED"].includes(s.status)) return false;
    const sStart = new Date(s.date);
    const sEnd = new Date(s.endTime);
    return proposedStart < sEnd && proposedEnd > sStart;
  });

  if (hasConflict) return; // silently skip conflicting requests

  await prisma.classSession.update({
    where: { id: sessionId },
    data: {
      rescheduleRequestedBy: "TEACHER",
      rescheduleProposedTime: proposedStart,
      rescheduleProposedEndTime: proposedEnd,
      rescheduleReason: reason,
      rescheduleStatus: "PENDING"
    }
  });
  revalidatePath("/dashboard/teacher");
  revalidatePath("/dashboard/student");
}

export async function markClassStatus(sessionId: string, status: "COMPLETED" | "MISSED" | "PENDING") {
  await prisma.classSession.update({
    where: { id: sessionId },
    data: { status },
  });
  revalidatePath("/dashboard/teacher");
}

export async function updateClassLink(sessionId: string, formData: FormData) {
  const link = formData.get("link") as string;
  await prisma.classSession.update({
    where: { id: sessionId },
    data: { classLink: link },
  });
  revalidatePath("/dashboard/teacher");
}
