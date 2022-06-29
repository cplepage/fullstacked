> **Warning** <br />
> FullStacked is still in early development. Commands and syntax are likely to change.

# FullStacked
A full stack web app build tool and development kit.

[<img src="https://fullstacked.org/favicon.png" alt="FullStacked Logo" width="75px" />](https://fullstacked.org/)


[![version](https://img.shields.io/badge/version-0.3.5-01b0de)](https://www.npmjs.com/package/fullstacked)
[![dependencies](https://img.shields.io/badge/dependencies-18-yellowgreen)](https://www.npmjs.com/package/fullstacked?activeTab=dependencies)
[![module dependencies](https://img.shields.io/badge/module%20deps-360-yellow)](https://npmgraph.js.org/?q=fullstacked)
[![code coverage](https://img.shields.io/badge/coverage-81.55%25-yellowgreen)](https://cplepage.github.io/fullstacked-code-coverage/)


A complete setup for a Typescript full stack application.
It has all the Server(Backend) setup and the WebApp(Frontend) setup including features like :
* Create
* Run
* Build
  * w/ Code Splitting
* Watch
  * w/ WebApp auto reload & Server auto restart
* Test
  * w/ Code Coverage
* Deploy

### Build with
* [react](https://github.com/facebook/react) for Web App (Frontend)
* [express](https://github.com/expressjs/express) for Server (Backend)
* [mocha](https://github.com/mochajs/mocha) for Testing 

## Getting Started

1. Create a folder where you will develop your awesome web app
```shell
mkdir my-awesome-project
cd my-awesome-project
```
2. Init npm
```shell
npm init -y
```
3. Install FullStacked
```shell
npm i fullstacked
```
4. Create the default starter files
```shell
npx fullstacked create
```
5. Startup you project locally!
```shell
npx fullstacked watch
```
Open [http://localhost:8000](http://localhost:8000/) and start developing!

## Commands

| command | uses |
| --- | --- |
| npx fullstacked create | Generate the default files `index.tsx` and `server.ts` files. |
| npx fullstacked run | Run your web app. |
| npx fullstacked build | Build your app in production mode to your `dist` folder. |
| npx fullstacked watch | Rebuilds your app and hot reloads on changes. |
| npx fullstacked test | Run tests throughout your app. |
| npx fullstacked deploy | Ship a production build to a remote host to deploy your web app to the internet.|

see flags and requirements in the [docs](https://fullstacked.org/docs/commands)

## Motivation
As many web developer, I have changed my toolset more than once. I wasted
too much time on configs and figuring out how to deploy my apps. FullStacked aims to skip
all the configuration phases to instead, start developing as quickly as possible!

I also really like the iterative approach, so I look forward to implementing ways to help with 
sharing development environments for the purpose of testing and reviewing.

## Roadmap & Thoughts

* Create tests for `test` commands
* Save command line args to skip the typing afterwards
* Manage to create a simple and efficient way to test frontend component/class individually
* Add integration with [PWABuilder](https://github.com/pwa-builder/PWABuilder) to generate iOS and Android App
* Switch to [Deno](https://github.com/denoland/deno)
  * ✅ No transpiling needed (not even for TS!)
  * ✅ No *node_modules* installation needed
  * ⛔️ Making e2e tests (no puppeteer modules yet)
  * ⛔️ Filesystem less permissive
* Auto Import like [nuxt.js](https://v3.nuxtjs.org/guide/concepts/auto-imports/)
  * ✅ The dream
  * ⛔ Resources for indexing and resolving
  * ⛔ IDE needs extra plugins
* TypeScript Web Based IDE
  * Designed only for TypeScript projects, so it helps with all the main features
    * Typing
    * Autocomplete
    * Imports resolving
  * It must be enabled with PWA features, so that it feels like a native app
  * My goal would be to develop from an iPad Pro with all the same feature Desktop IDE provides.
