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

-- Add input_hashes column
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
                     AND column_name = 'input_hashes') THEN
           ALTER TABLE document
               ADD COLUMN input_hashes JSONB NULL;
       END IF;
   END IF;
END
$do$;

-- Remove input_log column from table_hashes, move to document.
DO
$do$
BEGIN
   IF EXISTS (SELECT 1
                FROM information_schema.tables
               WHERE table_schema = 'public'
                 AND table_name = 'model_output') THEN
       IF EXISTS (SELECT *
                    FROM information_schema.columns
                   WHERE table_schema = 'public'
                     AND table_name = 'model_output'
                     AND column_name = 'input_log') THEN
           ALTER TABLE model_output
               DROP COLUMN input_log;
       END IF;
   END IF;
END
$do$;

COMMIT;
