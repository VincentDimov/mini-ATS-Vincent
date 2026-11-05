import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

export async function verifyLocalCv({
  admin,
  status,
  accounts,
  jobs,
  organizationIds,
}) {
  if (!["127.0.0.1", "localhost"].includes(new URL(status.API_URL).hostname))
    throw new Error("Local test database required.");
  const checked = (result) => {
    if (result.error) throw result.error;
    return result.data;
  };
  const member = createClient(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false },
  });
  const other = createClient(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false },
  });
  checked(await member.auth.signInWithPassword(accounts.member));
  checked(await other.auth.signInWithPassword(accounts.other));
  const candidate = checked(
    await admin
      .from("candidates")
      .insert({
        full_name: "Synthetic CV lifecycle",
        email: "synthetic-cv@example.test",
        job_id: jobs[0].id,
        organization_id: organizationIds[0],
      })
      .select()
      .single(),
  );
  const actor = accounts.member.id;
  const paths = [];
  const payload = {
    summary: "Synthetic",
    strengths: [],
    potential_gaps: [],
    matching_skills: [],
    interview_questions: [],
  };
  const reserve = async () => {
    const data = checked(
      await admin.rpc("reserve_cv", {
        actor_id: actor,
        cid: candidate.id,
        bytes: 100,
        digest: "a".repeat(64),
      }),
    );
    paths.push(data.path);
    checked(
      await admin.storage
        .from("candidate-cvs")
        .upload(data.path, Buffer.from("%PDF-1.4\nsynthetic fixture\n%%EOF"), {
          contentType: "application/pdf",
        }),
    );
    return data;
  };
  const commit = async (value) =>
    checked(
      await admin.rpc("commit_cv", {
        actor_id: actor,
        cid: candidate.id,
        rid: value.requestId,
        filename: "synthetic.pdf",
      }),
    );
  const begin = async () =>
    checked(
      await admin.rpc("begin_analysis", { actor_id: actor, cid: candidate.id }),
    );
  const save = async (ctx) =>
    checked(
      await admin.rpc("save_analysis", {
        actor_id: actor,
        cid: candidate.id,
        token: ctx.token,
        expected_path: ctx.path,
        expected_job: ctx.jobId,
        expected_version: ctx.version,
        payload,
        model_name: "synthetic-test",
      }),
    );
  try {
    const direct = await member.storage
      .from("candidate-cvs")
      .upload(
        `${organizationIds[0]}/${candidate.id}/bypass.pdf`,
        Buffer.from("not a PDF"),
        { contentType: "application/pdf" },
      );
    assert.ok(direct.error, "Browser cannot bypass PDF validation");
    const privileged = await member.rpc("reserve_cv", {
      actor_id: actor,
      cid: candidate.id,
      bytes: 100,
      digest: "a".repeat(64),
    });
    assert.ok(privileged.error, "Service RPC cannot be invoked by browser");
    const cross = await admin.rpc("reserve_cv", {
      actor_id: accounts.other.id,
      cid: candidate.id,
      bytes: 100,
      digest: "a".repeat(64),
    });
    assert.ok(cross.error, "Service workflow rechecks tenant access");
    const first = await reserve();
    assert.equal(await commit(first), true);
    assert.ok(
      (await other.storage.from("candidate-cvs").download(first.path)).error,
      "Cross tenant download denied",
    );
    assert.ok(
      checked(await member.storage.from("candidate-cvs").download(first.path)),
    );
    const oldCtx = await begin(),
      latestCtx = await begin();
    assert.equal(await save(oldCtx), false);
    assert.equal(await save(latestCtx), true);
    const contenders = await Promise.all([reserve(), reserve()]);
    const latestId = checked(
      await admin
        .from("candidates")
        .select("cv_request_id")
        .eq("id", candidate.id)
        .single(),
    ).cv_request_id;
    const newUpload = contenders.find((item) => item.requestId === latestId);
    const oldUpload = contenders.find((item) => item.requestId !== latestId);
    assert.ok(newUpload && oldUpload);
    const results = await Promise.all([commit(oldUpload), commit(newUpload)]);
    assert.deepEqual(results, [false, true]);
    assert.equal(
      checked(
        await admin
          .from("candidate_analyses")
          .select("stale")
          .eq("candidate_id", candidate.id)
          .single(),
      ).stale,
      true,
    );
    assert.equal(
      await save(latestCtx),
      false,
      "CV change rejects old analysis",
    );
    const ctx = await begin();
    checked(
      await admin
        .from("jobs")
        .update({ description: "Changed synthetic test role" })
        .eq("id", jobs[0].id),
    );
    assert.equal(await save(ctx), false, "Job change rejects old analysis");
    const claims = checked(
      await admin.rpc("claim_cv_cleanup", {
        batch_size: 100,
        target_org: organizationIds[0],
      }),
    );
    assert.ok(
      !claims.some((item) => item.path === newUpload.path),
      "Referenced file never claimed",
    );
    for (const item of claims) {
      // Exercise retry without deleting the object on the first attempt.
      checked(
        await admin.rpc("finish_cv_cleanup", {
          object_path: item.path,
          lease: item.lease_id,
          succeeded: false,
        }),
      );
    }
    checked(
      await member
        .from("candidates")
        .delete()
        .eq("id", candidate.id)
        .select("id")
        .single(),
    );
    const row = checked(
      await admin
        .from("cv_files")
        .select("state")
        .eq("path", newUpload.path)
        .single(),
    );
    assert.equal(row.state, "queued");
    const cleanup = checked(
      await admin.rpc("claim_cv_cleanup", {
        batch_size: 100,
        target_org: organizationIds[0],
      }),
    );
    for (const item of cleanup) {
      checked(await admin.storage.from("candidate-cvs").remove([item.path]));
      checked(
        await admin.rpc("finish_cv_cleanup", {
          object_path: item.path,
          lease: item.lease_id,
          succeeded: true,
        }),
      );
    }
    assert.ok(
      (await admin.storage.from("candidate-cvs").download(newUpload.path))
        .error,
      "Deleted candidate CV removed through Storage API",
    );
    console.log(
      "PASS local Auth/Storage: tenant isolation, CV replacement/races/deletion, AI CAS and cleanup retries",
    );
  } finally {
    checked(await admin.from("candidates").delete().eq("id", candidate.id));
    if (paths.length)
      checked(await admin.storage.from("candidate-cvs").remove(paths));
    checked(
      await admin.from("cv_files").delete().eq("candidate_id", candidate.id),
    );
    await member.auth.signOut();
    await other.auth.signOut();
  }
}
