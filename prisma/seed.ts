import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 创建示例剧本
  const stories = [
    {
      title: '午夜图书馆',
      description: '一个雨夜，你误入了一家永不关闭的图书馆。书架间传来细微的窃窃私语，而每一本书都藏着一个不为人知的秘密...',
      genre: '悬疑',
      difficulty: 2,
      content: JSON.stringify({
        scenes: [
          {
            id: 'scene-1',
            title: '入夜',
            content: '暴雨如注，你在街角发现了一家古老的图书馆。门虚掩着，温暖的灯光从里面透出。你推门而入，却发现空无一人，只有无数本书籍静静地注视着你。',
            choices: [
              { text: '走向书架，随意翻看一本书', nextScene: 'scene-2a' },
              { text: '寻找图书馆管理员', nextScene: 'scene-2b' },
              { text: '转身离开这个诡异的地方', nextScene: 'scene-2c' },
            ],
          },
          {
            id: 'scene-2a',
            title: '书中的秘密',
            content: '你随手抽出一本泛黄的书籍，翻开第一页，却发现上面的文字正在缓缓变化，逐渐形成你熟悉的名字和记忆...',
            choices: [
              { text: '继续阅读，看看会发生什么', nextScene: 'scene-3a' },
              { text: '合上书本，感到不安', nextScene: 'scene-3b' },
            ],
          },
          {
            id: 'scene-2b',
            title: '寻觅',
            content: '你穿过一排排书架，在图书馆深处发现了一盏烛光。一个身影背对着你，似乎在专注地阅读着什么。',
            choices: [
              { text: '轻声打招呼', nextScene: 'scene-3c' },
              { text: '悄悄靠近，看清对方的脸', nextScene: 'scene-3d' },
            ],
          },
          {
            id: 'scene-2c',
            title: '离去的尝试',
            content: '你转身想要离开，却发现门已经锁上了。门上出现了一行字：「只有找到属于你的故事，才能离开。」',
            choices: [
              { text: '被迫留下，开始探索', nextScene: 'scene-2a' },
              { text: '用力敲门，呼救', nextScene: 'scene-3e' },
            ],
          },
          {
            id: 'scene-3a',
            title: '真相初现',
            content: '书页上的文字讲述着你的人生，但有些部分完全陌生——似乎是另一个人的人生与你的交织在一起。你意识到，这里隐藏着关于你过去的秘密。',
            choices: [],
          },
          {
            id: 'scene-3b',
            title: '不安蔓延',
            content: '你合上书本，心跳加速。整个图书馆似乎都在低语，无数个故事正在等待被发现。',
            choices: [],
          },
          {
            id: 'scene-3c',
            title: '相遇',
            content: '"你终于来了。"那人缓缓转过身，露出一张令你惊讶的面孔——那竟然是你认识的人。',
            choices: [],
          },
          {
            id: 'scene-3d',
            title: '窥视',
            content: '你屏住呼吸靠近，当看清那张脸时，你的血液几乎凝固——那是一张与你一模一样的脸。',
            choices: [],
          },
          {
            id: 'scene-3e',
            title: '回响',
            content: '你的呼喊声在空旷的图书馆中回荡。突然，所有的书同时翻开了同一页，上面写着相同的一句话...',
            choices: [],
          },
        ],
      }),
    },
    {
      title: '星际信号',
      description: '作为深空探测站的值班员，你收到了一串来自遥远星系的神秘信号。解码后，那竟然是一段私人信息...',
      genre: '科幻',
      difficulty: 3,
      content: JSON.stringify({
        scenes: [
          {
            id: 'scene-1',
            title: '信号',
            content: '深空探测站的人工智能助手ALICE突然唤醒了你："船长，我们收到了一个来自仙女座星系的信号。它...似乎是专门发给你的。"',
            choices: [
              { text: '立即解码查看内容', nextScene: 'scene-2a' },
              { text: '先确认信号的来源和真实性', nextScene: 'scene-2b' },
              { text: '向地球总部报告这一发现', nextScene: 'scene-2c' },
            ],
          },
          {
            id: 'scene-2a',
            title: '解码',
            content: '屏幕上的数据流逐渐转化为可读文字。你的瞳孔放大——那是你失踪多年的父亲的名字，后面跟着一句话："我找到了答案，但代价是永远无法回家。"',
            choices: [
              { text: '回复信号', nextScene: 'scene-3a' },
              { text: '追踪信号源', nextScene: 'scene-3b' },
            ],
          },
          {
            id: 'scene-2b',
            title: '验证',
            content: 'ALICE分析后确认信号真实可靠，而且...这串信号已经在宇宙中传播了整整二十年，恰好是你父亲失踪的时间。',
            choices: [],
          },
          {
            id: 'scene-2c',
            title: '报告',
            content: '地球总部的回复来得很快："立即返回，不要尝试任何接触。这是直接命令。"',
            choices: [],
          },
          {
            id: 'scene-3a',
            title: '回应',
            content: '你输入了回复，按下发送键。三秒后，屏幕亮起——"收到。正在传输坐标。准备接收访客。"',
            choices: [],
          },
          {
            id: 'scene-3b',
            title: '追踪',
            content: '信号的源头指向一颗环绕双星运行的行星。扫描显示那里有...人造建筑。',
            choices: [],
          },
        ],
      }),
    },
    {
      title: '咖啡店邂逅',
      description: '在城市角落的一家小咖啡店，你与一个陌生人的目光相遇。看似普通的相遇，却将改变你们彼此的人生轨迹...',
      genre: '言情',
      difficulty: 1,
      content: JSON.stringify({
        scenes: [
          {
            id: 'scene-1',
            title: '雨天的咖啡店',
            content: '窗外下着小雨，咖啡店里只有轻柔的音乐和咖啡机的声音。你正专注地看着笔记本电脑，突然感觉有人在注视着你。抬头，对面桌坐着的人正向你微笑。',
            choices: [
              { text: '回以微笑', nextScene: 'scene-2a' },
              { text: '低头继续工作，假装没注意', nextScene: 'scene-2b' },
              { text: '主动走过去搭话', nextScene: 'scene-2c' },
            ],
          },
          {
            id: 'scene-2a',
            title: '微笑',
            content: '对方的笑容加深了，站起身向你走来。"介意我坐这里吗？这家店今天好像特别满。"其实店里明明还有好几个空位。',
            choices: [
              { text: '"当然不介意，请坐。"', nextScene: 'scene-3a' },
              { text: '笑着指出有空位的事实', nextScene: 'scene-3b' },
            ],
          },
          {
            id: 'scene-2b',
            title: '回避',
            content: '你低下头，心跳却莫名加速。过了一会儿，一杯咖啡被轻轻放在你的桌上。"我觉得你可能需要续杯。"',
            choices: [],
          },
          {
            id: 'scene-2c',
            title: '主动',
            content: '你合上电脑，走向对方。近距离看，你发现对方的眼中似乎藏着某种深邃的情绪。',
            choices: [],
          },
          {
            id: 'scene-3a',
            title: '交谈开始',
            content: '你们开始聊天，从天气谈到工作，从兴趣爱好谈到人生理想。时间在不知不觉中流逝，窗外的雨也渐渐停了。',
            choices: [],
          },
          {
            id: 'scene-3b',
            title: '调侃',
            content: '"观察得很仔细嘛，"对方笑着说，"我只是觉得，比起空桌子，有人的座位更有趣一些。"',
            choices: [],
          },
        ],
      }),
    },
  ]

  for (const story of stories) {
    const existing = await prisma.story.findFirst({
      where: { title: story.title }
    })
    if (!existing) {
      await prisma.story.create({
        data: story
      })
      console.log(`Created story: ${story.title}`)
    } else {
      console.log(`Story already exists: ${story.title}`)
    }
  }

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
