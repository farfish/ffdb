"use strict";
/*jslint todo: true, regexp: true, browser: true, unparam: true, plusplus: true, bitwise: true */
/*global Promise, Blob */
var Handsontable = require('handsontable');
var XLSX = require('xlsx');
var FileSaver = require('file-saver');
var jQuery = require('jquery/dist/jquery.slim.js');
var get_dimension = require('./dimensions.js').get_dimension;
var table_templates = require('./templates.js').table_templates;
jQuery = require('select2')(jQuery);

var hots;

/**
  * Given a template name and input data.frame
  * Generate handsontable objects
  */
function generate_hots(template_name, input_df) {
    var tbl = document.getElementById("tbl"), out;

    out = table_templates[template_name].map(function (tmpl) {
        var hot, hotParams, cols, rows,
            el = document.createElement("div");

        tbl.appendChild(el);

        cols = get_dimension(tmpl.orientation === 'horizontal' ? tmpl.fields : tmpl.values);
        rows = get_dimension(tmpl.orientation === 'horizontal' ? tmpl.values : tmpl.fields);

        el.innerHTML = [
            '<h3>' + (tmpl.title || tmpl.name) + '</h3>',
            '<div class="parameters">',
            '<span class="cols">' + cols.parameterHtml() + '</span>',
            '<span class="rows">' + rows.parameterHtml() + '</span>',
            '</div>',
            '<div class="hot"></div>',
        ].join("\n");

        hotParams = JSON.parse(JSON.stringify(tmpl.params || {}));
        hotParams.stretchH = 'all';
        hotParams.autoWrapRow = true;
        hotParams.rowHeaders = rows.headers();
        hotParams.minRows = rows.minCount();
        hotParams.maxRows = rows.maxCount();
        hotParams.colHeaders = cols.headers();
        hotParams.minCols = cols.minCount();
        hotParams.maxCols = cols.maxCount();
        hot = new Handsontable(el.querySelector('.hot'), hotParams);

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

    out.tmpl = table_templates[template_name];
    return out;
}

document.querySelector("#options button[name=save]").addEventListener('click', function (e) {
    var wb = { SheetNames: [], Sheets: {} },
        filename = document.querySelector("#options *[name=filename]").value;

    hots.map(function (hot, tableIndex) {
        var i,
            data = hot.getData(),
            tmpl = tableTemplate[tableIndex],
            tmpl = table_templates.dlmtool[tableIndex],
            rowHeaders = hot.getRowHeader();

        // Add column header
        data.unshift(hot.getColHeader());

        // Add row headers
        for (i = 0; i < data.length; i++) {
            data[i].unshift(i > 0 ? rowHeaders[i - 1] : null);
        }

        wb.SheetNames.push(tmpl.name);
        wb.Sheets[tmpl.name] = XLSX.utils.aoa_to_sheet(data);
    });

    window.fetch('/api/doc/dlmtool/' + encodeURIComponent(filename), {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(wb),
    }).then(function (data) {
        console.log("Saved");
    });
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
            data = hot.getData(),
            tmpl = hots.tmpl,
            rowHeaders = hot.getRowHeader();

        // Add column header
        data.unshift(hot.getColHeader());

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

jQuery("select.select2[name=template]").select2({
}).on('change', function (e) {
    /* Re-generate tables based on selected template */
    hots = generate_hots(e.target.value, {});
}).trigger('change'); /* Generate initial tables on startup */

jQuery("select.select2[name=filename]").select2({
    ajax: {
        url: '/api/doc/dlmtool',
        dataType: 'json',
        processResults: function (data) {
            return { results: data.documents.map(function (x) {
                return {
                    id: x[0],
                    text: x[0] + " (v" + x[1] + ")",
                };
            }) };
        },
    },
    tags: true,
});
