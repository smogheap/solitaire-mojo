# Solitaire Collection
################################################################################

beta:
	rm -rf .active 2>/dev/null || true
	ln -s beta/full .active

debug:
	rm -rf .active 2>/dev/null || true
	ln -s debug/full .active

release:
	rm -rf .active 2>/dev/null || true
	ln -s release/full .active

# Freecell (Free version which allows unlimited plays of freecell and limited
# plays of other games)
################################################################################

free-beta:
	rm -rf .active 2>/dev/null || true
	ln -s beta/free .active

free-debug:
	rm -rf .active 2>/dev/null || true
	ln -s debug/free .active

free-release:
	rm -rf .active 2>/dev/null || true
	ln -s release/free .active

################################################################################



all: lint
	rm -rf .tmp 2>/dev/null || true
	mkdir .tmp
	cp -r app images stylesheets resources index.html sources.json .tmp
	cp -r .active/appinfo.json .active/framework_config.json .active/icon.png .tmp || true
	cp .active/minego-app.js .tmp/app/models/ || true
	palm-package .tmp
	rm -rf .tmp

install: all
	palm-install *.ipk

clean:
	rm *.ipk 2>/dev/null || true
	rm -rf .tmp 2>/dev/null || true

appid:
	grep '"id"' .active/appinfo.json | cut -d: -f2 | cut -d'"' -f2 > .active/appid

launch: install appid
	palm-launch -i `cat .active/appid`

log: appid
	-palm-log -f `cat .active/appid` | sed -u							\
		-e 's/\[[0-9]*-[0-9]*:[0-9]*:[0-9]*\.[0-9]*\] [a-zA-Z]*: //'	\
		-e 's/indicated new content, but not active./\n\n\n/'

lint:
	cat sources.json				| \
		grep -v "minego-app.js"		| \
		grep "source"				| \
		sed 's/.*\"source\"://'		| \
		cut -d'"' -f2				| \
		xargs -L1 -I{} jsl -nologo -nofilelisting -nosummary -nocontext -conf jsl.conf -process {}

test: launch log
	true

.PHONY: beta debug release clean

