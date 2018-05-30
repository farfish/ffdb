"use strict";
/*jslint todo: true, regexp: true, browser: true, unparam: true, plusplus: true, bitwise: true, nomen: true */
/*global Promise */
var jQuery = require('jquery');
var Handsontable = require('handsontable');
var get_dimension = require('./dimensions.js').get_dimension;
var table_templates = require('./templates.js').table_templates;
var hot_utils = require('./hot_utils.js');

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

module.exports.generate_hots = generate_hots;