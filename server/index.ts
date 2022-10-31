import path from "path";
import fs from "fs";
import http, {IncomingMessage, RequestListener, ClientRequest, ServerResponse} from "http";
import mime from "mime-types";

export default class Server {
    server: http.Server;
    watcher;
    port: number = 80;
    publicDir = path.resolve(__dirname, './public');
    logger: (req: IncomingMessage) => void = null;
    reqListeners = [];

    constructor() {
        if(process.argv.includes("--development")){
            this.logger = (req: IncomingMessage) => {
                console.log(req.method, req.url);
            }
        }

        this.server = http.createServer(async (req, res) => {
            if(this.logger) this.logger(req);

            for (const reqListener of this.reqListeners) {
                const maybePromise = reqListener(req, res);
                if(maybePromise instanceof Promise)
                    await maybePromise;
            }
        });
    }

    addListener(requestListener?: RequestListener<typeof IncomingMessage, typeof ServerResponse>){
        this.reqListeners.push(requestListener);
    }


    start(args: {silent?: boolean, testing?: boolean} = {silent: false, testing: false}){
        // prevent starting server by import
        // source: https://stackoverflow.com/a/6398335
        if (require.main !== module && !args.testing) return;

        this.addListener((req, res) => {
            const url = new URL(this.publicDir + req.url, "http://localhost");

            const filePath = url.pathname +
                (url.pathname.endsWith("/")
                    ? "index.html"
                    : "");

            if(res.writableEnded) return;

            fs.readFile(filePath, (err,data) => {
                if (err) {
                    res.writeHead(404);
                    return res.end(JSON.stringify(err));
                }

                res.writeHead(200, {"content-type": mime.lookup(filePath)});
                res.end(data);
            });
        });

        this.server.listen(this.port);

        if(process.argv.includes("--development")){
            const watcherModule = require("./watcher");
            this.watcher = new watcherModule.default();
            this.watcher.init(this.server);
        }
    }

    stop(){
        this.server.close();
    }
}
