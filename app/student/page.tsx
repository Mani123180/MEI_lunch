"use client";

import { useState, useEffect } from "react";
import { GlobalStore, Pass, Student } from "@/lib/store";
import { QRCodeSVG } from "qrcode.react";
import {
    Menu, X, History, Clock, Send, User, LogOut,
    Calendar, Info, ChevronRight, CheckCircle2,
    Plus, Search, Phone, Book, Building, UserCircle, ArrowLeft, XCircle, FileText
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function StudentPortal() {
    const [student, setStudent] = useState<Student | null>(null);
    const [passes, setPasses] = useState<Pass[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"dashboard" | "requests" | "profile" | "instructions" | "view_pass">("dashboard");
    const [applyingType, setApplyingType] = useState<"lunch" | "leave" | null>(null);
    const [selectedPass, setSelectedPass] = useState<Pass | null>(null);

    const [passDate, setPassDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    const router = useRouter();

    useEffect(() => {
        const savedUser = sessionStorage.getItem("user");
        if (!savedUser) { router.push("/login"); return; }
        const user = JSON.parse(savedUser) as Student;
        if (user.role !== "student") { router.push("/login"); return; }
        setStudent(user);

        const update = () => {
            const allUsers = GlobalStore.getUsers();
            const currentUser = allUsers.find(u => u.id === user.id) as Student;
            if (currentUser) setStudent(currentUser);
            
            setPasses(GlobalStore.getPasses().filter(p => p.studentId === user.id)
                .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()));
        };
        update();
        return GlobalStore.subscribe(update);
    }, [router]);

    const [reason, setReason] = useState("");
    const [selectedSlot, setSelectedSlot] = useState<"12:00PM-01:00PM" | "01:00PM-02:00PM" | "">("");

    const handleApply = (e: React.FormEvent) => {
        e.preventDefault();
        proceedWithApplication(e);
    };

    const proceedWithApplication = (e: React.FormEvent) => {
        if (!student || !applyingType) return;

        // Restriction: Cannot apply before 11:30 AM for today's pass
        const now = new Date();
        const [todayY, todayM, todayD] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
        const [appY, appM, appD] = passDate.split("-").map(Number);

        if (applyingType === "lunch" && todayY === appY && todayM === appM && todayD === appD) {
            if (now.getHours() < 11 || (now.getHours() === 11 && now.getMinutes() < 30)) {
                alert("Lunch pass application opens at 11:30 AM.");
                return;
            }
            
            // Check if lunch pass already exists for today
            const existingLunch = passes.find(p => p.type === "lunch" && p.date === passDate);
            if (existingLunch) {
                alert("You have already applied for a Lunch Pass today.");
                return;
            }
        }

        let resStartTime = "";
        let resEndTime = "";

        if (applyingType === "lunch") {
            if (selectedSlot === "12:00PM-01:00PM") {
                resStartTime = "12:00";
                resEndTime = "13:00";
            } else if (selectedSlot === "01:00PM-02:00PM") {
                resStartTime = "13:00";
                resEndTime = "14:00";
            }
        }

        const newPass: Pass = {
            id: `P${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
            studentId: student.id,
            type: applyingType,
            status: applyingType === "lunch" ? "approved" : "pending",
            appliedAt: new Date().toISOString(),
            date: passDate,
            startTime: resStartTime,
            endTime: resEndTime,
            reason: applyingType === "leave" ? reason : undefined,
        };
        GlobalStore.addPass(newPass);
        setApplyingType(null);
        setReason("");
        setSelectedSlot("");
        setActiveTab("requests");
    };

    const isWithinTime = (pass: Pass) => {
        const now = new Date();
        const [y, m, d] = pass.date.split("-").map(Number);
        const [sh, sm] = (pass.startTime || "00:00").split(":").map(Number);
        const [eh, em] = (pass.endTime || "23:59").split(":").map(Number);
        const start = new Date(y, m - 1, d, sh, sm);
        const end = new Date(y, m - 1, d, eh, em);
        return now >= start && now <= end;
    };

    const isExpired = (pass: Pass) => {
        const now = new Date();
        const [y, m, d] = pass.date.split("-").map(Number);
        const [eh, em] = (pass.endTime || "23:59").split(":").map(Number);
        return now > new Date(y, m - 1, d, eh, em);
    };

    if (!student) return null;

    const handleLogout = () => { sessionStorage.removeItem("user"); router.push("/login"); };

    return (
        <div className="min-h-screen bg-[#f3f4f9] pb-10">
            {/* Mobile Header (Blue/Purple Banner like app 1) */}
            <header className="fixed top-0 bg-gradient-to-r from-[#1e3a8a] to-[#5b21b6] text-white w-full h-16 flex items-center px-6 z-50">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -ml-2">
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                <h1 className="ml-6 font-bold text-lg tracking-tight capitalize">
                    {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'requests' ? 'Request' : activeTab === 'profile' ? 'Profile' : 'Instructions'}
                </h1>
                {activeTab === 'requests' && <Search className="ml-auto" size={20} />}
            </header>

            {/* Sidebar Menu Drawer (Black/Gray from app image 3) */}
            <div
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={() => setIsMenuOpen(false)}
            />
            <aside className={`fixed top-0 left-0 h-full w-[80%] bg-[#333333] z-50 shadow-2xl transition-transform duration-300 transform ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="flex flex-col h-full">
                    <div className="bg-gradient-to-r from-[#1e3a8a] to-[#5b21b6] p-10 flex flex-col items-center justify-center text-white">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 p-2">
                            <div className="w-full h-full bg-[#1e3a8a] rounded-full flex items-center justify-center font-black">MEI</div>
                        </div>
                        <p className="font-bold text-lg uppercase tracking-widest">MEI LUNCH</p>
                    </div>

                    <nav className="flex-1 p-4 space-y-2 mt-4 text-white">
                        <button
                            onClick={() => { setActiveTab("dashboard"); setIsMenuOpen(false); }}
                            className={`w-full flex items-center gap-6 p-4 rounded-xl font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        >
                            <div className="w-6"><User size={20} /></div> Dashboard
                        </button>
                        <button
                            onClick={() => { setActiveTab("requests"); setIsMenuOpen(false); }}
                            className={`w-full flex items-center gap-6 p-4 rounded-xl font-medium transition-colors ${activeTab === 'requests' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        >
                            <div className="w-6"><History size={20} /></div> Request List
                        </button>
                        <button
                            onClick={() => { setActiveTab("profile"); setIsMenuOpen(false); }}
                            className={`w-full flex items-center gap-6 p-4 rounded-xl font-medium transition-colors ${activeTab === 'profile' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        >
                            <div className="w-6"><UserCircle size={20} /></div> Profile
                        </button>
                        <button
                            onClick={() => { setActiveTab("instructions"); setIsMenuOpen(false); }}
                            className={`w-full flex items-center gap-6 p-4 rounded-xl font-medium transition-colors ${activeTab === 'instructions' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        >
                            <div className="w-6"><Info size={20} /></div> Pass Timing
                        </button>
                        <hr className="border-white/10 my-6" />
                        <button onClick={handleLogout} className="w-full flex items-center gap-6 p-4 rounded-xl font-medium text-red-100 hover:bg-red-500/10">
                            <div className="w-6"><LogOut size={20} /></div> Logout
                        </button>
                    </nav>
                </div>
            </aside>

            <main className="pt-16 min-h-screen">
                {activeTab === "dashboard" && (
                    <div className="p-8 animate-in fade-in space-y-8">
                        <div className="bg-white p-8 rounded-[1.5rem] shadow-sm flex items-center gap-6">
                            <div className="w-20 h-20 bg-blue-100 border-4 border-white shadow-xl rounded-full flex items-center justify-center p-2 overflow-hidden">
                                {student.profileImg ? (
                                    <img src={student.profileImg} className="w-full h-full object-cover rounded-full" alt="Profile" />
                                ) : (
                                    <div className="w-full h-full bg-[#1e3a8a] rounded-full flex items-center justify-center text-white font-black">{student.name.charAt(0)}</div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-gray-500 font-bold uppercase tracking-widest text-xs">Welcome</h2>
                                <h1 className="text-2xl font-black text-[#1e3a8a] tracking-tight">{student.name}</h1>
                            </div>
                        </div>

                        {/* Apply Pass options removed from here as per user request */}


                    </div>
                )}

                {activeTab === "requests" && (
                    <div className="p-4 space-y-4 animate-in fade-in">
                        {/* New Application Options inside Request List as per user request */}
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <button
                                onClick={() => { setApplyingType("lunch"); setActiveTab("view_pass"); }}
                                className="bg-white p-4 rounded-xl shadow-sm border text-center flex items-center justify-center gap-2 active:scale-95 transition-all text-[#1e3a8a] font-black uppercase text-[10px] tracking-widest"
                            >
                                <Clock size={16} /> Lunch
                            </button>
                            <button
                                onClick={() => { setApplyingType("leave"); setActiveTab("view_pass"); }}
                                className="bg-white p-4 rounded-xl shadow-sm border text-center flex items-center justify-center gap-2 active:scale-95 transition-all text-purple-600 font-black uppercase text-[10px] tracking-widest"
                            >
                                <Send size={16} /> Leave
                            </button>
                        </div>

                        {passes.length === 0 ? (
                            <div className="text-center py-20 text-gray-300 font-bold uppercase tracking-widest text-xs">No records found</div>
                        ) : (
                            passes.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => { setSelectedPass(p); setActiveTab("view_pass"); }}
                                    className="w-full bg-white rounded-2xl shadow-sm border p-6 flex flex-col space-y-3 relative overflow-hidden group active:scale-[0.98] transition-all"
                                >
                                    {/* Decorative Wave from app image 2 */}
                                    <div className="absolute top-0 -right-4 w-40 h-40 bg-[#cffafe] rounded-full opacity-30 -mr-10 -mt-20 group-hover:scale-110 transition-transform"></div>

                                    <div className="flex items-center gap-6 relative z-10">
                                        <Calendar size={18} className="text-gray-400" />
                                        <span className="font-bold text-gray-700">{p.date}</span>
                                        <div className="w-[1px] h-4 bg-gray-200" />
                                        <Clock size={18} className="text-gray-400" />
                                        <span className="font-bold text-gray-700">{p.startTime} - {p.endTime}</span>
                                    </div>

                                    <div className="flex items-center gap-6 relative z-10">
                                        <User size={18} className="text-gray-400" />
                                        <span className="font-bold text-gray-700 tracking-wide uppercase">Outing</span>
                                    </div>

                                    <div className="flex items-center gap-6 relative z-10">
                                        <Info size={18} className="text-gray-400" />
                                        <span className="font-bold text-gray-700 capitalize">Purpose: {p.type === 'lunch' ? 'Lunch' : 'Official Leave'}</span>
                                    </div>

                                    <div className="flex items-center gap-6 relative z-10">
                                        <CheckCircle2 size={18} className={p.status === 'approved' ? 'text-green-500' : 'text-orange-500'} />
                                        <span className={`font-black uppercase tracking-widest text-xs ${p.status === 'approved' ? 'text-green-600' : 'text-orange-600'}`}>{p.status}</span>
                                    </div>
                                </button>
                            ))
                        )}

                    </div>
                )}

                {activeTab === "view_pass" && (
                    <div className="p-8 animate-in slide-in-from-bottom-8">
                        <button onClick={() => setActiveTab("requests")} className="mb-8 flex items-center gap-2 text-[#1e3a8a] font-bold">
                            <ArrowLeft size={20} /> Back
                        </button>

                        {applyingType ? (
                            <div className="bg-white p-10 rounded-[2rem] shadow-xl space-y-8">
                                <h2 className="text-2xl font-black text-[#1e3a8a] uppercase tracking-tighter">Apply {applyingType.toUpperCase()}</h2>
                                <form onSubmit={handleApply} className="space-y-6">
                                    <div>
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-widest block mb-2">Target Date</label>
                                        <input type="date" required className="w-full h-14 bg-gray-50 rounded-xl px-5 font-bold" value={passDate} onChange={e => setPassDate(e.target.value)} />
                                    </div>

                                    {applyingType === "lunch" ? (
                                        <div className="space-y-4">
                                            <label className="text-xs font-black uppercase text-gray-400 tracking-widest block mb-2">Select Time Slot</label>
                                            <div className="grid grid-cols-1 gap-3">
                                                {["12:00PM-01:00PM", "01:00PM-02:00PM"].map(slot => (
                                                    <button
                                                        key={slot}
                                                        type="button"
                                                        onClick={() => setSelectedSlot(slot as any)}
                                                        className={`w-full h-14 rounded-xl font-bold border-2 transition-all ${selectedSlot === slot ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                                                    >
                                                        {slot}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <label className="text-xs font-black uppercase text-gray-400 tracking-widest block mb-2">Reason for Leave</label>
                                            <textarea
                                                required
                                                className="w-full p-5 bg-gray-50 rounded-xl font-bold min-h-[120px] outline-none focus:ring-2 ring-purple-100"
                                                placeholder="Enter detailed reason..."
                                                value={reason}
                                                onChange={e => setReason(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    <button
                                        disabled={applyingType === "lunch" && !selectedSlot}
                                        className="w-full h-16 bg-[#1e3a8a] text-white rounded-xl font-black text-lg shadow-xl shadow-blue-100 uppercase tracking-widest disabled:opacity-50"
                                    >
                                        Submit Request
                                    </button>
                                </form>
                            </div>
                        ) : selectedPass ? (
                            <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden text-center relative">
                                <div className={`h-2 w-full ${selectedPass.status === 'approved' ? 'bg-green-500' : 'bg-orange-500'}`} />
                                <div className="p-10">
                                    {selectedPass.status === 'approved' ? (
                                        <div className="flex flex-col items-center">
                                            {isExpired(selectedPass) ? (
                                                <div className="py-12 w-full">
                                                    <XCircle size={64} className="mx-auto text-red-500 mb-4" />
                                                    <p className="font-black text-red-500 uppercase italic">Token Expired</p>
                                                    <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Time closed at {selectedPass.endTime}</p>
                                                    <button onClick={() => setActiveTab('requests')} className="mt-8 px-6 py-3 bg-red-50 text-red-600 rounded-full font-black text-xs uppercase tracking-widest border border-red-100">Go Back</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="mb-6">
                                                        <p className="text-xl font-black text-[#1e3a8a] uppercase tracking-tight">{student.name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{student.rollNo} | {student.department}</p>
                                                    </div>
                                                    <div className="p-6 bg-gray-50 rounded-[2rem] mb-8 border-2 border-dashed border-gray-200">
                                                        <QRCodeSVG
                                                            value={JSON.stringify({
                                                                id: selectedPass.id,
                                                                name: student.name,
                                                                roll: student.rollNo,
                                                                dept: student.department,
                                                                year: student.year,
                                                                sec: student.section
                                                            })}
                                                            size={200}
                                                        />
                                                    </div>
                                                    <div className="bg-gray-50 w-full p-6 rounded-2xl flex justify-between font-bold text-[10px] uppercase text-gray-400 tracking-widest">
                                                        <div className="text-left"><p>Valid Date</p><p className="text-gray-900 mt-1 font-black">{selectedPass.date}</p></div>
                                                        <div className="text-right"><p>Time Window</p><p className="text-gray-900 mt-1 font-black">{selectedPass.type === 'lunch' ? `${selectedPass.startTime}-${selectedPass.endTime}` : 'All Day'}</p></div>
                                                    </div>
                                                </>
                                            )}
                                            {selectedPass.reason && !isExpired(selectedPass) && (
                                                <div className="mt-4 w-full p-4 bg-purple-50 rounded-xl text-left border-l-4 border-purple-500">
                                                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Reason for Leave</p>
                                                    <p className="text-xs font-bold text-gray-700 italic">{selectedPass.reason}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : selectedPass.status === 'rejected' ? (
                                        <div className="py-12 text-red-500">
                                            <XCircle size={64} className="mx-auto mb-4" />
                                            <p className="font-black uppercase">Pass Rejected</p>
                                        </div>
                                    ) : (
                                        <div className="py-12 text-orange-500">
                                            <Clock size={64} className="mx-auto mb-4 animate-pulse" />
                                            <p className="font-black uppercase tracking-widest">Awaiting Approval</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {activeTab === "profile" && (
                    <div className="p-0 animate-in fade-in slide-in-from-top-4">
                        {/* Profile Page Layout like App Image 4 */}
                        <div className="h-64 bg-gradient-to-b from-[#1e3a8a] to-[#5b21b6] relative flex items-end justify-center pb-12">
                            <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center p-2">
                                {student.profileImg ? (
                                    <img src={student.profileImg} className="w-full h-full object-cover rounded-full" alt="Profile" />
                                ) : (
                                    <UserCircle size={100} className="text-gray-200" />
                                )}
                            </div>
                        </div>

                        <div className="max-w-[90%] mx-auto -mt-8 bg-white rounded-3xl p-10 shadow-xl border border-gray-100 text-center space-y-8">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{student.name}</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">{student.rollNo}</p>
                            </div>

                            <hr className="border-gray-50" />

                            <div className="space-y-6 text-sm font-black text-gray-600 uppercase tracking-widest leading-6">
                                <p className="flex items-center gap-4 justify-center"><Building size={16} className="text-blue-500" /> {student.department}</p>
                                <p className="flex items-center gap-4 justify-center"><Book size={16} className="text-blue-500" /> B-TECH (IT)</p>
                                <p className="flex items-center gap-4 justify-center"><Building size={16} className="text-blue-500" /> Year {student.year} | {student.section}</p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4 justify-center text-[#1e3a8a] text-xs">
                                        <Phone size={14} /> <span>S: {student.studentPhone}</span>
                                    </div>
                                    <div className="flex items-center gap-4 justify-center text-orange-600 text-xs">
                                        <Phone size={14} /> <span>P: {student.parentPhone}</span>
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleLogout} className="w-full py-4 bg-[#1e3a8a] text-white rounded-xl font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-100 mt-8 active:scale-95 transition-all">Logout</button>
                        </div>
                    </div>
                )}

                {activeTab === "instructions" && (
                    <div className="p-8 animate-in fade-in space-y-8">
                        <h2 className="text-2xl font-black text-[#1e3a8a] uppercase tracking-widest border-b pb-4">Pass Timings</h2>
                        <div className="space-y-4">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-600">
                                <p className="font-black text-[#1e3a8a] mb-1">Lunch Break Timings</p>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-2">Slot 1: 12:00 PM to 01:00 PM</p>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Slot 2: 01:00 PM to 02:00 PM</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-purple-600">
                                <p className="font-black text-purple-600 mb-1">Official Leave</p>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">As approved by Advisor</p>
                            </div>
                            <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-red-700">
                                <p className="font-black mb-2 uppercase italic text-xs">Emergency Reporting</p>
                                <p className="text-xs font-bold leading-relaxed uppercase tracking-tighter">Students found outside campus after 8:00 PM will face strict disciplinary action.</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
