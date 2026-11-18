"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Bell, CheckCheck, ArrowLeft, CreditCard, Clock, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organization";

const labels: Record<string, string> = {
  payment_received: "Pagamento recebido",
  rent_due_soon: "Renda a vencer",
  rent_due_today: "Renda vence hoje",
  rent_overdue: "Renda em atraso",
};

const icons: Record<string, typeof Bell> = {
  payment_received: CreditCard,
  rent_due_soon: Clock,
  rent_due_today: Clock,
  rent_overdue: AlertTriangle,
};

export default async function NotificationsPage() {
  const { supabase, user, membership } = await getActiveOrganization();

  const { data: notifications, error } = await supabase
    .from("app_notifications")
    .select("id, event_type, title, body, read_at, created_at")
    .eq("user_id", user.id)
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })
    .limit(100);

  async function markAsRead(formData: FormData) {
    "use server";
    const id = String(formData.get("notification_id") ?? "");
    if (!id) return;
    const { supabase: client, user: currentUser, membership: activeMembership } = await getActiveOrganization();
    await client
      .from("app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", currentUser.id)
      .eq("organization_id", activeMembership.organization_id);
    revalidatePath("/dashboard/notificacoes");
  }

  const unreadCount = notifications?.filter((item) => !item.read_at).length ?? 0;

  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><a className="brand" href="/dashboard">Imobi<span>AO</span></a><p className="dashboard-subtitle">Centro de notificações</p></div>
      <a className="logout-button" href="/dashboard"><ArrowLeft size={16}/> Voltar à dashboard</a>
    </header>
    <section className="dashboard-content notification-content">
      <div className="page-heading">
        <div><p className="eyebrow">ATUALIZAÇÕES DA CONTA</p><h1>Notificações</h1><p className="auth-description">Acompanhe os acontecimentos importantes da sua organização.</p></div>
        <div className="notification-counter"><Bell size={18}/><strong>{unreadCount}</strong><span>por ler</span></div>
      </div>
      {error ? <div className="notice-box">Não foi possível carregar as notificações. Confirme se a migração 0008 foi executada.</div> : null}
      {!notifications?.length ? <section className="empty-panel"><div className="empty-icon"><Bell size={25}/></div><h2>Ainda não há notificações</h2><p>Quando houver pagamentos registados ou outros eventos importantes, as atualizações aparecerão aqui.</p><a className="primary-link" href="/dashboard">Voltar à dashboard</a></section> :
        <div className="notification-list">{notifications.map((item) => {
          const Icon = icons[item.event_type] ?? Bell;
          return <article className={item.read_at ? "notification-card is-read" : "notification-card"} key={item.id}>
            <span className="notification-icon"><Icon size={19}/></span>
            <div className="notification-main"><div className="notification-title-row"><h2>{item.title || labels[item.event_type] || "Atualização"}</h2>{!item.read_at && <span className="notification-unread">Nova</span>}</div>
              <p>{item.body}</p><small>{new Intl.DateTimeFormat("pt-AO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</small>
            </div>
            {!item.read_at && <form action={markAsRead}><input type="hidden" name="notification_id" value={item.id}/><button className="notification-read-button" type="submit"><CheckCheck size={15}/> Marcar como lida</button></form>}
          </article>;
        })}</div>
      }
    </section>
  </main>;
}
