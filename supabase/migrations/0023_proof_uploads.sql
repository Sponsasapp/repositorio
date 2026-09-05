-- 0023 — upload de comprovação de entrega (print) no Storage.
--
-- Reaproveita o bucket público `uploads` (já usado pra avatar/foto do
-- carro), só liberando escrita também na pasta proofs/<uid>/ — cada um só
-- escreve na própria pasta, igual já vale pra avatars/<uid>/.

create policy proofs_insert_own on storage.objects
  for insert
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = 'proofs'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
