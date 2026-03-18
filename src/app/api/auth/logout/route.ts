import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url))

  // 清除用户ID cookie
  response.cookies.delete('user_id')

  return response
}
