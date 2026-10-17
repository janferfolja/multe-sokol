-- Esordio is now a MERENDA penalty instead of a KASA.
-- The kind lives on the fine type, so already-given esordio multe count as merende too.
update public.fine_types set kind = 'merenda', price = null where name = 'Esordio';
