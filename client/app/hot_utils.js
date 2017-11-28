"use strict";
/*jslint todo: true, regexp: true, nomen: true, plusplus: true */

function rotate(ar) {
    var rotated, i, j;

    function new_array(len, fn) {
        var out = [], k;

        for (k = 0; k < len; k++) {
            out.push(fn());
        }
        return out;
    }

    // Generate matrix of appropriate dimensions
    rotated = new_array(ar[0].length, function () {
        return new_array(ar.length, function () {
            return [];
        });
    });

    // Flip data around
    for (i = 0; i < ar.length; i++) {
        for (j = 0; j < ar[0].length; j++) {
            rotated[j][i] = ar[i][j];
        }
    }

    return rotated;
}

function df_to_aofa(df, field_headings, value_headings, orientation) {
    var out;

    // Generate aofa, assume fields are rows, values are columns
    out = field_headings.map(function (field) {
        return value_headings.map(function (value) {
            var i = df._headings.values.indexOf(value);

            return i >= 0 ? (df[field] || {})[i] || null : null;
        });
    });

    // Rotate if required
    if (orientation !== 'vertical') {
        out = rotate(out);
    }

    return out;
}
module.exports.df_to_aofa = df_to_aofa;
