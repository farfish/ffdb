EGG_NAME=ffdb
SHELL=/bin/bash -o pipefail

all: compile test lint

bin/pip:
	python3 -m venv .

lib/.requirements: requirements.txt requirements-to-freeze.txt setup.py bin/pip
	# Install frozen requirements
	./bin/pip install -r requirements.txt
	# Make sure any new requirements are available
	./bin/pip install -r requirements-to-freeze.txt
	# Freeze the output at current state
	./bin/pip freeze | grep -v egg=$(EGG_NAME) > requirements.txt
	touch lib/.requirements

upgrade:
	./bin/pip install -r requirements-to-freeze.txt --upgrade
	./bin/pip freeze | grep -v egg=$(EGG_NAME) > requirements.txt

compile: lib/.requirements

start: lib/.requirements test
	./bin/uwsgi \
	    --master \
	    --processes=1 --threads=1 \
	    --enable-threads --thunder-lock \
	    --honour-stdin \
	    --mount /=$(EGG_NAME).web:app \
	    --chmod-socket=666 \
	    -s /tmp/$(EGG_NAME)_uwsgi.development.sock

clean:
	rm -rf -- ./bin ./include ./lib ./local ./share
	find . -name '*.pyc' -exec rm -- {} \;
	find . -name '__pycache__' -exec rm -r -- {} \;

test: lib/.requirements
	./bin/py.test tests/

lint: lib/.requirements
	./bin/flake8 --ignore=E501 $(EGG_NAME)/ tests/

.PHONY: upgrade compile test lint start clean
