import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

// Real PostgreSQL, no published port, no mounted volumes, no external credentials.
const name = "mini-ats-rls-" + randomUUID();
let owned = false;
function docker(args, input) {
  return execFileSync("docker", args, {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
}
try {
  docker([
    "run",
    "--rm",
    "--detach",
    "--name",
    name,
    "--network",
    "none",
    "--env",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "postgres:17",
  ]);
  owned = true;
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      docker(["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"]);
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!ready) throw new Error("Disposable PostgreSQL failed to start.");
  function run(path) {
    docker(
      [
        "exec",
        "-i",
        name,
        "psql",
        "-U",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-1",
      ],
      readFileSync(path, "utf8"),
    );
    console.log("PASS database:", path);
  }
  run("tests/local-supabase-bootstrap.sql");
  for (const file of readdirSync("supabase/migrations")
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    if (file === "20261013062712_production_hardening.sql")
      run("tests/upgrade-before.sql");
    run("supabase/migrations/" + file);
  }
  run("tests/upgrade-after.sql");
  run("tests/workspace-rls.sql");
  run("tests/hardening-rls.sql");
} finally {
  if (owned) docker(["stop", "--time", "5", name]);
}
