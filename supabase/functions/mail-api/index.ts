import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});
const required = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(label + " is required");
  return value.trim();
};
const validHost = (value: string) => {
  if (value.length > 253 || !/^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(value)) {
    throw new Error("Invalid mail server hostname");
  }
  const host = value.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw new Error("Local mail server addresses are not allowed");
};
const validPort = (value: unknown, label: string) => {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || port === 25) throw new Error(label + " must be a valid port (SMTP port 25 is not supported)");
  return port;
};
async function encryptionKey() {
  const secret = Deno.env.get("SETTINGS_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) throw new Error("SETTINGS_ENCRYPTION_KEY is not configured (minimum 32 characters)");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt"]);
}
async function encrypt(value: string) {
  const key = await encryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authorization.slice(7);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Invalid session" }, 401);
    const user = userData.user;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const body = await req.json();
    const organizationId = required(body.organization_id, "organization_id");
    const { data: membership, error: membershipError } = await admin.from("organization_members")
      .select("role").eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
    if (membershipError || !membership) return json({ error: "Organization membership required" }, 403);

    const audit = async (action: string, accountId: string | null, metadata: Record<string, unknown> = {}) => {
      await admin.from("mail_audit_logs").insert({
        organization_id: organizationId, user_id: user.id, account_id: accountId, action, metadata,
      });
    };

    switch (body.action) {
      case "list_accounts": {
        const { data, error } = await admin.from("mail_accounts")
          .select("id,provider_key,email_address,display_name,status,is_default,sync_window_days,sync_status,last_sync_at,last_error_code,last_error_message,provider_metadata,created_at,updated_at")
          .eq("organization_id", organizationId).eq("user_id", user.id).order("created_at", { ascending: false });
        if (error) throw error;
        return json({ accounts: data || [] });
      }
      case "save_imap_smtp_account": {
        const account = body.account || {};
        const emailAddress = required(account.email_address, "email_address").toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) throw new Error("Invalid email address");
        const username = required(account.username, "username");
        const password = required(account.password, "password");
        const imapHost = required(account.imap_host, "imap_host");
        const smtpHost = required(account.smtp_host, "smtp_host");
        validHost(imapHost); validHost(smtpHost);
        const imapPort = validPort(account.imap_port, "IMAP port");
        const smtpPort = validPort(account.smtp_port, "SMTP port");
        const syncDays = [7, 30, 90].includes(Number(account.sync_window_days)) ? Number(account.sync_window_days) : 30;
        const providerMetadata = {
          username,
          imap_host: imapHost,
          imap_port: imapPort,
          imap_tls: account.imap_tls !== false,
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_tls_mode: account.smtp_tls_mode === "starttls" ? "starttls" : "tls",
        };
        const { data: existing, error: lookupError } = await admin.from("mail_accounts").select("id")
          .eq("organization_id", organizationId).eq("user_id", user.id).eq("provider_key", "imap_smtp")
          .ilike("email_address", emailAddress).maybeSingle();
        if (lookupError) throw lookupError;
        const patch = {
          organization_id: organizationId, user_id: user.id, provider_key: "imap_smtp",
          email_address: emailAddress, display_name: String(account.display_name || "").trim(),
          status: "pending", sync_window_days: syncDays, provider_metadata: providerMetadata,
          updated_at: new Date().toISOString(),
        };
        const saved = existing
          ? await admin.from("mail_accounts").update(patch).eq("id", existing.id).select("id").single()
          : await admin.from("mail_accounts").insert(patch).select("id").single();
        if (saved.error || !saved.data) throw saved.error || new Error("Unable to save mailbox");
        const encrypted = await encrypt(password);
        const { error: secretError } = await admin.from("mail_account_credentials").upsert({
          account_id: saved.data.id, password_ciphertext: encrypted.ciphertext,
          password_iv: encrypted.iv, updated_at: new Date().toISOString(),
        }, { onConflict: "account_id" });
        if (secretError) throw secretError;
        await audit(existing ? "mail_account.updated" : "mail_account.created", saved.data.id, { provider_key: "imap_smtp" });
        return json({ success: true, account_id: saved.data.id });
      }
      case "set_default_account": {
        const accountId = required(body.account_id, "account_id");
        const { data: target, error: targetError } = await admin.from("mail_accounts").select("id")
          .eq("id", accountId).eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
        if (targetError || !target) return json({ error: "Mailbox not found" }, 404);
        const { error: clearError } = await admin.from("mail_accounts").update({ is_default: false })
          .eq("organization_id", organizationId).eq("user_id", user.id);
        if (clearError) throw clearError;
        const { error } = await admin.from("mail_accounts").update({ is_default: true, updated_at: new Date().toISOString() }).eq("id", accountId);
        if (error) throw error;
        await audit("mail_account.default_changed", accountId);
        return json({ success: true });
      }
      case "update_sync_window": {
        const accountId = required(body.account_id, "account_id");
        const days = Number(body.sync_window_days);
        if (![7, 30, 90].includes(days)) throw new Error("sync_window_days must be 7, 30, or 90");
        const { error } = await admin.from("mail_accounts").update({ sync_window_days: days, updated_at: new Date().toISOString() })
          .eq("id", accountId).eq("organization_id", organizationId).eq("user_id", user.id);
        if (error) throw error;
        await audit("mail_account.sync_window_updated", accountId, { sync_window_days: days });
        return json({ success: true });
      }
      case "remove_account": {
        const accountId = required(body.account_id, "account_id");
        const { error } = await admin.from("mail_accounts").delete()
          .eq("id", accountId).eq("organization_id", organizationId).eq("user_id", user.id);
        if (error) throw error;
        await audit("mail_account.removed", accountId);
        return json({ success: true });
      }
      default: return json({ error: "Unsupported action" }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 400);
  }
});
