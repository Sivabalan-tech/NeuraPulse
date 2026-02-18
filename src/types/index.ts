
// This file contains shared type definitions for the application

export interface HealthLog {
    id: string;
    log_date: string;
    symptoms: string | null;
    medications: string | null;
    mood: string | null;
    sleep_hours: number | null;
    energy_level: number | null;
    notes: string | null;
}

export interface Appointment {
    id: string;
    status: string;
    appointment_date: string;
    user_id?: string; // Added user_id as it is common in DB
}

export interface UserProfile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
}
