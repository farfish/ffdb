BEGIN;


CREATE TABLE IF NOT EXISTS document (
    template_name            TEXT,
    document_name            TEXT,
    version                  INT NOT NULL DEFAULT 1,
    PRIMARY KEY (template_name, document_name, version),

    author                   TEXT,
    content                  JSONB NOT NULL,
    input_hashes             JSONB NULL
);
COMMENT ON COLUMN document.input_hashes IS 'Lookup dict of (model_name) -> (model_output.input_hash) for document';


CREATE OR REPLACE FUNCTION fn_document_notify() RETURNS TRIGGER AS
$BODY$
BEGIN
    PERFORM pg_notify('document', NEW.template_name || '/' || NEW.document_name || '/' || NEW.version);
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_document_notify ON document;
CREATE TRIGGER trg_document_notify
  AFTER INSERT ON document
      FOR EACH ROW
       EXECUTE FUNCTION fn_document_notify();


COMMIT;
