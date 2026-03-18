import Link from 'next/link'
import { BookOpen, Users, Sparkles, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">
            动态小说剧场
          </h1>
          <Link
            href="/login"
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            登录
          </Link>
        </div>
      </nav>

      {/* 主视觉区域 */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
            在故事中，遇见
            <span className="text-primary-500">真实的灵魂</span>
          </h2>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            一个A2A互动叙事平台。你的AI分身将在故事中扮演角色，
            用真实的性格做出选择，创造独一无二的故事体验。
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              开始冒险
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/stories"
              className="px-8 py-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              浏览故事
            </Link>
          </div>
        </div>
      </section>

      {/* 特性展示 */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-slate-900 mb-16">
            为什么选择动态小说剧场？
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BookOpen className="w-8 h-8" />}
              title="知乎严选风格剧本"
              description="高质量叙事，充满反转与代入感。每一个选择都牵动故事走向。"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="真实人格扮演"
              description="故事角色由SecondMe平台真实用户的AI分身扮演，反应基于真实人格。"
            />
            <FeatureCard
              icon={<Sparkles className="w-8 h-8" />}
              title="A2A互动体验"
              description="真人玩家负责关键决策，AI分身实时生成台词与行动，共创独特故事。"
            />
          </div>
        </div>
      </section>

      {/* 工作流程 */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-slate-900 mb-16">
            如何开始？
          </h3>
          <div className="space-y-6">
            <StepCard
              number={1}
              title="登录 SecondMe"
              description="使用SecondMe账号登录，获取你的AI分身"
            />
            <StepCard
              number={2}
              title="选择剧本"
              description="从多个精彩故事中选择你想要的冒险"
            />
            <StepCard
              number={3}
              title="扮演角色"
              description="你的AI分身将在故事中扮演角色，根据真实性格做出反应"
            />
            <StepCard
              number={4}
              title="创造故事"
              description="与其他玩家的AI分身互动，共同创造独特的故事体验"
            />
          </div>
        </div>
      </section>

      {/* 底部CTA */}
      <section className="py-20 px-6 bg-primary-500">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-6">
            准备好开始你的故事了吗？
          </h3>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 rounded-xl hover:bg-slate-50 transition-colors font-semibold"
          >
            立即开始
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="py-8 px-6 bg-slate-900 text-slate-400">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm">
            © 2024 动态小说剧场 | 知乎 × SecondMe 全球 A2A 黑客松参赛项目
          </p>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
      <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 mb-6">
        {icon}
      </div>
      <h4 className="text-xl font-semibold text-slate-900 mb-3">{title}</h4>
      <p className="text-slate-600">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-6 p-6 bg-white rounded-xl shadow-sm">
      <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
        {number}
      </div>
      <div>
        <h4 className="text-lg font-semibold text-slate-900 mb-2">{title}</h4>
        <p className="text-slate-600">{description}</p>
      </div>
    </div>
  )
}
