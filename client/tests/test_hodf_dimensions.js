"use strict";
/*jslint todo: true, regexp: true */
var test = require('tape');

var get_dimension = require('lib/hodf_dimensions.js').get_dimension;

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

    yd = get_dimension({type: 'year', min: 1990, max: 1993, initial: ['woo', 'yay']});
    t.deepEqual(
        yd.headers(),
        ['woo', 'yay', '1990', '1991', '1992', '1993'],
        "Generated consecutive headers with a initial value"
    );
    t.deepEqual(yd.minCount(), 6, "mincount/maxcount equal");
    t.deepEqual(yd.maxCount(), 6, "mincount/maxcount equal");

    yd = get_dimension({type: 'year', min: 1990, max: 1993, initial: ['woo', 'yay']}, ['woo', 'yay', '2000', '2001', '2004']);
    t.deepEqual(
        yd.headers(),
        ['woo', 'yay', '2000', '2001', '2002', '2003', '2004'],
        "Generated consecutive headers based on input data with a initial value"
    );
    t.deepEqual(yd.minCount(), 7, "mincount/maxcount equal");
    t.deepEqual(yd.maxCount(), 7, "mincount/maxcount equal");

    yd = get_dimension({type: 'year', min: 1990, max: 1993, initial: ['woo', 'yay']}, ['parp', '2000', '2001', '2004']);
    t.deepEqual(
        yd.headers(),
        ['woo', 'yay', '2000', '2001', '2002', '2003', '2004'],
        "Mismatched initial columns ignored"
    );
    t.deepEqual(yd.minCount(), 7, "mincount/maxcount equal");
    t.deepEqual(yd.maxCount(), 7, "mincount/maxcount equal");

    yd = get_dimension({type: 'year', min: 1990, max: 1993, initial: ['woo', 'yay'], prefix: ["y_", "Year "]}, ['parp', 'y_2000', 'y_2001', 'y_2004']);
    t.deepEqual(
        yd.headers(),
        ['woo', 'yay', 'y_2000', 'y_2001', 'y_2002', 'y_2003', 'y_2004'],
        "Prefixed columns, used init_headings with values stripped off"
    );
    t.deepEqual(
        yd.headerHTML(),
        ['woo', 'yay', 'Year 2000', 'Year 2001', 'Year 2002', 'Year 2003', 'Year 2004'],
        "HTML headings use different prefix"
    );

    t.end();
});

test('BinsDimension', function (t) {
    var d;

    d = get_dimension({type: 'bins', max: 5});
    t.deepEqual(
        d.headers(),
        ['1', '2', '3', '4', '5'],
        "Generated consecutive headers"
    );
    t.deepEqual(d.minCount(), 5, "mincount/maxcount equal");
    t.deepEqual(d.maxCount(), 5, "mincount/maxcount equal");

    t.end();
});
