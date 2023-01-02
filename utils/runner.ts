import {execScript, getNextAvailablePort, isDockerInstalled, maybePullDockerImage} from "./utils";
import path, {resolve} from "path";
import DockerCompose from "dockerode-compose";
import {FullStackedConfig} from "../index";
import {Writable} from "stream";
import os from "os";
import readline from "readline";

export default class Runner {
    config: FullStackedConfig;
    nodePort: number;
    dockerCompose: any;

    constructor(config: FullStackedConfig) {
        this.config = config;
        this.dockerCompose = new DockerCompose(this.config.docker, resolve(this.config.dist, "docker-compose.yml"), this.config.name);

        if(!isDockerInstalled())
            throw new Error("Cannot run app without Docker and Docker-Compose");

        if(os.platform() === "win32"){
            //source : https://stackoverflow.com/a/48837698
            readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            }).on('close', function() {
                process.emit('SIGINT')
            })
        }

        let printStopOnce = false;
        process.on("SIGINT", async () => {
            if(!config.silent && !printStopOnce) {
                console.log('\x1b[33m%s\x1b[0m', "Stopping!");
                printStopOnce = true;
            }

            await this.stop();
            process.exit(0);
        });
    }

    async start(): Promise<number> {
        await execScript(path.resolve(this.config.src, "prerun.ts"), this.config);

        try{
            await this.dockerCompose.down();
        }catch(e){}

        // setup exposed ports
        const services = Object.keys(this.dockerCompose.recipe.services);
        let availablePort = 8000;

        for(const service of services){
            const serviceObject = this.dockerCompose.recipe.services[service];

            await maybePullDockerImage(this.config.docker, serviceObject.image);

            const exposedPorts = serviceObject.ports;

            if(!exposedPorts) continue;

            for (let i = 0; i < exposedPorts.length; i++) {
                if(exposedPorts[i].toString().includes(":")) continue;

                availablePort = await getNextAvailablePort(availablePort);

                serviceObject.ports[i] = `${availablePort}:${exposedPorts[i]}`;

                if(service === "node") this.nodePort = availablePort;

                availablePort++;
            }
        }

        // force pull process
        if(this.config.pull) {
            console.log("Pulling latest images")
            await this.dockerCompose.pull();
        }

        await this.dockerCompose.up();

        await execScript(path.resolve(this.config.src, "postrun.ts"), this.config);

        return this.nodePort;
    }

    async restart(){
        await this.config.docker.getContainer(this.dockerCompose.projectName + '_node_1').restart({t: 0});
    }

    // attach to docker-compose
    async attach(stdout: Writable, containerName = "node"){
        const container = this.config.docker.getContainer(`${this.dockerCompose.projectName}_${containerName}_1`);
        const stream = await container.attach({stream: true, stdout: true, stderr: true});
        container.modem.demuxStream(stream, stdout, stdout);
    }

    async stop(){
        const services = Object.keys(this.dockerCompose.recipe.services);
        await Promise.all(services.map(serviceName => new Promise<void>(async resolve => {
            try{
                const container = await this.config.docker.getContainer(`${this.dockerCompose.projectName}_${serviceName}_1`);
                if((await container.inspect()).State.Status === 'running')
                    await container.stop({t: 0});
                await container.remove({force: true, v: true});
            }catch (e) {}

            resolve();
        })));
        try{
            await this.dockerCompose.down({ volumes: true });
        }catch (e){}
    }
}
