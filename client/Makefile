GIT = git
YARN = yarn
NODE = node
NODE != which node || which nodejs
NODE_PATH = node_modules
NODE_CMD = NODE_PATH="$(NODE_PATH)" $(NODE)

OUT_FILES = \
    www/js/app.min.js \
    www/css/app.min.css \
    www/js/polyfill.min.js \
    www/js/libraries.min.js \
    www/css/libraries.min.css \

LIBRARIES_JS = \
    papaparse \
    handsontable \
    jquery/dist/jquery.slim.js \

LIBRARIES_CSS = \
    node_modules/bootstrap/dist/css/bootstrap-reboot.min.css \
    node_modules/handsontable/dist/handsontable.min.css \

all: test lint compile

compile: $(NODE_PATH) $(OUT_FILES)

test: $(NODE_PATH)
	$(NODE_CMD) $(NODE_PATH)/tape/bin/tape tests/test_*.js

coverage: $(NODE_PATH)
	$(NODE_CMD) node_modules/istanbul/lib/cli.js cover $(NODE_PATH)/tape/bin/tape tests/test_*.js

lint: $(NODE_PATH)
	$(NODE_CMD) $(NODE_PATH)/jslint/bin/jslint */*.js

clean:
	rm -r -- "$(NODE_PATH)"
	rm -- www/js/*.min.js www/css/*.min.css

$(NODE_PATH): package.json
	NODE_PATH="$(NODE_PATH)" $(YARN)
	touch $(NODE_PATH)

www/js/libraries.min.js: package.json
	mkdir -p www/js
	(cd www/js && ln -sf ../../node_modules .)
	$(NODE_CMD) $(NODE_PATH)/browserify/bin/cmd.js \
	        $(foreach l,$(LIBRARIES_JS),-r $(l)) \
	        -g uglifyify \
	    > $@.mktmp
	mv $@.mktmp $@

www/css/libraries.min.css: package.json
	mkdir -p www/css
	cp node_modules/chosen-js/chosen-sprite*.png www/css/
	cat $(LIBRARIES_CSS) > $@.mktmp
	mv $@.mktmp $@

www/js/%.min.js: package.json %/*
	mkdir -p www/js
	(cd www/js && ln -sf ../../$(basename $(basename $(notdir $@))) .)
	$(NODE_CMD) $(NODE_PATH)/browserify/bin/cmd.js --debug \
	        $(foreach l,$(LIBRARIES_JS),-x $(l)) \
	        -g uglifyify \
	        $(basename $(basename $(notdir $@)))/index.js \
	    | $(NODE_CMD) $(NODE_PATH)/exorcist/bin/exorcist.js $@.map \
	        --base . \
	        --root /js/ \
	        --url /js/$(notdir $@).map \
	    > $@.mktmp
	mv $@.mktmp $@

www/css/%.min.css: package.json %/css/*
	cat $(basename $(basename $(notdir $@)))/css/* > $@.mktmp
	mv $@.mktmp $@

.PHONY: compile test lint clean
