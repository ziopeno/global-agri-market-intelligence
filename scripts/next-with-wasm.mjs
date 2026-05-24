import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname } from "node:path";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const args = process.argv.slice(2);
const env = { ...process.env };

if (process.platform === "darwin") {
  const wasmPath = require.resolve("@next/swc-wasm-nodejs/wasm.js");
  env.NEXT_TEST_WASM = "1";
  env.NEXT_TEST_WASM_DIR = dirname(wasmPath);
}

const child = spawn(process.execPath, [nextBin, ...args], {
  env,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
