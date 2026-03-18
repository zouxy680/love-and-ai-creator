import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import PersonalityTestClient from './PersonalityTestClient'

export default async function PersonalityTestPage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memories: {
        where: { category: 'personality' },
      },
    },
  })

  if (!user) {
    redirect('/login')
  }

  return <PersonalityTestClient user={user} existingMemories={user.memories} />
}
