import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { requireSupabase } from "../lib/supabase";

type Workspace = { id: string; name: string; role: string };
type AuthState = { session: Session | null; workspace: Workspace | null; loading: boolean; refresh: () => Promise<void> };
const Context = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    const client = requireSupabase();
    const { data: { session: current } } = await client.auth.getSession();
    setSession(current);
    if (!current) { setWorkspace(null); setLoading(false); return; }
    const { data, error } = await client.from("organization_members").select("role, organizations(id,name)").eq("user_id", current.user.id).limit(1).maybeSingle();
    if (error) throw error;
    const org = data?.organizations as unknown as { id: string; name: string } | null;
    setWorkspace(org ? { ...org, role: data.role } : null);
    setLoading(false);
  };
  useEffect(() => {
    const client = requireSupabase();
    void refresh().catch(() => setLoading(false));
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) { setWorkspace(null); setLoading(false); }
      else void refresh().catch(() => setLoading(false));
    });
    return () => subscription.unsubscribe();
  }, []);
  return <Context.Provider value={{ session, workspace, loading, refresh }}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}
