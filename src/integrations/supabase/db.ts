// Loosely-typed Supabase accessor.
// Some tables/views used by this module are not present in the generated
// `Database` types, so queries against them go through this untyped client.
import { supabase } from './client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;
