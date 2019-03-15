"use strict";
/*jslint todo: true, regexp: true, browser: true, unparam: true, plusplus: true, bitwise: true, nomen: true */
/*global Promise, Blob */
var XLSX = require('xlsx');
var file_loader = require('./file_loader.js');
var FileSaver = require('file-saver');
var jQuery = require('jquery');
var Hodataframe = require('hodf');
var table_templates = require('./templates.js').table_templates;
var selectize = require('selectize');
var alert = require('alerts');
alert.transitionTime = 300;

var hodfs, file_select, template_select;

/** Wrap a promise, enabling alerts and loading spinner */
function do_work(p) {
    document.querySelector('body').classList.add('loading');

    return p.then(function () {
        document.querySelector('body').classList.remove('loading');
    }).catch(function (err) {
        document.querySelector('body').classList.remove('loading');
        alert(err, {className: "error"});
        throw err;
    });
}

function isDirty(dirty) {
    var el = document.querySelector("#options button[name=save]");

    if (dirty !== undefined) {
        el.disabled = !dirty;
    }
    return !el.disabled;
}

/**
  * Given a template name and input data.frame
  * Generate handsondataframe objects
  */
function generate_hodfs(tmpls, input_dfs) {
    var tbl = document.getElementById("tbl");

    tbl.innerHTML = "";
    isDirty(false);
    document.querySelector("#options button[name=import]").disabled = false;
    document.querySelector("#options button[name=export]").disabled = false;

    return tmpls.map(function (tmpl) {
        var out, el = document.createElement("div");

        tbl.appendChild(el);
        out = new Hodataframe(tmpl, el, (input_dfs || {})[tmpl.name]);

        // Notify surrounding code on changes
        out.hot.addHook('afterChange', function (changes, source) {
            if (source === 'edit') {
                isDirty(true);
            }
        });
        out.hot.addHook('afterCreateCol', isDirty.bind(null, true));
        out.hot.addHook('afterCreateRow', isDirty.bind(null, true));
        out.hot.addHook('afterRemoveCol', isDirty.bind(null, true));
        out.hot.addHook('afterRemoveRow', isDirty.bind(null, true));

        return out;
    });
}

/**
  * Save content. Turn it into a data.frame alike of:
  * {
  *     _headings: {
  *         fields: [(field_name), (field_name), (field_name)],
  *         values: [(value_name), ...],
  *     }
  *     field_name: [values....],
  * }
  */
document.querySelector("#options button[name=save]").addEventListener('click', function (e) {
    var sheets = {},
        filename = document.querySelector("#options *[name=filename]").value;

    hodfs.map(function (hodf, tableIndex) {
        sheets[hodf.name] = hodf.getDataFrame();
    });

    do_work(window.fetch('/api/doc/dlmtool/' + encodeURIComponent(filename), {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(sheets),
    }).then(function (response) {
        return response.json();
    }).then(function (data) {
        file_select.updateOption(data.document_name, {
            value: data.document_name,
            text: data.document_name + " (v" + data.version + ")",
        });
        alert("Saved", { className: "success", timeout: 3000 });
        isDirty(false);
    }));
});

document.querySelector("#options button[name=export]").addEventListener('click', function (e) {
    var wb = { SheetNames: [], Sheets: {} },
        filename = document.querySelector("#options *[name=filename]").value;

    function s2ab(s) {
        var i,
            buf = new window.ArrayBuffer(s.length),
            view = new window.Uint8Array(buf);

        for (i = 0; i < s.length; ++i) {
            view[i] = s.charCodeAt(i) & 0xFF;
        }

        return buf;
    }

    if (!filename) {
        window.alert("You must enter a filename in the box above");
        return;
    }

    hodfs.map(function (hodf, tableIndex) {
        wb.SheetNames.push(hodf.name);
        wb.Sheets[hodf.name] = XLSX.utils.aoa_to_sheet(hodf.getAofA());
    });

    FileSaver.saveAs(new Blob(
        [s2ab(XLSX.write(wb, {bookType: 'xlsx', bookSST: true, type: 'binary'}))],
        {type: "application/octet-stream"}
    ), filename + ".xlsx");
});

document.querySelector("#options button[name=import]").addEventListener('click', function (e) {
    file_loader('import-csv', 'array', function (data) {
        var workbook = XLSX.read(new window.Uint8Array(data), {type: 'array'});

        hodfs = hodfs.map(function (hodf, tableIndex) {
            var sheet = workbook.Sheets[hodf.name];

            // Replace with sheet data if available, or empty it
            return hodf.replace(sheet ? XLSX.utils.sheet_to_json(sheet, {header: 1}) : {});
        });
    });
});

template_select = jQuery("select[name=template]").selectize({
    preload: true,
    loadThrottle: null,
    load: function (query, callback) {
        var templates = Object.keys(table_templates);

        do_work(new Promise(function (resolve) {
            callback(templates.map(function (x) {
                return {
                    value: x,
                    text: x,
                };
            }));
            resolve();
        }).then(function () {
            // Choose first value, trigger change
            this.setValue(templates[0]);
        }.bind(this)));
    },
    onChange: function (value) {
        if (this.ffdb_old_value === this.getValue()) {
            return;
        }
        if (isDirty() && !window.confirm("You have unsaved changes, press OK to delete them")) {
            this.setValue(this.ffdb_old_value);
            return;
        }
        this.ffdb_old_value = this.getValue();

        if (window.serverless) {
            // Just show an empty template
            hodfs = generate_hodfs(table_templates[template_select.getValue()], {content: {}});
            return;
        }

        // Trigger file_select to update
        file_select.onSearchChange('');
    },
})[0].selectize;

file_select = jQuery("select[name=filename]").selectize({
    loadThrottle: null,
    load: function (query, callback) {
        return do_work(window.fetch('/api/doc/dlmtool', {
            method: "GET",
        }).then(function (response) {
            return response.json();
        }).then(function (data) {
            callback(data.documents.map(function (x) {
                return {
                    value: x.document_name,
                    text: x.document_name + " (v" + x.latest + ")",
                };
            }));
        }));
    },
    onChange: function (value) {
        if (this.ffdb_old_value === this.getValue()) {
            return;
        }
        if (isDirty() && !window.confirm("You have unsaved changes, press OK to delete them")) {
            this.setValue(this.ffdb_old_value);
            return;
        }
        this.ffdb_old_value = this.getValue();

        do_work(window.fetch('/api/doc/' + encodeURIComponent(template_select.getValue()) + '/' + encodeURIComponent(file_select.getValue()), {
            method: "GET",
        }).then(function (response) {
            if (response.status === 404) {
                // We're starting a new document
                return {content: {}};
            }
            return response.json();
        }).then(function (data) {
            hodfs = generate_hodfs(table_templates[template_select.getValue()], data.content);
        }));
    },
    create: true,
})[0].selectize;

// Hide controls that aren't relevant
if (window.serverless) {
    document.querySelector("#options button[name=save]").style.display = "none";
    document.querySelector("label.filename").style.display = "none";
}
