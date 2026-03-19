import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { BookOpen, User, LogOut, Sparkles, Compass, Trophy } from 'lucide-react'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      stories: {
        include: { story: true },
        orderBy: { startedAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!user) {
    redirect('/login')
  }

  // 解析 shades
  let shades: string[] = []
  try {
    shades = user.shades ? JSON.parse(user.shades) : []
  } catch {
    shades = []
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* 导航栏 */}
      <nav className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-slate-900">
            动态小说剧场
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/stories"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              浏览故事
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                退出
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* 用户信息卡片 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 mb-10">
          <div className="flex items-start gap-6">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar}
                alt={user.name || 'Avatar'}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="w-12 h-12 text-primary-500" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {user.name || '神秘旅人'}
              </h1>
              {user.bio && (
                <p className="text-slate-600 mb-4">{user.bio}</p>
              )}
              {shades.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {shades.map((shade, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-sm"
                    >
                      {shade}
                    </span>
                  ))}
                </div>
              )}
              {shades.length > 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  以上特质来自你的 SecondMe 分身，将用于匹配最适合你的故事角色
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="grid md:grid-cols-4 gap-6 mb-10">
          <QuickActionCard
            icon={<Compass className="w-6 h-6" />}
            title="发现素材"
            description="从知乎热榜搜索故事灵感"
            href="/discover"
          />
          <QuickActionCard
            icon={<BookOpen className="w-6 h-6" />}
            title="开始新故事"
            description="选择一个剧本，开始你的冒险"
            href="/stories"
          />
          <QuickActionCard
            icon={<Trophy className="w-6 h-6" />}
            title="我的成就"
            description="查看你在故事中的成就"
            href="/achievements"
          />
          <QuickActionCard
            icon={<User className="w-6 h-6" />}
            title="我的记忆"
            description="查看和管理你的Key Memory"
            href="/memories"
          />
        </div>

        {/* 我的故事 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            我的故事
          </h2>
          {user.stories.length > 0 ? (
            <div className="space-y-4">
              {user.stories.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                >
                  <div>
                    <h3 className="font-medium text-slate-900">
                      {participant.story.title}
                    </h3>
                    <p className="text-sm text-slate-500">
                      进度: {participant.progress}% · {participant.status}
                    </p>
                  </div>
                  <Link
                    href={`/story/${participant.story.id}`}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    继续
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">你还没有开始任何故事</p>
              <Link
                href="/stories"
                className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600"
              >
                浏览可用故事
                <Sparkles className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function QuickActionCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-primary-200 hover:shadow-md transition-all"
    >
      <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-500 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </Link>
  )
}
