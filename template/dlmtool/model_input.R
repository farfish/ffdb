library(digest)

source('ffdbclient.R')
source('spicttools.R')

# Generate Digest of DLMTool objects by CSVing first
sha1.Data <- function(x, digits = 14L, zapsmall = 7L, ..., algo = "sha1") {
    tf <- tempfile(fileext = '.csv')
    on.exit(unlink(tf))
    Data2csv(x, file = tf)
    x <- read.csv(tf, header = FALSE, stringsAsFactors = FALSE)

    digest::sha1(x, digits = digits, zapsmall = zapsmall, ..., algo = algo)
}

dlmtool <- list(
    spict_fit = function(doc) ffdbdoc_to_spictstock(dlmtool_fixup(doc)),
    dlm_mp = function(doc) ffdbdoc_to_dlmtool(dlmtool_fixup(doc)))
