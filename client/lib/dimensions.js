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

// Parse everything that is a number, ditch anything that didn't parse
function numericItems(arr) {
    return arr.map(Number).filter(function (x) { return !isNaN(x); });
}

function ListDimension(t) { this.values = t.values; }
ListDimension.prototype.parameterHtml = function () { return ""; };
ListDimension.prototype.headers = function () { return this.values.map(function (x) { return x[0]; }); };
ListDimension.prototype.headerHTML = function () { return this.values.map(function (x) { return x[1]; }); };
ListDimension.prototype.minCount = function () { return this.values.length; };
ListDimension.prototype.maxCount = function () { return this.values.length; };

function RangeDimension(t, init_headings) {
    var numeric_headings = numericItems(init_headings || [t.min, t.max]);

    this.initial = t.initial || [];
    this.min = Math.min.apply(null, numeric_headings);
    this.max = Math.max.apply(null, numeric_headings);
    this.overall_min = t.overall_min || 1;
    this.overall_max = t.overall_max || 100;
}
RangeDimension.prototype.parameterHtml = function () {
    return [
        '<label>Min: <input type="number" name="min" min="' + this.overall_min + '" max="' + this.overall_max + '" step="1" value="' + this.min + '" /></label>',
        '<label>Max: <input type="number" name="max" min="' + this.overall_min + '" max="' + this.overall_max + '" step="1" value="' + this.max + '" /></label>',
    ].join("\n");
};
RangeDimension.prototype.headers = function () { return this.initial.concat(sequence(this.min, this.max)); };
RangeDimension.prototype.headerHTML = RangeDimension.prototype.headers;
RangeDimension.prototype.minCount = function () { return this.initial.length + this.max - this.min + 1; };
RangeDimension.prototype.maxCount = function () { return this.initial.length + this.max - this.min + 1; };
RangeDimension.prototype.update = function (paramEl, hot, e) {
    var i, oldHeaders, newHeaders,
        startEl = paramEl.querySelector("input[name=min]"),
        endEl = paramEl.querySelector("input[name=max]");

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

// YearDimension inherits RangeDimension
function YearDimension(t, init_headings) {
    RangeDimension.apply(this, arguments);

    this.overall_min = t.overall_min || 1900;
    this.overall_max = t.overall_max || 2050;
}
YearDimension.prototype = Object.create(RangeDimension.prototype);
YearDimension.prototype.parameterHtml = function () {
    return [
        '<label>Start year: <input type="number" name="min" min="' + this.overall_min + '" max="' + this.overall_max + '" step="1" value="' + this.min + '" /></label>',
        '<label>End year: <input type="number" name="max" min="' + this.overall_min + '" max="' + this.overall_max + '" step="1" value="' + this.max + '" /></label>',
    ].join("\n");
};

// BinsDimension inherits RangeDimension
function BinsDimension(t, init_headings) {
    RangeDimension.apply(this, arguments);

    this.min = 1;
    this.max = init_headings ? init_headings.length : t.count;
    this.overall_min = t.overall_min || 1;
    this.overall_max = t.overall_max || 1000;
}
BinsDimension.prototype = Object.create(RangeDimension.prototype);
BinsDimension.prototype.parameterHtml = function () {
    return [
        '<input type="hidden" name="min" value="' + this.min + '" />',
        '<label>Bins: <input type="number" name="max" min="' + this.overall_min + '" max="' + this.overall_max + '" step="1" value="' + this.max + '" /></label>',
    ].join("\n");
};

/** Get a new dimension based on type */
function get_dimension(t, init_headings) {
    return new ({
        list: ListDimension,
        year: YearDimension,
        bins: BinsDimension,
    }[t.type])(t, init_headings);
}
module.exports.get_dimension = get_dimension;
