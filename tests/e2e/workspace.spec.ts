import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const fixture = JSON.parse(process.env.ATS_E2E || "null");
test.skip(!fixture, "Run npm run test:e2e against local Supabase.");
let browserErrors: string[] = [];
test.beforeEach(async ({ page }) => {
  browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
});
test.afterEach(() => {
  expect(browserErrors, "No hydration or runtime errors").toEqual([]);
});

async function login(page: Page, role: string) {
  await page.context().route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
      console.error("Blocked non-local test request:", url.origin);
      return route.abort();
    }
    return route.continue();
  });
  page.on("response", (response) => {
    if (response.url().includes("/auth/v1/token"))
      console.log(
        "Local Auth token response:",
        new URL(response.url()).origin,
        response.status(),
      );
  });
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(fixture.accounts[role].email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(fixture.accounts[role].password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(role === "admin" ? /\/admin$/ : /\/dashboard$/);
}

test("public landing is responsive and protected pages require authentication", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Great teams");
  await page.screenshot({ path: "test-results/landing-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/landing-mobile.png", fullPage: true });
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/login\?/);
});

test("candidate collaboration, private PDF, bulk pipeline, interview and calendar persist", async ({
  page,
}) => {
  await login(page, "manager");
  await page.goto("/candidates/" + fixture.candidate.id);
  await page
    .getByLabel("Add team note")
    .fill("E2E shared feedback: next conversation confirmed");
  await page.getByRole("button", { name: "Post note" }).click();
  await expect(
    page.getByText("E2E shared feedback: next conversation confirmed", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("New candidate tag").fill("E2E-review");
  await page.getByRole("button", { name: "Add tag", exact: true }).click();
  await expect(page.getByRole("button", { name: /E2E-review/ })).toBeVisible();
  const pdf = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
  );
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "synthetic-test.pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    });
  await page
    .getByRole("button", { name: "Upload PDF CV", exact: true })
    .click();
  await expect(
    page.getByText("synthetic-test.pdf", { exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("E2E shared feedback: next conversation confirmed", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("synthetic-test.pdf", { exact: true }).first(),
  ).toBeVisible();
  await page.goto("/dashboard/candidates");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Select E2E Candidate", exact: true })
    .check();
  await page
    .getByLabel("Move selected candidates", { exact: true })
    .selectOption("interview");
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "E2E Candidate" })
      .getByText("Interview", { exact: true }),
  ).toBeVisible();
  const csv = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export CSV/ }).click();
  expect((await csv).suggestedFilename()).toMatch(/\.csv$/);
  await page.goto("/dashboard/schedule");
  await page
    .getByRole("button", { name: "Schedule interview", exact: true })
    .click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("E2E Technical conversation");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page.getByLabel("Starts", { exact: true }).fill(tomorrow + "T10:00");
  await page.getByLabel("Ends", { exact: true }).fill(tomorrow + "T11:00");
  await page
    .getByLabel("Location or meeting URL")
    .fill("Local synthetic meeting");
  await page
    .getByRole("button", { name: "Save interview", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "E2E Technical conversation" }),
  ).toBeVisible();
  const ics = page.waitForEvent("download");
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  expect((await ics).suggestedFilename()).toMatch(/\.ics$/);
  await page.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(page.getByText("completed", { exact: true })).toBeVisible();
  await page.goto("/dashboard/activity");
  await expect(page.getByText("E2E Candidate").first()).toBeVisible();
  await page.screenshot({
    path: "test-results/activity-desktop.png",
    fullPage: true,
  });
});

test("job and candidate creation, job detail, editing and deletion work end to end", async ({
  page,
}) => {
  await login(page, "manager");
  await page.goto("/dashboard/jobs");
  await page.getByRole("button", { name: "New job", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("E2E UI-created role");
  await page
    .getByLabel("Description", { exact: true })
    .fill(
      "Synthetic role for end-to-end verification of creation and removal.",
    );
  await page
    .getByLabel("Salary range", { exact: true })
    .fill("45,000–60,000 SEK / month");
  await page.getByRole("button", { name: "Create job", exact: true }).click();
  const card = page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", {
        name: "E2E UI-created role",
        exact: true,
      }),
    });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: "Open role", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/jobs\//);
  await expect(
    page
      .getByRole("heading", { name: "E2E UI-created role", exact: true })
      .first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add candidate", exact: true })
    .click();
  await page.getByLabel("Full name", { exact: false }).fill("E2E UI Applicant");
  await page
    .getByLabel("Email", { exact: false })
    .fill("e2e-applicant@example.test");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add candidate", exact: true })
    .click();
  await expect(
    page.getByText("E2E UI Applicant", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open profile", exact: true }).click();
  await page.getByRole("button", { name: /Edit candidate/ }).click();
  await page
    .getByLabel("Full name", { exact: false })
    .fill("E2E UI Applicant Edited");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "E2E UI Applicant Edited", exact: true }),
  ).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete candidate", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/dashboard/jobs");
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(card).toHaveCount(0);
});

test("group access grants and revokes restricted role; suspended JWT loses data access", async ({
  page,
  browser,
}) => {
  await login(page, "manager");
  await page.goto("/dashboard/groups");
  await page.getByLabel("New group name").fill("E2E Hiring Circle");
  await page.getByLabel("Group description").fill("Local access test");
  await page
    .getByRole("button", { name: "Create circle", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "E2E Hiring Circle" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "E2E member", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "E2E member", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("checkbox", { name: "E2E private role", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "E2E private role", exact: true }),
  ).toBeChecked();
  const client = createClient(fixture.url, fixture.anonKey, {
    auth: { persistSession: false },
  });
  expect(
    (await client.auth.signInWithPassword(fixture.accounts.member)).error,
  ).toBeNull();
  const jobs = await client.from("jobs").select("id,title");
  expect(jobs.error).toBeNull();
  expect(jobs.data?.map((j) => j.id)).toEqual(
    expect.arrayContaining(
      fixture.jobs.slice(0, 2).map((j: { id: string }) => j.id),
    ),
  );
  expect(
    (await client.from("jobs").select("id").eq("id", fixture.jobs[2].id)).data,
  ).toEqual([]);
  await page
    .getByRole("checkbox", { name: "E2E private role", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await client.from("jobs").select("id").eq("id", fixture.jobs[1].id))
          .data,
    )
    .toEqual([]);
  await page.goto("/dashboard/team");
  await page
    .getByRole("button", { name: "Suspend E2E member", exact: true })
    .click();
  await expect
    .poll(async () => (await client.from("jobs").select("id")).data?.length)
    .toBe(0);
  await page
    .getByRole("button", { name: "Edit E2E member", exact: true })
    .click();
  await page
    .getByLabel("Full name", { exact: true })
    .fill("E2E Member Renamed");
  await page
    .getByRole("button", { name: "Save teammate", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "E2E Member Renamed", exact: true }),
  ).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete E2E Member Renamed", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "E2E Member Renamed", exact: true }),
  ).toHaveCount(0);
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await login(otherPage, "other");
  await otherPage.goto("/candidates/" + fixture.candidate.id);
  await expect(
    otherPage.getByRole("heading", { name: "This page is not available" }),
  ).toBeVisible();
  await otherContext.close();
});

test("admin creates a scoped recruiter; navigation, dark theme and mobile layout", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto(
    "/admin/organizations/" + fixture.organizations[0].id + "?view=team",
  );
  await page.getByRole("button", { name: "Add member", exact: true }).click();
  await page.getByLabel("Full name", { exact: true }).fill("E2E UI Recruiter");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`e2e-ui-${fixture.suffix}@example.test`);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "E2E UI Recruiter", exact: true }),
  ).toBeVisible();
  await page.goto("/admin");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Quick navigation and search").fill("E2E Candidate");
  await page
    .getByRole("button", { name: "Search records", exact: true })
    .click();
  await expect(
    page.getByRole("link").filter({ hasText: "E2E Candidate" }).first(),
  ).toBeVisible();
  await page.goto("/admin");
  await page.screenshot({
    path: "test-results/overview-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Switch to dark/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: "test-results/overview-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Switch to light/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/organizations");
  await expect(
    page.getByRole("navigation", { name: "Mobile primary navigation" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/workspaces-mobile.png",
    fullPage: true,
  });
});
