"use strict";
/*jslint todo: true, regexp: true, browser: true, unparam: true, plusplus: true, bitwise: true */
/*global Promise, Blob */
var Handsontable = require('handsontable');
var XLSX = require('xlsx');
var FileSaver = require('file-saver');
var jQuery = require('jquery/dist/jquery.slim.js');
var get_dimension = require('./dimensions.js').get_dimension;
jQuery = require('select2')(jQuery);

var tableTemplate = [
    {
        name: "constants",
        title: "Constants",
        orientation: "vertical",
        fields: {type: "list", values: [
            "Data source type", // i.e. where the data came from TODO: vocab?
            "Data source description",
            "Duration t",  // i.e. number columns for templateCatch
            "Average catch over time t", // Mean of catch
            "Depletion over time t",
            "M",
            "FMSY/M",
            "BMSY/B0",
            "MSY",
            "BMSY",
            "Length at 50% maturity",
            "Length at 95% maturity",
            "Length at first capture",
            "Length at full selection",
            "Current stock depletion",
            "Current stock abundance",
            "Von Bertalanffy K parameter",
            "Von Bertalanffy Linf parameter",
            "Von Bertalanffy t0 parameter",
            "Length-weight parameter a",
            "Length-weight parameter b",
            "Steepness",
            "Maximum age",
            "CV Catch",
            "CV Depletion over time t",
            "CV Average catch over time t",
            "CV Abundance index",
            "CV M",
            "CV FMSY/M",
            "CV BMSY/B0",
            "CV current stock depletion",
            "CV current stock abundance",
            "CV von B. K parameter",
            "CV von B. Linf parameter",
            "CV von B. t0 parameter",
            "CV Length at 50% maturity",
            "CV Length at first capture",
            "CV Length at full selection",
            "CV Length-weight parameter a",
            "CV Length-weight parameter b",
            "CV Steepness",
            "Sigma length composition",
            "Units",
            "Reference OFL",
            "Reference OFL type",
            "MPrec",
            "LHYear",
        ]},
        values: {type: "list", values: ["Value"]},
        params: {rowHeaderWidth: 270},
    },
    {
        name: "catch",
        title: "Catch data",
        orientation: "vertical",
        fields: {type: "list", values: [
            "Catch",
            "Abundance index",
        ]},
        values: {type: 'year', min: 2000, max: 2010},
        params: {rowHeaderWidth: 170},
    },
    {
        name: "caa",
        title: "Catch at age",
        orientation: "horizontal",
        fields: {type: "bins", count: 10},
        values: {type: "year", min: 2000, max: 2010},
    },
    {
        name: "cal",
        title: "Catch at length",
        orientation: "horizontal",
        fields: {type: "bins", count: 10},
        values: {type: "year", min: 2000, max: 2010, initial: ["Min Length"]},
        params: {rowHeaderWidth: 100},
    },
];

var tbl = document.getElementById("tbl");

var hots = tableTemplate.map(function (tmpl) {
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

document.querySelector("#options button[name=save]").addEventListener('click', function (e) {
    var wb = { SheetNames: [], Sheets: {} },
        filename = document.querySelector("#options *[name=filename]").value;

    hots.map(function (hot, tableIndex) {
        var i,
            data = hot.getData(),
            tmpl = tableTemplate[tableIndex],
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
            tmpl = tableTemplate[tableIndex],
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

jQuery("select.select2[name=template]").select2({});

jQuery("select.select2[name=filename]").select2({
    ajax: {
        url: '/api/doc/dlmtool',
        dataType: 'json',
        processResults: function (data) {
            return { results: data.documents.map(function(x) {
                return {
                    id: x[0],
                    text: x[0] + " (v" + x[1] + ")",
                };
            }) };
        },
    },
    tags: true,
});
