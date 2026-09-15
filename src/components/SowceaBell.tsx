import { useEffect, useRef, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Notif = {
  id: string;
  title: string;
  message: string | null;
  priority: string;
  category_slug: string | null;
  created_at: string;
  read_at: string | null;
};

const prioColor: Record<string, string> = {
  critical: "#dc2626",
  high: "#d97706",
  normal: "#64748b",
  low: "#94a3b8",
};

const prioChip: Record<string, { label: string; bg: string; color: string }> = {
  critical: { label: "Emergência", bg: "#fee2e2", color: "#b91c1c" },
  high: { label: "Alta", bg: "#fef3c7", color: "#b45309" },
  normal: { label: "Normal", bg: "#effafa", color: "#0f766e" },
  low: { label: "Leve", bg: "#f1f5f9", color: "#64748b" },
};

const HUB_URL = "https://notifications.sowcea.com";

/**
 * Universal Sowcea notifications bell (INTERNAL / ADMIN ONLY).
 * Reads public.ecosystem_notifications — never user_notifications.
 */
export function SowceaBell({ moduleSlug }: { moduleSlug?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const load = async () => {
    let q = sb
      .from("ecosystem_notifications")
      .select("id,title,message,priority,category_slug,created_at,read_at")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(15);
    if (moduleSlug) q = q.eq("category_slug", moduleSlug);
    const { data } = await q;
    setItems(data ?? []);

    let c = sb
      .from("ecosystem_notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .is("archived_at", null);
    if (moduleSlug) c = c.eq("category_slug", moduleSlug);
    const { count } = await c;
    setUnread(count ?? 0);
  };

  useEffect(() => {
    load();
    const ch = sb
      .channel("sowcea-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ecosystem_notifications" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const n = payload.new as Notif;
          if (moduleSlug && n.category_slug !== moduleSlug) return;
          setItems((p) => [n, ...p].slice(0, 15));
          setUnread((u) => u + 1);
        }
      )
      .subscribe();

    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => {
      sb.removeChannel(ch);
      document.removeEventListener("mousedown", onDoc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleSlug]);

  const runAction = async (n: Notif, action: "ignore" | "resolve" | "delegate_ai" | "auto_resolve") => {
    setBusyId(n.id);
    const removes = action === "ignore" || action === "resolve";
    const previous = items;
    if (removes) {
      setItems((p) => p.filter((i) => i.id !== n.id));
      if (!n.read_at) setUnread((u) => Math.max(0, u - 1));
    }
    try {
      const { data, error } = await sb.rpc("notification_take_action", {
        p_notification_id: n.id,
        p_action: action,
        p_note: null,
      });
      if (error) throw error;
      if (action === "delegate_ai") {
        const triad = (data as { triad?: string } | null)?.triad;
        toast.success(triad ? `Delegado à AI · ${triad}` : "Delegado à AI");
      } else if (action === "auto_resolve") {
        toast.success("Auto-resolução iniciada");
      } else {
        toast.success(action === "ignore" ? "Notificação ignorada" : "Notificação resolvida");
      }
    } catch (err) {
      if (removes) setItems(previous);
      console.error("notification_take_action failed:", err);
      toast.error("Não foi possível executar a acção");
    } finally {
      setBusyId(null);
    }
  };

  const goTo = (n: Notif) => {
    const url = n.category_slug ? `${HUB_URL}/modules/${n.category_slug}` : HUB_URL;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen(!open)}
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 8,
          borderRadius: 8,
          lineHeight: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#effafa")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      >
        <Bell size={20} color="#0f172a" />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 999,
              background: "#dc2626",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 380,
            maxWidth: "calc(100vw - 2rem)",
            maxHeight: 460,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(15,23,42,0.12)",
            zIndex: 60,
            padding: 8,
          }}
        >
          <div style={{ padding: "8px 10px", fontWeight: 600, fontSize: 14, color: "#0f172a" }}>
            Notificações
          </div>

          {items.length === 0 && (
            <div style={{ padding: "16px 10px", fontSize: 13, color: "#64748b" }}>Sem notificações ✅</div>
          )}

          {items.map((n) => {
            const chip = prioChip[n.priority] ?? prioChip.normal;
            const expanded = expandedId === n.id;
            return (
              <div
                key={n.id}
                onClick={() => setExpandedId(expanded ? null : n.id)}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  cursor: "pointer",
                  background: expanded ? "#effafa" : "transparent",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: prioColor[n.priority] ?? prioColor.normal,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", flex: 1 }}>{n.title}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: chip.bg,
                      color: chip.color,
                    }}
                  >
                    {chip.label}
                  </span>
                </div>

                {n.message && (
                  <p style={{ margin: "4px 0 0 16px", fontSize: 12, color: "#475569" }}>
                    {expanded ? n.message : n.message.slice(0, 120)}
                  </p>
                )}

                <div style={{ margin: "4px 0 0 16px", fontSize: 11, color: "#94a3b8" }}>
                  {n.category_slug ?? "ecosystem"} · {new Date(n.created_at).toLocaleString()}
                </div>

                {expanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0 0 16px" }}
                  >
                    {busyId === n.id ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
                        <Loader2 size={12} className="animate-spin" /> a processar…
                      </span>
                    ) : (
                      <>
                        <ActionBtn label="Ignorar" onClick={() => runAction(n, "ignore")} />
                        <ActionBtn label="Resolver" onClick={() => runAction(n, "resolve")} />
                        <ActionBtn label="Delegar à AI" onClick={() => runAction(n, "delegate_ai")} />
                        <ActionBtn label="Auto-resolver" onClick={() => runAction(n, "auto_resolve")} />
                        <ActionBtn label="Ir ver" onClick={() => goTo(n)} />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <a
            href={HUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              padding: "10px",
              fontSize: 12,
              fontWeight: 600,
              color: "#0f766e",
              textDecoration: "none",
            }}
          >
            Ver tudo no Notifications Hub →
          </a>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "4px 8px",
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: "#fff",
        color: "#0f172a",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#effafa")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
    >
      {label}
    </button>
  );
}
