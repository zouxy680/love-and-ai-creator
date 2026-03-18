import { getSecondMeAuthUrl } from '@/lib/secondme'
import Link from 'next/link'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
  const authUrl = getSecondMeAuthUrl()

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-slate-50 px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-semibold text-slate-900">
            动态小说剧场
          </Link>
          <p className="text-slate-600 mt-2">使用 SecondMe 账号登录</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            欢迎回来
          </h1>

          <a
            href={authUrl}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
          >
            <LogIn className="w-5 h-5" />
            使用 SecondMe 登录
          </a>

          <p className="text-center text-sm text-slate-500 mt-6">
            登录即表示你同意我们的服务条款
          </p>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          还没有 SecondMe 账号？
          <a
            href="https://second.me"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 hover:text-primary-600 ml-1"
          >
            立即注册
          </a>
        </p>
      </div>
    </main>
  )
}
