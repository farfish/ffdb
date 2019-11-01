"use strict";
/*jslint todo: true, regexp: true, browser: true, unparam: true, plusplus: true, bitwise: true, nomen: true */
/*global Promise, Blob */
var XLSX = require('xlsx');
var file_loader = require('./file_loader.js');
var FileSaver = require('file-saver');
var jQuery = require('jquery');
var Hodataframe = require('hodf');
var table_templates = require('./templates.js').table_templates;
var table_fixups = require('./templates.js').table_fixups;
var queryString = require('query-string');
var selectize = require('selectize');
var alert = require('alerts');
alert.transitionTime = 300;

var hodfs = {}, file_select, default_lang = 'en';

/** Wrap a promise, enabling alerts and loading spinner */
function do_work(p) {
    document.querySelector('body').classList.add('loading');

    return p.then(function () {
        document.querySelector('body').classList.remove('loading');
    }).catch(function (err) {
        document.querySelector('body').classList.remove('loading');
        alert(err, {className: "error"});
        throw err;
    });
}

function api_fetch(url, args) {
    return window.fetch(url, args).then(function (response) {
        if (response.status !== 200) {
            return response.json().then(function (data) {
                if (data.redirect) {
                    window.document.location = data.redirect;
                }
                throw new Error(data.error + ": " + data.message);
            });
        }
        return response;
    }).then(function (response) {
        return response.json();
    });
}

function parse_location(loc) {
    var out = queryString.parse(loc.search);

    out.template = out.template || 'dlmtool';
    out.filename = out.filename || '';
    out.lang = out.lang || default_lang;
    return out;
}

function replace_location(new_state) {
    var new_search;

    if (!new_state.template) {
        new_state.template = parse_location(window.location).template;
    }
    new_search = '?' + queryString.stringify(new_state);

    window.history.replaceState("", "", new_search);
    window.onpopstate();
}

function isDirty(dirty) {
    var el = document.querySelector("#options button[name=save]");

    if (dirty !== undefined) {
        el.disabled = !dirty;
    }
    return !el.disabled;
}

function tlate(obj, html_tag, sel_lang) {
    if (!obj) {
        return '';
    }

    if (typeof obj === 'string') {
        return '<' + html_tag + '>' + obj + '</' + html_tag + '>';
    }

    if (sel_lang === '*') {
        return Object.keys(obj).map(function (l) {
            return '<' + html_tag + ' lang="' + l + '">' + obj[l] + '</' + html_tag + '>';
        }).join("\n");
    }

    if (obj[sel_lang]) {
        return '<' + html_tag + ' lang="' + sel_lang + '">' + obj[sel_lang] + '</' + html_tag + '>';
    }
    return '<' + html_tag + ' lang="en">' + obj.en + '</' + html_tag + '>';
}

/**
  * Given a template name and input data.frame
  * Generate handsondataframe objects
  */
function generate_hodfs(tmpls, input_dfs) {
    var tbl = document.getElementById("tbl");

    function parent_el(gp_el) {
        var el = document.createElement("div");
        gp_el.appendChild(el);
        return el;
    }

    function hodf(tmpl, parent_el, data, new_name) {
        var out;

        // If multiple, shallow copy and add name/title
        if (tmpl.multiple) {
            tmpl = Object.keys(tmpl).reduce(function (acc, k) {
                acc[k] = tmpl[k];
                return acc;
            }, {});

            tmpl.title = new_name.replace(tmpl.name + '_', '');
            tmpl.name = new_name;
        }

        parent_el.setAttribute('class', 'hodf');
        parent_el.setAttribute('data-name', tmpl.name);
        out = new Hodataframe(tmpl, parent_el, data, '*');
        // Notify surrounding code on changes
        out.hot.addHook('afterChange', function (changes, source) {
            if (source === 'edit') {
                isDirty(true);
            }
        });
        out.hot.addHook('afterCreateCol', isDirty.bind(null, true));
        out.hot.addHook('afterCreateRow', isDirty.bind(null, true));
        out.hot.addHook('afterRemoveCol', isDirty.bind(null, true));
        out.hot.addHook('afterRemoveRow', isDirty.bind(null, true));

        return out;
    }

    // Destroy anything existing and rebuild
    Object.values(hodfs).forEach(function (hodf) {
        hodf.hot.destroy();
    });
    hodfs = {};
    tbl.innerHTML = "";
    input_dfs = input_dfs || {};
    isDirty(false);
    document.querySelector("#options button[name=import]").disabled = false;
    document.querySelector("#options button[name=export]").disabled = false;

    return tmpls.forEach(function (tmpl, tmpl_idx) {
        var mult_el;

        if (tmpl.multiple) {
            mult_el = parent_el(tbl);

            mult_el.appendChild((function () {
                var el = document.createElement('div');
                el.innerHTML = [
                    tlate(tmpl.multiple.title, 'h3', '*'),
                    tlate(tmpl.multiple.description, 'p', '*'),
                    '<button class="btn btn-link">Add new...</button>',
                ].join("");

                el.lastChild.addEventListener('click', function (e) {
                    var new_name = window.prompt(tmpl.multiple.title[document.documentElement.lang]);

                    if (!new_name) {
                        return;
                    }
                    if (new_name.match(/\W/)) {
                        alert(new_name + " should only contain a-z,0-9,_", {className: "error"});
                        return;
                    }
                    if (hodfs[new_name]) {
                        alert(new_name + " already exists", {className: "error"});
                        return;
                    }
                    new_name = tmpl.name + '_' + new_name;
                    hodfs[new_name] = hodf(tmpl, parent_el(mult_el), null, new_name);
                });

                return el;
            }()));

            Object.keys(input_dfs).forEach(function (sub_name) {
                if (sub_name.startsWith(tmpl.name + '_')) {
                    hodfs[sub_name] = hodf(tmpl, parent_el(mult_el), input_dfs[sub_name], sub_name);
                }
            });

        } else {
            hodfs[tmpl.name] = hodf(tmpl, parent_el(tbl), input_dfs[tmpl.name]);
        }
    });
}

/**
  * Fetch current HODF objects in display order
  */
function all_hodfs() {
    return Array.prototype.map.call(document.querySelectorAll('div.hodf[data-name]'), function (hodf_el) {
        var n = hodf_el.getAttribute('data-name');

        if (hodfs[n]) {
            return hodfs[n];
        }
        throw new Error('No HODF for ' + n);
    });
}

/**
  * Save content. Turn it into a data.frame alike of:
  * {
  *     _headings: {
  *         fields: [(field_name), (field_name), (field_name)],
  *         values: [(value_name), ...],
  *     }
  *     field_name: [values....],
  * }
  */
document.querySelector("#options button[name=save]").addEventListener('click', function (e) {
    var sheets = {},
        filename = file_select.getValue();

    if (!filename) {
        alert("You must enter a document name first", { className: "warn", timeout: 3000 });
        file_select.focus();
        return;
    }

    all_hodfs().map(function (hodf, tableIndex) {
        sheets[hodf.name] = hodf.getDataFrame();
    });

    do_work(api_fetch('/api/doc/dlmtool/' + encodeURIComponent(filename), {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(sheets),
    }).then(function (data) {
        file_select.updateOption(data.document_name, {
            value: data.document_name,
            text: data.document_name + " (v" + data.version + ")",
        });

        if (window.ga) {
            window.ga('send', 'event', 'widget', 'save', filename);
        }
        alert("Saved", { className: "success", timeout: 3000 });
        isDirty(false);
        replace_location({
            filename: filename,
        });
    }));
});

document.querySelector("#options button[name=export]").addEventListener('click', function (e) {
    var wb = { SheetNames: [], Sheets: {} },
        filename = file_select.getValue();

    function s2ab(s) {
        var i,
            buf = new window.ArrayBuffer(s.length),
            view = new window.Uint8Array(buf);

        for (i = 0; i < s.length; ++i) {
            view[i] = s.charCodeAt(i) & 0xFF;
        }

        return buf;
    }

    if (!filename) {
        alert("You must enter a document name first", { className: "warn", timeout: 3000 });
        file_select.focus();
        return;
    }

    all_hodfs().map(function (hodf, tableIndex) {
        wb.SheetNames.push(hodf.name);
        wb.Sheets[hodf.name] = XLSX.utils.aoa_to_sheet(hodf.getAofA());
    });

    FileSaver.saveAs(new Blob(
        [s2ab(XLSX.write(wb, {bookType: 'xlsx', bookSST: true, type: 'binary'}))],
        {type: "application/octet-stream"}
    ), filename + ".xlsx");
});

document.querySelector("#options button[name=import]").addEventListener('click', function (e) {
    var state = parse_location(window.location);

    file_loader('import-csv', 'array', function (data) {
        var input_dfs = {}, workbook = XLSX.read(new window.Uint8Array(data), {type: 'array'});

        // Turn workbook into object full of AofAs
        workbook.SheetNames.forEach(function (sheet_name) {
            input_dfs[sheet_name] = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name], {header: 1});
        });

        // Re-generate HODFs with this data
        generate_hodfs(table_templates[state.template], input_dfs);

        isDirty(true);
    });
});

document.querySelector("#options button[name=new]").addEventListener('click', function (e) {
    if (isDirty() && !window.confirm("You have unsaved changes, press OK to delete them")) {
        return;
    }

    replace_location({
        filename: '',
    });
});

file_select = jQuery("select[name=filename]").selectize({
    persist: false,
    createOnBlur: true,
    onChange: function (value) {
        if (!value || this.options[value].new_option) {
            // Ignore any newly-created items, wait for save to be pressed
            this.ffdb_old_value = this.getValue();
            return;
        }

        if (this.ffdb_old_value === this.getValue()) {
            return;
        }
        if (isDirty() && !window.confirm("You have unsaved changes, press OK to delete them")) {
            this.setValue(this.ffdb_old_value, true);
            return;
        }
        this.ffdb_old_value = this.getValue();

        replace_location({
            filename: file_select.getValue(),
        });
    },
    create: function (input) {
        return {
            value: input,
            text: input + ' (new)',
            new_option: true,
        };
    },
})[0].selectize;

document.querySelector('nav .languages').addEventListener('click', function (e) {
    e.stopPropagation();
    e.preventDefault();

    replace_location({
        lang: e.target.getAttribute('hreflang'),
    });
});

window.onpopstate = function () {
    var state = parse_location(window.location);

    // Update page with current language
    window.document.documentElement.setAttribute('lang', state.lang);
    Array.prototype.forEach.call(document.querySelectorAll('nav .languages > a'), function (el) {
        el.classList.toggle('selected', el.getAttribute('hreflang') === state.lang);
    });

    file_select.setValue(state.filename, true);

    if (window.ga) {
        window.ga('set', 'location', window.location.href);
        window.ga('send', 'pageview');
    }

    return do_work(Promise.resolve().then(function () {
        if (!state.filename) {
            return {content: {}};
        }

        return api_fetch('/api/doc/' + encodeURIComponent(state.template) + '/' + encodeURIComponent(state.filename), {
            method: "GET",
        });
    }).then(function (data) {
        generate_hodfs(table_templates[state.template], table_fixups[state.template](data.content));
    }));
};

document.addEventListener('DOMContentLoaded', function (e) {
    var state = parse_location(window.location),
        template_langs;

    // Assume first title in template contains all known languages
    template_langs = Object.keys(table_templates[state.template][0].title);

    // Default language is first language in navigator.languages that we know about
    default_lang = (navigator.languages || []).find(function (x) { return template_langs.indexOf(x) > -1; }) || 'en';

    // Fill in language selector
    document.querySelector('nav .languages').innerHTML = template_langs.map(function (lang) {
        return '<a href="?template=' + state.template + '&lang=' + lang + '" hreflang="' + lang + '">' + lang + '</a>';
    }).join("\n");

    return do_work(api_fetch('/api/doc/' + state.template, {
        method: "GET",
    }).then(function (data) {
        data.documents.forEach(function (x) {
            file_select.addOption({
                value: x.document_name,
                text: x.document_name + " (v" + x.latest + ")",
            });
        });
        file_select.refreshOptions(false);
    })).then(function () {
        return window.onpopstate();
    });
});
