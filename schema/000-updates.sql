BEGIN;


-- Add author column
DO
$do$
BEGIN
   IF EXISTS (SELECT 1
                FROM information_schema.tables
               WHERE table_schema = 'public'
                 AND table_name = 'document') THEN
       IF NOT EXISTS (SELECT *
                    FROM information_schema.columns
                   WHERE table_schema = 'public'
                     AND table_name = 'document'
                     AND column_name = 'author') THEN
           ALTER TABLE document
               ADD COLUMN author TEXT;
       END IF;
   END IF;
END
$do$;


COMMIT;
