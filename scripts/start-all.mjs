import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const children = [
  spawn(process.execPath, [resolve(root, "dist/main.js")], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  }),
  spawn(
    process.execPath,
    [resolve(root, "node_modules/next/dist/bin/next"), "start", "frontend", "-p", "3000"],
    { cwd: root, env: process.env, stdio: "inherit" },
  ),
];

function stop() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

for (const child of children) child.on("exit", stop);
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
