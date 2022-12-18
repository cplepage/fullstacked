import axios from "axios";

export default function waitForServer(waitLimit: number, url: string = "http://localhost:8000", silent: boolean = false): Promise<void>{
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {

            axios.get(url, {
                timeout: 500,
                headers: {
                    "wait-for-server": startTime
                }
            })
                .then(() => {
                    clearInterval(interval)
                    resolve()
                })
                .catch((e) => {

                    if(Date.now() - startTime > waitLimit) {
                        if(!silent)
                            console.error("Max Wait Limit reached")
                        clearInterval(interval)
                        reject();
                    }

                })


        }, 550);
    });
}
