BEGIN;


-- Add author column
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT *
                FROM information_schema.columns
               WHERE table_schema = 'public'
                 AND table_name = 'document'
                 AND column_name = 'author') THEN
       ALTER TABLE document
           ADD COLUMN author TEXT;
   END IF;
END
$do$;


COMMIT;
