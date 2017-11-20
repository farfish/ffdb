"use strict";
/*jslint todo: true, regexp: true, browser: true, unparam: true, plusplus: true, bitwise: true */
/*global Promise, Blob */
var Handsontable = require('handsontable');
var XLSX = require('xlsx');
var FileSaver = require('file-saver');
var jQuery = require('jquery/dist/jquery.slim.js');
jQuery = require('select2')(jQuery);

function sequence(min, max) {
    var i, out = [];

    if (min > max) {
        throw new Error("Minimum (" + min + ") should be smaller than maximum (" + max + ")");
    }

    for (i = min; i <= max; i++) {
        out.push(i);
    }

    return out;
}

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

function ListDimension(t) { this.values = t.values; }
ListDimension.prototype.parameterHtml = function () { return ""; };
ListDimension.prototype.headers = function () { return this.values; };
ListDimension.prototype.minCount = function () { return this.values.length; };
ListDimension.prototype.maxCount = function () { return this.values.length; };

function YearDimension(t) {
    this.min = t.min;
    this.max = t.max;
    this.initial = t.initial || [];
    this.overall_min = t.overall_min || 1900;
    this.overall_max = t.overall_max || 2050;
}
YearDimension.prototype.parameterHtml = function () {
    return [
        '<label>Start year: <input type="number" name="year_start" min="' + this.overall_min + '" max="' + this.overall_max + '" step="1" value="' + this.min + '" /></label>',
        '<label>End year: <input type="number" name="year_end" min="' + this.overall_min + '" max="' + this.overall_max + '" step="1" value="' + this.max + '" /></label>',
    ].join("\n");
};
YearDimension.prototype.headers = function () { return this.initial.concat(sequence(this.min, this.max)); };
YearDimension.prototype.minCount = function () { return this.initial.length + this.max - this.min; };
YearDimension.prototype.maxCount = function () { return this.initial.length + this.max - this.min; };
YearDimension.prototype.update = function (paramEl, hot, e) {
    var oldHeaders, newHeaders,
        startEl = paramEl.querySelector("input[name=year_start]"),
        endEl = paramEl.querySelector("input[name=year_end]");

    // make sure other end of range is configured appropriately
    if (e.target.id === startEl.id) {
        endEl.min = startEl.value;
        if (endEl.value < endEl.min) {
            endEl.value = endEl.min;
        }
    } else if (e.target.id === endEl.id) {
        startEl.max = endEl.value;
        if (startEl.value > startEl.max) {
            startEl.value = startEl.max;
        }
    }
    this.min = parseInt(startEl.value, 10);
    this.max = parseInt(endEl.value, 10);

    // Work out which headers are missing
    newHeaders = this.headers();
    oldHeaders = hot.getColHeader();

    // Add/remove items to bottom until they line up
    hot.updateSettings({
        minCols: this.initial.length,
        maxCols: newHeaders.length,
    });
    while (true) {
        if (oldHeaders[this.initial.length] > newHeaders[this.initial.length]) {
            // Bottom is higher than we need, add one smaller
            oldHeaders.splice(this.initial.length, 0, oldHeaders[this.initial.length] - 1);
            hot.alter('insert_col', this.initial.length);
        } else if (oldHeaders[this.initial.length] < newHeaders[this.initial.length]) {
            // Bottom is smaller than we need, remove one
            oldHeaders.splice(this.initial.length, 1);
            hot.alter('remove_col', this.initial.length);
        } else if (oldHeaders[oldHeaders.length - 1] < newHeaders[newHeaders.length - 1]) {
            // Top is smaller than we need, add one
            oldHeaders.push(oldHeaders[oldHeaders.length - 1] + 1);
            hot.alter('insert_col', oldHeaders.length);
        } else if (oldHeaders[oldHeaders.length - 1] > newHeaders[newHeaders.length - 1]) {
            // Top is bigger than we need, remove one
            oldHeaders.pop();
            hot.alter('remove_col', oldHeaders.length);
        } else {
            // We're done
            break;
        }

        hot.updateSettings({
            colHeaders: oldHeaders,
        });
    }
};

function BinsDimension(t) {
    this.count = t.count;
    this.overall_max = t.overall_max || 1000;
}
BinsDimension.prototype.parameterHtml = function () {
    return [
        '<label>Bins: <input type="number" name="bin_count" min="0" max="' + this.overall_max + '" step="1" value="' + this.count + '" /></label>',
    ].join("\n");
};
BinsDimension.prototype.headers = function () { return sequence(1, this.count); };
BinsDimension.prototype.minCount = function () { return this.count; };
BinsDimension.prototype.maxCount = function () { return this.count; };
BinsDimension.prototype.update = function (paramEl, hot, e) {
    var oldHeaders, newHeaders,
        countEl = paramEl.querySelector("input[name=bin_count]");

    this.count = parseInt(countEl.value, 10);

    // Work out which headers are missing
    newHeaders = this.headers();

    // Add/remove items to bottom until they line up
    hot.updateSettings({
        minCols: 0,
        maxCols: newHeaders.length,
    });
    while (true) {
        oldHeaders = hot.getColHeader();

        if (oldHeaders[0] > newHeaders[0]) {
            // Bottom is higher than we need, add one smaller
            oldHeaders.unshift(oldHeaders[0] - 1);
            hot.alter('insert_col', 0);
        } else if (oldHeaders[0] < newHeaders[0]) {
            // Bottom is smaller than we need, remove one
            oldHeaders.shift();
            hot.alter('remove_col', 0);
        } else if (oldHeaders[oldHeaders.length - 1] < newHeaders[newHeaders.length - 1]) {
            // Top is smaller than we need, add one
            oldHeaders.push(oldHeaders[oldHeaders.length - 1] + 1);
            hot.alter('insert_col', oldHeaders.length);
        } else if (oldHeaders[oldHeaders.length - 1] > newHeaders[newHeaders.length - 1]) {
            // Top is bigger than we need, remove one
            oldHeaders.pop();
            hot.alter('remove_col', oldHeaders.length);
        } else {
            // We're done
            break;
        }

        hot.updateSettings({
            colHeaders: oldHeaders,
        });
    }
};

function get_dimension(t) {
    return new ({
        list: ListDimension,
        year: YearDimension,
        bins: BinsDimension,
    }[t.type])(t);
}

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

jQuery("select.select2").select2({tags: true});
