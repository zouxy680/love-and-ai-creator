'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'

interface Memory {
  id: string
  key: string
  value: string
  category: string | null
}

interface User {
  id: string
  name: string | null
}

interface PersonalityTestClientProps {
  user: User
  existingMemories: Memory[]
}

const questions = [
  {
    id: 'social',
    question: '在社交场合，你更倾向于：',
    options: [
      { value: 'introvert', label: '安静地观察，与少数人深入交流' },
      { value: 'extrovert', label: '活跃地参与，与多数人广泛互动' },
      { value: 'balanced', label: '视情况而定，保持平衡' },
    ],
  },
  {
    id: 'decision',
    question: '面对重要决策时，你更看重：',
    options: [
      { value: 'logic', label: '逻辑和理性分析' },
      { value: 'intuition', label: '直觉和内心感受' },
      { value: 'both', label: '两者兼顾' },
    ],
  },
  {
    id: 'adventure',
    question: '对于未知和冒险，你的态度是：',
    options: [
      { value: 'cautious', label: '谨慎行事，偏好安稳' },
      { value: 'bold', label: '勇于尝试，热爱挑战' },
      { value: 'selective', label: '有选择性，权衡风险' },
    ],
  },
  {
    id: 'emotion',
    question: '面对情感和人际关系，你通常是：',
    options: [
      { value: 'rational', label: '理性主导，不易情绪化' },
      { value: 'emotional', label: '感性丰富，情感外露' },
      { value: 'deep', label: '内敛深沉，感情内化' },
    ],
  },
  {
    id: 'creativity',
    question: '在创造性活动方面，你更喜欢：',
    options: [
      { value: 'artistic', label: '艺术创作，如写作、绘画、音乐' },
      { value: 'analytical', label: '分析思考，如研究、编程、逻辑' },
      { value: 'practical', label: '实用创新，如设计、策划、组织' },
    ],
  },
]

export default function PersonalityTestClient({
  user,
  existingMemories,
}: PersonalityTestClientProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    existingMemories.forEach((m) => {
      if (m.category === 'personality') {
        initial[m.key] = m.value
      }
    })
    return initial
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const handleSelect = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memories: Object.entries(answers).map(([key, value]) => ({
            key,
            value,
            category: 'personality',
          })),
        }),
      })

      if (response.ok) {
        setIsComplete(true)
      }
    } catch (error) {
      console.error('Error submitting:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const progress = (Object.keys(answers).length / questions.length) * 100

  if (isComplete) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            人格测试完成！
          </h1>
          <p className="text-slate-600 mb-8">
            你的AI分身现在更了解你了。这些信息将帮助分身在故事中做出更符合你性格的选择。
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
          >
            返回主页
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* 头部 */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </Link>
          <span className="text-sm text-slate-500">
            {Math.round(progress)}% 完成
          </span>
        </div>
      </header>

      {/* 进度条 */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-primary-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 问题区域 */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            人格测试
          </h1>
          <p className="text-slate-600">
            回答这些问题，帮助你的AI分身更好地理解你的人格特质
          </p>
        </div>

        <div className="space-y-8">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <span className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {index + 1}
                </span>
                <h3 className="font-medium text-slate-900">{q.question}</h3>
              </div>
              <div className="space-y-2 ml-12">
                {q.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(q.id, option.value)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      answers[q.id] === option.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length || isSubmitting}
            className="w-full py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                提交中...
              </>
            ) : (
              '提交答案'
            )}
          </button>
        </div>
      </div>
    </main>
  )
}
