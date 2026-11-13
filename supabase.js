const SUPABASE_URL = "https://uoiheunoqqdsigyecvnu.supabase.co";

const SUPABASE_KEY = "sb_publishable_-oa2atmwh7TCk63xIV1yFA_dqQUeunh";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("VETCARE conectado a Supabase");
