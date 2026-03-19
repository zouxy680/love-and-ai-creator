import { NextRequest, NextResponse } from 'next/server'
import { searchZhihu } from '@/lib/zhihu'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || searchParams.get('query') || ''
    const count = parseInt(searchParams.get('count') || '10', 10)

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      )
    }

    const results = await searchZhihu(query, count)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error searching:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to search'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
