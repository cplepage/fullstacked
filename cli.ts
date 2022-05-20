#!/usr/bin/env node
import defaultConfig from "./scripts/config";

const scripts = {
    "create": "./scripts/create",
    "build" : "./scripts/build",
    "watch" : "./scripts/watch",
    "deploy": "./scripts/deploy",
    "test": "./scripts/test"
};
let script = "build"

let config: Config = {}
const args = {
    "--src=": value => config.src = value,
    "--out=": value => config.out = value,
    "--port=": value => config.port = value,
    "--port-https=": value => config.portHTTPS = value,
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
    "--rootless": () => config.rootless = true
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
