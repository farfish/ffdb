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


CREATE OR REPLACE FUNCTION fn_version_increment() RETURNS TRIGGER AS
$BODY$
BEGIN
    SELECT COALESCE(MAX(d.version), 0) + 1
      INTO NEW.version
      FROM document d
     WHERE d.template_name = NEW.template_name
       AND d.document_name = NEW.document_name;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_version_increment ON document;
CREATE TRIGGER trg_version_increment
  BEFORE INSERT ON document
      FOR EACH ROW
       EXECUTE PROCEDURE fn_version_increment();


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
       EXECUTE PROCEDURE fn_document_notify();


COMMIT;
