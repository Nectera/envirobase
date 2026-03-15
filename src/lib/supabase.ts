import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with service role key for storage operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const INVENTORY_BUCKET = "content-inventory";
export const DOCUMENTS_BUCKET = "project-documents";
export const CHAT_BUCKET = "chat-uploads";
export const DFR_PHOTOS_BUCKET = "dfr-photos";
export const CERTIFICATIONS_BUCKET = "certifications";
export const INVOICES_BUCKET = "material-invoices";
