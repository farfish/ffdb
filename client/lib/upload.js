"use strict";
/*jslint todo: true, regexp: true, browser: true, unparam: true, plusplus: true, bitwise: true, nomen: true */
/*global Promise, Blob */
var XLSX = require('xlsx');
var file_loader = require('./file_loader.js');
var FileSaver = require('file-saver');
var jQuery = require('jquery');
var Hodataframe = require('hodf');
var table_templates = require('./templates.js').table_templates;
var queryString = require('query-string');
var selectize = require('selectize');
var alert = require('alerts');
alert.transitionTime = 300;

var hodfs, file_select;

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

function api_fetch(url, args) {
    return window.fetch(url, args).then(function (response) {
        if (response.status !== 200) {
            return response.json().then(function (data) {
                if (data.redirect) {
                    window.document.location = data.redirect;
                }
                throw new Error(data.error + ": " + data.message);
            });
        }
        return response;
    }).then(function (response) {
        return response.json();
    });
}

function parse_location(loc) {
    var out = queryString.parse(loc.search);

    out.template = out.template || 'dlmtool';
    out.filename = out.filename || '';
    return out;
}

function replace_location(new_state) {
    var new_search;

    if (!new_state.template) {
        new_state.template = parse_location(window.location).template;
    }
    new_search = '?' + queryString.stringify(new_state);

    window.history.replaceState("", "", new_search);
    window.onpopstate();
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
        filename = file_select.getValue();

    if (!filename) {
        alert("You must enter a document name first", { className: "warn", timeout: 3000 });
        file_select.focus();
        return;
    }

    hodfs.map(function (hodf, tableIndex) {
        sheets[hodf.name] = hodf.getDataFrame();
    });

    do_work(api_fetch('/api/doc/dlmtool/' + encodeURIComponent(filename), {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(sheets),
    }).then(function (data) {
        file_select.updateOption(data.document_name, {
            value: data.document_name,
            text: data.document_name + " (v" + data.version + ")",
        });
        alert("Saved", { className: "success", timeout: 3000 });
        isDirty(false);
        replace_location({
            filename: filename,
        });
    }));
});

document.querySelector("#options button[name=export]").addEventListener('click', function (e) {
    var wb = { SheetNames: [], Sheets: {} },
        filename = file_select.getValue();

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
        alert("You must enter a document name first", { className: "warn", timeout: 3000 });
        file_select.focus();
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

        isDirty(true);
    });
});

document.querySelector("#options button[name=new]").addEventListener('click', function (e) {
    if (isDirty() && !window.confirm("You have unsaved changes, press OK to delete them")) {
        return;
    }

    replace_location({
        filename: '',
    });
});

file_select = jQuery("select[name=filename]").selectize({
    persist: false,
    createOnBlur: true,
    onChange: function (value) {
        if (!value || this.options[value].new_option) {
            // Ignore any newly-created items, wait for save to be pressed
            return;
        }

        if (this.ffdb_old_value === this.getValue()) {
            return;
        }
        if (isDirty() && !window.confirm("You have unsaved changes, press OK to delete them")) {
            this.setValue(this.ffdb_old_value, true);
            return;
        }
        this.ffdb_old_value = this.getValue();

        replace_location({
            filename: file_select.getValue(),
        });
    },
    create: function (input) {
        return {
            value: input,
            text: input + ' (new)',
            new_option: true,
        };
    },
})[0].selectize;

window.onpopstate = function () {
    var state = parse_location(window.location);

    file_select.setValue(state.filename, true);

    return do_work(Promise.resolve().then(function () {
        if (!state.filename) {
            return {content: {}};
        }

        return api_fetch('/api/doc/' + encodeURIComponent(state.template) + '/' + encodeURIComponent(state.filename), {
            method: "GET",
        });
    }).then(function (data) {
        hodfs = generate_hodfs(table_templates[state.template], data.content);
    }));
};

document.addEventListener('DOMContentLoaded', function (e) {
    var state = parse_location(window.location);

    return do_work(api_fetch('/api/doc/' + state.template, {
        method: "GET",
    }).then(function (data) {
        data.documents.forEach(function (x) {
            file_select.addOption({
                value: x.document_name,
                text: x.document_name + " (v" + x.latest + ")",
            });
        });
        file_select.refreshOptions(false);
    })).then(function () {
        return window.onpopstate();
    });
});

// Hide controls that aren't relevant
if (window.serverless) {
    document.querySelector("#options button[name=save]").style.display = "none";
    document.querySelector("label.filename").style.display = "none";
}
