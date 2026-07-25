import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://aoglolvcgjheqjxcrvxp.supabase.co";

const supabaseAnonKey = "YOUR_KEY_HERE";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);