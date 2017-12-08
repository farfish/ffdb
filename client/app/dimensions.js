"use strict";
/*jslint todo: true, regexp: true, browser: true, unparam: true, plusplus: true */
/*global Promise */
function sequence(min, max) {
    var i, out = [];

    if (min > max) {
        throw new Error("Minimum (" + min + ") should be smaller than maximum (" + max + ")");
    }

    for (i = min; i <= max; i++) {
        out.push(i.toString());
    }

    return out;
}

function ListDimension(t) { this.values = t.values; }
ListDimension.prototype.parameterHtml = function () { return ""; };
ListDimension.prototype.headers = function () { return this.values; };
ListDimension.prototype.minCount = function () { return this.values.length; };
ListDimension.prototype.maxCount = function () { return this.values.length; };

function YearDimension(t, init_headings) {
    var numeric_headings = (init_headings || []).map(function (x) { return parseInt(x, 10); });

    this.initial = t.initial || [];
    if (this.initial.length > 0) {
        //TODO: Can we trust the initial items to always be there? Bit dodgy
        numeric_headings.splice(0, this.initial.length);
    }
    this.min = numeric_headings.length > 0 ? Math.min.apply(null, numeric_headings) : t.min;
    this.max = numeric_headings.length > 0 ? Math.max.apply(null, numeric_headings) : t.max;
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
YearDimension.prototype.minCount = function () { return this.initial.length + this.max - this.min + 1; };
YearDimension.prototype.maxCount = function () { return this.initial.length + this.max - this.min + 1; };
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

function BinsDimension(t, init_headings) {
    this.count = init_headings ? init_headings.length : t.count;
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

function get_dimension(t, init_headings) {
    return new ({
        list: ListDimension,
        year: YearDimension,
        bins: BinsDimension,
    }[t.type])(t, init_headings);
}
module.exports.get_dimension = get_dimension;
