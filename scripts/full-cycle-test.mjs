import { createRequire } from "node:module";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const qaBuildDir = resolve(root, ".qa-build");
const tscPath = resolve(root, "node_modules", "typescript", "bin", "tsc");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error(`${command} ${args.join(" ")} failed`);
  }

  return result;
}

if (!existsSync(tscPath)) {
  throw new Error("TypeScript compiler not found. Run dependency install first.");
}

rmSync(qaBuildDir, { recursive: true, force: true });
run(process.execPath, [tscPath, "-p", "tsconfig.qa.json"]);
mkdirSync(qaBuildDir, { recursive: true });
writeFileSync(resolve(qaBuildDir, "package.json"), "{\"type\":\"commonjs\"}\n");

const require = createRequire(import.meta.url);
const harnessPath = resolve(qaBuildDir, "qa", "fullCycleHarness.js");

let report;
const originalLog = console.log;
console.log = (message, ...rest) => {
  if (typeof message === "string" && message.trim().startsWith("{")) {
    report = JSON.parse(message);
  }
  originalLog(message, ...rest);
};

require(harnessPath);

console.log = originalLog;

if (!report) {
  throw new Error("QA harness did not emit a JSON report.");
}

writeFileSync(resolve(root, "qa-results.json"), JSON.stringify(report, null, 2));
console.log(`Full-cycle QA passed: ${report.totals.passed} passed, ${report.totals.failed} failed.`);
