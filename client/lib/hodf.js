"use strict";
/*jslint todo: true, regexp: true, browser: true, unparam: true, plusplus: true, bitwise: true, nomen: true */
/*global Promise */
var Handsontable = require('handsontable');
var get_dimension = require('./hodf_dimensions.js').get_dimension;
var hodf_utils = require('./hodf_utils.js');

/**
  * Create Hodataframe within element el
  * @constructor
  * @param {Object} tmpl         The Hodataframe template to use for this element
  * @param {Element} el          The HTML element the control should sit within
  * @param {Object} initial_data Initial values to populate table with, either array-of-arrays or JSON data frame
  */
function Hodataframe(tmpl, el, inital_data) {
    var hot, hotParams, cols, rows,
        customData = {};

    if (!inital_data) {
        inital_data = { _headings: {}};
    } else if (Array.isArray(inital_data)) {
        // If it's an array, convert back into df
        inital_data = hodf_utils.aofa_to_df(inital_data, tmpl.orientation);
    }

    if (tmpl.text) {
        el.innerHTML = tmpl.text;
        return null;
    }

    customData.fields = get_dimension(tmpl.fields, inital_data._headings.fields);
    customData.values = get_dimension(tmpl.values, inital_data._headings.values);
    cols = tmpl.orientation === 'vertical' ? customData.values : customData.fields;
    rows = tmpl.orientation === 'vertical' ? customData.fields : customData.values;

    el.innerHTML = [
        (tmpl.title ? '<h3>' + tmpl.title + '</h3>' : ''),
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
    hotParams.data = inital_data._headings.fields ? hodf_utils.df_to_aofa(inital_data, customData.fields.headers(), customData.values.headers(), tmpl.orientation) : undefined;
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

    this.el = el;
    this.hot = hot;
    this.tmpl = tmpl;
    this.name = tmpl.name;
}

Hodataframe.prototype.getDataFrame = function () {
    var i,
        out = { _headings: {} },
        data = this.hot.getData();

    function return_ith_value(row) {
        return row[i];
    }

    out._headings.fields = this.hot.customData.fields.headers();
    out._headings.values = this.hot.customData.values.headers();

    // Turn table data into a data.frame-esque object of fields
    for (i = 0; i < out._headings.fields.length; i++) {
        if (this.tmpl.orientation === "vertical") {
            // Map rows to values
            out[out._headings.fields[i]] = data[i];
        } else {
            // Map columns to values
            out[out._headings.fields[i]] = data.map(return_ith_value);
        }
    }
    return out;
};

Hodataframe.prototype.getAofA = function () {
    var i, data, rowHeaders, colHeaders;

    data = this.hot.getData();
    rowHeaders = this.hot.customData[this.tmpl.orientation === 'vertical' ? 'fields' : 'values'].headers();
    colHeaders = this.hot.customData[this.tmpl.orientation === 'vertical' ? 'values' : 'fields'].headers();

    // Add column header
    data.unshift(colHeaders);

    // Add row headers
    for (i = 0; i < data.length; i++) {
        data[i].unshift(i > 0 ? rowHeaders[i - 1] : null);
    }
    return data;
};

Hodataframe.prototype.replace = function (data) {
    // Generate new DF and return it.
    this.hot.destroy();
    this.el.innerHTML = '';
    return new Hodataframe(this.tmpl, this.el, data);
};

module.exports = Hodataframe;
