"use client";

// Since I can't install zustand easily without potentially more ERESOLVE issues, I'll use a simple React Context or a singleton.

export type PassType = "lunch" | "leave";
export type PassStatus = "pending" | "approved" | "rejected" | "used" | "expired";
export type UserRole = "student" | "admin" | "advisor" | "watchman";

export interface User {
    id: string;
    username: string;
    password: string;
    role: UserRole;
    name: string;
    profileImg?: string;
}

export interface Student extends User {
    rollNo: string;
    department: string;
    year: string;
    section: string;
    parentPhone: string;
    studentPhone: string;
}

export interface Advisor extends User {
    department: string;
    assignedClass: string; // e.g., "CSE-3-A" (Dept-Year-Sec)
    phone: string;
}

export interface Pass {
    id: string;
    studentId: string;
    type: PassType;
    status: PassStatus;
    appliedAt: string;
    date: string; // User requested date
    startTime?: string; // User requested time
    endTime?: string;
    reason?: string; // For leave passes
    approvedAt?: string;
    scannedOutAt?: string;
    scannedInAt?: string;
    // Expiry message tracking
    studentNotified?: boolean;
    advisorNotified?: boolean;
    parentNotified?: boolean;
}

class PassStore {
    private users: User[] = [
        { id: "admin1", username: "admin", password: "123", role: "admin", name: "System Admin" },
        { id: "watchman_common", username: "watchman", password: "123", role: "watchman", name: "Main Gate Security" },
        { id: "demo_student", username: "student", password: "123", role: "student", name: "Test Student", rollNo: "MAH001", department: "B.Tech IT", year: "3", section: "A", parentPhone: "9876543210", studentPhone: "8877665544" } as Student
    ];
    private passes: Pass[] = [
        { id: "P-DEMO-123", studentId: "demo_student", type: "lunch", status: "approved", appliedAt: new Date().toISOString(), date: new Date().toISOString().split('T')[0], startTime: "12:00", endTime: "14:00" }
    ];
    private listeners: (() => void)[] = [];

    constructor() {
        if (typeof window !== "undefined") {
            const savedPasses = localStorage.getItem("mei_passes");
            const savedUsers = localStorage.getItem("mei_users");
            if (savedPasses) this.passes = JSON.parse(savedPasses);
            if (savedUsers) {
                const parsedUsers = JSON.parse(savedUsers);
                // Ensure default users exist
                this.users = [...this.users, ...parsedUsers.filter((u: User) => u.id !== "admin1" && u.id !== "watchman_common")];
            }
            
            // Auto-check expiries every 30 seconds
            setInterval(() => this.checkExpiries(), 30000);
        }
    }

    private checkExpiries() {
        if (typeof window === "undefined") return;
        
        const now = new Date();
        let changed = false;

        this.passes = this.passes.map(pass => {
            if (pass.type !== "lunch" || pass.status !== "approved" || !pass.endTime) return pass;

            // Simple time parser (HH:MM)
            const [endH, endM] = pass.endTime.split(":").map(Number);
            const endTimeDate = new Date();
            endTimeDate.setHours(endH, endM, 0);

            const diffMins = (now.getTime() - endTimeDate.getTime()) / (1000 * 60);

            let updatedPass = { ...pass };

            // 1 min after: Student msg
            if (diffMins >= 1 && !pass.studentNotified) {
                const student = this.users.find(u => u.id === pass.studentId) as Student;
                if (student) {
                    this.simulateSMS(student.id, `LUNCH PASS EXPIRED! You were supposed to return by ${pass.endTime}. Return to hostel immediately.`, student.studentPhone);
                    updatedPass.studentNotified = true;
                    changed = true;
                }
            }

            // 5 mins after (total 6): Advisor msg
            if (diffMins >= 6 && !pass.advisorNotified) {
                const student = this.users.find(u => u.id === pass.studentId) as Student;
                const advisors = this.users.filter(u => u.role === "advisor") as Advisor[];
                const studentClass = `${student?.department}-${student?.year}-${student?.section}`.toUpperCase();
                const advisor = advisors.find(a => a.assignedClass.toUpperCase() === studentClass);

                if (advisor && student) {
                    this.simulateSMS(advisor.id, `ALERT: Student ${student.name} (${student.rollNo}) has not returned from Lunch (End: ${pass.endTime}). Action required.`, advisor.phone);
                    updatedPass.advisorNotified = true;
                    changed = true;
                }
            }

            return updatedPass;
        });

        if (changed) {
            this.save();
            this.notify();
        }
    }

    private save() {
        if (typeof window !== "undefined") {
            localStorage.setItem("mei_passes", JSON.stringify(this.passes));
            localStorage.setItem("mei_users", JSON.stringify(this.users.filter(u => u.id !== "admin1" && u.id !== "watchman_common")));
        }
    }

    getUsers() { return this.users; }
    getPasses() { return this.passes; }

    addUser(user: User) {
        this.users.push(user);
        this.save();
        this.notify();
        
        // Notify user about registration
        let phone = "";
        if (user.role === "student") phone = (user as Student).studentPhone;
        else if (user.role === "advisor") phone = (user as Advisor).phone;
        
        if (phone) {
            this.simulateSMS(user.id, `Welcome to MEI Hostel Portal. Account active!`, phone);
        }
    }

    updateUser(id: string, updates: Partial<User>) {
        this.users = this.users.map(u => u.id === id ? { ...u, ...updates } : u);
        this.save();
        this.notify();
    }

    deleteUser(id: string) {
        this.users = this.users.filter(u => u.id !== id);
        this.save();
        this.notify();
    }

    addPass(pass: Pass) {
        this.passes.push(pass);
        this.save();
        this.notify();
        
        const student = this.users.find(u => u.id === pass.studentId) as Student;
        // Only lunch pass messages as per request (aside from application confirmation maybe)
        if (student && pass.type === 'lunch') {
            this.simulateSMS(pass.studentId, `Lunch Pass applied for ${pass.date} (${pass.startTime}-${pass.endTime})`, student.parentPhone);
        }
    }

    updatePass(id: string, updates: Partial<Pass>) {
        this.passes = this.passes.map(p => p.id === id ? { ...p, ...updates } : p);
        this.save();
        this.notify();

        const pass = this.passes.find(p => p.id === id);
        if (pass && updates.status === "approved" && pass.type === 'lunch') {
            const student = this.users.find(u => u.id === pass.studentId) as Student;
            if (student) {
                this.simulateSMS(pass.studentId, `Lunch Pass APPROVED for ${pass.date}. Ready for exit.`, student.studentPhone);
            }
        }
    }

    public sendCustomSMS(userId: string, targetPhone: string, message: string) {
        this.simulateSMS(userId, message, targetPhone);
    }

    public static triggerWhatsApp(phone: string, message: string) {
        const cleanPhone = phone.replace(/\D/g, '');
        const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }

    private simulateSMS(userId: string, message: string, overridePhone?: string) {
        const user = this.users.find(u => u.id === userId);
        if (user || overridePhone) {
            let phone = overridePhone;
            if (!phone && user) {
                if (user.role === "student") phone = (user as Student).studentPhone;
                else if (user.role === "advisor") phone = (user as Advisor).phone;
            }
            
            if (!phone) return;

            console.log(`%c[WHATSAPP SIMULATION TO ${phone}]: %c${message}`, "color: #25d366; font-weight: bold", "color: #374151");
            
            if (typeof window !== "undefined") {
                const toast = document.createElement("div");
                toast.className = "fixed top-6 right-6 w-[340px] bg-white text-gray-900 rounded-[1.5rem] shadow-2xl z-[9999] animate-in slide-in-from-right-12 overflow-hidden border border-gray-100 ring-4 ring-black/5";
                toast.innerHTML = `
                    <div class="flex items-center gap-4 p-4 border-b bg-[#25d366]/5">
                        <div class="w-10 h-10 bg-[#25d366] rounded-full flex items-center justify-center text-white shadow-inner font-black">WA</div>
                        <div>
                            <p class="text-[10px] font-black text-[#128c7e] uppercase tracking-widest">WhatsApp Business</p>
                            <p class="text-xs font-black text-gray-500">${phone}</p>
                        </div>
                        <div class="ml-auto text-[8px] font-black text-gray-300 uppercase">Now</div>
                    </div>
                    <div class="p-5">
                        <p class="text-[13px] font-bold leading-relaxed text-gray-700 italic">"${message}"</p>
                    </div>
                    <button id="wa-btn-${phone.slice(-4)}" class="w-full py-3 bg-gray-50 text-[#128c7e] text-[10px] font-black uppercase tracking-widest border-t hover:bg-gray-100 transition-colors">
                        Tap to Reply in WhatsApp
                    </button>
                `;
                document.body.appendChild(toast);
                
                // Add click listener to the toast button for real WhatsApp trigger
                const btn = document.getElementById(`wa-btn-${phone.slice(-4)}`);
                if (btn) {
                    btn.onclick = () => PassStore.triggerWhatsApp(phone!, message);
                }

                setTimeout(() => {
                    toast.classList.add("animate-out", "fade-out", "slide-out-to-right-12");
                    setTimeout(() => toast.remove(), 500);
                }, 8000);
            }
        }
    }

    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }
}

export const GlobalStore = new PassStore();
export const MOCK_STUDENTS = () => GlobalStore.getUsers().filter(u => u.role === "student") as Student[];
export const MOCK_ADVISORS = () => GlobalStore.getUsers().filter(u => u.role === "advisor") as Advisor[];
