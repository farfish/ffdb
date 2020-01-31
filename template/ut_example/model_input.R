generate_output <- function (tbl_name, tbl) {
    if ('print' %in% names(tbl)) {
        writeLines(c(paste(tbl_name,"has"), "Some lines", tbl$print))
    }
    if ('err' %in% names(tbl)) {
        stop(paste(tbl_name, "went wrong!"), tbl$err)
    }
}

ut_example <- list(
    model_a = function(doc) {
        generate_output("A", doc$a)
        doc$a
    },
    model_b = function(doc) {
        generate_output("B", doc$b)
        doc$b
    })
