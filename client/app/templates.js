"use strict";

var dlmtool = [
    {
        text: "<p>Please fill the form with all tha data available for your stock, if you are not sure about the value of some category please leave the field blank.</p><p>Based on DLMtool package (Tom Carruthers and Adrian Hordyk (2016). DLMtool: Data-Limited Methods Toolkit. R package version 3.1. <a href=\"https://CRAN.R-project.org/package=DLMtool\">https://CRAN.R-project.org/package=DLMtool</a>).</p>"
    },
    {
        name: "constants",
        title: "Constants",
        orientation: "vertical",
        fields: {type: "list", values: [
            "Data source type", // i.e. where the data came from TODO: vocab?
            "Data source description",
            "Duration t",  // i.e. number columns for templateCatch
            "Average catch over time t", // Mean of catch
            "Depletion over time t",
            "M",
            "FMSY/M",
            "BMSY/B0",
            "MSY",
            "BMSY",
            "Length at 50% maturity",
            "Length at 95% maturity",
            "Length at first capture",
            "Length at full selection",
            "Current stock depletion",
            "Current stock abundance",
            "Von Bertalanffy K parameter",
            "Von Bertalanffy Linf parameter",
            "Von Bertalanffy t0 parameter",
            "Length-weight parameter a",
            "Length-weight parameter b",
            "Steepness",
            "Maximum age",
            "CV Catch",
            "CV Depletion over time t",
            "CV Average catch over time t",
            "CV Abundance index",
            "CV M",
            "CV FMSY/M",
            "CV BMSY/B0",
            "CV current stock depletion",
            "CV current stock abundance",
            "CV von B. K parameter",
            "CV von B. Linf parameter",
            "CV von B. t0 parameter",
            "CV Length at 50% maturity",
            "CV Length at first capture",
            "CV Length at full selection",
            "CV Length-weight parameter a",
            "CV Length-weight parameter b",
            "CV Steepness",
            "Sigma length composition",
            "Units",
            "Reference OFL",
            "Reference OFL type",
            "MPrec",
            "LHYear",
        ]},
        values: {type: "list", values: ["Value"]},
        params: {rowHeaderWidth: 270},
    },
    {
        name: "catch",
        title: "Catch data",
        orientation: "vertical",
        fields: {type: "list", values: [
            "Catch",
            "Abundance index",
        ]},
        values: {type: 'year', min: 2000, max: 2010},
        params: {rowHeaderWidth: 170},
    },
    {
        name: "caa",
        title: "Catch at age",
        orientation: "horizontal",
        fields: {type: "bins", count: 10},
        values: {type: "year", min: 2000, max: 2010},
    },
    {
        name: "cal",
        title: "Catch at length",
        orientation: "horizontal",
        fields: {type: "bins", count: 10},
        values: {type: "year", min: 2000, max: 2010, initial: ["Min Length"]},
        params: {rowHeaderWidth: 100},
    },
];

module.exports.table_templates = {
    dlmtool: dlmtool,
};
