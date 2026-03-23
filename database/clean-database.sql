-- Remove all demo songs from the database
DELETE FROM public.songs;

-- Reset the sequence counter
ALTER SEQUENCE songs_id_seq RESTART WITH 1;
