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
ListDimension.prototype.headers = function () { return this.values.map(function (x) { return x[0]; }); };
ListDimension.prototype.headerHTML = function () { return this.values.map(function (x) { return x[1]; }); };
ListDimension.prototype.minCount = function () { return this.values.length; };
ListDimension.prototype.maxCount = function () { return this.values.length; };

function RangeDimension(t, init_headings) {
    var numeric_headings;

    this.initial = t.initial || [];
    this.overall_min = t.overall_min || 1;
    this.overall_max = t.overall_max || 100;
    this.prefix = t.prefix || ['', ''];

    // Try to work out numeric headings based on init_headings inputs
    numeric_headings = (init_headings || []).map(function (x) {
        if (this.prefix[0] && x.indexOf(this.prefix[0]) === 0) {
            x = x.substr(this.prefix[0].length);
        }

        return Number(x);
    }.bind(this)).filter(function (x) { return !isNaN(x); });

    // If we didn't get any, just use min/max
    if (numeric_headings.length === 0) {
        numeric_headings = [t.min, t.max];
    }

    this.min = Math.min.apply(null, numeric_headings);
    this.max = Math.max.apply(null, numeric_headings);
}
RangeDimension.prototype.parameterHtml = function () {
    return [
        '<label>Min: <input type="number" name="min" min="' + this.overall_min + '" max="' + this.overall_max + '" step="1" value="' + this.min + '" /></label>',
        '<label>Max: <input type="number" name="max" min="' + this.overall_min + '" max="' + this.overall_max + '" step="1" value="' + this.max + '" /></label>',
    ].join("\n");
};
RangeDimension.prototype.headers = function () {
    return this.initial.map(function (x) { return Array.isArray(x) ? x[0] : x; }).concat(
        sequence(this.min, this.max).map(function (x) { return this.prefix[0] + x; }.bind(this))
    );
};
RangeDimension.prototype.headerHTML = function () {
    return this.initial.map(function (x) { return Array.isArray(x) ? x[1] : x; }).concat(
        sequence(this.min, this.max).map(function (x) { return this.prefix[1] + x; }.bind(this))
    );
};
RangeDimension.prototype.minCount = function () { return this.initial.length + this.max - this.min + 1; };
RangeDimension.prototype.maxCount = function () { return this.initial.length + this.max - this.min + 1; };
RangeDimension.prototype.update = function (paramEl, hot, e) {
    var i, oldHeaders, newHeaders, self = this,
        startEl = paramEl.querySelector("input[name=min]"),
        endEl = paramEl.querySelector("input[name=max]");

    function to_num(x, offset) {
        return (parseInt(x.substr(self.prefix[1].length), 10) + (offset || 0)).toString();
    }

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
    for (i = 0; i < 2000; i++) {
        if (to_num(oldHeaders[this.initial.length]) > to_num(newHeaders[this.initial.length])) {
            // Bottom is higher than we need, add one smaller
            oldHeaders.splice(this.prefix[1] + this.initial.length, 0, to_num(oldHeaders[this.initial.length], -1));
            hot.alter('insert_col', this.initial.length);
        } else if (to_num(oldHeaders[this.initial.length]) < to_num(newHeaders[this.initial.length])) {
            // Bottom is smaller than we need, remove one
            oldHeaders.splice(this.initial.length, 1);
            hot.alter('remove_col', this.initial.length);
        } else if (to_num(oldHeaders[oldHeaders.length - 1]) < to_num(newHeaders[newHeaders.length - 1])) {
            // Top is smaller than we need, add one
            oldHeaders.push(this.prefix[1] + to_num(oldHeaders[oldHeaders.length - 1], 1));
            hot.alter('insert_col', oldHeaders.length);
        } else if (to_num(oldHeaders[oldHeaders.length - 1]) > to_num(newHeaders[newHeaders.length - 1])) {
            // Top is bigger than we need, remove one
            oldHeaders.pop();
            hot.alter('remove_col', oldHeaders.length);
        } else {
            // We're done
            break;
        }

        if (i > 1000) {
            throw new Error("Adding too many rows");
        }
    }

    hot.updateSettings({
        colHeaders: oldHeaders,
    });
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
    t.min = 1;
    RangeDimension.apply(this, [t, init_headings]);

    this.overall_min = t.overall_min || 1;
    this.overall_max = t.overall_max || 1000;
}
BinsDimension.prototype = Object.create(RangeDimension.prototype);
BinsDimension.prototype.parameterHtml = function () {
    return [
        '<input type="hidden" name="min" value="' + this.min + '" />',
        '<label>' + (this.prefix[1] ? this.prefix[1] + 'Max' : 'Bins') + ': <input type="number" name="max" min="' + this.overall_min + '" max="' + this.overall_max + '" step="1" value="' + this.max + '" /></label>',
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
