import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { BookOpen, Clock, Users } from 'lucide-react'

export default async function StoriesPage() {
  // 获取所有激活的剧本
  const stories = await prisma.story.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main className="min-h-screen bg-slate-50">
      {/* 导航栏 */}
      <nav className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-slate-900">
            动态小说剧场
          </Link>
          <Link
            href="/dashboard"
            className="text-slate-600 hover:text-slate-900 transition-colors"
          >
            返回主页
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            选择你的故事
          </h1>
          <p className="text-slate-600">
            每一个故事都是独一无二的体验，你的AI分身将在其中扮演重要角色
          </p>
        </div>

        {stories.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-600 mb-2">
              暂无可用故事
            </h2>
            <p className="text-slate-500">
              新的故事正在准备中，敬请期待...
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

function StoryCard({ story }: { story: { id: string; title: string; description: string; coverImage: string | null; genre: string; difficulty: number } }) {
  return (
    <Link
      href={`/story/${story.id}`}
      className="block bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:border-primary-200 transition-all"
    >
      {story.coverImage ? (
        <div className="h-48 bg-slate-100 relative">
          <img
            src={story.coverImage}
            alt={story.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
          <BookOpen className="w-12 h-12 text-primary-400" />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-1 bg-primary-50 text-primary-600 rounded text-xs">
            {story.genre}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            难度 {story.difficulty}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          {story.title}
        </h3>
        <p className="text-sm text-slate-600 line-clamp-2">
          {story.description}
        </p>
      </div>
    </Link>
  )
}
