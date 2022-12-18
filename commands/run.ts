import Build from "./build.js";
import Runner from "../utils/runner.js";
import os from "os";
import readline from "readline";
import Restore from "./restore.js";
import {FullStackedConfig} from "../index";

let runner: Runner = null, didSetExitHook = false, printStopOnce = false;

export default async function(config: FullStackedConfig, build: boolean = true){
    if(build)
        await Build(config);

    if(!runner) {
        runner = new Runner(config);
        await runner.start();
        console.log("Web App Running at http://localhost:" + runner.nodePort);

        if(config.restored)
            await Restore(config);
    }else{
        await runner.restart();
    }

    await runner.attach(process.stdout);

    // set exit hook only once
    if(!didSetExitHook){
        if(os.platform() === "win32"){
            //source : https://stackoverflow.com/a/48837698
            readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            }).on('close', function() {
                process.emit('SIGINT')
            })
        }

        process.on("SIGINT", async () => {
            if(!config.silent && !printStopOnce) {
                console.log('\x1b[33m%s\x1b[0m', "Stopping!");
                printStopOnce = true;
            }

            if(runner)
                await runner.stop()
            process.exit(0);
        });

        didSetExitHook = true;
    }

    return runner;
}