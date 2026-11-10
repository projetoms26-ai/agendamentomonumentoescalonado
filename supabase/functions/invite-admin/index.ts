import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return Response.json({ error: "Server configuration missing" }, { status: 500, headers: cors });
  const auth = req.headers.get("Authorization");
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  const caller = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  const { data: allowed, error: roleError } = await caller.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
  if (roleError || !allowed) return Response.json({ error: "Forbidden" }, { status: 403, headers: cors });
  let body: { email?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: cors }); }
  const email = body.email?.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Informe um endereço de e-mail válido" }, { status: 400, headers: cors });
  }
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { error: insertError } = await admin.from("pending_admin_invites").insert({ email, invited_by: userData.user.id });
  if (insertError) return Response.json({ error: insertError.code === "23505" ? "Já existe um convite pendente para este e-mail" : "Não foi possível registrar o convite" }, { status: 400, headers: cors });
  const origin = req.headers.get("origin");
  if (!origin) { await admin.from("pending_admin_invites").delete().eq("email", email).is("accepted_at", null); return Response.json({ error: "Origin header required" }, { status: 400, headers: cors }); }
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin.replace(/\/$/, "")}/auth` });
  if (inviteError) {
    await admin.from("pending_admin_invites").delete().eq("email", email).is("accepted_at", null);
    return Response.json({ error: inviteError.message }, { status: 400, headers: cors });
  }
  return Response.json({ ok: true }, { headers: cors });
});
