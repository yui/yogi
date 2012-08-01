all:
	npm install

lint:
	./node_modules/.bin/jslint --white --sloppy --node --stupid --nomen --plusplus  ./lib/*.js ./lib/*/*.js

test: lint
	./node_modules/.bin/vows ./tests/*.js

.PHONY: lint test
