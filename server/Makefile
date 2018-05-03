PROJECT=ffdb

all: compile test lint

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
	find . -name '*.pyc' -exec rm -- {} \;
	find . -name '__pycache__' -exec rm -r -- {} \;

test: lib/.requirements
	./bin/py.test tests/

lint: lib/.requirements
	./bin/flake8 --ignore=E501 ffdb/ tests/

.PHONY: compile test lint start clean
