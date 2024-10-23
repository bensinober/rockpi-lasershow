// Bun server with static file serving
const BASE_PATH = "./www"
import { $, Glob } from "bun"
import { spawn } from "node:child_process"

let ildaProc    = null  // placeholder for running lasershow Process

const httpServer = Bun.serve({
  port: 8443,
  host: "0.0.0.0",
  tls: {
    cert: Bun.file("cert.pem"),
    key: Bun.file("key.pem"),
  },
  async fetch(req, server) {
    const url = new URL(req.url);
    switch (url.pathname) {

    case "/api/status":
      return new Response("OK")
      break

    case "/api/upload":
      try {
        const formData = await req.formData()
        const filename = formData.get("name")
        //const filename = name.replace(/[^a-z0-9]/gi, "-").toLowerCase()
        const image = formData.get("image")
        if (!image) throw new Error("Must upload a svg picture.")
        const svgPath = `${BASE_PATH}/images/${filename}.svg`
        const ildaPath = `${BASE_PATH}/ilda/${filename}.ild`
        await Bun.write(svgPath, image)
        try {
          // convert svg to ilda and send arraybuffer in response
          const output = await $`python ../tools/svg2ild.py ${svgPath} ${ildaPath}`.text()
          const ildaFile = await Bun.file(ildaPath)
          return new Response(ildaFile)
        } catch(err) {
          console.log(`Failed with code ${err.exitCode}`)
          console.log(err.stdout.toString())
          console.log(err.stderr.toString())
          throw new Error("failed converting svg")
        }
      } catch(err) {
        console.log(err)
        return new Response(null, { status: 500 })
      }
      break

    case "/api/loadilda":
      try {
        const { searchParams } = new URL(req.url)
        const filename = await searchParams.get("file")
        const file = Bun.file(`${BASE_PATH}/ilda/${filename}`)
        return new Response(file)
      } catch(err) {
        console.log(err)
      }
      break

    case "/api/startFazer":
      try {
        const { searchParams } = new URL(req.url)
        const name = searchParams.get("name")
        if (ildaProc !== null) {
          console.log("lasershow already running - stopping first!")
          ildaProc.kill()
          //await ildaProc.exited
        }
        if (name) {
          ildaProc = spawn("../lasershow", ["0", `${BASE_PATH}/ilda/${name}.ild`])
          ildaProc.on("exit", () => {
            ildaProc.kill()
          })
          /* not working - unable to kill child process
          ildaProc = Bun.spawn([`../lasershow`, "0", `${BASE_PATH}/ilda/${name}.ild`], {
            //cwd: ".", // specify a working directory
            //env: { ...process.env }, // specify environment variables
            onExit(proc, exitCode, signalCode, error) {
              // exit handler
              console.log(`EXIT CODE: ${exitCode}, SIGNAL CODE: ${signalCode}`)
              ildaProc = null
            },
          })
          */
          return new Response("OK")
        } else {
          return new Response(null, { status: 400 })
        }
      } catch(err) {
        console.log(err)
      }
      break

    case "/api/stopFazer":
      try {
        if (ildaProc !== null) {
          ildaProc.kill()
          return new Response("OK")
        } else {
          return new Response(null, { status: 400 })
        }
      } catch(err) {
        console.log(err)
      }
      break

    case "/images":
      const glob = new Glob(`${BASE_PATH}/images/*.svg`)
      for await (const file of glob.scan(".")) {
        console.log(file)
      }
      break

    default:
      const filePath = BASE_PATH + url.pathname
      const file = Bun.file(filePath)
      return new Response(file)
    }
  },
  error() {
    return new Response(null, { status: 404 })
  },
})
console.log(`Bun http Server listening on ${httpServer.hostname}:${httpServer.port}`)
