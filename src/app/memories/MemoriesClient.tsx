'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, Brain } from 'lucide-react'

interface Memory {
  id: string
  key: string
  value: string
  category: string | null
  updatedAt: Date
}

interface MemoriesClientProps {
  groupedMemories: Record<string, Memory[]>
}

export default function MemoriesClient({
  groupedMemories: initialMemories,
}: MemoriesClientProps) {
  const [groupedMemories, setGroupedMemories] = useState(initialMemories)
  const [isAdding, setIsAdding] = useState(false)
  const [newMemory, setNewMemory] = useState({ key: '', value: '', category: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleAdd = async () => {
    if (!newMemory.key || !newMemory.value) return

    try {
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memories: [
            {
              key: newMemory.key,
              value: newMemory.value,
              category: newMemory.category || undefined,
            },
          ],
        }),
      })

      if (response.ok) {
        const category = newMemory.category || '其他'
        setGroupedMemories((prev) => ({
          ...prev,
          [category]: [
            ...(prev[category] || []),
            {
              id: `new-${Date.now()}`,
              key: newMemory.key,
              value: newMemory.value,
              category: newMemory.category || null,
              updatedAt: new Date(),
            },
          ],
        }))
        setNewMemory({ key: '', value: '', category: '' })
        setIsAdding(false)
      }
    } catch (error) {
      console.error('Error adding memory:', error)
    }
  }

  const handleEdit = async (memory: Memory) => {
    if (!editValue.trim()) return

    try {
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memories: [{ key: memory.key, value: editValue, category: memory.category }],
        }),
      })

      if (response.ok) {
        const category = memory.category || '其他'
        setGroupedMemories((prev) => ({
          ...prev,
          [category]: prev[category].map((m) =>
            m.id === memory.id ? { ...m, value: editValue } : m
          ),
        }))
        setEditingId(null)
      }
    } catch (error) {
      console.error('Error editing memory:', error)
    }
  }

  const handleDelete = async (memory: Memory) => {
    try {
      const response = await fetch(`/api/memories/${memory.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const category = memory.category || '其他'
        setGroupedMemories((prev) => ({
          ...prev,
          [category]: prev[category].filter((m) => m.id !== memory.id),
        }))
      }
    } catch (error) {
      console.error('Error deleting memory:', error)
    }
  }

  const categories = Object.keys(groupedMemories)

  return (
    <main className="min-h-screen bg-slate-50">
      {/* 头部 */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </Link>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加记忆
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Key Memory
          </h1>
          <p className="text-slate-600">
            管理你的记忆，这些信息将帮助AI分身更好地理解和扮演你
          </p>
        </div>

        {/* 添加新记忆 */}
        {isAdding && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-primary-100 mb-8">
            <h3 className="font-medium text-slate-900 mb-4">添加新记忆</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">键</label>
                <input
                  type="text"
                  value={newMemory.key}
                  onChange={(e) => setNewMemory({ ...newMemory, key: e.target.value })}
                  placeholder="例如：喜欢的食物"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary-300"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">值</label>
                <textarea
                  value={newMemory.value}
                  onChange={(e) => setNewMemory({ ...newMemory, value: e.target.value })}
                  placeholder="例如：我喜欢麻辣火锅和寿司"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary-300"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">类别（可选）</label>
                <input
                  type="text"
                  value={newMemory.category}
                  onChange={(e) => setNewMemory({ ...newMemory, category: e.target.value })}
                  placeholder="例如：preference, trait, experience"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary-300"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 记忆列表 */}
        {categories.length > 0 ? (
          <div className="space-y-8">
            {categories.map((category) => (
              <div key={category}>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary-500" />
                  {category}
                </h2>
                <div className="space-y-3">
                  {groupedMemories[category].map((memory) => (
                    <div
                      key={memory.id}
                      className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-4"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-700 mb-1">
                          {memory.key}
                        </h4>
                        {editingId === memory.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 px-3 py-1 border border-slate-200 rounded-lg focus:outline-none focus:border-primary-300"
                            />
                            <button
                              onClick={() => handleEdit(memory)}
                              className="p-1 text-green-500 hover:bg-green-50 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-slate-600">{memory.value}</p>
                        )}
                      </div>
                      {editingId !== memory.id && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingId(memory.id)
                              setEditValue(memory.value)
                            }}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(memory)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-600 mb-2">
              还没有任何记忆
            </h2>
            <p className="text-slate-500 mb-6">
              添加一些记忆，帮助AI分身更好地了解你
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              添加第一条记忆
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
