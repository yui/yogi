all:
	npm install

help:
	./bin/yogi.js --help | tail -n+8  > ./conf/docs/partials/help.mustache

docs: version help
	./node_modules/.bin/selleck --project conf/docs/ ./docs/ --output ./output

deploydocs: docs
	rm -rRf ../yogi-pages/*
	cp -R ./output/* ../yogi-pages/

lint:
	npm run-script pretest

test:
	npm test

version:
	./scripts/versions.js

.PHONY: lint test docs help version deploydocs
