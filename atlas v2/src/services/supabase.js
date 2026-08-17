import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vpiwgdrzxfkilbpicjmq.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwaXdnZHJ6eGZraWxicGljam1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4Mzc0NTEsImV4cCI6MjEwMjQxMzQ1MX0.s0jAZZnOwjny9pv69BlUSr5SiRMV7idg2TIdFZZg2G4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
