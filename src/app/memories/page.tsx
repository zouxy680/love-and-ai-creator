import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import MemoriesClient from './MemoriesClient'

export default async function MemoriesPage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memories: {
        orderBy: { updatedAt: 'desc' },
      },
    },
  })

  if (!user) {
    redirect('/login')
  }

  // 按类别分组
  const groupedMemories = user.memories.reduce(
    (acc, memory) => {
      const category = memory.category || '其他'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(memory)
      return acc
    },
    {} as Record<string, typeof user.memories>
  )

  return <MemoriesClient groupedMemories={groupedMemories} />
}
