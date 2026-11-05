import { NextResponse, type NextRequest } from "next/server";
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const hash = params.get("token_hash"),
    type = params.get("type");
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/reset-password" },
  });
  if (
    !hash ||
    !/^[a-zA-Z0-9_-]{20,256}$/.test(hash) ||
    (type !== "invite" && type !== "recovery")
  ) {
    response.headers.set("Location", "/forgot-password?error=expired");
  } else {
    // Do not consume a single-use token on GET: email scanners may follow links.
    // The same-origin password POST exchanges it and changes the password using
    // the same cookie-bound client, without a fragile session hand-off.
    response.cookies.set("mini-ats-recovery", JSON.stringify({ hash, type }), {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.SITE_URL?.startsWith("https://") === true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
