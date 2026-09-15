import { supabase } from "@/integrations/supabase/client";

// Validation views/RPCs live in the `validation` schema and are not in generated types.
export const vdb = supabase as any;

export const MODULE_SLUG = "legal-hub";
export const MODULE_NAME = "Legal Hub";
