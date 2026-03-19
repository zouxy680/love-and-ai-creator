import { getSecondMeAuthUrl } from '@/lib/secondme'
import Link from 'next/link'
import { LogIn, AlertCircle } from 'lucide-react'

// 错误类型映射
const ERROR_MESSAGES: Record<string, string> = {
  no_code: '授权码丢失，请重试',
  token_failed: '获取 Token 失败，请重试',
  userinfo_failed: '获取用户信息失败，请重试',
  no_shades: '无法获取您的人格特质，请确保 SecondMe 账号已完善个人资料',
  shades_failed: '获取人格特质失败，请重试',
  db_failed: '保存用户信息失败，请重试',
  auth_failed: '登录失败，请重试',
}

interface LoginPageProps {
  searchParams: Promise<{ error?: string; details?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, details } = await searchParams
  const authUrl = getSecondMeAuthUrl()

  const errorMessage = error ? (ERROR_MESSAGES[error] || details || '登录失败') : null

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

          {/* 错误提示 */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 text-sm font-medium">登录失败</p>
                <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

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
