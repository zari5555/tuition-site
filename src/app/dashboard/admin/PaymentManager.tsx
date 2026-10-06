"use client";

import { useState } from "react";
import { toggleMonthlyPayment } from "./actions";
import { getKarachiMonthString } from "@/lib/timezone";

type Payment = {
  id: string;
  type: string;
  monthYear: string;
  status: string;
  amount: number;
};

type Tuition = {
  id: string;
  tuitionCode: string;
  subjects: string[];
  fee: number;
  teacherFee: number;
  student: { name: string };
  teacher: { name: string };
  payments: Payment[];
};

export default function PaymentManager({ tuitions }: { tuitions: Tuition[] }) {
  // Default to current month in Karachi (YYYY-MM)
  const currentMonth = getKarachiMonthString();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  return (
    <div className="space-y-6">
      {/* Month Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 font-bold shadow-xs">
            📅
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-wide">Billing Cycle</h2>
            <p className="text-xs text-slate-500 font-medium">Manage student fees and teacher salaries</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600 uppercase">Select Month:</label>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-sm font-semibold bg-white border-blue-200 text-blue-700 shadow-sm focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Data Grid */}
      <div className="border border-slate-200/80 rounded-2xl overflow-x-auto bg-white/80 shadow-xs">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-50/90 border-b border-slate-200">
            <tr>
              <th className="py-4 px-6 text-xs font-bold tracking-wider text-slate-600 uppercase">Class Details</th>
              <th className="py-4 px-6 text-xs font-bold tracking-wider text-slate-600 uppercase bg-emerald-50/30">Student Fee (In)</th>
              <th className="py-4 px-6 text-xs font-bold tracking-wider text-slate-600 uppercase bg-indigo-50/30">Teacher Salary (Out)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tuitions.length === 0 ? (
              <tr><td colSpan={3} className="py-8 px-6 text-center text-sm text-slate-500">No active classes found.</td></tr>
            ) : tuitions.map(t => {
              // Find payments for the selected month
              const feePayment = t.payments.find(p => p.type === "FEE" && p.monthYear === selectedMonth);
              const salaryPayment = t.payments.find(p => p.type === "SALARY" && p.monthYear === selectedMonth);

              const isFeePaid = feePayment?.status === "PAID";
              const isSalaryPaid = salaryPayment?.status === "PAID";

              return (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Class Info */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {t.tuitionCode.replace("T-", "")}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{t.subjects?.join(", ")}</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                          Student: <span className="text-slate-800 font-semibold">{t.student.name}</span>
                        </p>
                        <p className="text-[11px] font-medium text-slate-500">
                          Teacher: <span className="text-slate-800 font-semibold">{t.teacher.name}</span>
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Student Fee */}
                  <td className="py-4 px-6 bg-emerald-50/10">
                    <div className="flex flex-col items-start gap-2">
                      <div className="text-sm font-bold text-slate-800">Rs {t.fee}</div>
                      <form action={toggleMonthlyPayment.bind(null, t.id, 'FEE', selectedMonth, t.fee)}>
                        <button 
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm border ${
                            isFeePaid 
                              ? "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-50" 
                              : "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                          }`}
                        >
                          {isFeePaid ? "✅ Received" : "Mark Received"}
                        </button>
                      </form>
                    </div>
                  </td>

                  {/* Teacher Salary */}
                  <td className="py-4 px-6 bg-indigo-50/10">
                    <div className="flex flex-col items-start gap-2">
                      <div className="text-sm font-bold text-slate-800">Rs {t.teacherFee}</div>
                      <form action={toggleMonthlyPayment.bind(null, t.id, 'SALARY', selectedMonth, t.teacherFee)}>
                        <button 
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm border ${
                            isSalaryPaid 
                              ? "bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-50" 
                              : "bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                          }`}
                        >
                          {isSalaryPaid ? "✅ Paid" : "Mark Paid"}
                        </button>
                      </form>
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
