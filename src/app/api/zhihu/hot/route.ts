import { NextResponse } from 'next/server'
import { getZhihuHotList } from '@/lib/zhihu'

export async function GET() {
  try {
    const hotList = await getZhihuHotList()
    return NextResponse.json({ hotList })
  } catch (error) {
    console.error('Error fetching hot list:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch hot list'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
