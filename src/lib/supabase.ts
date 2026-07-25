import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://aoglolvcgjheqjxcrvxp.supabase.co";

const supabaseAnonKey = "sb_publishable_KrDUCafyn0_ZbLSW_iPd1g_030I8Po6";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);