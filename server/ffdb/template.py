import json
import os.path

import rpy2
import rpy2.robjects as robjects
import rpy2.rinterface
from rpy2.rinterface_lib import openrlib


# Encode input function
encode_inputs = robjects.r('''function (fn, json_string) {
    convert_ffdb_doc <- function (json_string) {
        # Convert a raw JSON FFDB document into proper data.frame's
        json_df_to_ffdbdoc <- function (json_df) {
            to_numeric_or_char <- function (l) {
                withCallingHandlers((function (m) {
                    withRestarts(
                        as.numeric(m),
                        as_char_restart = as.character)
                })(l), warning = function (w) {
                    invokeRestart('as_char_restart', l)
                })
            }

            # Take a FFDB data.frame structure and convert it into R
            do.call(data.frame, c(list(
                    row.names = json_df[['_headings']]$values,
                    stringsAsFactors = FALSE
                ), lapply(json_df[json_df[['_headings']]$fields], to_numeric_or_char)))
        }

        out <- jsonlite::fromJSON(json_string)
        out <- lapply(out, json_df_to_ffdbdoc)
        return(out)
    }

    tryCatch({
        object <- fn(convert_ffdb_doc(json_string))

        tf <- tempfile(fileext = ".rds")
        on.exit(unlink(tf))
        saveRDS(object, file = tf, compress = FALSE)
        list(
            digest = digest::sha1(object),
            rdata = readBin(tf, "raw", n = file.info(tf)$size))
    }, error = function (e) {
        list(error = e)
    })
}''')

# Read all template input functions
TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'template')

for root, dirs, files in os.walk(TEMPLATE_DIR):
    if 'model_input.R' in files:
        robjects.r['source'](os.path.join(root, 'model_input.R'), chdir=True)


def template_model_inputs(template_name, ffdb_doc):
    '''
    Generate model inputs for a given doc
    Returns a dict of the form: {
        "model_name": {
            "digest": (unique digest of model input),
            "data": (RDS-serialised bytes for input object),
            "error": (Error that occured turning processing),
            "log": (log entries generated whilst processing),
        }
    }
    '''
    buf = []

    def console_callback(str):
        buf.append(str)

    model_inputs = {}
    with openrlib.rlock:
        try:
            template_fns = robjects.r[template_name]
        except KeyError:
            # Nothing to do
            return {}

        # Generate model inputs and their digests
        consolewrite_print_orig = rpy2.rinterface_lib.callbacks.consolewrite_print
        consolewrite_warnerror_orig = rpy2.rinterface_lib.callbacks.consolewrite_warnerror
        try:
            rpy2.rinterface_lib.callbacks.consolewrite_print = console_callback
            rpy2.rinterface_lib.callbacks.consolewrite_warnerror = console_callback

            for model_name, model_input_fn in template_fns.items():
                buf.clear()
                # Add output (as regular dict not R list)
                r_inputs = encode_inputs(model_input_fn, json.dumps(ffdb_doc))

                model_inputs[model_name] = dict(log="".join(buf))
                for i, n in enumerate(r_inputs.names):
                    if n == 'rdata':
                        model_inputs[model_name][n] = bytes(r_inputs[i])
                    else:
                        model_inputs[model_name][n] = str(r_inputs[i][0])
        finally:
            rpy2.rinterface_lib.callbacks.consolewrite_print = consolewrite_print_orig
            rpy2.rinterface_lib.callbacks.consolewrite_warnerror = consolewrite_warnerror_orig
    return model_inputs
