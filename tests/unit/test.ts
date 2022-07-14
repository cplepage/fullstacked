import {describe} from "mocha";
import {equal, ok} from "assert";
import sleep from "fullstacked/scripts/sleep";
import waitForServer from "fullstacked/scripts/waitForServer";
import fs from "fs";
import path from "path";
import {copyRecursiveSync} from "../../scripts/utils";

describe("Unit Tests", function(){
    const oneSec = 1000;

    it('Should sleep near 1 second', async function(){
        const now = Date.now();
        await sleep(oneSec);
        ok(Date.now() - now > oneSec - 5);
    });

    it("Should error after max wait time", async function(){
        let success = false;
        let now = Date.now();
        try{
            await waitForServer(oneSec, undefined, true);
        }catch (e){
            ok(Date.now() - now > oneSec - 5);
            success = true;
        }
        ok(success);
    });

    it("Should copy recursively", function(){
        const dir = path.resolve(__dirname, "tempDir");
        fs.mkdirSync(dir);
        fs.writeFileSync(path.resolve(dir, "tempFile.txt"), "test");

        const copiedDir = path.resolve(__dirname, "tempDirCopy");
        copyRecursiveSync(dir, copiedDir);
        equal(fs.readFileSync(path.resolve(copiedDir, "tempFile.txt"), {encoding: "utf-8"}), "test");

        fs.rmSync(dir, {force: true, recursive: true});
        fs.rmSync(copiedDir, {force: true, recursive: true});
    });
});
