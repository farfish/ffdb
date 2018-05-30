"use strict";
/*jslint todo: true, regexp: true, browser: true, unparam: true, plusplus: true, bitwise: true, nomen: true */
/*global Promise, Blob */
var Handsontable = require('handsontable');
var XLSX = require('xlsx');
var file_loader = require('./file_loader.js');
var FileSaver = require('file-saver');
var jQuery = require('jquery');
var get_dimension = require('./dimensions.js').get_dimension;
var table_templates = require('./templates.js').table_templates;
var hot_utils = require('./hot_utils.js');
var selectize = require('selectize');
var alert = require('alerts');
alert.transitionTime = 300;

var hots;

/**
  * Given a template name and input data.frame
  * Generate handsontable objects
  */
function generate_hots(template_name, input_dfs) {
    var tbl = document.getElementById("tbl"), out;

    tbl.innerHTML = "";
    out = table_templates[template_name].map(function (tmpl) {
        var hot, hotParams, cols, rows,
            customData = {},
            el = document.createElement("div"),
            input_df = (input_dfs || {})[tmpl.name] || { _headings: {}};

        tbl.appendChild(el);

        if (tmpl.text) {
            el.innerHTML = tmpl.text;
            return null;
        }

        customData.fields = get_dimension(tmpl.fields, input_df._headings.fields);
        customData.values = get_dimension(tmpl.values, input_df._headings.values);
        cols = tmpl.orientation === 'vertical' ? customData.values : customData.fields;
        rows = tmpl.orientation === 'vertical' ? customData.fields : customData.values;

        el.innerHTML = [
            '<h3>' + (tmpl.title || tmpl.name) + '</h3>',
            (tmpl.description ? '<p>' + tmpl.description + '</p>' : ''),
            '<div class="parameters">',
            '<span class="cols">' + cols.parameterHtml() + '</span>',
            '<span class="rows">' + rows.parameterHtml() + '</span>',
            '</div>',
            '<div class="hot"></div>',
        ].join("\n");

        hotParams = JSON.parse(JSON.stringify(tmpl.params || {}));
        hotParams.stretchH = 'all';
        hotParams.autoWrapRow = true;
        hotParams.rowHeaders = rows.headerHTML();
        hotParams.minRows = rows.minCount();
        hotParams.maxRows = rows.maxCount();
        hotParams.colHeaders = cols.headerHTML();
        hotParams.minCols = cols.minCount();
        hotParams.maxCols = cols.maxCount();
        hotParams.data = input_df._headings.fields ? hot_utils.df_to_aofa(input_df, customData.fields.headers(), customData.values.headers(), tmpl.orientation) : undefined;
        hot = new Handsontable(el.querySelector('.hot'), hotParams);
        hot.customData = customData;

        el.querySelector(".parameters > .cols").addEventListener('change', function (e) {
            cols.update(el.querySelector(".parameters > .cols"), hot, e);
        });

        el.querySelector(".parameters > .rows").addEventListener('change', function (e) {
            rows.update(el.querySelector(".parameters > .rows"), {
               // Return a fake hot object where we map col operations to row
                updateSettings: function (settings) {
                    var newSettings = {};
                    Object.keys(settings).map(function (k) {
                        newSettings[k.replace("Col", "Row").replace("col", "row")] = settings[k];
                    });
                    return hot.updateSettings(newSettings);
                },
                getColHeader: function () {
                    return hot.getRowHeader();
                },
                alter: function (cmd, x, y) {
                    return hot.alter(cmd.replace("_col", "_row"), x, y);
                }
            }, e);
        });

        return hot;
    });

    jQuery('#buttons button').prop('disabled', false);

    out.tmpl = table_templates[template_name];
    return out;
}

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

    hots.map(function (hot, tableIndex) {
        var i,
            data,
            tmpl = hots.tmpl[tableIndex],
            out = { _headings: {} };

        function return_ith_value(row) {
            return row[i];
        }

        if (!tmpl.name) {
            // Ignore informational blocks
            return;
        }
        data = hot.getData();

        out._headings.fields = hot.customData.fields.headers();
        out._headings.values = hot.customData.values.headers();

        // Turn table data into a data.frame-esque object of fields
        for (i = 0; i < out._headings.fields.length; i++) {
            if (tmpl.orientation === "vertical") {
                // Map rows to values
                out[out._headings.fields[i]] = data[i];
            } else {
                // Map columns to values
                out[out._headings.fields[i]] = data.map(return_ith_value);
            }
        }

        sheets[tmpl.name] = out;
    });

    do_work(window.fetch('/api/doc/dlmtool/' + encodeURIComponent(filename), {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(sheets),
    }).then(function (data) {
        alert("Saved", { className: "success", timeout: 3000 });
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

    hots.map(function (hot, tableIndex) {
        var i,
            data,
            rowHeaders,
            colHeaders,
            tmpl = hots.tmpl[tableIndex];

        if (!tmpl.name) {
            // Ignore informational blocks
            return;
        }
        data = hot.getData();
        rowHeaders = hot.customData[tmpl.orientation === 'vertical' ? 'fields' : 'values'].headers();
        colHeaders = hot.customData[tmpl.orientation === 'vertical' ? 'values' : 'fields'].headers();

        // Add column header
        data.unshift(colHeaders);

        // Add row headers
        for (i = 0; i < data.length; i++) {
            data[i].unshift(i > 0 ? rowHeaders[i - 1] : null);
        }

        wb.SheetNames.push(tmpl.name);
        wb.Sheets[tmpl.name] = XLSX.utils.aoa_to_sheet(data);
    });

    FileSaver.saveAs(new Blob(
        [s2ab(XLSX.write(wb, {bookType: 'xlsx', bookSST: true, type: 'binary'}))],
        {type: "application/octet-stream"}
    ), filename + ".xlsx");
});

document.querySelector("#options button[name=import]").addEventListener('click', function (e) {
    file_loader('import-csv', 'array', function (data) {
        var data_dfs = {},
            workbook = XLSX.read(new window.Uint8Array(data), {type: 'array'});

        hots.map(function (hot, tableIndex) {
            var tmpl = hots.tmpl[tableIndex],
                sheet = workbook.Sheets[tmpl.name];

            if (!sheet) {
                return;
            }

            // Convert sheet -> aoa -> df
            data_dfs[tmpl.name] = hot_utils.aofa_to_df(XLSX.utils.sheet_to_json(sheet, {header: 1}), tmpl.orientation);
        });

        // Replace tables with new data
        hots = generate_hots(document.querySelector("select[name=template]").value, data_dfs);
    });
});

jQuery("select[name=template]").selectize({});

jQuery("select[name=filename]").selectize({
    preload: true,
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
    create: true,
}).on('change', function (e) {
    do_work(window.fetch('/api/doc/dlmtool/' + encodeURIComponent(e.target.value), {
        method: "GET",
    }).then(function (response) {
        if (response.status === 404) {
            // We're starting a new document
            return {content: {}};
        }
        return response.json();
    }).then(function (data) {
        hots = generate_hots(document.querySelector("select[name=template]").value, data.content);
    }));
});
