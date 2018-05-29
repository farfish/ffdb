"use strict";
/*jslint todo: true, regexp: true, nomen: true */
var test = require('tape');

var hot_utils = require('lib/hot_utils.js');

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

test('aofa_to_df', function (t) {
    t.deepEqual(hot_utils.aofa_to_df([
        [null, 'a', 'b', 'c'],
        [   1,  11,  12,  13],
        [   2,  21,  22,  23],
        [   3,  31,  32,  33],
    ], "vertical"), {
        _headings: { fields: [ 1, 2, 3 ], values: [ 'a', 'b', 'c' ] },
        1: [ 11, 12, 13 ],
        2: [ 21, 22, 23 ],
        3: [ 31, 32, 33 ],
    }, "Converted to vertical df");

    t.deepEqual(hot_utils.aofa_to_df([
        [null, 'a', 'b', 'c'],
        [   1,  11,  12,  13],
        [   2,  21,  22,  23],
        [   3,  31,  32,  33],
    ], "horizontal"), {
        _headings: { fields: [ 'a', 'b', 'c' ], values: [ 1, 2, 3 ] },
        a: [ 11, 21, 31 ],
        b: [ 12, 22, 32 ],
        c: [ 13, 23, 33 ]
    }, "Converted to vertical df");


    t.end();
});
