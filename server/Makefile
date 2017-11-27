PROJECT=ffdb

all: compile test

compile: lib/.requirements
	./bin/pip install -e .

bin/pip:
	python3 -m venv .

lib/.requirements: requirements.txt \
    bin/pip
	./bin/pip install -r requirements.txt
	touch lib/.requirements

start: lib/.requirements test
	./bin/uwsgi \
	    --master \
	    --processes=1 --threads=1 \
	    --enable-threads --thunder-lock \
	    --honour-stdin \
	    --mount /=$(PROJECT).web:app \
	    --chmod-socket=666 \
	    -s /tmp/$(PROJECT)_uwsgi.development.sock

clean:
	rm -rf -- ./bin ./include ./lib ./local ./share
	find ./$(PROJECT) -name '*.pyc' -exec rm -- {} \;

test: lib/.requirements
	./bin/py.test tests/

.PHONY: compile test start