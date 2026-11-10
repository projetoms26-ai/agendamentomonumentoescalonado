# Implantação das atualizações de atendimento e convite

1. Aplicar `migrations/20261110150000_attendance_history_admin_invites.sql` ao projeto Supabase existente. A migração é aditiva: não altera ou apaga os agendamentos, clientes ou papéis atuais.
2. Implantar a Edge Function `invite-admin` no mesmo projeto Supabase. Ela exige autenticação de um administrador e usa a chave `SUPABASE_SERVICE_ROLE_KEY` somente no lado servidor (fornecida pelo ambiente Supabase).
3. Conferir em Supabase Auth que o endereço de redirecionamento do site Lovable está permitido. O link de convite redireciona para `/auth` no domínio da aplicação.
4. Testar registrar um resultado para um agendamento, confirmar que aparece na conta do cliente associado e aceitar um convite com um endereço de teste antes de liberar para uso.

A permissão `admin` é concedida pelo gatilho no banco somente após a confirmação do e-mail do usuário convidado. A função não oferece cadastro público de administradores.
