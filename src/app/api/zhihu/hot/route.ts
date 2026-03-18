import { NextResponse } from 'next/server'
import { getZhihuHotList } from '@/lib/zhihu'

export async function GET() {
  try {
    const hotList = await getZhihuHotList()
    return NextResponse.json({ hotList })
  } catch (error) {
    console.error('Error fetching hot list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hot list' },
      { status: 500 }
    )
  }
}
