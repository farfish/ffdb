GIT = git
YARN = yarn
NODE = node
NODE != which node || which nodejs
NODE_CMD = NODE_PATH="$(CURDIR)" $(NODE)
SHELL=/bin/bash -o pipefail

OUTPUTS := index upload

OUT_FILES = \
    www/js/polyfill.min.js \
    www/js/libraries.min.js \
    www/css/libraries.min.css \
    $(foreach O,$(OUTPUTS),www/$(O).html www/js/$(O).min.js www/css/$(O).min.css)

LIBRARIES_JS = \
    file-saver \
    handsontable \
    jquery \
    selectize \
    xlsx \

LIBRARIES_CSS = \
    node_modules/bootstrap/dist/css/bootstrap-reboot.min.css \
    node_modules/handsontable/dist/handsontable.min.css \
    node_modules/selectize/dist/css/selectize.default.css

all: test lint compile

compile: node_modules/ $(OUT_FILES)

test: node_modules/
	$(NODE_CMD) node_modules/.bin/tape tests/test_*.js

coverage: node_modules/
	$(NODE_CMD) node_modules/istanbul/lib/cli.js cover node_modules/tape/bin/tape tests/test_*.js

lint: node_modules/
	$(NODE_CMD) node_modules/jslint/bin/jslint */*.js

clean:
	rm -r -- "node_modules/" || true
	rm -- $(OUT_FILES) || true

node_modules/: package.json yarn.lock
	$(YARN)
	touch node_modules/

yarn.lock:
	touch $@

www/js/libraries.min.js: package.json
	mkdir -p www/js
	(cd www/js && ln -sf ../../node_modules .)
	$(NODE_CMD) node_modules/browserify/bin/cmd.js \
	        $(foreach l,$(LIBRARIES_JS),-r $(l)) \
	    | $(NODE_CMD) node_modules/uglify-js/bin/uglifyjs \
	        --compress --mangle "reserved=['$$','require','exports']" \
	        --output $@.mktmp
	mv $@.mktmp $@

www/css/libraries.min.css: package.json
	mkdir -p www/css
	cp node_modules/chosen-js/chosen-sprite*.png www/css/
	cat $(LIBRARIES_CSS) > $@.mktmp
	mv $@.mktmp $@

www/js/%.min.js: lib/%.js lib/*.js package.json
	mkdir -p www/js
	(cd www/js && ln -sf ../../lib .)
	$(NODE_CMD) node_modules/.bin//browserify --debug \
	        $(foreach l,$(LIBRARIES_JS),-x $(l)) \
	        $< \
	    | $(NODE_CMD) node_modules/.bin/uglifyjs \
	        --compress --mangle "reserved=['$$','require','exports']" \
	        --source-map "content='inline',url='$(notdir $@).map'" \
	        --output $@.mktmp
	mv $@.mktmp.map $@.map
	mv $@.mktmp $@

www/css/%.min.css: lib/%.css lib/*.css package.json
	mkdir -p www/css
	(cd www/css && ln -sf ../../lib .)
	$(NODE_CMD) node_modules/postcss-cli/bin/postcss \
	    --config postcss.config.js \
	    -o $@ \
	    $<

www/%.html: lib/%.html $(filter-out %.html,$(OUT_FILES)) \
    ../.local-conf \
    package.json
	cat $< > $@.mktmp
	mv $@.mktmp $@

.PHONY: compile test lint clean
