-- 1. No Dashboard, crie seu usuário em Authentication > Users antes de executar este arquivo.
-- 2. Substitua UUID_DO_ADMIN pelo UUID desse usuário em TODAS as ocorrências abaixo.
-- O UUID é uma identidade definida pelo Supabase Auth, não um valor fornecido pelo navegador.

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 90),
  institution text not null check (char_length(institution) between 1 and 70),
  category text not null default 'curso' check (category in ('curso', 'evento', 'outro')),
  completed_month text,
  certificate_url text,
  note text check (char_length(note) <= 180),
  image_path text,
  created_at timestamptz not null default now()
);

alter table public.certificates enable row level security;
revoke all on public.certificates from anon, authenticated;
grant select on public.certificates to anon, authenticated;
grant insert, update, delete on public.certificates to authenticated;

create policy "Certificados são públicos para leitura"
  on public.certificates for select to anon, authenticated using (true);
create policy "Só o administrador adiciona certificados"
  on public.certificates for insert to authenticated
  with check ((select auth.uid()) = 'e89527d5-71ff-47bb-a4f4-fe4136c63bb4'::uuid);
create policy "Só o administrador edita certificados"
  on public.certificates for update to authenticated
  using ((select auth.uid()) = 'e89527d5-71ff-47bb-a4f4-fe4136c63bb4'::uuid)
  with check ((select auth.uid()) = 'e89527d5-71ff-47bb-a4f4-fe4136c63bb4'::uuid);
create policy "Só o administrador remove certificados"
  on public.certificates for delete to authenticated
  using ((select auth.uid()) = 'e89527d5-71ff-47bb-a4f4-fe4136c63bb4'::uuid);

-- Imagens públicas para exibição no portfólio; upload e remoção apenas pelo administrador.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificate-images', 'certificate-images', true, 4194304,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 4194304,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Só o administrador envia imagens de certificados"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'certificate-images' and (select auth.uid()) = 'e89527d5-71ff-47bb-a4f4-fe4136c63bb4'::uuid);
create policy "Só o administrador atualiza imagens de certificados"
  on storage.objects for update to authenticated
  using (bucket_id = 'certificate-images' and (select auth.uid()) = 'e89527d5-71ff-47bb-a4f4-fe4136c63bb4'::uuid)
  with check (bucket_id = 'certificate-images' and (select auth.uid()) = 'e89527d5-71ff-47bb-a4f4-fe4136c63bb4'::uuid);
create policy "Só o administrador remove imagens de certificados"
  on storage.objects for delete to authenticated
  using (bucket_id = 'certificate-images' and (select auth.uid()) = 'e89527d5-71ff-47bb-a4f4-fe4136c63bb4'::uuid);
