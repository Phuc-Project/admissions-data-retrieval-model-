/**
 * CareerCompass-AI 2026 - Supabase Authentication & Session Management
 */
import { CONFIG } from './config.js';

class AuthService {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.listeners = [];
        this.initSupabase();
    }

    initSupabase() {
        try {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                this.supabase = window.supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.KEY);
                this.setupAuthListener();
            } else {
                console.warn("Supabase SDK not loaded yet. Retrying in 500ms...");
                setTimeout(() => this.initSupabase(), 500);
            }
        } catch (err) {
            console.error("Failed to initialize Supabase:", err);
        }
        
        // Restore cached local user session if any
        const cached = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_USER);
        if (cached) {
            try {
                this.currentUser = JSON.parse(cached);
            } catch (e) {
                this.currentUser = null;
            }
        }
    }

    setupAuthListener() {
        if (!this.supabase) return;

        this.supabase.auth.onAuthStateChange((event, session) => {
            if (session && session.user) {
                this.currentUser = {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                    school: session.user.user_metadata?.school || "THPT",
                    isGuest: false
                };
                localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(this.currentUser));
            } else if (event === 'SIGNED_OUT') {
                if (this.currentUser && !this.currentUser.isGuest) {
                    this.currentUser = null;
                    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_USER);
                }
            }
            this.notifyListeners();
        });
    }

    onAuthChange(callback) {
        this.listeners.push(callback);
        // Trigger immediately with current status
        callback(this.currentUser);
    }

    notifyListeners() {
        this.listeners.forEach(cb => {
            try {
                cb(this.currentUser);
            } catch (e) {
                console.error("Error in auth listener:", e);
            }
        });
    }

    async signUp(email, password, fullName, school = "THPT") {
        if (!this.supabase) throw new Error("Chưa kết nối được Supabase Client");

        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    school: school,
                    role: "student_12"
                }
            }
        });

        if (error) throw error;

        // Auto set user if session exists
        if (data.user) {
            this.currentUser = {
                id: data.user.id,
                email: data.user.email,
                name: fullName || data.user.email.split('@')[0],
                school: school,
                isGuest: false
            };
            localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(this.currentUser));
            this.notifyListeners();
        }

        return data;
    }

    async signIn(email, password) {
        if (!this.supabase) throw new Error("Chưa kết nối được Supabase Client");

        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (data.user) {
            this.currentUser = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
                school: data.user.user_metadata?.school || "THPT",
                isGuest: false
            };
            localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(this.currentUser));
            this.notifyListeners();
        }

        return data;
    }

    async signOut() {
        if (this.supabase && !this.currentUser?.isGuest) {
            try {
                await this.supabase.auth.signOut();
            } catch (e) {
                console.warn("Supabase signOut error:", e);
            }
        }
        this.currentUser = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_USER);
        this.notifyListeners();
    }

    loginAsGuest(name = "Học sinh Lớp 12", school = "THPT Chuyên / THPT") {
        this.currentUser = {
            id: "guest_" + Math.random().toString(36).substring(2, 9),
            email: "guest@careercompass.edu.vn",
            name: name.trim() || "Học sinh Lớp 12",
            school: school.trim() || "THPT",
            isGuest: true
        };
        localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(this.currentUser));
        this.notifyListeners();
        return this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }
}

export const authService = new AuthService();
