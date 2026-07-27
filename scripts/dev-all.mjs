import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const commands = [
  {
    name: "BACKEND",
    command: resolve(root, "node_modules/@nestjs/cli/bin/nest.js"),
    args: ["start", "--watch"],
  },
  {
    name: "FRONTEND",
    command: resolve(root, "node_modules/next/dist/bin/next"),
    args: ["dev", "frontend", "-p", "3000"],
  },
];

const children = commands.map(({ name, command, args }) => {
  const child = spawn(process.execPath, [command, ...args], {
    cwd: root,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  });

  child.stdout.on("data", (data) => process.stdout.write(`[${name}] ${data}`));
  child.stderr.on("data", (data) => process.stderr.write(`[${name}] ${data}`));
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] đã dừng với mã lỗi ${code}.`);
      stopAll(code);
    }
  });
  return child;
});

let stopping = false;
function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 300);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
