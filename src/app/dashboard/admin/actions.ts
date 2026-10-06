"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { sendSetPasswordEmail, sendClassAllottedEmail } from "@/lib/email";
import { parseKarachiDateTime, getKarachiDayIndex } from "@/lib/timezone";

/** Generates a secure token for the set-password link */
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function acceptStudentApp(id: string) {
  const app = await prisma.studentApplication.findUnique({ where: { id } });
  if (!app) return;

  await prisma.studentApplication.update({
    where: { id },
    data: { status: "ACCEPTED" },
  });

  const emailDomain = process.env.STUDENT_EMAIL_DOMAIN || "student.tuitionss.com";
  const targetEmail = (app as any).email || `${app.studentName.replace(/\s+/g, "").toLowerCase()}@${emailDomain}`;

  // Create user account without a password — they'll set it via the email link
  await prisma.user.upsert({
    where: { email: targetEmail },
    update: {},
    create: {
      name: app.studentName,
      email: targetEmail,
      phone: app.phone,
      password: null,
      role: "STUDENT",
      studentProfile: {
        create: { grade: (app as any).grade || "Class 9" }
      }
    }
  });

  // Generate a 24-hour set-password token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await prisma.passwordResetToken.create({
    data: { token, email: targetEmail, expiresAt, used: false }
  });

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.tuitionss.com";
  const setPasswordUrl = `${baseUrl}/reset-password/${token}`;

  await sendSetPasswordEmail({
    to: targetEmail,
    name: app.studentName,
    role: "STUDENT",
    setPasswordUrl,
  });

  revalidatePath("/dashboard/admin");
}

export async function rejectStudentApp(id: string) {
  await prisma.studentApplication.update({
    where: { id },
    data: { status: "REJECTED" },
  });
  revalidatePath("/dashboard/admin");
}

export async function acceptTeacherApp(id: string) {
  const app = await prisma.teacherApplication.findUnique({ where: { id } });
  if (!app) return;

  await prisma.teacherApplication.update({
    where: { id },
    data: { status: "ACCEPTED" },
  });

  // Create user account without a password — they'll set it via the email link
  await prisma.user.upsert({
    where: { email: app.email },
    update: {},
    create: {
      name: app.name,
      email: app.email,
      phone: app.phone,
      password: null,
      role: "TEACHER",
      teacherProfile: {
        create: { subjects: app.subjects, grades: (app as any).grades || "Class 2 to A Levels", qualification: (app as any).qualification || null } as any
      }
    }
  });

  // Generate a 24-hour set-password token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await prisma.passwordResetToken.create({
    data: { token, email: app.email, expiresAt, used: false }
  });

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.tuitionss.com";
  const setPasswordUrl = `${baseUrl}/reset-password/${token}`;

  await sendSetPasswordEmail({
    to: app.email,
    name: app.name,
    role: "TEACHER",
    setPasswordUrl,
  });

  revalidatePath("/dashboard/admin");
}

export async function rejectTeacherApp(id: string) {
  await prisma.teacherApplication.update({
    where: { id },
    data: { status: "REJECTED" },
  });
  revalidatePath("/dashboard/admin");
}

export async function createTuitionClass(formData: FormData) {
  const teacherId = formData.get("teacherId") as string;
  const studentId = formData.get("studentId") as string;
  const subjects = formData.getAll("subjects") as string[];
  const fee = parseFloat((formData.get("fee") as string) || "0");
  const teacherFee = parseFloat((formData.get("teacherFee") as string) || "0");
  let grade = formData.get("grade") as string;

  if (!teacherId || !studentId || subjects.length === 0) return;

  if (!grade) {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: studentId }
    });
    grade = studentProfile?.grade || "Class 9";
  }

  // Generate unique tuition code like T-101
  const count = await prisma.tuitionClass.count();
  const tuitionCode = `T-${101 + count}`;

  await prisma.tuitionClass.create({
    data: {
      tuitionCode,
      teacherId,
      studentId,
      subjects,
      grade: grade || "Class 9",
      fee,
      teacherFee,
    } as any,
  });

  // Fetch teacher and student details to send allotment emails
  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  const student = await prisma.user.findUnique({ where: { id: studentId } });

  if (student?.email) {
    await sendClassAllottedEmail({
      to: student.email,
      recipientName: student.name,
      subjectName: subjects.join(", "),
      partnerName: teacher?.name || "Your Teacher",
      partnerRole: "Instructor",
      grade: grade || undefined,
    });
  }

  if (teacher?.email) {
    await sendClassAllottedEmail({
      to: teacher.email,
      recipientName: teacher.name,
      subjectName: subjects.join(", "),
      partnerName: student?.name || "Your Student",
      partnerRole: "Student",
      grade: grade || undefined,
    });
  }

  revalidatePath("/dashboard/admin");
}

export async function updateUserGrade(userId: string, grade: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true, teacherProfile: true }
  });
  if (!user) return;

  if (user.role === "STUDENT") {
    await prisma.studentProfile.upsert({
      where: { userId },
      update: { grade } as any,
      create: { userId, grade } as any,
    });
  } else if (user.role === "TEACHER") {
    await prisma.teacherProfile.upsert({
      where: { userId },
      update: { grades: grade } as any,
      create: { userId, grades: grade } as any,
    });
  }
  revalidatePath("/dashboard/admin");
}



export async function togglePaymentStatus(id: string, currentStatus: string) {
  await prisma.payment.update({
    where: { id },
    data: { status: currentStatus === "PAID" ? "UNPAID" : "PAID", paidDate: currentStatus === "PAID" ? null : new Date() },
  });
  revalidatePath("/dashboard/admin");
}

export async function rescheduleClass(id: string, newDate: string) {
  if (!newDate) return;
  const parsedDate = newDate.includes('+') || newDate.includes('Z')
    ? new Date(newDate)
    : new Date(`${newDate}+05:00`);
  await prisma.classSession.update({
    where: { id },
    data: {
      date: parsedDate,
      status: "RESCHEDULED"
    }
  });
  revalidatePath("/dashboard/admin");
}

export async function generateMonthSchedule(tuitionId: string, startDateStr: string, startTimeStr: string, endTimeStr: string, selectedDays: number[]) {
  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
  const sessionsToCreate = [];

  // Generate for 30 days starting from the given start date
  for (let i = 0; i < 30; i++) {
    const tempUtc = new Date(Date.UTC(startYear, startMonth - 1, startDay + i, 12, 0, 0));
    const year = tempUtc.getUTCFullYear();
    const month = String(tempUtc.getUTCMonth() + 1).padStart(2, '0');
    const day = String(tempUtc.getUTCDate()).padStart(2, '0');
    const currentDateStr = `${year}-${month}-${day}`;

    // Check if the day of week in Karachi is selected
    const dayDate = parseKarachiDateTime(currentDateStr, "12:00");
    const dayOfWeek = getKarachiDayIndex(dayDate);

    if (selectedDays.includes(dayOfWeek)) {
      const sessionDate = parseKarachiDateTime(currentDateStr, startTimeStr);
      let sessionEndTime = parseKarachiDateTime(currentDateStr, endTimeStr);
      if (sessionEndTime <= sessionDate) {
        sessionEndTime = new Date(sessionEndTime.getTime() + 24 * 60 * 60 * 1000);
      }

      sessionsToCreate.push({
        tuitionId,
        date: sessionDate,
        endTime: sessionEndTime,
        status: "SCHEDULED"
      });
    }
  }

  if (sessionsToCreate.length > 0) {
    for (const session of sessionsToCreate) {
      await prisma.classSession.create({ data: session });
    }
  }
  revalidatePath("/dashboard/admin");
}

export async function handleRescheduleRequest(sessionId: string, action: 'APPROVE' | 'REJECT') {
  const session = await prisma.classSession.findUnique({ where: { id: sessionId } });
  if (!session || session.rescheduleStatus !== 'PENDING') return;

  if (action === 'APPROVE' && session.rescheduleProposedTime) {
    const newEndTime = session.rescheduleProposedEndTime || new Date(session.rescheduleProposedTime.getTime() + 3600000);

    await prisma.classSession.update({
      where: { id: sessionId },
      data: {
        date: session.rescheduleProposedTime,
        endTime: newEndTime,
        rescheduleStatus: 'ACCEPTED',
        status: 'RESCHEDULED'
      }
    });
  } else {
    await prisma.classSession.update({
      where: { id: sessionId },
      data: {
        rescheduleStatus: 'REJECTED'
      }
    });
  }
  
  revalidatePath("/dashboard/admin");
}

export async function deleteSession(sessionId: string) {
  await prisma.classSession.delete({ where: { id: sessionId } });
  revalidatePath("/dashboard/admin");
}

export async function deleteTuition(tuitionId: string) {
  await prisma.classSession.deleteMany({ where: { tuitionId } });
  await prisma.payment.deleteMany({ where: { tuitionId } });
  await prisma.tuitionClass.delete({ where: { id: tuitionId } });
  revalidatePath("/dashboard/admin");
}

export async function deleteUser(userId: string) {
  // Manual cascade delete
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { teacherClasses: true, studentClasses: true } });
  if (!user) return;

  const tuitionIds = [
    ...user.teacherClasses.map(t => t.id),
    ...user.studentClasses.map(t => t.id)
  ];

  if (tuitionIds.length > 0) {
    await prisma.classSession.deleteMany({ where: { tuitionId: { in: tuitionIds } } });
    await prisma.payment.deleteMany({ where: { tuitionId: { in: tuitionIds } } });
    await prisma.tuitionClass.deleteMany({ where: { id: { in: tuitionIds } } });
  }

  await prisma.teacherProfile.deleteMany({ where: { userId } });
  await prisma.studentProfile.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  
  revalidatePath("/dashboard/admin");
}

export async function toggleMonthlyPayment(tuitionId: string, type: 'FEE' | 'SALARY', monthYear: string, amount: number) {
  // Check if payment exists
  const existing = await prisma.payment.findFirst({
    where: { tuitionId, type, monthYear }
  });

  if (existing) {
    // Toggle status
    await prisma.payment.update({
      where: { id: existing.id },
      data: {
        status: existing.status === "PAID" ? "UNPAID" : "PAID",
        paidDate: existing.status === "PAID" ? null : new Date()
      }
    });
  } else {
    // Create new PAID payment
    await prisma.payment.create({
      data: {
        tuitionId,
        amount,
        type,
        monthYear,
        status: "PAID",
        paidDate: new Date(),
      } as any // Use as any to bypass TS complaining about optional dueDate if Prisma client is not updated yet
    });
  }

  revalidatePath("/dashboard/admin");
}

export async function adjustExistingSessionsTimezone(shiftHours: number = -5) {
  const shiftMs = shiftHours * 60 * 60 * 1000;
  const sessions = await prisma.classSession.findMany();

  for (const session of sessions) {
    await prisma.classSession.update({
      where: { id: session.id },
      data: {
        date: new Date(session.date.getTime() + shiftMs),
        endTime: new Date(session.endTime.getTime() + shiftMs),
        ...(session.rescheduleProposedTime
          ? { rescheduleProposedTime: new Date(session.rescheduleProposedTime.getTime() + shiftMs) }
          : {}),
        ...(session.rescheduleProposedEndTime
          ? { rescheduleProposedEndTime: new Date(session.rescheduleProposedEndTime.getTime() + shiftMs) }
          : {}),
      },
    });
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/teacher");
  revalidatePath("/dashboard/student");
  return { success: true, count: sessions.length };
}

