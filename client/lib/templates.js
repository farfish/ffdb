"use strict";
/*jslint todo: true */

var dlmtool = [
    {
        name: "metadata",
        title: "Data description",
        description: " " +
            "Please fill the form with all the data available for your " +
            "stock, if you are not sure about the value of some category " +
            "please enter 'NA'. If a field heading is underlined " +
            "you can hover over for a more detailed description." +
            '</p><p>' +
            "Based on DLMtool package " +
            "(Tom Carruthers and Adrian Hordyk (2016). DLMtool: Data-Limited " +
            "Methods Toolkit. R package version 3.1. " +
            "<a href=\"https://CRAN.R-project.org/package=DLMtool\">https://CRAN.R-project.org/package=DLMtool</a>).",
        orientation: "vertical",
        fields: {type: "list", values: [
            ["species", "Species"],
            ["location", "Location"],
            ["case_study", "Case study"],
        ]},
        values: {type: "list", values: [["value", "Value"]]},
        params: {rowHeaderWidth: 140},
    },
    {
        name: "catch",
        title: "Catch data",
        description: " " +
            "Catch data should be in tonnes.",
        orientation: "vertical",
        fields: {type: "list", values: [
            ["catch", "Catch"],
            ["abundance_index", "Abundance index"],
        ]},
        values: {type: 'year', min: 2000, max: 2010},
        params: {rowHeaderWidth: 170},
    },
    {
        name: "caa",
        title: "Catch at age",
        description: "Age data should be in numbers.",
        orientation: "horizontal",
        fields: {type: "bins", count: 10},
        values: {type: "year", min: 2000, max: 2010},
    },
    {
        name: "cal",
        title: "Catch at length",
        description: "Length data should be in mm.",
        orientation: "horizontal",
        fields: {type: "bins", count: 10},
        values: {type: "year", min: 2000, max: 2010, initial: ["Min Length"]},
        params: {rowHeaderWidth: 100},
    },
    {
        name: "constants",
        title: "Constants",
        description: " " +
            "In the 'source' field write for each value a reference source, this " +
            "could be a bibliographic or a database (e.g. www.fishbase.org, " +
            "http://ramlegacy.org) if available. If you do not have a reference " +
            "but you have some knowledge on the value or if a reference does not " +
            "apply please enter 'NA'.",
        orientation: "vertical",
        fields: {type: "list", values: [
            ["avg_catch_over_time", 'Average catch over time t'], // Mean of catch
            ["depletion_over_time", '<abbr title="Estimated biomass in the last year divided by estimated biomass at the beginning of time series">Depletion over time t</abbr>'],
            ["M", '<abbr title="Instantaneous natural mortality rate (year⁻¹)">M: Instantaneous natural mortality rate</a>'],
            ["FMSY/M", 'FMSY/M'],
            ["BMSY/B0", '<abbr title="The most productive stock size relative to unfished biomass">BMSY/B0</abbr>'],
            ["MSY", 'MSY'],
            ["BMSY", 'BMSY'],
            ["length_at_50pc_maturity", 'Length at 50% maturity'],
            ["length_at_95pc_maturity", 'Length at 95% maturity'],
            ["length_at_first_capture", 'Length at first capture'],
            ["length_at_full_selection", 'Length at full selection'],
            ["current_stock_depletion", '<abbr title="Biomass today divided by unfished biomass (B0)">Current stock depletion</abbr>'],
            ["current_stock_abundance", '<abbr title="Estimated abundance today">Current stock abundance</abbr>'],
            ["Von_Bertalanffy_K", '<abbr title="Growth rate parameter">Von Bertalanffy K parameter</abbr>'],
            ["Von_Bertalanffy_Linf", 'Von Bertalanffy Linf parameter'],
            ["Von_Bertalanffy_t0", 'Von Bertalanffy t0 parameter'],
            ["Length-weight_parameter_a", 'Length-weight param a (W=aLᵇ)'],
            ["Length-weight_parameter_b", 'Length-weight param b (W=aLᵇ)'],
            ["maximum_age", 'Maximum age'], //TODO: Needed?
            ["ref_ofl_limit", '<abbr title="Reference Overfishing limit or reference catch limit e.g. previous catch recommendation">Reference Overfishing/catch limit</abbr>'],
        ]},
        values: {type: "list", values: [["value", "Value"], ["source", "Source"]]},
        params: {rowHeaderWidth: 330},
    },
    {
        name: "cv",
        title: "Coefficient of variation",
        description: "CV is a measure of imprecision, i.e. how imprecise you think this value could be",
        orientation: "vertical",
        fields: {type: "list", values: [
            ["catch", "CV Catch"],
            ["depletion_over_time", "CV Depletion over time t"],
            ["avg_catch_over_time", "CV Average catch over time t"],
            ["abundance_index", "CV Abundance index"],
            ["M", "CV M"],
            ["FMSY/M", "CV FMSY/M"],
            ["BMSY/B0", "CV BMSY/B0"],
            ["current_stock_depletion", "CV current stock depletion"],
            ["current_stock_abundance", "CV current stock abundance"],
            ["Von_Bertalanffy_K", "CV von B. K parameter"],
            ["Von_Bertalanffy_Linf", "CV von B. Linf parameter"],
            ["Von_Bertalanffy_t0", "CV von B. t0 parameter"],
            ["length_at_50pc_maturity", "CV Length at 50% maturity"],
            ["length_at_first_capture", "CV Length at first capture"],
            ["length_at_full_selection", "CV Length at full selection"],
            ["Length-weight_parameter_a", "CV Length-weight parameter a"],
            ["Length-weight_parameter_b", "CV Length-weight parameter b"],
            ["length_composition", "Imprecision in length composition data"],
        ]},
        values: {type: "list", values: [["value", "Value"], ["source", "Source"]]},
        params: {rowHeaderWidth: 270},
    },
];

module.exports.table_templates = {
    dlmtool: dlmtool,
};
