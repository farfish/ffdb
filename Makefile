compile:
	for dir in client server; do make -C $$dir $@; done

test:
	for dir in client server; do make -C $$dir $@; done

start:
	for dir in client server; do make -C $$dir $@; done

.PHONY: compile start