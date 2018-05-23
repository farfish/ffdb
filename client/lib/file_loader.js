"use strict";
/*global document, FileReader */

/**
  * Prompt user to upload a file, using a hidden file-input dialog
  * - name: Unique name for this uploader (added as a class)
  * - encoding: File encoding to use: binary, array (ArrayBuffer), or "utf-8".
  * - fn: Function to call once upload finishes, first argument is content read
  */
module.exports = function file_loader(name, encoding, fn) {
    var el = document.querySelector('span.file_loader.' + name);

    // Already done this once, clear up the old element
    if (el) {
        document.body.removeChild(el);
        el = null;
    }

    // Create input element
    el = document.createElement('SPAN');
    el.innerHTML = '<input type="file" style="visibility: hidden; position: absolute; top: 0px; left: 0px; height: 0px; width: 0px;">';
    el = el.children[0];
    document.body.appendChild(el);

    // Listen to genuine file selection
    el.addEventListener('change', function (e) {
        var reader = new FileReader();

        reader.onload = function (e) {
            fn.call(this, e.target.result);
        };

        // Initiate file reading
        if (encoding === "binary") {
            reader.readAsBinaryString(e.target.files[0]);
        } else if (encoding === "array") {
            reader.readAsArrayBuffer(e.target.files[0]);
        } else {
            reader.readAsText(e.target.files[0], encoding || "utf-8");
        }
    });

    // Trigger file selection
    el.click();
};
