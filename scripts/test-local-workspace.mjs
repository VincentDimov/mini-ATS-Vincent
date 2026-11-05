import { execFileSync, spawn } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { verifyLocalCv } from "./verify-local-cv.mjs";
import { createServerClient } from "@supabase/ssr";

// Never load .env here: this runner must not touch a connected production project.
const status = JSON.parse(
  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["--yes", "supabase@3.0.0", "status", "--output", "json"],
    {
      encoding: "utf8",
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ),
);
if (!["127.0.0.1", "localhost"].includes(new URL(status.API_URL).hostname))
  throw new Error("Only a local Supabase instance is allowed.");
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
function checked(result) {
  if (result.error) throw result.error;
  return result.data;
}
const suffix = randomUUID().slice(0, 8);
const accounts = {},
  organizationIds = [],
  userIds = [];
let server;
let exitCode = 1;
try {
  const organizations = checked(
    await admin
      .from("organizations")
      .insert([
        { name: "E2E Workspace A " + suffix },
        { name: "E2E Workspace B " + suffix },
      ])
      .select(),
  );
  organizationIds.push(...organizations.map((o) => o.id));
  for (const role of ["admin", "manager", "member", "other", "recovery"]) {
    const password = randomBytes(24).toString("base64url") + "!a7A";
    const email = `e2e-${role}-${suffix}@example.test`;
    const { user } = checked(
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      }),
    );
    userIds.push(user.id);
    const organizationId =
      role === "admin" ? null : organizations[role === "other" ? 1 : 0].id;
    checked(
      await admin.from("profiles").insert({
        id: user.id,
        email,
        full_name: "E2E " + role,
        role: role === "admin" ? "admin" : "customer",
        organization_id: organizationId,
        is_org_manager: role === "manager",
      }),
    );
    accounts[role] = { id: user.id, email, password, organizationId };
    const authProbe = createClient(status.API_URL, status.ANON_KEY, {
      auth: { persistSession: false },
    });
    checked(await authProbe.auth.signInWithPassword({ email, password }));
  }
  const jobs = checked(
    await admin
      .from("jobs")
      .insert([
        {
          organization_id: organizationIds[0],
          title: "E2E shared role",
          description: "Local test role",
          restricted: false,
        },
        {
          organization_id: organizationIds[0],
          title: "E2E private role",
          description: "Local confidential role",
          restricted: true,
        },
        {
          organization_id: organizationIds[1],
          title: "E2E other role",
          description: "Different tenant",
          restricted: false,
        },
      ])
      .select(),
  );
  const candidate = checked(
    await admin
      .from("candidates")
      .insert({
        organization_id: organizationIds[0],
        job_id: jobs[1].id,
        full_name: "E2E Candidate",
        email: "candidate@example.test",
      })
      .select()
      .single(),
  );
  await verifyLocalCv({ admin, status, accounts, jobs, organizationIds });
  const probeLink = checked(
    await admin.auth.admin.generateLink({
      type: "recovery",
      email: accounts.recovery.email,
    }),
  );
  let recoveryCookieCount = 0;
  const authProbe = createServerClient(status.API_URL, status.ANON_KEY, {
    cookies: {
      getAll: () => [],
      setAll: (values) => {
        recoveryCookieCount += values.filter((value) => value.value).length;
      },
    },
  });
  await authProbe.auth.initialize();
  checked(
    await authProbe.auth.verifyOtp({
      type: "recovery",
      token_hash: probeLink.properties.hashed_token,
    }),
  );
  if (!recoveryCookieCount)
    throw new Error("Local Auth recovery did not write session cookies.");
  console.log(
    "PASS Auth recovery cookie transport:",
    recoveryCookieCount,
    "cookie chunks",
  );
  const recovery = checked(
    await admin.auth.admin.generateLink({
      type: "recovery",
      email: accounts.recovery.email,
    }),
  );
  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    OPENAI_API_KEY: "",
    SITE_URL: "http://127.0.0.1:3008",
    MAINTENANCE_SECRET: randomBytes(32).toString("hex"),
    ATS_E2E: JSON.stringify({
      accounts,
      jobs,
      candidate,
      organizations,
      suffix,
      url: status.API_URL,
      anonKey: status.ANON_KEY,
      recoveryHash: recovery.properties.hashed_token,
    }),
  };
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--webpack",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3008",
    ],
    { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  server.stdout.on("data", (data) => {
    const line = data.toString();
    if (/error|Error|Ready|GET|POST|Recovery server/.test(line))
      process.stdout.write(
        line.replace(/token_hash=[^&\s]+/g, "token_hash=[REDACTED]"),
      );
  });
  server.stderr.on("data", (data) => process.stderr.write(data));
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try {
      ready = (
        await fetch("http://127.0.0.1:3008/login", {
          signal: AbortSignal.timeout(5000),
        })
      ).ok;
    } catch {
      /* still starting */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Local application failed to start.");
  const tests = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    { env, stdio: "inherit", windowsHide: true },
  );
  exitCode = await new Promise((resolve) =>
    tests.on("exit", (code) => resolve(code ?? 1)),
  );
} finally {
  if (server) {
    // Terminate only the test server process created above, never any existing user's server.
    if (server.exitCode === null) {
      if (process.platform === "win32") {
        try {
          execFileSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], {
            stdio: "ignore",
          });
        } catch {
          /* The server may have already exited. Always clean test data. */
        }
      } else server.kill("SIGTERM");
    }
  }
  // Delete only this run's synthetic workspaces and Auth fixtures, including UI-created members.
  if (organizationIds.length) {
    const members = checked(
      await admin
        .from("profiles")
        .select("id")
        .in("organization_id", organizationIds),
    );
    const candidates = checked(
      await admin
        .from("candidates")
        .select("id,organization_id")
        .in("organization_id", organizationIds),
    );
    for (const candidate of candidates) {
      const prefix = candidate.organization_id + "/" + candidate.id;
      const files = checked(
        await admin.storage.from("candidate-cvs").list(prefix),
      );
      if (files.length)
        checked(
          await admin.storage
            .from("candidate-cvs")
            .remove(files.map((file) => prefix + "/" + file.name)),
        );
    }
    for (const id of new Set([...userIds, ...members.map((m) => m.id)])) {
      const result = await admin.auth.admin.deleteUser(id);
      if (result.error && result.error.status !== 404) throw result.error;
    }
    checked(
      await admin.from("organizations").delete().in("id", organizationIds),
    );
    const files = checked(
      await admin
        .from("cv_files")
        .select("path")
        .in("organization_id", organizationIds),
    );
    if (files.length)
      checked(
        await admin.storage
          .from("candidate-cvs")
          .remove(files.map((file) => file.path)),
      );
    checked(
      await admin
        .from("cv_files")
        .delete()
        .in("organization_id", organizationIds),
    );
  }
}
process.exitCode = exitCode;
