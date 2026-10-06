"use client";

import { useState } from "react";
import { requestReschedule } from "./actions";
import {
  formatKarachiDate,
  formatKarachiTime,
  formatKarachiWeekday,
  getKarachiMonthString,
  getKarachiMonthRange,
} from "@/lib/timezone";

type Session = {
  id: string;
  date: Date | string;
  endTime: Date | string;
  status: string;
  classLink: string | null;
  rescheduleStatus: string | null;
  rescheduleProposedTime: Date | string | null;
  rescheduleProposedEndTime: Date | string | null;
  rescheduleReason: string | null;
};

type Payment = { id: string; amount: number; status: string; type: string; monthYear: string };

type Tuition = {
  id: string;
  subjects: string[];
  grade?: string | null;
  fee?: number;
  teacher: { name: string };
  sessions: Session[];
  payments: Payment[];
};

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function stats(sessions: Session[]) {
  return {
    attended: sessions.filter(s => s.status === "COMPLETED").length,
    missed: sessions.filter(s => s.status === "MISSED").length,
    upcoming: sessions.filter(s => ["SCHEDULED", "RESCHEDULED", "PENDING"].includes(s.status)).length,
  };
}

export default function StudentScheduleView({ tuitions }: { tuitions: Tuition[] }) {
  const [selectedId, setSelectedId] = useState<string>(tuitions[0]?.id ?? "");
  const selected = tuitions.find(t => t.id === selectedId);

  // Current month in Karachi for checking payment status
  const currentMonth = getKarachiMonthString();

  if (tuitions.length === 0) {
    return (
      <div className="glass-card p-10 rounded-2xl text-center">
        <div className="text-4xl mb-3">📚</div>
        <p className="text-slate-500 text-sm font-medium">You don't have any active classes assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-xs flex flex-col md:flex-row min-h-[600px]">

      {/* ── Left Sidebar: Class List ── */}
      <aside className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-slate-200/80 bg-white/70 flex flex-col">
        {/* Sidebar header */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-200/80 bg-white/60">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-base shadow-xs shrink-0">📚</div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">My Classes</h2>
            <p className="text-[10px] text-slate-400">{tuitions.length} {tuitions.length === 1 ? "enrolment" : "enrolments"}</p>
          </div>
        </div>

        {/* Class list — horizontal on mobile, vertical on md+ */}
        <ul className="flex flex-row md:flex-col overflow-x-auto overflow-y-hidden md:overflow-x-hidden md:overflow-y-auto md:flex-1 divide-x md:divide-x-0 md:divide-y divide-slate-100">
          {tuitions.map(t => {
            const isSelected = t.id === selectedId;
            const s = stats(t.sessions);
            return (
              <li key={t.id}>
                <button
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-all group ${
                    isSelected
                      ? "bg-blue-50 border-r-2 border-r-blue-500"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {/* Subject Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 transition-all ${
                    isSelected
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200"
                      : "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700"
                  }`}>
                    {t.subjects?.[0]?.charAt(0).toUpperCase() || 'C'}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold truncate ${isSelected ? "text-blue-900" : "text-slate-800"}`}>
                      {t.subjects?.join(", ")}
                    </p>
                    <p className="text-[10px] text-blue-500 font-semibold truncate">{t.teacher.name}{t.grade ? ` · ${t.grade}` : ""}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[9px] font-bold text-emerald-600">{s.attended}✓</span>
                      <span className="text-[9px] font-bold text-red-400">{s.missed}✗</span>
                      <span className="text-[9px] font-bold text-blue-400">{s.upcoming} upcoming</span>
                    </div>
                  </div>

                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* ── Right Panel: Schedule Detail ── */}
      {/* FIX: flex-col so header is sticky and only content scrolls */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* FIX: Sticky panel header — matches teacher exactly */}
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 bg-white/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shadow-md shrink-0">
                  {selected.subjects?.[0]?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    {selected.subjects?.join(", ")}
                    {selected.grade && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{selected.grade}</span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs font-bold text-blue-600">{selected.teacher.name}</p>
                    {(selected.fee !== undefined && selected.fee > 0) ? (
                      <>
                        <span className="text-slate-300 text-[10px]">•</span>
                        <p className="text-xs font-bold text-slate-600">Fee: Rs {selected.fee}/mo</p>
                        {selected.payments.some(p => p.type === "FEE" && p.monthYear === currentMonth && p.status === "PAID") ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Fee Received</span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Fee Pending</span>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              {/* FIX: Label "Completed" to match teacher */}
              <div className="flex gap-2 flex-wrap">
                {(() => { const s = stats(selected.sessions); return (
                  <>
                    <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">{s.attended} Completed</span>
                    <span className="px-3 py-1 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">{s.missed} Missed</span>
                    <span className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-700">{s.upcoming} Upcoming</span>
                  </>
                ); })()}
              </div>
            </div>

            {/* FIX: Scrollable content area — header stays fixed above */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

              {/* Pending Reschedule Widget */}
              {(() => {
                const pendingReschedules = selected.sessions.filter(s => s.rescheduleStatus === "PENDING");
                if (pendingReschedules.length === 0) return null;
                return (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
                    <div className="px-4 py-3 border-b border-amber-200/80 flex items-center gap-2">
                      <span className="text-base">⏳</span>
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Pending Reschedule Requests</h4>
                      <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">{pendingReschedules.length}</span>
                    </div>
                    <ul className="divide-y divide-amber-100">
                      {pendingReschedules.map(s => (
                        <li key={s.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              Original: {formatKarachiDate(s.date, { month: "short", day: "numeric" })} · {formatKarachiTime(s.date)} – {formatKarachiTime(s.endTime)}
                            </p>
                            <p className="text-xs text-amber-800 font-semibold mt-0.5">
                              Proposed: {s.rescheduleProposedTime ? formatKarachiDate(s.rescheduleProposedTime, { weekday: "short", month: "short", day: "numeric" }) : ""} · {s.rescheduleProposedTime ? formatKarachiTime(s.rescheduleProposedTime) : ""} – {s.rescheduleProposedEndTime ? formatKarachiTime(s.rescheduleProposedEndTime) : "N/A"}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 italic">
                              Reason: {s.rescheduleReason ? `"${s.rescheduleReason}"` : "None provided"}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-1 rounded-lg shrink-0">Awaiting Admin</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* Rescheduled Classes Widget */}
              {(() => {
                const rescheduled = selected.sessions.filter(s => s.status === "RESCHEDULED");
                if (rescheduled.length === 0) return null;
                return (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/60 overflow-hidden">
                    <div className="px-4 py-3 border-b border-violet-200/80 flex items-center gap-2">
                      <span className="text-base">🔄</span>
                      <h4 className="text-xs font-bold text-violet-900 uppercase tracking-wider">Rescheduled Classes</h4>
                      <span className="ml-auto text-[10px] font-bold text-violet-700 bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-full">{rescheduled.length}</span>
                    </div>
                    <ul className="divide-y divide-violet-100">
                      {rescheduled.map(s => (
                        <li key={s.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] text-slate-500 font-medium line-through">
                              Was: {formatKarachiDate(s.date, { month: "short", day: "numeric" })} · {formatKarachiTime(s.date)}
                            </p>
                            <p className="text-sm font-bold text-violet-900 mt-0.5">
                              Now: {s.rescheduleProposedTime ? formatKarachiDate(s.rescheduleProposedTime, { weekday: "short", month: "short", day: "numeric" }) : "—"} · {s.rescheduleProposedTime ? formatKarachiTime(s.rescheduleProposedTime) : ""} – {s.rescheduleProposedEndTime ? formatKarachiTime(s.rescheduleProposedEndTime) : "N/A"}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 italic">
                              Reason: {s.rescheduleReason ? `"${s.rescheduleReason}"` : "None provided"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold text-violet-700 bg-violet-100 border border-violet-300 px-2 py-1 rounded-lg">Rescheduled</span>
                            {s.classLink && (
                              <a href={s.classLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                Join
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* FIX: Sessions Table — 4 columns matching teacher (Day | Date & Time | Status | Actions) */}
              {/* FIX: Removed max-h-96 internal scroll — panel already scrolls */}
              {(() => {
                const mainSessions = selected.sessions.filter(s => s.status !== "RESCHEDULED");
                return mainSessions.length === 0 ? (
                  <p className="text-sm text-slate-500 py-10 text-center">No sessions scheduled for this class yet.</p>
                ) : (
                  <div className="border border-slate-200/80 rounded-xl overflow-auto bg-white/90 shadow-xs">
                    <table className="w-full text-left border-collapse min-w-[560px]">
                      <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="py-3.5 px-4 text-xs font-bold tracking-wider text-slate-500 uppercase">Day</th>
                          <th className="py-3.5 px-4 text-xs font-bold tracking-wider text-slate-500 uppercase">Date &amp; Time</th>
                          <th className="py-3.5 px-4 text-xs font-bold tracking-wider text-slate-500 uppercase">Status &amp; Link</th>
                          <th className="py-3.5 px-4 text-xs font-bold tracking-wider text-slate-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {mainSessions.map(s => (
                          <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                            {/* Col 1: Day */}
                            <td className="py-3.5 px-4 text-xs font-bold text-blue-600 align-top pt-4">
                              {formatKarachiWeekday(s.date, "short")}
                            </td>
                            <td className="py-3.5 px-4 align-top pt-4">
                              <div className="text-sm font-semibold text-slate-900">
                                {formatKarachiDate(s.date, { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {formatKarachiTime(s.date)} – {formatKarachiTime(s.endTime)}
                              </div>

                              {s.status === "SCHEDULED" && (
                                s.rescheduleStatus === "PENDING" ? (
                                  <div className="mt-2.5 p-2 bg-amber-50 rounded-lg border border-amber-200 inline-block w-fit">
                                    <p className="text-xs text-amber-900 font-semibold">
                                      Reschedule req: {s.rescheduleProposedTime ? formatKarachiTime(s.rescheduleProposedTime) : ""} – {s.rescheduleProposedEndTime ? formatKarachiTime(s.rescheduleProposedEndTime) : "N/A"}
                                    </p>
                                    <p className="text-xs text-amber-600 mt-0.5">Pending admin approval.</p>
                                  </div>
                                ) : (
                                  <details className="group mt-2.5">
                                    <summary className="cursor-pointer text-xs font-bold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1 select-none transition-colors">
                                      <span>Request Reschedule</span>
                                      <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </summary>
                                    <form action={requestReschedule.bind(null, s.id)} className="flex flex-col gap-2 mt-2 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 w-fit">
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">New Date (same month)</label>
                                        <input
                                          type="date"
                                          name="date"
                                          required
                                          min={getKarachiMonthRange(s.date).minDate}
                                          max={getKarachiMonthRange(s.date).maxDate}
                                          className="glass-input rounded-lg px-2 py-1 text-xs w-full"
                                        />
                                      </div>
                                      <div className="flex gap-1.5 items-center">
                                        <input type="time" name="startTime" required className="glass-input rounded-lg px-2 py-1 text-xs w-[100px]" title="Start Time" />
                                        <span className="text-slate-400 text-xs">to</span>
                                        <input type="time" name="endTime" required className="glass-input rounded-lg px-2 py-1 text-xs w-[100px]" title="End Time" />
                                      </div>
                                      <input type="text" name="reason" placeholder="Reason (optional)" className="glass-input rounded-lg px-2 py-1 text-xs w-full" />
                                      <button className="bg-amber-600 text-white hover:bg-amber-700 px-3 py-1 rounded-lg text-xs font-semibold transition-all self-end">Submit Request</button>
                                    </form>
                                  </details>
                                )
                              )}
                            </td>

                            {/* Col 3: Status & Link */}
                            <td className="py-3.5 px-4 align-top pt-4">
                              <div className="flex flex-col items-start gap-2">
                                <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${s.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : s.status === "MISSED" ? "bg-red-50 text-red-700 border-red-200" : s.status === "RESCHEDULED" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                                  {s.status}
                                </span>
                                {s.classLink ? (
                                  <a href={s.classLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-semibold inline-flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                    Join Class
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Link pending</span>
                                )}
                              </div>
                            </td>

                            {/* Col 4: Actions (reschedule request only — student can't mark attendance) */}
                            <td className="py-3.5 px-4 align-top pt-4">
                              <span className="text-[11px] text-slate-400 italic">—</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Select a class to view your schedule
          </div>
        )}
      </div>

    </div>
  );
}
