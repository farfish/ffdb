import json
import unittest
import tempfile

import rpy2.robjects as robjects

from ffdb.template import template_model_inputs


anchovy_json = json.loads("""{"abundance_index_ecocadiz":{"_headings":{"fields":["month","index"],"values":["2004_7","2005_7","2006_7","2007_7","2008_7","2009_7","2010_7","2011_7","2012_7","2013_7","2014_7","2015_7","2016_7","2017_7","2018_7"]},"index":[18177.143,null,35539.397,28882.127,null,21580.497,11338.5654309886,null,null,7336.18359390864,28669.3403696941,12051.4426409076,22836.0294684166,6275.13588713,22608.3737410879],"month":["6","7","6","7","7","7","7","7","7","8","7","7","7","7","7"]},"abundance_index_pelagio":{"_headings":{"fields":["month","index"],"values":["1999_4","2000_4","2001_4","2002_4","2003_4","2004_4","2005_4","2006_4","2007_4","2008_4","2009_4","2010_4","2011_4","2012_4","2013_4","2014_4","2015_4","2016_4","2017_4","2018_4","2019_4"]},"index":[24763,null,24913,21335,24565,null,14041,24082,38020,34162,24745,7395,null,null,12700,28917,33100,65345,13797,23473,29876],"month":["2","4","2","2","2","4","4","4","4","4","4","4","4","4","4","4","4","4","4","4","4"]},"caa":{"1":[null,null,null,null,null,null,null,null,null,null,null],"10":[null,null,null,null,null,null,null,null,null,null,null],"2":[null,null,null,null,null,null,null,null,null,null,null],"3":[null,null,null,null,null,null,null,null,null,null,null],"4":[null,null,null,null,null,null,null,null,null,null,null],"5":[null,null,null,null,null,null,null,null,null,null,null],"6":[null,null,null,null,null,null,null,null,null,null,null],"7":[null,null,null,null,null,null,null,null,null,null,null],"8":[null,null,null,null,null,null,null,null,null,null,null],"9":[null,null,null,null,null,null,null,null,null,null,null],"_headings":{"fields":["1","2","3","4","5","6","7","8","9","10"],"values":["2000","2001","2002","2003","2004","2005","2006","2007","2008","2009","2010"]}},"cal":{"1":[null,null,null,null,null,null,null,null,null,null,null,null],"10":[null,null,null,null,null,null,null,null,null,null,null,null],"2":[null,null,null,null,null,null,null,null,null,null,null,null],"3":[null,null,null,null,null,null,null,null,null,null,null,null],"4":[null,null,null,null,null,null,null,null,null,null,null,null],"5":[null,null,null,null,null,null,null,null,null,null,null,null],"6":[null,null,null,null,null,null,null,null,null,null,null,null],"7":[null,null,null,null,null,null,null,null,null,null,null,null],"8":[null,null,null,null,null,null,null,null,null,null,null,null],"9":[null,null,null,null,null,null,null,null,null,null,null,null],"_headings":{"fields":["1","2","3","4","5","6","7","8","9","10"],"values":["Min Length","2000","2001","2002","2003","2004","2005","2006","2007","2008","2009","2010"]}},"catch":{"_headings":{"fields":["catch"],"values":["1989_3","1989_6","1989_9","1989_12","1990_3","1990_6","1990_9","1990_12","1991_3","1991_6","1991_9","1991_12","1992_3","1992_6","1992_9","1992_12","1993_3","1993_6","1993_9","1993_12","1994_3","1994_6","1994_9","1994_12","1995_3","1995_6","1995_9","1995_12","1996_3","1996_6","1996_9","1996_12","1997_3","1997_6","1997_9","1997_12","1998_3","1998_6","1998_9","1998_12","1999_3","1999_6","1999_9","1999_12","2000_3","2000_6","2000_9","2000_12","2001_3","2001_6","2001_9","2001_12","2002_3","2002_6","2002_9","2002_12","2003_3","2003_6","2003_9","2003_12","2004_3","2004_6","2004_9","2004_12","2005_3","2005_6","2005_9","2005_12","2006_3","2006_6","2006_9","2006_12","2007_3","2007_6","2007_9","2007_12","2008_3","2008_6","2008_9","2008_12","2009_3","2009_6","2009_9","2009_12","2010_3","2010_6","2010_9","2010_12","2011_3","2011_6","2011_9","2011_12","2012_3","2012_6","2012_9","2012_12","2013_3","2013_6","2013_9","2013_12","2014_3","2014_6","2014_9","2014_12","2015_3","2015_6","2015_9","2015_12","2016_3","2016_6","2016_9","2016_12","2017_3","2017_6","2017_9","2017_12","2018_3","2018_6","2018_9","2018_12","2019_3","2019_6","2019_9","2019_12"]},"catch":["1317.9435","2588.647","1336.252","111.41","2300.364","1571.006","1182.219","765.474","1049.15","3692.705","701.617","273.876","1125.1255","1368.1505","499.605","3.82","766.822","921.209","166.867","105.053","689.6753","2055.2715","210.042","80.47","185.366","79.89174","147.933","157.42301","41.043","807.1949","585.565","397.6074","907.8398","1110.0531","2006.9275","588.3929","1781.4164","2175.5461","2909.4182","2715.9148","1638.3307","1994.9302","1615.9149","691.3792","412.1563","667.8639","673.1865","600.2358","1045.57345","3226.82423","3275.36115","1088.9125","1771.89524","2957.36968","2698.97869","816.01298","1027.3472","2538.96731","965.34638","416.14447","1384.22688","1976.41876","1521.88429","698.6582","1398.1014","2252.438","705.5003","84.7802","1296.8964","2657.272","415.7993","19.1224","1581.1","2251.474","1422.7114","360.9648","612.7774","1120.8583","910.2741","575.7156","533.4636","1280.0593","1015.5397","125.8569","66.8165","1708.6936","919.8847","232.0384","1326.2015","2342.553","2051.2901","571.2697","1158.8977","2433.358","1219.56945447199","26.3829","434.4662","1837.2732","2683.1505","276.572","1754.3426","3553.2523","3299.6681","438.975","1470.6433","2424.776","1880.437","1174.2288","1351.9376","2267.3423","2253.7561","868.778","1021.2496","2150.1835","1059.981","164.4066","202.6613","2361.0453","1396.3757","447.6736","225.29228","1200.64428",null,null]},"constants":{"BMSY":[null,null],"BMSY/B0":[null,null],"FMSY/M":[null,null],"Length-weight_parameter_a":[null,null],"Length-weight_parameter_b":[null,null],"M":[null,null],"MSY":[null,null],"Von_Bertalanffy_K":[null,null],"Von_Bertalanffy_Linf":[null,null],"Von_Bertalanffy_t0":[null,null],"_headings":{"fields":["avg_catch_over_time","depletion_over_time","M","FMSY/M","BMSY/B0","MSY","BMSY","length_at_50pc_maturity","length_at_95pc_maturity","length_at_first_capture","length_at_full_selection","current_stock_depletion","current_stock_abundance","Von_Bertalanffy_K","Von_Bertalanffy_Linf","Von_Bertalanffy_t0","Length-weight_parameter_a","Length-weight_parameter_b","maximum_age","ref_ofl_limit"],"values":["value","source"]},"avg_catch_over_time":[null,null],"current_stock_abundance":[null,null],"current_stock_depletion":[null,null],"depletion_over_time":[null,null],"length_at_50pc_maturity":[null,null],"length_at_95pc_maturity":[null,null],"length_at_first_capture":[null,null],"length_at_full_selection":[null,null],"maximum_age":[null,null],"ref_ofl_limit":[null,null]},"cv":{"BMSY/B0":[null,null],"FMSY/M":[null,null],"Length-weight_parameter_a":[null,null],"Length-weight_parameter_b":[null,null],"M":[null,null],"Von_Bertalanffy_K":[null,null],"Von_Bertalanffy_Linf":[null,null],"Von_Bertalanffy_t0":[null,null],"_headings":{"fields":["catch","depletion_over_time","avg_catch_over_time","abundance_index","M","FMSY/M","BMSY/B0","current_stock_depletion","current_stock_abundance","Von_Bertalanffy_K","Von_Bertalanffy_Linf","Von_Bertalanffy_t0","length_at_50pc_maturity","length_at_first_capture","length_at_full_selection","Length-weight_parameter_a","Length-weight_parameter_b","length_composition"],"values":["value","source"]},"abundance_index":[null,null],"avg_catch_over_time":[null,null],"catch":[null,null],"current_stock_abundance":[null,null],"current_stock_depletion":[null,null],"depletion_over_time":[null,null],"length_at_50pc_maturity":[null,null],"length_at_first_capture":[null,null],"length_at_full_selection":[null,null],"length_composition":[null,null]},"metadata":{"_headings":{"fields":["species","location","case_study"],"values":["value"]},"case_study":[""],"location":[null],"species":["anchovy9a South"]}}""")


def ut_template_table(**fields):
    out = dict(
        _headings=dict(
            fields=list(fields.keys()),
            # 0..x for length of first field
            values=list(range(len(fields[list(fields.keys())[0]]))),
        )
    )
    for k, v in fields.items():
        out[k] = v
    return out


def decode_rdata(raw):
    with tempfile.NamedTemporaryFile() as f:
        f.write(raw)
        f.flush()
        return robjects.r('readRDS')(f.name)


class Test_template_model_inputs(unittest.TestCase):
    maxDiff = None

    def test_template_model_inputs(self):
        out = template_model_inputs('unknown', {})
        self.assertEqual(out, {})

        out = template_model_inputs('dlmtool', {})
        self.assertEqual(sorted(out['spict_fit'].keys()), ['error', 'log'])
        self.assertEqual(sorted(out['dlm_mp'].keys()), ['error', 'log'])
        self.assertEqual(out['spict_fit']['log'], "")
        self.assertEqual(out['dlm_mp']['log'], "")

        out = template_model_inputs('dlmtool', anchovy_json)
        self.assertEqual(sorted(out['spict_fit'].keys()), ['digest', 'log', 'rdata'])
        self.assertEqual(sorted(out['dlm_mp'].keys()), ['digest', 'log', 'rdata'])
        self.assertEqual(out['spict_fit']['log'], "")
        self.assertEqual(out['dlm_mp']['log'], "")

        out = template_model_inputs('ut_example', dict(
            a=ut_template_table(a=[1]),
            b=ut_template_table(print=['hello', 'there']),
        ))
        self.assertEqual(out['model_a']['log'], '')
        self.assertEqual(out['model_a'].get('error', None), None)
        self.assertTrue(out['model_a'].get('digest', False))
        self.assertEqual(str(decode_rdata(out['model_a']['rdata'])), '  a\n0 1\n')
        self.assertEqual(out['model_b']['log'], 'B has\nSome lines\nhello\nthere\n')
        self.assertEqual(out['model_b'].get('error', None), None)
        self.assertTrue(out['model_b'].get('digest', False))
        self.assertEqual(str(decode_rdata(out['model_b']['rdata'])), '  print\n0 hello\n1 there\n')

        out = template_model_inputs('ut_example', dict(
            a=ut_template_table(print=["Whoops"]),
            b=ut_template_table(err=['Oh noes']),
        ))
        self.assertEqual(out['model_a']['log'], 'A has\nSome lines\nWhoops\n')
        self.assertEqual(out['model_a'].get('error', None), None)
        self.assertTrue(out['model_a'].get('digest', False))
        self.assertEqual(str(decode_rdata(out['model_a']['rdata'])), '   print\n0 Whoops\n')
        self.assertEqual(out['model_b']['log'], '')
        self.assertEqual(out['model_b'].get('error', None), '[1] "B went wrong!Oh noes"\n')
        self.assertFalse(out['model_b'].get('digest', False))
        self.assertNotIn('rdata', out['model_b'])
