import path from "path";
import fs from "fs";
import glob from "glob";
import {
    askQuestion,
    askToContinue,
    execScript,
    execSSH,
    getSFTPClient,
    uploadFileWithProgress
} from "./utils";
import build from "./build";
import test from "./test";
import yaml from "yaml";
import Docker from "./docker";
import version from "../version";

/*
*
* 1. try to connect to remote host
* 2. check if docker and docker-compose is installed
* 3. check if app at version is already deployed
* 4. run tests
* 5. build app production mode
* 6. load .fullstacked.json
* 7. determine hostnames required, missing, ask
* 8. save hostnames info locally (.fullstacked.json)
* 9. setup project docker-compose and nginx.conf files
* 10. make sure App Directory exists
* 11. ship built app
* 12. predeploy script
* 13. pull/up/restart built app
* 14. ship and up/restart fullstacked-server
* 15. postdeploy script
* 16. clean up
*
 */

async function getAvailablePorts(ssh2, count: number, startingPort: number = 8001): Promise<string[]> {
    const dockerContainerPorts = await execSSH(ssh2, "docker container ls --format \"{{.Ports}}\" -a");
    const portsInUse = dockerContainerPorts.split("\n").map(portUsed =>
        portUsed.split(":").pop().split("->").shift()) // each line looks like "0.0.0.0:8000->8000/tcp"
        .map(port => parseInt(port)) // cast to number
        .filter(port => port || !isNaN(port)); // filter empty strings


    const availablePorts = [];
    while (availablePorts.length < count){
        if(!portsInUse.includes(startingPort))
            availablePorts.push(startingPort);
        startingPort++;
    }

    return availablePorts;
}

async function uploadFilesToServer(localPath, remotePath, sftp){
    const files = glob.sync("**/*", {cwd: localPath})
    const localFiles = files.map(file => path.resolve(localPath, file));

    for (let i = 0; i < files.length; i++) {
        const fileInfo = fs.statSync(localFiles[i]);
        if(fileInfo.isDirectory())
            await sftp.mkdir(remotePath + "/" + files[i]);
        else
            await uploadFileWithProgress(sftp, localFiles[i], remotePath + "/" + files[i], `[${i + 1}/${files.length}] `);
    }
}

export default async function (config: Config) {
    console.log('\x1b[33m%s\x1b[0m', "You are about to deploy " + config.name + " v" + config.version);
    if(!await askToContinue("Continue"))
        return;

    // 1.
    let sftp = await getSFTPClient(config);

    // 2.
    await Docker(sftp);

    // 3.
    const serverAppDir = config.appDir + "/" + config.name;
    const serverAppDistDir = serverAppDir + "/" + config.version;
    let mustOverWriteCurrentVersion = false;
    if(await sftp.exists(serverAppDistDir)){
        console.log('\x1b[33m%s\x1b[0m', "Version " + config.version + " is already deployed");
        if(!await askToContinue("Overwrite [" + serverAppDistDir + "]")) {
            await sftp.end();
            return;
        }

        mustOverWriteCurrentVersion = true;
    }

    // 4.
    if(!config.skipTest){
        await sftp.end()
        console.log('\x1b[32m%s\x1b[0m', "Launching Tests!");
        test({
            ...config,
            headless: true,
            coverage: true
        });
        sftp = await getSFTPClient(config);
    }

    // 5.
    await build({
        ...config,
        production: true
    });

    // 6.
    let hostnames: {
        [service: string]: {
            [service_port: string]: {
                server_name: string,
                nginx_extra_configs: string
            }
        }
    } = {};
    const fullstackedConfig = path.resolve(config.src, ".fullstacked.json");
    if(fs.existsSync(fullstackedConfig)) hostnames = JSON.parse(fs.readFileSync(fullstackedConfig, {encoding: "utf-8"}));

    // 7.
    const dockerComposeFile = path.resolve(config.dist, "docker-compose.yml");
    const dockerCompose = yaml.parse(fs.readFileSync(dockerComposeFile, {encoding: "utf-8"}));
    const services = Object.keys(dockerCompose.services);
    for(const service of services){
        const ports = dockerCompose.services[service].ports;
        if(!ports) continue;

        for(const port of ports){
            if(hostnames[service] && hostnames[service][port]) continue;

            const domain = await askQuestion(`Enter domain (example.com) or multiple domains (split with space : example.com www.example.com) for ${service} at ${port}\n`);

            if(!hostnames[service]) hostnames[service] = {};
            hostnames[service][port] = {
                server_name: domain ?? `http://0.0.0.0:${port}`,
                nginx_extra_configs: ""
            };

        }
    }

    // 8.
    fs.writeFileSync(fullstackedConfig, JSON.stringify(hostnames, null, 2));

    // 9.
    const neededPortsCount = Object.keys(hostnames).map(service => Object.keys(hostnames[service]).filter(port => port.startsWith("${PORT}"))).flat().length;
    const availablePorts = await getAvailablePorts(sftp.client, neededPortsCount);

    const nginxFile = path.resolve(config.dist, "nginx.conf");

    const nginxTemplate = fs.readFileSync(path.resolve(__dirname, "..", "nginx.conf"), {encoding: "utf-8"});

    let nginxConf = ""

    Object.keys(dockerCompose.services).forEach(service => {
        if(!dockerCompose.services[service].ports) return;

        dockerCompose.services[service].ports.forEach((port, index) => {
            let externalPort = port.split(":").at(0);
            if(externalPort === "${PORT}"){
                externalPort = availablePorts.shift();
                dockerCompose.services[service].ports[index] = externalPort + port.substring("${PORT}".length);
            }

            nginxConf += nginxTemplate.replace(/\{PORT\}/g, externalPort)
                .replace(/\{SERVER_NAME\}/g, hostnames[service][port].server_name)
                .replace(/\{APP_NAME\}/g, config.name)
                .replace(/\{VERSION\}/g, config.version)
                .replace(/\{EXTRA_CONFIGS\}/g, hostnames[service][port].nginx_extra_configs ?? "")
                .replace(/\{DOMAIN\}/g, hostnames[service][port].server_name.split(" ").at(0));
        });
    });

    fs.writeFileSync(dockerComposeFile, yaml.stringify(dockerCompose));
    fs.writeFileSync(nginxFile, nginxConf);

    // 10.
    if(await sftp.exists(serverAppDir)) await execSSH(sftp.client, `sudo chown ${config.user}:${config.user} ${serverAppDir}`);
    else await sftp.mkdir(serverAppDir, true);


    // 11.
    if(mustOverWriteCurrentVersion) await sftp.rmdir(serverAppDistDir, true);
    await sftp.mkdir(serverAppDistDir, true);
    await uploadFilesToServer(config.dist, serverAppDir, sftp);
    console.log('\x1b[32m%s\x1b[0m', "\nUpload completed");

    // 12.
    await execScript(path.resolve(config.src, "predeploy.ts"), config, sftp);

    // 13.
    if(config.pull){
        await execSSH(sftp.client, `docker-compose -p ${config.name} -f ${serverAppDir}/docker-compose.yml stop`);
        await execSSH(sftp.client, `docker-compose -p ${config.name} -f ${serverAppDir}/docker-compose.yml rm -f`);
        await execSSH(sftp.client, `docker-compose -p ${config.name} -f ${serverAppDir}/docker-compose.yml pull`);
        await execSSH(sftp.client, `docker-compose -p ${config.name} -f ${serverAppDir}/docker-compose.yml up -d`);
    }else{
        await execSSH(sftp.client, `docker-compose -p ${config.name} -f ${serverAppDir}/docker-compose.yml up -d`);
        await execSSH(sftp.client, `docker-compose -p ${config.name} -f ${serverAppDir}/docker-compose.yml restart -t 0`);
    }

    // 14.
    const fullstackedServerDist = path.resolve(__dirname, "..", "fullstacked-server", "dist");
    console.log("Uploading FullStacked Server");
    // ship
    const fullstackedServerRemoteDir = config.appDir + "/fullstacked-server";
    await sftp.mkdir(fullstackedServerRemoteDir, true);
    await uploadFilesToServer(fullstackedServerDist, fullstackedServerRemoteDir, sftp);
    // up/restart
    await execSSH(sftp.client, `docker-compose -p fullstacked-server -f ${fullstackedServerRemoteDir}/docker-compose.yml up -d`);
    await execSSH(sftp.client, `docker-compose -p fullstacked-server -f ${fullstackedServerRemoteDir}/docker-compose.yml restart -t 0`);


    // 15.
    await execScript(path.resolve(config.src, "postdeploy.ts"), config, sftp);

    // 16.
    await sftp.end();
    if(!config.silent)
        console.log('\x1b[32m%s\x1b[0m', config.name + " v" + config.version + " deployed!");
    return process.exit(0);
}



/*
* e.g.,
* {APP_DIR} <-- config.appDir
* ├── nginx.conf
* ├── docker-compose.yml
* ├── /0.9.0 <-- FullStacked Portal
* │   └── ...
* ├── /project-1 <-- serverAppDir
* │   ├── docker-compose.yml
* │   ├── nginx.conf
* │   ├── /0.0.1 <-- serverAppDistDir
* │   │   ├── index.js
* │   │   └── /public
* │   │       └── ...
* │   └── /0.0.2
* │      ├── index.js
* │      └── /public
* │          └── ...
* └── /project-2
*     └── ...
*/
