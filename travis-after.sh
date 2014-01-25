#!/bin/bash

if [[ $TRAVIS_BRANCH == 'master' ]]
	then
	echo "Sending new site configs to master"
	cd ../../
	mkdir tempclone
	cd tempclone
	git clone $REPO.git waltz
	cd waltz
	git checkout master
	git config user.email "joe@wegnerdesign.com"
	git config user.name "Joseph Wegner"
	#cp ../../build/Waltz.zip deploy/ -f
	cp ../../waltzio/waltz/build/site_configs.json deploy/site_configs.json -f
	git add deploy/site_configs.json
	git commit -a -m "Committed from CI (build number - $((TRAVIS_JOB_ID - 1))) [ci skip]"
	git push origin master
fi