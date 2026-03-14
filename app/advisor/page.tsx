"use client";

import { useState, useEffect } from "react";
import { GlobalStore, MOCK_STUDENTS, Pass, Advisor } from "@/lib/store";
import {
    Menu, X, ShieldAlert, UserCheck, Inbox, LogOut,
    User, CheckCircle, Clock, Calendar, ArrowLeft, Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdvisorPortal() {
    const [advisor, setAdvisor] = useState<Advisor | null>(null);
    const [requests, setRequests] = useState<Pass[]>([]);
    const [latePasses, setLatePasses] = useState<Pass[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"pending" | "late" | "profile">("pending");
    const router = useRouter();

    useEffect(() => {
        const savedUser = sessionStorage.getItem("user");
        if (!savedUser) { router.push("/login"); return; }
        const user = JSON.parse(savedUser) as Advisor;
        if (user.role !== "advisor") { router.push("/login"); return; }
        setAdvisor(user);

        const update = () => {
            const allStudents = MOCK_STUDENTS();
            const allPasses = GlobalStore.getPasses();
            const now = new Date();

            const pending = allPasses.filter(p => {
                const student = allStudents.find(s => s.id === p.studentId);
                if (!student) return false;
                const studentClass = `${student.department}-${student.year}-${student.section}`.toUpperCase();
                return p.type === "leave" && p.status === "pending" && studentClass === user.assignedClass.toUpperCase();
            });
            setRequests(pending);

            const late = allPasses.filter(p => {
                if (p.type !== "lunch" || p.status !== "approved" || !p.endTime) return false;
                const student = allStudents.find(s => s.id === p.studentId);
                if (!student) return false;
                const studentClass = `${student.department}-${student.year}-${student.section}`.toUpperCase();
                if (studentClass !== user.assignedClass.toUpperCase()) return false;

                const [endH, endM] = p.endTime.split(":").map(Number);
                const endTimeDate = new Date();
                endTimeDate.setHours(endH, endM, 0);
                const diffMins = (now.getTime() - endTimeDate.getTime()) / (1000 * 60);
                return diffMins >= 6; // Advisor Alert Threshold
            });
            setLatePasses(late);
        };
        update();
        return GlobalStore.subscribe(update);
    }, [router]);

    const handleAction = (id: string, action: "approved" | "rejected") => {
        GlobalStore.updatePass(id, {
            status: action,
            approvedAt: action === "approved" ? new Date().toISOString() : undefined,
        });
    };

    const handleParentEscalation = (pass: Pass, response: "enter" | "not") => {
        const student = MOCK_STUDENTS().find(s => s.id === pass.studentId);
        if (student) {
            if (response === "not") {
                const message = `Security Alert: Student ${student.name} (${student.rollNo}) has NOT returned by the lunch deadline (${pass.endTime}). Please contact immediately.`;
                GlobalStore.sendCustomSMS(student.id, student.parentPhone, message);
                GlobalStore.updatePass(pass.id, { parentNotified: true });
                
                // Real WhatsApp Trigger
                const PassStoreClass = (GlobalStore.constructor as any);
                if (PassStoreClass.triggerWhatsApp) {
                    PassStoreClass.triggerWhatsApp(student.parentPhone, message);
                }
            } else {
                GlobalStore.updatePass(pass.id, { status: "used" });
                alert("Student marked as Returned");
            }
        }
    };

    const handleLogout = () => { sessionStorage.removeItem("user"); router.push("/login"); };

    if (!advisor) return null;

    return (
        <div className="min-h-screen bg-[#f3f4f9]">
            {/* Header Banner */}
            <header className="fixed top-0 bg-gradient-to-r from-[#1e3a8a] to-[#4338ca] text-white w-full h-16 flex items-center px-6 z-50">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -ml-2">
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                <div className="ml-6 flex items-center gap-3">
                    <h1 className="font-bold text-lg tracking-tight capitalize">
                        {activeTab === 'pending' ? 'Advisor Approval' : activeTab === 'late' ? 'Security Alerts' : 'Profile'}
                    </h1>
                    {latePasses.length > 0 && <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">{latePasses.length}</span>}
                </div>
            </header>

            {/* Sidebar Drawer */}
            <div
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={() => setIsMenuOpen(false)}
            />
            <aside className={`fixed top-0 left-0 h-full w-[80%] bg-[#333333] z-50 shadow-2xl transition-transform duration-300 transform ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="flex flex-col h-full text-white">
                    <div className="bg-[#1e3a8a] p-10 text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 font-black text-[#1e3a8a] text-2xl overflow-hidden border-2 border-white/20">
                            {advisor.profileImg ? (
                                <img src={advisor.profileImg} className="w-full h-full object-cover rounded-full" alt="Profile" />
                            ) : (
                                <span>{advisor.name.charAt(0)}</span>
                            )}
                        </div>
                        <p className="font-black uppercase tracking-widest">{advisor.name}</p>
                        <p className="text-[10px] opacity-60 mt-1 font-bold">{advisor.assignedClass}</p>
                    </div>
                    <nav className="flex-1 p-4 space-y-2 mt-4">
                        <button
                            onClick={() => { setActiveTab("pending"); setIsMenuOpen(false); }}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl font-bold transition-colors ${activeTab === 'pending' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        >
                            <Inbox size={20} /> Leave Inbox
                        </button>
                        <button
                            onClick={() => { setActiveTab("late"); setIsMenuOpen(false); }}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl font-bold transition-colors ${activeTab === 'late' ? 'bg-red-500/20 text-red-200' : 'hover:bg-white/5 opacity-70'}`}
                        >
                            <ShieldAlert size={20} /> Overdue Lunch {latePasses.length > 0 && <span className="ml-auto bg-red-600 px-2 py-0.5 rounded text-[8px]">{latePasses.length}</span>}
                        </button>
                        <button
                            onClick={() => { setActiveTab("profile"); setIsMenuOpen(false); }}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl font-bold transition-colors ${activeTab === 'profile' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        >
                            <User size={20} /> My Profile
                        </button>
                        <hr className="border-white/10 my-6" />
                        <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-xl font-bold text-red-100 hover:bg-red-500/10">
                            <LogOut size={20} /> Logout
                        </button>
                    </nav>
                </div>
            </aside>

            <main className="pt-20 px-6 pb-20">
                {activeTab === "pending" && (
                    <div className="animate-in fade-in space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="text-[#1e3a8a]" size={20} />
                            <h2 className="font-black text-gray-500 uppercase tracking-widest text-xs">Waiting Approval</h2>
                        </div>

                        {requests.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 italic font-bold text-gray-300">No pending leave requests</div>
                        ) : (
                            requests.map(pass => {
                                const student = MOCK_STUDENTS().find(s => s.id === pass.studentId);
                                return (
                                    <div key={pass.id} className="bg-white rounded-2xl shadow-sm border p-6 space-y-4 animate-in slide-in-from-bottom-4">
                                        <div className="flex items-center gap-4 border-b pb-4">
                                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">{student?.name.charAt(0)}</div>
                                            <div><p className="font-black text-[#1e3a8a]">{student?.name}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{student?.rollNo}</p></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-500 uppercase">
                                            <div className="flex items-center gap-2 font-bold"><Calendar size={14} /> {pass.date}</div>
                                            <div className="flex items-center gap-2 font-bold"><Clock size={14} /> {pass.startTime}-{pass.endTime}</div>
                                        </div>
                                        <div className="flex gap-4">
                                            <button onClick={() => handleAction(pass.id, "rejected")} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-black text-xs uppercase tracking-widest">Reject</button>
                                            <button onClick={() => handleAction(pass.id, "approved")} className="flex-1 py-3 bg-[#1e3a8a] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100">Approve</button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === "late" && (
                    <div className="animate-in fade-in space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldAlert className="text-red-600" size={20} />
                            <h2 className="font-black text-red-600 uppercase tracking-widest text-xs underline">Action Required: Overdue Students</h2>
                        </div>

                        {latePasses.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 italic font-bold text-gray-300 uppercase text-[10px]">All Lunch Pass students accounted for</div>
                        ) : (
                            latePasses.map(pass => {
                                const student = MOCK_STUDENTS().find(s => s.id === pass.studentId);
                                return (
                                    <div key={pass.id} className="bg-white rounded-3xl shadow-xl border-2 border-red-50 p-6 space-y-6 relative overflow-hidden">
                                        <div className="bg-red-600 absolute top-0 inset-x-0 h-1" />
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner animate-pulse">{student?.name.charAt(0)}</div>
                                            <div>
                                                <p className="font-black text-gray-900 text-lg leading-tight uppercase tracking-tighter">{student?.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Overdue since {pass.endTime}</p>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-2xl space-y-2 border border-dashed text-[10px] font-bold uppercase text-gray-500">
                                            <p className="flex justify-between">Student Mobile <span>{student?.studentPhone}</span></p>
                                            <p className="flex justify-between border-t border-gray-100 pt-2">Parent Contact <span className="text-blue-600">{student?.parentPhone}</span></p>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black text-gray-400 uppercase text-center mb-2 italic">Confirm Student Status at Gateway</p>
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => handleParentEscalation(pass, "enter")} 
                                                    className="flex-1 py-4 bg-green-50 text-green-700 rounded-xl font-black text-[10px] uppercase tracking-widest border border-green-100 hover:bg-green-100 active:scale-95 transition-all"
                                                >
                                                    Returned (Enter)
                                                </button>
                                                <button 
                                                    onClick={() => handleParentEscalation(pass, "not")} 
                                                    className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-100 active:scale-95 transition-all"
                                                >
                                                    Not Returned (Not)
                                                </button>
                                            </div>
                                            {pass.parentNotified && <p className="text-center text-red-500 font-black text-[8px] uppercase tracking-[0.2em] italic">Parent Alert Already Sent</p>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === "profile" && (
                    <div className="animate-in fade-in space-y-8 py-8">
                        <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border">
                            <div className="bg-[#1e3a8a] h-24 relative flex justify-center items-end pb-8">
                                <div className="absolute -bottom-8 w-24 h-24 bg-white rounded-full border-4 border-white shadow-xl overflow-hidden flex items-center justify-center text-[#1e3a8a] font-black text-3xl">
                                    {advisor.profileImg ? (
                                        <img src={advisor.profileImg} className="w-full h-full object-cover rounded-full" alt="Profile" />
                                    ) : (
                                        <span>{advisor.name.charAt(0)}</span>
                                    )}
                                </div>
                            </div>
                            <div className="p-8 pt-12 space-y-8">
                                <div className="text-center border-b pb-8"><p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Advisor Name</p><p className="text-xl font-black text-[#1e3a8a]">{advisor.name}</p></div>
                                <div className="text-center border-b pb-8"><p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Assigned Jurisdiction</p><p className="text-xl font-black text-green-600 uppercase italic">{advisor.assignedClass} Class</p></div>
                                <div className="text-center border-b pb-8"><p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Primary Mobile</p><p className="text-xl font-black text-blue-600 italic tracking-widest">{advisor.phone}</p></div>
                                <div className="text-center"><p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Primary Dept</p><p className="text-xl font-black text-gray-900">{advisor.department}</p></div>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="w-full py-4 bg-[#1e3a8a] text-white rounded-xl font-black uppercase tracking-widest">System Logout</button>
                    </div>
                )}
            </main>
        </div>
    );
}
