import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function AchievementsPage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    redirect('/login')
  }

  // 获取用户成就
  const achievements = await prisma.achievement.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  // 计算统计
  const stats = {
    total: achievements.length,
    common: achievements.filter(a => a.rarity === 'common').length,
    rare: achievements.filter(a => a.rarity === 'rare').length,
    epic: achievements.filter(a => a.rarity === 'epic').length,
    legendary: achievements.filter(a => a.rarity === 'legendary').length,
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 头部 */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-600">
            返回
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">我的成就</h1>
        </div>
      </header>

      {/* 统计卡片 */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-sm text-slate-500">总成就</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-slate-400">{stats.common}</div>
            <div className="text-sm text-slate-500">普通</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-500">{stats.rare}</div>
            <div className="text-sm text-slate-500">稀有</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-purple-500">{stats.legendary}</div>
            <div className="text-sm text-slate-500">传说</div>
          </div>
        </div>
      </div>

      {/* 成就列表 */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        {achievements.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <p className="text-slate-500">还没有解锁任何成就</p>
            <p className="text-sm text-slate-400 mt-2">完成故事、分享结局、邀请好友来解锁成就吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="bg-white rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{achievement.name}</h3>
                    <p className="text-sm text-slate-500">{achievement.description}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    achievement.rarity === 'legendary' ? 'bg-purple-100 text-purple-600' :
                    achievement.rarity === 'epic' ? 'bg-blue-100 text-blue-600' :
                    achievement.rarity === 'rare' ? 'bg-slate-100 text-slate-600' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    {achievement.rarity === 'common' ? '普通' :
                     achievement.rarity === 'rare' ? '稀有' :
                     achievement.rarity === 'epic' ? '史诗' :
                     '传说'}
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  解锁于 {new Date(achievement.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
