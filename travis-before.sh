#!/bin/bash

if [[ $TRAVIS_BRANCH == 'master' ]]
	then
	echo "Building Site Configs"
	grunt build-config
	echo "Building Chrome Extension"
	grunt chrome-extension
fi