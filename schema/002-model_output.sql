BEGIN;


CREATE TABLE IF NOT EXISTS model_output (
    model_name               TEXT,
    input_hash               TEXT,
    PRIMARY KEY (model_name, input_hash),

    input_rdata              BYTEA,
    input_log                TEXT,
    output_path              TEXT NULL,
    output_log               TEXT
);
COMMENT ON TABLE model_output IS 'model input --> model output';
COMMENT ON COLUMN model_output.input_hash IS 'Unique hash of input_rdata object';
COMMENT ON COLUMN model_output.input_log IS 'Output/warnings whilst generating input';
COMMENT ON COLUMN model_output.output_path IS 'Absolute path to output file';
COMMENT ON COLUMN model_output.output_log IS 'Output/warnings whilst generating output';

CREATE OR REPLACE FUNCTION fn_model_output_notify() RETURNS TRIGGER AS
$BODY$
BEGIN
    PERFORM pg_notify('model_output', NEW.model_name || '/' || NEW.input_hash);
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_model_output_notify ON model_output;
CREATE TRIGGER trg_model_output_notify
  AFTER INSERT ON model_output
      FOR EACH ROW
       EXECUTE PROCEDURE fn_model_output_notify();


COMMIT;
