import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminState {
  loading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

export function useRequireAdmin(): AdminState {
  const [state, setState] = useState<AdminState>({
    loading: true,
    isAdmin: false,
    isAuthenticated: false,
  });

  useEffect(() => {
    const check = async (retries = 3) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setState({ loading: false, isAdmin: false, isAuthenticated: false });
        return;
      }

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });

      if (error && retries > 0) {
        // Retry on transient errors (503, network issues)
        await new Promise((r) => setTimeout(r, 1500));
        return check(retries - 1);
      }

      setState({
        loading: false,
        isAuthenticated: true,
        isAdmin: !!data,
      });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setState((s) => ({ ...s, loading: true }));
      check();
    });

    check();

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
