#!/usr/bin/env node
import defaultConfig from "./scripts/config";

const scripts = {
    "create": "./scripts/create",
    "build" : "./scripts/build",
    "run"   : "./scripts/run",
    "watch" : "./scripts/watch",
    "deploy": "./scripts/deploy",
    "test"  : "./scripts/test"
};
let script = "run"

let config: Config = {}
const args = {
    "--src=": value => config.src = value,
    "--out=": value => config.out = value,
    "--port=": value => config.port = value,
    "--host=": value => config.host = value,
    "--ssh-port=": value => config.sshPort = parseInt(value),
    "--user=": value => config.user = value,
    "--pass=": value => config.pass = value,
    "--private-key=": value => config.privateKey = value,
    "--app-dir=": value => config.appDir = value,
    "--silent": () => config.silent = true,
    "--coverage": () => config.coverage = true,
    "--headless": () => config.headless = true,
    "--skip-test": () => config.skipTest = true,
    "--y": () => config.allYes = true,
    "--server-name=": value => config.serverName = value,
    "--version=": value => config.version = value,
    "--name=": value => config.name = value,
    "--title=": value => config.title = value,
    "--no-nginx": () => config.noNginx = true
};

process.argv.forEach(arg => {
    Object.keys(scripts).forEach(availableScript => {
        if(availableScript === arg)
            script = availableScript;
    });

    Object.keys(args).forEach(anchor => {
        if(arg.startsWith(anchor))
            args[anchor](arg.slice(anchor.length));
    });
});

require(scripts[script]).default(defaultConfig(config));
