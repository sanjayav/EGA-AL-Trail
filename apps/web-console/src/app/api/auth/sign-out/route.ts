import { NextResponse } from 'next/server'

export async function POST(req: Request): Promise<Response> {
  const res = NextResponse.redirect(new URL('/', req.url), { status: 303 })
  res.cookies.delete('dpp_role')
  res.cookies.delete('dpp_signed_in')
  return res
}
