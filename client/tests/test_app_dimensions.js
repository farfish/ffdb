"use strict";
/*jslint todo: true, regexp: true */
var test = require('tape');

var get_dimension = require('../app/dimensions.js').get_dimension;

test('ListDimension', function (t) {
    var d;

    d = get_dimension({type: 'list', values: [['l0', 'Item 0'], ['l1', 'Item 1']]});
    t.deepEqual(d.headers(), ['l0', 'l1'], 'Got headers');
    t.deepEqual(d.headerHTML(), ['Item 0', 'Item 1'], 'Got header HTML (i.e. pretty titles');
    t.deepEqual(d.minCount(), 2, "Count same as length of values");
    t.deepEqual(d.maxCount(), 2, "Count same as length of values");

    t.end();
});

test('YearDimension', function (t) {
    var yd;

    yd = get_dimension({type: 'year', min: 2000, max: 2010});
    t.deepEqual(
        yd.headers(),
        ['2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010'],
        "Generated consecutive headers"
    );
    t.deepEqual(yd.minCount(), 11, "mincount/maxcount equal");
    t.deepEqual(yd.maxCount(), 11, "mincount/maxcount equal");

    yd = get_dimension({type: 'year', min: 1990, max: 1993});
    t.deepEqual(
        yd.headers(),
        ['1990', '1991', '1992', '1993'],
        "Generated consecutive headers"
    );
    t.deepEqual(yd.minCount(), 4, "mincount/maxcount equal");
    t.deepEqual(yd.maxCount(), 4, "mincount/maxcount equal");

    yd = get_dimension({type: 'year', min: 1990, max: 1993}, ['2000', '2001', '2004']);
    t.deepEqual(
        yd.headers(),
        ['2000', '2001', '2002', '2003', '2004'],
        "Generated consecutive headers based on input data"
    );
    t.deepEqual(yd.minCount(), 5, "mincount/maxcount equal");
    t.deepEqual(yd.maxCount(), 5, "mincount/maxcount equal");

    t.end();
});
