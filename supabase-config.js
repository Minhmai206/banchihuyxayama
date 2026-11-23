// Replace these with the Project URL and publishable (or legacy anon) key
// from Supabase Project Settings > API. Never put a service_role key here.
const SUPABASE_URL = "https://apdhtucbpbcwgogllcer.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_2XLCZPoYJGNcM3_ABePO1Q_dNrqJSuL";

window.supabaseClient = null;
window.supabaseSetupError = "";

if (SUPABASE_URL.includes("YOUR_PROJECT_ID") || SUPABASE_PUBLIC_KEY.includes("YOUR_")) {
  window.supabaseSetupError = "Hãy điền Project URL và publishable key vào supabase-config.js.";
} else if (!window.supabase || typeof window.supabase.createClient !== "function") {
  window.supabaseSetupError = "Không tải được Supabase SDK. Kiểm tra kết nối mạng hoặc CDN.";
} else {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
}
