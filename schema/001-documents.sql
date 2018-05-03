BEGIN;


CREATE TABLE IF NOT EXISTS document (
    template_name            TEXT,
    document_name            TEXT,
    version                  INT NOT NULL DEFAULT 1,
    PRIMARY KEY (template_name, document_name, version),

    content                  JSONB NOT NULL
);


COMMIT;
