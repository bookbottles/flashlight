#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" # This loads nvm
echo "Starting Deployment..."
printenv
cd /srv/vemos/flashlight
git pull origin master && nvm use 5.4 && npm install && pm2 startOrRestart prod.ecosystem.json5
