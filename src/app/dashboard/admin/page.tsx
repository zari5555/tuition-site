import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { acceptStudentApp, rejectStudentApp, acceptTeacherApp, rejectTeacherApp, createTuitionClass, togglePaymentStatus, rescheduleClass, deleteUser, deleteTuition, handleRescheduleRequest } from "./actions";
import AdminTabs from "./AdminTabs";
import TimetableManager from "./TimetableManager";
import GradeCategoryManager from "./GradeCategoryManager";
import DeleteButton from "./DeleteButton";
import CreateTuitionForm from "./CreateTuitionForm";
import PaymentManager from "./PaymentManager";
import { getKarachiStartOfDay, formatKarachiDateTime, formatKarachiTime } from "@/lib/timezone";

const GRADES = ["Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "O Levels", "A Levels"];

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const studentApps = await prisma.studentApplication.findMany({ where: { status: "PENDING" } });
  const teacherApps = await prisma.teacherApplication.findMany({ where: { status: "PENDING" } });

  // Fetch emails of accepted teachers to filter the user lists
  const acceptedTeacherAppsList = await prisma.teacherApplication.findMany({
    where: { status: "ACCEPTED" },
    select: { email: true }
  });
  const acceptedTeacherEmails = acceptedTeacherAppsList.map(app => app.email);

  const teachers = await prisma.user.findMany({ 
    where: { 
      role: "TEACHER",
      email: { in: acceptedTeacherEmails }
    } 
  });
  const students = await prisma.user.findMany({ where: { role: "STUDENT" } });

  const studentsWithProfile = await prisma.user.findMany({
    where: { role: "STUDENT" },
    include: {
      studentProfile: true,
      studentClasses: {
        include: {
          teacher: true,
        }
      }
    }
  });

  const teachersWithProfile = await prisma.user.findMany({
    where: { 
      role: "TEACHER",
      email: { in: acceptedTeacherEmails }
    },
    include: {
      teacherProfile: true,
      teacherClasses: {
        include: {
          student: true,
          sessions: {
            orderBy: { date: 'asc' }
          }
        }
      }
    }
  });

  const pendingReschedules = await prisma.classSession.findMany({
    where: { rescheduleStatus: "PENDING" },
    include: {
      tuition: {
        include: {
          teacher: true,
          student: true
        }
      }
    },
    orderBy: { date: 'asc' }
  });

  const tuitions = await prisma.tuitionClass.findMany({
    include: {
      teacher: true,
      student: true,
      sessions: true,
      payments: true,
    },
  });

  const siteVisitsToday = await prisma.siteVisit.count({
    where: { date: { gte: getKarachiStartOfDay() } }
  });
  const totalSiteVisits = await prisma.siteVisit.count();
  const visitsByCountry = await prisma.siteVisit.groupBy({
    by: ['country'],
    _count: { id: true },
    where: { 
      AND: [
        { country: { not: null } },
        { country: { not: "" } }
      ]
    },
    orderBy: { _count: { id: 'desc' } },
    take: 3,
  });

  const expectedRevenue = tuitions.reduce((sum, t) => sum + (t.isActive ? ((t.fee || 0) - (t.teacherFee || 0)) : 0), 0);
  const totalClasses = tuitions.length;
  const ongoingClasses = tuitions.filter(t => t.isActive).length;

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-blue-100/80 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Admin <span className="blue-glow-text">Dashboard</span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">Manage student & teacher applications, grade categorization, tuition scheduling, and payments.</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/70 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping mr-2"></span>
            System Live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl flex flex-col justify-center">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Site Visits (Today / Total)</p>
              <p className="text-2xl font-extrabold text-blue-600">{siteVisitsToday} <span className="text-sm text-slate-400 font-medium">/ {totalSiteVisits}</span></p>
            </div>
            {visitsByCountry.length > 0 && (
              <div className="text-[9px] text-right text-slate-500">
                <p className="font-bold text-slate-700 mb-0.5">Top Countries</p>
                {visitsByCountry.map(v => (
                  <p key={v.country}>{v.country}: {v._count.id}</p>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl flex flex-col justify-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Users (Students / Teachers)</p>
          <p className="text-2xl font-extrabold text-indigo-600">{students.length} <span className="text-sm text-slate-400 font-medium">/ {teachers.length}</span></p>
        </div>
        <div className="glass-card p-4 rounded-xl flex flex-col justify-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Classes (Active / Total)</p>
          <p className="text-2xl font-extrabold text-emerald-600">{ongoingClasses} <span className="text-sm text-slate-400 font-medium">/ {totalClasses}</span></p>
        </div>
        <div className="glass-card p-4 rounded-xl flex flex-col justify-center bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60">
          <p className="text-[10px] uppercase tracking-wider text-amber-700 font-bold mb-1">Expected Revenue / Mo</p>
          <p className="text-2xl font-extrabold text-amber-600">Rs {expectedRevenue.toLocaleString()}</p>
        </div>
      </div>

      <AdminTabs
        pendingStudentAppsCount={studentApps.length}
        pendingTeacherAppsCount={teacherApps.length}
        pendingReschedulesCount={pendingReschedules.length}
        directoryTab={
          <>
            {/* Class & Grade Directory Categorization */}
            <section className="glass-card glass-card-hover p-4 sm:p-7 rounded-2xl">
              <div className="flex items-center space-x-3 mb-6 border-b border-slate-200/70 pb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Class & Grade Directory</h2>
                  <p className="text-xs text-slate-500 font-medium">Categorized view of enrolled students and active instructors (Class 2 to A Levels)</p>
                </div>
              </div>
              <GradeCategoryManager students={studentsWithProfile} teachers={teachersWithProfile} />
            </section>
          </>
        }
        studentAppsTab={
          <>
            {/* Student Applications */}
            <section className="glass-card glass-card-hover p-4 sm:p-7 rounded-2xl">
              <div className="flex items-center justify-between mb-6 border-b border-slate-200/70 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 font-bold text-sm shadow-xs">
                    🎓
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-wide">Student Applications</h2>
                </div>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1 rounded-full">
                  {studentApps.length}
                </span>
              </div>
              {studentApps.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200/80 rounded-xl text-slate-500 text-sm">
                  No pending student applications
                </div>
              ) : (
                <div className="space-y-4">
                  {studentApps.map(app => (
                    <div key={app.id} className="p-5 rounded-xl flex flex-col gap-4 bg-white/90 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all">
                      <div>
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-slate-900 text-lg">{app.studentName}</p>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {app.grade || "Class 9"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                          <p><span className="text-slate-500 font-medium">Parent:</span> <span className="text-slate-800 font-semibold">{app.parentName}</span></p>
                          <p><span className="text-slate-500 font-medium">Subject:</span> <span className="text-blue-600 font-bold">{app.subject}</span></p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center pt-3 border-t border-slate-100">
                        <a href={`https://wa.me/${app.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-all">
                          WhatsApp
                        </a>
                        <form action={acceptStudentApp.bind(null, app.id)} className="flex-1">
                          <button className="w-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-1.5 rounded-lg shadow-sm border border-blue-500/20 transition-all">
                            Accept
                          </button>
                        </form>
                        <form action={rejectStudentApp.bind(null, app.id)} className="flex-1">
                          <button className="w-full text-xs font-semibold bg-white border border-slate-200 text-red-600 px-4 py-1.5 rounded-lg hover:bg-red-50 hover:border-red-200 transition-all">
                            Reject
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        }
        teacherAppsTab={
          <>
            {/* Teacher Applications */}
            <section className="glass-card glass-card-hover p-4 sm:p-7 rounded-2xl">
              <div className="flex items-center justify-between mb-6 border-b border-slate-200/70 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 font-bold text-sm shadow-xs">
                    👨‍🏫
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-wide">Teacher Applications</h2>
                </div>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-3 py-1 rounded-full">
                  {teacherApps.length}
                </span>
              </div>
              {teacherApps.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200/80 rounded-xl text-slate-500 text-sm">
                  No pending teacher applications
                </div>
              ) : (
                <div className="space-y-4">
                  {teacherApps.map(app => (
                    <div key={app.id} className="p-5 rounded-xl flex flex-col gap-4 bg-white/90 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all">
                      <div>
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-slate-900 text-lg">{app.name}</p>
                          {app.qualification && (
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              🎓 {app.qualification}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-y-1 gap-x-4 mt-2 text-xs text-slate-600">
                          <p className="col-span-2"><span className="text-slate-500 font-medium">Subjects:</span> <span className="text-indigo-600 font-bold">{app.subjects}</span></p>
                          {app.grades && (
                            <p className="col-span-2"><span className="text-slate-500 font-medium">Grades:</span> <span className="text-slate-800 font-semibold">{app.grades}</span></p>
                          )}
                          <p className="col-span-2"><span className="text-slate-500 font-medium">Email:</span> <span className="text-slate-800 font-semibold">{app.email}</span></p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center pt-3 border-t border-slate-100">
                        <a href={`https://wa.me/${app.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-all">
                          WhatsApp
                        </a>
                        <form action={acceptTeacherApp.bind(null, app.id)} className="flex-1">
                          <button className="w-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-1.5 rounded-lg shadow-sm border border-blue-500/20 transition-all">
                            Accept
                          </button>
                        </form>
                        <form action={rejectTeacherApp.bind(null, app.id)} className="flex-1">
                          <button className="w-full text-xs font-semibold bg-white border border-slate-200 text-red-600 px-4 py-1.5 rounded-lg hover:bg-red-50 hover:border-red-200 transition-all">
                            Reject
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        }
        createTuitionTab={
          <>
            {/* Assign Tuitions */}
            <section className="glass-card glass-card-hover p-4 sm:p-7 rounded-2xl">
              <div className="flex items-center space-x-3 mb-6 border-b border-slate-200/70 pb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Create Tuition Class</h2>
                  <p className="text-xs text-slate-500 font-medium">Assign an instructor to a student (Class / Grade auto-detects from student profile)</p>
                </div>
              </div>
              <CreateTuitionForm teachers={teachers} students={studentsWithProfile} />
            </section>
          </>
        }
        scheduleTab={
          <>
            {/* Teacher Timetables & Scheduling */}
            <section id="timetable-section" className="glass-card p-4 sm:p-7 rounded-2xl">
              <div className="flex items-center space-x-3 mb-6 border-b border-slate-200/70 pb-4">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200/60 flex items-center justify-center text-sky-600 font-bold text-sm shadow-xs">
                  📅
                </div>
                <h2 className="text-lg font-bold text-slate-900 tracking-wide">Teacher Timetables & Scheduling</h2>
              </div>
              <TimetableManager teachers={teachersWithProfile} />
            </section>
          </>
        }
        rescheduleTab={
          <>
            {/* Pending Reschedules */}
            {pendingReschedules.length > 0 && (
              <section className="glass-card p-4 sm:p-7 rounded-2xl border-amber-200/80 bg-amber-50/40">
                <div className="flex items-center justify-between mb-6 border-b border-amber-200/80 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-sm">
                      ⏳
                    </div>
                    <h2 className="text-lg font-bold text-amber-900">Pending Reschedule Requests</h2>
                  </div>
                  <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-3 py-1 rounded-full">
                    {pendingReschedules.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingReschedules.map(session => (
                    <div key={session.id} className="bg-white border border-amber-200 p-5 rounded-xl flex flex-col gap-4 shadow-xs">
                      <div>
                        <p className="font-bold text-slate-900">{session.tuition.subjects?.join(", ")}</p>
                        <p className="text-xs text-slate-600 mt-1">Teacher: <span className="font-semibold text-slate-800">{session.tuition.teacher.name}</span></p>
                        <p className="text-xs text-slate-600">Student: <span className="font-semibold text-slate-800">{session.tuition.student.name}</span></p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1.5">
                        <p className="text-xs text-slate-500">Original: <span className="text-slate-800 font-medium">{formatKarachiDateTime(session.date)}</span></p>
                        <p className="text-xs text-blue-700 font-bold">Proposed: {session.rescheduleProposedTime ? formatKarachiTime(session.rescheduleProposedTime) : 'N/A'} - {session.rescheduleProposedEndTime ? formatKarachiTime(session.rescheduleProposedEndTime) : 'N/A'}</p>
                        <p className="text-xs text-slate-500">Reason: <span className="text-slate-700">{session.rescheduleReason || "None provided"}</span></p>
                        <p className="text-xs text-slate-500">By: <span className="capitalize text-slate-800 font-medium">{session.rescheduleRequestedBy?.toLowerCase()}</span></p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center pt-2 border-t border-slate-100">
                        <form action={handleRescheduleRequest.bind(null, session.id, 'APPROVE')} className="flex-1">
                          <button className="w-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-all">
                            Approve
                          </button>
                        </form>
                        <form action={handleRescheduleRequest.bind(null, session.id, 'REJECT')} className="flex-1">
                          <button className="w-full text-xs font-semibold bg-white border border-slate-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-all">
                            Reject
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {pendingReschedules.length === 0 && (
              <div className="glass-card p-8 text-center rounded-2xl border-dashed border-slate-200/80 text-slate-500 text-sm">
                No pending reschedule requests
              </div>
            )}
          </>
        }
        paymentsTab={
          <>
            {/* Active Tuitions & Payments */}
            <section className="glass-card glass-card-hover p-4 sm:p-7 rounded-2xl">
              <PaymentManager tuitions={tuitions as any} />
            </section>
          </>
        }
      />
    </div>
  );
}

