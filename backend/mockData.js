export const MOCK_TRENDS = [
  {
    id: '1',
    title: 'The 5AM Routine That Changed Everything',
    platform: 'instagram',
    signal: 'viral',
    summary: 'Morning routines hitting 2M+ saves this week across fitness creators',
    score: 94,
    niche: 'fitness',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Why Your Emergency Fund Advice Is Wrong',
    platform: 'x',
    signal: 'viral',
    summary: 'Counter-narrative finance content dominating X discourse',
    score: 91,
    niche: 'finance',
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'AI Tools That Replaced My $5k/mo Software Stack',
    platform: 'reddit',
    signal: 'rising',
    summary: 'r/entrepreneur thread with 12k upvotes sparking creator interest',
    score: 87,
    niche: 'tech',
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    title: 'Quiet Luxury vs. Loud Budgeting',
    platform: 'instagram',
    signal: 'rising',
    summary: 'Aesthetic frugality trend merging fashion + finance niches',
    score: 83,
    niche: 'lifestyle',
    createdAt: new Date().toISOString()
  },
  {
    id: '5',
    title: '$100 Grocery Challenge: Week of Meals',
    platform: 'reddit',
    signal: 'new',
    summary: 'Budget cooking challenges seeing 3x engagement uplift',
    score: 79,
    niche: 'food',
    createdAt: new Date().toISOString()
  },
  {
    id: '6',
    title: 'The Protein Myth Trainers Dont Tell You',
    platform: 'instagram',
    signal: 'viral',
    summary: 'Debunking nutrition misinformation drives massive saves',
    score: 96,
    niche: 'fitness',
    createdAt: new Date().toISOString()
  },
  {
    id: '7',
    title: 'I Tested Every AI Coding Assistant for 30 Days',
    platform: 'x',
    signal: 'rising',
    summary: 'Long-form comparison threads converting well to reels',
    score: 85,
    niche: 'tech',
    createdAt: new Date().toISOString()
  },
  {
    id: '8',
    title: 'Recession-Proof Income Streams for 2025',
    platform: 'reddit',
    signal: 'viral',
    summary: 'Economic anxiety content peaking amid market uncertainty',
    score: 93,
    niche: 'finance',
    createdAt: new Date().toISOString()
  }
]

export const MOCK_RECOMMENDATIONS = [MOCK_TRENDS[0], MOCK_TRENDS[5], MOCK_TRENDS[7]]

export const MOCK_SCRIPT = {
  topicId: '1',
  topicTitle: 'The 5AM Routine That Changed Everything',
  tone: 'storytelling',
  format: '60s',
  hookLine: 'I used to think 5AM people were lying. Then I became one.',
  scenes: [
    {
      sceneNumber: 1,
      visuals: 'POV shot of phone alarm at 4:58AM, hand reaching to turn it off',
      voiceover: 'Six months ago, I was hitting snooze seven times a day.',
      duration: '~8s'
    },
    {
      sceneNumber: 2,
      visuals: 'Timelapse of dark kitchen, making coffee, steam rising',
      voiceover: 'Then I tried something that felt impossible. One hour before everyone else woke up.',
      duration: '~10s'
    },
    {
      sceneNumber: 3,
      visuals: 'Split screen: chaotic morning vs. calm 5AM journaling',
      voiceover: 'No notifications. No obligations. Just you and your goals.',
      duration: '~10s'
    },
    {
      sceneNumber: 4,
      visuals: 'Progress montage: workout, reading, planning flat-lay',
      voiceover: 'In 30 days, I shipped a side project, lost 8 pounds, and read 4 books.',
      duration: '~12s'
    },
    {
      sceneNumber: 5,
      visuals: 'Talking head, looking directly at camera, confident smile',
      voiceover: 'The 5AM routine is not about waking up early. Its about choosing yourself first.',
      duration: '~10s'
    }
  ],
  cta: 'Follow for the exact 5-step system I use every morning. Link in bio for the free template.',
  niche: 'fitness',
  platform: 'instagram'
}

export const MOCK_CONTENT_KIT = {
  hookVariants: [
    'I used to think 5AM people were lying. Then I became one.',
    'This one habit added 30 extra hours to my week. No, seriously.',
    'What if the most productive part of your day has not happened yet?'
  ],
  caption:
    '⏰ 5AM changed my life — and I have receipts.\n\nSix months ago I was sleeping until 8, rushing through my mornings, and wondering why I never had time for my goals.\n\nThen I committed to one month of 5AM starts. Here is what actually happened 👇\n\n✅ Shipped a side project\n✅ Lost 8 pounds (no diet change)\n✅ Read 4 books\n✅ Journaled every single day\n\nThe secret? The first hour belongs to YOU. No emails. No socials. No one elses agenda.\n\nSave this if you want to try it. Drop a 🌅 in the comments if you are a morning person.',
  hashtags: {
    niche: ['#morningroutine', '#5amclub', '#fitnesslifestyle', '#selfimprovement', '#habitbuilding'],
    trending: ['#5am', '#morningperson', '#productivityhacks', '#grwm', '#dayinmylife'],
    broad: ['#motivation', '#lifestyle', '#wellness', '#mindset', '#success', '#contentcreator', '#viral', '#reels']
  },
  thumbnailText: 'WOKE UP AT 5AM FOR 30 DAYS'
}
