"use client";

import { useState, useEffect } from "react";
import { generateMonthSchedule, handleRescheduleRequest, deleteSession, deleteTuition, deleteUser } from "./actions";
import {
  formatKarachiDate,
  formatKarachiTime,
  formatKarachiDateTime,
  formatKarachiWeekday,
  getKarachiDateString,
} from "@/lib/timezone";

type Session = {
  id: string;
  date: Date;
  endTime: Date;
  status: string;
  classLink: string | null;
  rescheduleStatus: string | null;
  rescheduleProposedTime: Date | null;
  rescheduleProposedEndTime?: Date | null;
  rescheduleReason: string | null;
  rescheduleRequestedBy: string | null;
};

type Tuition = {
  id: string;
  subjects: string[];
  student: { name: string, grade?: string | null };
  sessions: Session[];
};

type Teacher = {
  id: string;
  name: string;
  teacherProfile?: { subjects?: string | null } | null;
  teacherClasses: Tuition[];
};

export default function TimetableManager({ teachers }: { teachers: Teacher[] }) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedTuitionId, setSelectedTuitionId] = useState<string | null>(null);

  useEffect(() => {
    const handleSelectTeacher = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.teacherId) {
        setSelectedTeacherId(customEvent.detail.teacherId);
        setSelectedTuitionId(null);
      }
    };
    window.addEventListener('select-teacher-timetable', handleSelectTeacher);
    return () => window.removeEventListener('select-teacher-timetable', handleSelectTeacher);
  }, []);

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  const selectedTuition = selectedTeacher?.teacherClasses.find(t => t.id === selectedTuitionId);

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="flex flex-col md:flex-row gap-6 border border-slate-200/80 rounded-2xl bg-white/70 shadow-xs overflow-hidden min-h-[500px]">
      {/* Left Sidebar: Teachers */}
      <div className="w-full md:w-1/4 bg-slate-50/80 border-b md:border-b-0 md:border-r border-slate-200/80 p-5 overflow-y-auto max-h-[250px] md:max-h-none">
        <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-4 pb-2 border-b border-slate-200">Instructors</h3>
        <ul className="space-y-1.5">
          {teachers.map((teacher) => (
            <li key={teacher.id} className="relative group">
              <button 
                onClick={() => {
                  setSelectedTeacherId(teacher.id);
                  setSelectedTuitionId(null);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold ${selectedTeacherId === teacher.id ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs' : 'hover:bg-slate-100/70 text-slate-700 pr-8'}`}
              >
                {teacher.name}
              </button>
              <form action={deleteUser.bind(null, teacher.id)} onSubmit={(e) => { if(!confirm("Are you sure you want to delete this teacher? All their classes and sessions will be deleted permanently.")) e.preventDefault(); }} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="submit" className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50" title="Delete Teacher">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Area: Timetable details */}
      <div className="w-full md:w-3/4 p-8 overflow-y-auto bg-white/40">
        {!selectedTeacher ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-16">
            <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <p className="text-sm font-medium">Select an instructor to manage their timetable</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 mb-8 pb-4 border-b border-slate-200/80">
              <h2 className="text-2xl font-bold text-slate-900">
                {selectedTeacher.name}
              </h2>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                {selectedTeacher.teacherProfile?.subjects || "General"}
              </span>
            </div>
            
            {/* Class selection for this teacher */}
            <div className="mb-8 flex flex-wrap gap-2.5">
              {selectedTeacher.teacherClasses.map((tuition) => (
                <div key={tuition.id} className="relative group inline-block">
                  <button
                    onClick={() => setSelectedTuitionId(tuition.id)}
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all pr-8 ${selectedTuitionId === tuition.id ? 'border-blue-300 bg-blue-50 text-blue-800 shadow-xs' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300'}`}
                  >
                    {tuition.student.name} <span className="opacity-60 font-normal ml-1">• {tuition.subjects?.join(", ")}</span>
                  </button>
                  <form action={deleteTuition.bind(null, tuition.id)} onSubmit={(e) => { if(!confirm("Are you sure you want to delete this class? All sessions and payments will be deleted permanently.")) e.preventDefault(); }} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="submit" className="text-slate-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50" title="Delete Class">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </form>
                </div>
              ))}
            </div>

            {selectedTuition && (
              <div className="animate-in slide-in-from-bottom-2 duration-300">

                {/* Generate Schedule Form */}
                <div className="bg-blue-50/40 p-6 rounded-2xl border border-blue-100 mb-8 shadow-xs">
                  <div className="flex-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                      Generate Monthly Schedule
                    </label>
                    <form action={async (formData) => {
                      const startDate = formData.get("startDate") as string;
                      const startTime = formData.get("startTime") as string;
                      const endTime = formData.get("endTime") as string;
                      const selectedDays = formData.getAll("days").map(Number);
                      if (selectedDays.length === 0) {
                        alert("Please select at least one day of the week.");
                        return;
                      }
                      await generateMonthSchedule(selectedTuition.id, startDate, startTime, endTime, selectedDays);
                    }} className="flex flex-col gap-4">
                      <div className="flex flex-wrap gap-3 items-center">
                        <input type="date" name="startDate" required className="glass-input rounded-xl px-3.5 py-2 text-sm text-slate-900" defaultValue={getKarachiDateString()} />
                        <div className="flex items-center gap-2">
                          <input type="time" name="startTime" required className="glass-input rounded-xl px-3.5 py-2 text-sm text-slate-900" title="Start Time" />
                          <span className="text-slate-500 text-sm">to</span>
                          <input type="time" name="endTime" required className="glass-input rounded-xl px-3.5 py-2 text-sm text-slate-900" title="End Time" />
                        </div>
                        <button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all shadow-md shadow-blue-600/20 border border-blue-500/20 flex items-center gap-2">
                          Schedule Month
                        </button>
                      </div>
                      <div className="flex gap-2 flex-wrap pt-2">
                        {daysOfWeek.map((d, i) => (
                          <label key={i} className="flex items-center gap-2 text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-blue-50/50 transition-colors has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-800">
                            <input type="checkbox" name="days" value={i} defaultChecked={i === 1 || i === 3 || i === 5} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /> 
                            <span className="font-semibold">{d.substring(0,3)}</span>
                          </label>
                        ))}
                      </div>
                    </form>
                  </div>
                </div>

                {/* Reschedule Requests */}
                {selectedTuition.sessions.some(s => s.rescheduleStatus === 'PENDING') && (
                  <div className="mb-6 p-5 bg-amber-50/60 border border-amber-200 rounded-2xl">
                    <h4 className="font-bold text-amber-900 text-sm mb-3">Pending Reschedule Requests</h4>
                    <div className="space-y-3">
                      {selectedTuition.sessions.filter(s => s.rescheduleStatus === 'PENDING').map(session => (
                        <div key={session.id} className="bg-white p-4 rounded-xl border border-amber-200 flex justify-between items-center shadow-xs">
                          <div>
                            <p className="text-xs text-slate-700 font-medium">Original: {formatKarachiDateTime(session.date)}</p>
                            <p className="text-xs text-blue-700 font-bold mt-0.5">Proposed: {session.rescheduleProposedTime ? formatKarachiDate(session.rescheduleProposedTime, {weekday: 'short', month: 'short', day: 'numeric'}) : 'N/A'} · {session.rescheduleProposedTime ? formatKarachiTime(session.rescheduleProposedTime) : ''} – {session.rescheduleProposedEndTime ? formatKarachiTime(session.rescheduleProposedEndTime) : 'N/A'}</p>
                            <p className="text-xs text-slate-500 mt-1">Requested by: {session.rescheduleRequestedBy} | Reason: {session.rescheduleReason || "None"}</p>
                          </div>
                          <div className="flex gap-2">
                            <form action={handleRescheduleRequest.bind(null, session.id, 'APPROVE')}><button className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-lg hover:bg-emerald-100 text-xs font-semibold">Approve</button></form>
                            <form action={handleRescheduleRequest.bind(null, session.id, 'REJECT')}><button className="bg-white border border-slate-200 text-red-600 px-3 py-1 rounded-lg hover:bg-red-50 text-xs font-semibold">Reject</button></form>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timetable Table */}
                <div className="border border-slate-200/80 rounded-2xl overflow-auto bg-white/80 shadow-xs max-h-[550px]">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-3.5 px-4 text-xs font-bold tracking-wider text-slate-600 uppercase">Day</th>
                        <th className="py-3.5 px-4 text-xs font-bold tracking-wider text-slate-600 uppercase">Date & Time</th>
                        <th className="py-3.5 px-4 text-xs font-bold tracking-wider text-slate-600 uppercase">Status & Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedTuition.sessions.length === 0 ? (
                        <tr><td colSpan={3} className="p-8 text-center text-sm text-slate-500">No classes scheduled.</td></tr>
                      ) : (
                        selectedTuition.sessions.map((session) => (
                          <tr key={session.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-3.5 px-4 text-xs font-bold text-blue-600">{formatKarachiWeekday(session.date, "short")}</td>
                            <td className="py-3.5 px-4">
                              <div className="text-sm font-semibold text-slate-900">
                                {formatKarachiTime(session.date)} - {formatKarachiTime(session.endTime)}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">{formatKarachiDate(session.date, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-between gap-4">
                                {session.classLink ? (
                                  <a href={session.classLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-xs truncate max-w-[150px] inline-flex items-center gap-1 font-semibold"><svg className="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg> Class Link</a>
                                ) : <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Not set</span>}
                                
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${session.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : session.status === 'MISSED' ? 'bg-red-50 text-red-700 border-red-200' : session.status === 'RESCHEDULED' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{session.status}</span>
                                  <form action={deleteSession.bind(null, session.id)} onSubmit={(e) => { if(!confirm("Are you sure you want to delete this scheduled day?")) e.preventDefault(); }}>
                                    <button type="submit" className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors" title="Delete Session">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                  </form>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

