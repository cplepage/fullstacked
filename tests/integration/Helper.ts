import child_process from "child_process";
import puppeteer from "puppeteer";
import v8toIstanbul from "v8-to-istanbul";
import fs from "fs";
import {killProcess} from "scripts/utils";
import {sleep} from "utils";

export default class {
    dir;
    serverProcess;
    browser;
    page;

    constructor(dir) {
        this.dir = dir
        const logMessage = child_process.execSync(`fullstacked --src=${this.dir} --out=${this.dir} --silent`)
        if(logMessage)
            console.log(logMessage.toString());
    }

    async start(path: string = ""){
        this.serverProcess = child_process.exec("node " + this.dir + "/dist/index.js");
        this.browser = await puppeteer.launch({headless: false});
        this.page = await this.browser.newPage();
        await this.page.coverage.startJSCoverage({
            includeRawScriptCoverage: true,
            resetOnNavigation: false
        });
        await this.page.goto("http://localhost:8000" + path);

        process.on('uncaughtException', err => {
            if(this.serverProcess?.kill)
                this.serverProcess.kill();

            if(this.browser?.close)
                this.browser.close();

            console.error(err);
            process.exit(1);
        });
    }

    async stop(){
        const jsCoverage = (await this.page.coverage.stopJSCoverage()).map(({rawScriptCoverage: coverage}) => {
            const file = (new URL(coverage.url)).pathname;
            if(!file.endsWith(".js"))
                return false;
            return {
                ...coverage,
                url: this.dir + "/dist/public" + file
            }
        }).filter(Boolean);

        for (let i = 0; i < jsCoverage.length; i++) {
            const script = v8toIstanbul(jsCoverage[i].url);
            await script.load();
            script.applyCoverage(jsCoverage[i].functions);
            fs.writeFileSync(process.cwd() + "/.nyc_output/webapp-" +
                Math.floor(Math.random() * 10000) + "-" + Date.now() + ".json", JSON.stringify(script.toIstanbul()))
            script.destroy();
        }

        await this.browser.close();
        this.serverProcess.kill();
        await killProcess(this.serverProcess, 8000)
    }
}
