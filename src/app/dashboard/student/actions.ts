"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseKarachiDateTime, getKarachiDateString } from "@/lib/timezone";

export async function requestReschedule(sessionId: string, formData: FormData) {
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const dateStr = formData.get("date") as string;
  const reason = formData.get("reason") as string;
  if (!startTime || !endTime) return;

  const session = await prisma.classSession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  const targetDateStr = dateStr || getKarachiDateString(session.date);
  const proposedStart = parseKarachiDateTime(targetDateStr, startTime);
  const proposedEnd = parseKarachiDateTime(targetDateStr, endTime);

  await prisma.classSession.update({
    where: { id: sessionId },
    data: {
      rescheduleRequestedBy: "STUDENT",
      rescheduleProposedTime: proposedStart,
      rescheduleProposedEndTime: proposedEnd,
      rescheduleReason: reason,
      rescheduleStatus: "PENDING"
    }
  });
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/teacher");
}
