import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Script to inspect and optionally shift existing ClassSession timestamps.
 * 
 * If sessions were generated previously on Vercel while Vercel was in UTC,
 * an admin picking "16:00" resulted in "16:00 UTC" stored in Supabase,
 * which displays as 21:00 (9:00 PM) in Karachi (+05:00).
 * 
 * To adjust those sessions so that they display as the originally intended
 * Karachi time, run this script with:
 *   npx tsx scripts/adjust-session-timezones.ts --apply
 * 
 * Running without --apply will perform a safe DRY-RUN preview.
 */
async function main() {
  const isApply = process.argv.includes("--apply");

  console.log(`\n=== Tuitionss.com Timezone Migration Tool ===`);
  console.log(`Mode: ${isApply ? "APPLY (Modifying Database)" : "DRY-RUN (Preview Only)"}\n`);

  const sessions = await prisma.classSession.findMany({
    include: {
      tuition: {
        include: {
          teacher: true,
          student: true,
        },
      },
    },
    orderBy: { date: "asc" },
  });

  if (sessions.length === 0) {
    console.log("No class sessions found in the database.");
    return;
  }

  console.log(`Found ${sessions.length} class session(s).\n`);

  const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

  for (const session of sessions) {
    const origDateUtc = session.date.toISOString();
    const origEndTimeUtc = session.endTime.toISOString();

    // To shift from UTC-as-PKT to true PKT UTC timestamp, subtract 5 hours
    const shiftedDate = new Date(session.date.getTime() - FIVE_HOURS_MS);
    const shiftedEndTime = new Date(session.endTime.getTime() - FIVE_HOURS_MS);

    console.log(
      `Session ID: ${session.id} | Class: ${session.tuition.teacher.name} -> ${session.tuition.student.name}`
    );
    console.log(`  Current UTC: ${origDateUtc} to ${origEndTimeUtc}`);
    console.log(
      `  Shifted UTC: ${shiftedDate.toISOString()} to ${shiftedEndTime.toISOString()} (-5 hrs)`
    );

    if (isApply) {
      await prisma.classSession.update({
        where: { id: session.id },
        data: {
          date: shiftedDate,
          endTime: shiftedEndTime,
          ...(session.rescheduleProposedTime
            ? {
                rescheduleProposedTime: new Date(
                  session.rescheduleProposedTime.getTime() - FIVE_HOURS_MS
                ),
              }
            : {}),
          ...(session.rescheduleProposedEndTime
            ? {
                rescheduleProposedEndTime: new Date(
                  session.rescheduleProposedEndTime.getTime() - FIVE_HOURS_MS
                ),
              }
            : {}),
        },
      });
    }
  }

  if (isApply) {
    console.log(`\nSuccessfully shifted ${sessions.length} session(s) by -5 hours!`);
  } else {
    console.log(
      `\n[DRY RUN COMPLETE] No records were modified.\nIf existing sessions are 5 hours ahead and you want to fix them, run:\n  npx tsx scripts/adjust-session-timezones.ts --apply\nOr you can simply delete and regenerate the month schedule from the Admin Dashboard.`
    );
  }
}

main()
  .catch((e) => {
    console.error("Error adjusting session timezones:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
