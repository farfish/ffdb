"use strict";
/*jslint todo: true, regexp: true, nomen: true */
var test = require('tape');

var hot_utils = require('../app/hot_utils.js');

test('df_to_aofa', function (t) {
    t.deepEqual(hot_utils.df_to_aofa({
        _headings: { fields: ['a', 'c'], values: [1, 2, 3] },
        a: [11, 12, 13],
        c: [21, 22, 23],
    }, ['a', 'b', 'c'], [0, 1, 2, 3, 4], 'vertical'), [
        [ null,   11,   12,   13, null ],
        [ null, null, null, null, null ],
        [ null,   21,   22,   23, null ],
    ], "Converted to horizontal aofa");

    t.deepEqual(hot_utils.df_to_aofa({
        _headings: { fields: ['a', 'c'], values: [1, 2, 3] },
        a: [11, 12, 13],
        c: [21, 22, 23],
    }, ['a', 'b', 'c'], [0, 1, 2, 3, 4], 'horizontal'), [
        [ null, null, null ],
        [   11, null,   21 ],
        [   12, null,   22 ],
        [   13, null,   23 ],
        [ null, null, null ],
    ], "Converted to vertical aofa");

    t.end();
});
