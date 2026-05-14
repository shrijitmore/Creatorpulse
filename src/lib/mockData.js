export const MOCK_TRENDS = [
  {
    id: '1',
    title: 'The 5AM Routine That Changed Everything',
    platform: 'instagram',
    signal: 'viral',
    summary: 'Morning routines hitting 2M+ saves this week across fitness creators',
    score: 94,
    niche: 'fitness'
  },
  {
    id: '2',
    title: 'Why Your Emergency Fund Advice Is Wrong',
    platform: 'x',
    signal: 'viral',
    summary: 'Counter-narrative finance content dominating X discourse',
    score: 91,
    niche: 'finance'
  },
  {
    id: '3',
    title: 'AI Tools That Replaced My $5k/mo Software Stack',
    platform: 'reddit',
    signal: 'rising',
    summary: 'r/entrepreneur thread with 12k upvotes sparking creator interest',
    score: 87,
    niche: 'tech'
  },
  {
    id: '4',
    title: 'Quiet Luxury vs. Loud Budgeting',
    platform: 'instagram',
    signal: 'rising',
    summary: 'Aesthetic frugality trend merging fashion + finance niches',
    score: 83,
    niche: 'lifestyle'
  },
  {
    id: '5',
    title: '$100 Grocery Challenge: Week of Meals',
    platform: 'reddit',
    signal: 'new',
    summary: 'Budget cooking challenges seeing 3x engagement uplift',
    score: 79,
    niche: 'food'
  },
  {
    id: '6',
    title: 'The Protein Myth Trainers Dont Tell You',
    platform: 'instagram',
    signal: 'viral',
    summary: 'Debunking nutrition misinformation — controversy drives saves',
    score: 96,
    niche: 'fitness'
  },
  {
    id: '7',
    title: 'I Tested Every AI Coding Assistant for 30 Days',
    platform: 'x',
    signal: 'rising',
    summary: 'Long-form comparison threads converting well to reels',
    score: 85,
    niche: 'tech'
  },
  {
    id: '8',
    title: 'Recession-Proof Income Streams for 2025',
    platform: 'reddit',
    signal: 'viral',
    summary: 'Economic anxiety content peaking amid market uncertainty',
    score: 93,
    niche: 'finance'
  },
  {
    id: '9',
    title: 'The Minimalist Travel Packing System',
    platform: 'instagram',
    signal: 'rising',
    summary: 'One-bag travel aesthetic trending hard across travel creators',
    score: 80,
    niche: 'travel'
  },
  {
    id: '10',
    title: 'Skin Cycling Is Replacing 10-Step Routines',
    platform: 'instagram',
    signal: 'viral',
    summary: 'Simplified skincare protocols outperforming complex routines',
    score: 89,
    niche: 'beauty'
  },
  {
    id: '11',
    title: 'This Game Made $50M with Zero Marketing',
    platform: 'x',
    signal: 'rising',
    summary: 'Indie game breakout stories driving massive creator commentary',
    score: 82,
    niche: 'gaming'
  },
  {
    id: '12',
    title: 'Why Street Food Chefs Are Beating Michelin Stars',
    platform: 'reddit',
    signal: 'new',
    summary: 'Accessibility vs. prestige debate heating up in food communities',
    score: 76,
    niche: 'food'
  }
]

export const MOCK_RECOMMENDATIONS = [
  MOCK_TRENDS[0],
  MOCK_TRENDS[5],
  MOCK_TRENDS[7]
]

export const MOCK_SCRIPT = {
  id: 'mock-1',
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
      visuals: 'Split screen: chaotic morning vs. calm 5AM journaling setup',
      voiceover: 'No notifications. No obligations. Just you and your goals.',
      duration: '~10s'
    },
    {
      sceneNumber: 4,
      visuals: 'Progress montage — workout, reading, planning in golden morning light',
      voiceover: 'In 30 days, I shipped a side project, lost 8 pounds, and read 4 books.',
      duration: '~12s'
    },
    {
      sceneNumber: 5,
      visuals: 'Talking head, looking directly at camera, confident expression',
      voiceover: 'The 5AM routine isn\'t about waking up early. It\'s about choosing yourself first.',
      duration: '~10s'
    }
  ],
  cta: 'Follow for the exact 5-step system I use every morning. Link in bio for the free template.',
  niche: 'fitness',
  platform: 'instagram',
  createdAt: new Date().toISOString()
}

export const MOCK_CONTENT_KIT = {
  hookVariants: [
    { text: 'I used to think 5AM people were lying. Then I became one.', type: 'Storytelling' },
    { text: 'This one habit added 30 extra hours to my week. No, seriously.', type: 'Bold Claim' },
    { text: 'What if the most productive part of your day hasn\'t happened yet?', type: 'Question' }
  ],
  caption: '⏰ 5AM changed my life — and I have receipts.\n\nSix months ago I was sleeping until 8, rushing through my mornings, and wondering why I never had time for my goals.\n\nThen I committed to one month of 5AM starts. Here\'s what actually happened 👇\n\n✅ Shipped a side project\n✅ Lost 8 pounds (no diet change)\n✅ Read 4 books\n✅ Journaled every single day\n\nThe secret? The first hour belongs to YOU. No emails. No socials. No one else\'s agenda.\n\nSave this if you want to try it. Drop a 🌅 in the comments if you\'re a morning person.',
  hashtags: {
    niche: ['#morningroutine', '#5amclub', '#fitnesslifestyle', '#selfimprovement', '#habitbuilding'],
    trending: ['#5am', '#morningperson', '#productivityhacks', '#grwm', '#dayinmylife'],
    broad: ['#motivation', '#lifestyle', '#wellness', '#mindset', '#success', '#contentcreator', '#viral', '#reels']
  },
  thumbnailText: 'WOKE UP AT 5AM FOR 30 DAYS'
}

export const MOCK_SAVED_SCRIPTS = [
  {
    id: 'saved-1',
    topicTitle: 'The 5AM Routine That Changed Everything',
    niche: 'fitness',
    format: '60s',
    platform: 'instagram',
    tone: 'storytelling',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: 'saved-2',
    topicTitle: 'Why Your Emergency Fund Advice Is Wrong',
    niche: 'finance',
    format: '90s',
    platform: 'x',
    tone: 'controversial',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: 'saved-3',
    topicTitle: 'AI Tools That Replaced My $5k/mo Software Stack',
    niche: 'tech',
    format: '30s',
    platform: 'reddit',
    tone: 'educational',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
  }
]

export const NICHES = [
  { id: 'fitness', label: 'Fitness', icon: '💪' },
  { id: 'finance', label: 'Finance', icon: '💰' },
  { id: 'tech', label: 'Tech', icon: '⚡' },
  { id: 'lifestyle', label: 'Lifestyle', icon: '✨' },
  { id: 'food', label: 'Food', icon: '🍜' },
  { id: 'travel', label: 'Travel', icon: '🌍' },
  { id: 'beauty', label: 'Beauty', icon: '💄' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' }
]
