all:
	npm install

lint:
	npm run-script pretest

test:
	npm test

.PHONY: lint test
