-- Execute este SQL no Supabase para habilitar PDFs no bucket já criado.
-- As políticas de acesso existentes permanecem; só os formatos e limite mudam.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array[
      'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'
    ]
where id = 'certificate-images';
