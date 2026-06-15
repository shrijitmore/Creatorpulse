/**
 * Backend constants — shared across agents, routes, services.
 */

// Input validation allowlists — imported by validate.js and routes
export const VALID_TONES    = ['educational', 'entertaining', 'controversial', 'storytelling']
export const VALID_FORMATS  = ['30s', '60s', '90s']
export const VALID_ELEMENTS = ['visual', 'voiceover', 'hook', 'cta']
export const VALID_CYCLES   = ['monthly', 'yearly']
export const VALID_SECTIONS = ['hookVariants', 'caption', 'hashtags', 'thumbnailText', 'fullScript']

export const NICHES_DEFAULT = ['fitness', 'finance', 'tech', 'lifestyle', 'food', 'travel', 'beauty', 'gaming']

// Billing — amounts in paise (INR × 100) for Razorpay
export const PLAN_AMOUNTS = {
  pro:    { monthly: 99900,   yearly: 958800  },
  agency: { monthly: 499900,  yearly: 4799000 },
}

export const COUPON_DISCOUNTS = {
  LAUNCH20: 0.20,
}

export const PLAN_IDS = ['free', 'pro', 'agency']

// Hard usage limits enforced server-side. Infinity = unlimited.
export const PLAN_LIMITS = {
  free:   { scriptsPerMonth: 5,        niches: 3 },
  pro:    { scriptsPerMonth: Infinity, niches: Infinity },
  agency: { scriptsPerMonth: Infinity, niches: Infinity },
}

// How many billing cycles a subscription runs before completing.
// Razorpay requires total_count; set high so it effectively auto-renews.
export const SUBSCRIPTION_TOTAL_COUNT = { monthly: 120, yearly: 10 }

// Hard ceilings so a hung upstream call (Gemini, Vertex auth, etc.) degrades to
// an error instead of leaving an SSE stream open forever.
export const TIMEOUTS = {
  embeddingAuthMs:  10000,
  creatorContextMs: 8000,
  scriptPipelineMs: 90000,
}

// Retry policy for transient Vertex AI errors (429 RESOURCE_EXHAUSTED, 503).
export const GEMINI_RETRY = {
  maxRetries:   2,
  baseDelayMs:  1000,
}

// Model fallback chain. Each model has its own per-project-per-minute quota
// bucket on Vertex, so falling through to the next on a 429 multiplies the
// effective request capacity. Ordered best → cheapest/fastest. Override the
// primary with GEMINI_MODEL env; the rest stay as backups.
// Only models verified accessible in the active Vertex project (sanskruti-407310,
// us-central1). 2.0/1.5 ids return NO-ACCESS there, so they're excluded.
// Order: primary → cheap+fast backup → most-capable last resort.
export const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
]

export const SIGNAL_THRESHOLDS = { viral: 80, rising: 55 }

export const CACHE_TTL = {
  viral:   60 * 60 * 1,
  rising:  60 * 60 * 5,
  new:     60 * 60 * 10,
  default: 60 * 60 * 2,
}

export const SCRAPING = {
  yt_results_per_niche:     5,
  reddit_posts_per_search:  4,
  reddit_hot_per_sub:       3,
  max_niches_per_run:       4,
  trend_analyst_input_cap:  15,
  recommendations_count:    2,
}

export const GEMINI = {
  model:             'gemini-2.5-flash',
  analyst_temp:      0.2,
  analyst_tokens:    8000,
  writer_temp:       0.7,
  writer_tokens:     3000,
  hooks_temp:        0.8,
  hooks_tokens:      2000,
  onboarding_temp:   0.2,
  onboarding_tokens: 2500,
}

export const SCORING = {
  youtube: { log_mult: 12, base: 20 },
  reddit:  { divisor: 30000, max_boost: 60, base: 30 },
}

export const NICHE_IG_HASHTAGS = {
  finance:        ['personalfinance', 'moneymanagement', 'financialtips', 'moneymindset', 'budgeting'],
  investing:      ['investing', 'stockmarket', 'dividends', 'wealthbuilding', 'passiveincome'],
  crypto:         ['crypto', 'bitcoin', 'ethereum', 'web3', 'cryptotrading'],
  ecommerce:      ['ecommerce', 'dropshipping', 'shopify', 'onlinebusiness', 'amazonFBA'],
  marketing:      ['digitalmarketing', 'contentmarketing', 'socialmediamarketing', 'seo', 'branding'],
  'side-hustle':  ['sidehustle', 'makemoneyonline', 'entrepreneurship', 'passiveincome', 'freelance'],
  'real-estate':  ['realestate', 'property', 'realestateinvesting', 'housing', 'landlord'],
  startup:        ['startup', 'entrepreneur', 'founder', 'innovation', 'venturecapital'],
  career:         ['career', 'jobsearch', 'resumetips', 'linkedin', 'professionaldevelopment'],
  fitness:        ['fitness', 'workout', 'gym', 'fitnessmotivation', 'bodybuilding'],
  yoga:           ['yoga', 'yogalife', 'yogapractice', 'yogainspiration', 'mindfulness'],
  running:        ['running', 'runningmotivation', 'marathon', 'runnersofinstagram', '5k'],
  nutrition:      ['nutrition', 'healthyfood', 'mealprep', 'healthyeating', 'cleaneating'],
  'weight-loss':  ['weightloss', 'weightlossjourney', 'fatloss', 'healthylifestyle', 'diet'],
  'mental-health':['mentalhealth', 'anxiety', 'selfcare', 'mentalhealthawareness', 'therapy'],
  meditation:     ['meditation', 'mindfulness', 'breathwork', 'innerpeace', 'zen'],
  veganism:       ['vegan', 'plantbased', 'veganfood', 'crueltyfree', 'govegan'],
  bodybuilding:   ['bodybuilding', 'powerlifting', 'gains', 'musclebuilding', 'lifting'],
  beauty:         ['beauty', 'skincare', 'makeup', 'beautycare', 'skincareroutine'],
  skincare:       ['skincare', 'glowingskin', 'skincareaddict', 'antiaging', 'acne'],
  hair:           ['haircare', 'hairstyle', 'naturalhair', 'hairgoals', 'hairtransformation'],
  fashion:        ['fashion', 'style', 'ootd', 'fashionblogger', 'outfitoftheday'],
  nails:          ['nails', 'nailart', 'manicure', 'gelmanicure', 'naildesign'],
  streetwear:     ['streetwear', 'hypebeast', 'sneakers', 'streetstyle', 'urbfashion'],
  cooking:        ['cooking', 'homecooking', 'recipes', 'foodphotography', 'cookingvideos'],
  baking:         ['baking', 'bakery', 'cakesofinstagram', 'homemade', 'bakedgoods'],
  'meal-prep':    ['mealprep', 'mealplanning', 'healthymeals', 'prepday', 'mealprepideas'],
  food:           ['food', 'foodie', 'foodphotography', 'instafood', 'foodlover'],
  keto:           ['keto', 'ketodiet', 'ketogenic', 'lowcarb', 'ketorecipes'],
  'plant-based':  ['plantbased', 'vegan', 'wholefood', 'plantbaseddiet', 'veganrecipes'],
  'street-food':  ['streetfood', 'foodie', 'localfood', 'foodhunt', 'eats'],
  coffee:         ['coffee', 'coffeelover', 'latteart', 'coffeetime', 'specialtycoffee'],
  tech:           ['technology', 'tech', 'innovation', 'futurism', 'gadgets'],
  ai:             ['artificialintelligence', 'machinelearning', 'ai', 'chatgpt', 'deeplearning'],
  coding:         ['coding', 'programming', 'developer', 'webdevelopment', 'codelife'],
  gadgets:        ['gadgets', 'tech', 'newtech', 'smartphone', 'techreview'],
  cybersecurity:  ['cybersecurity', 'hacking', 'infosec', 'privacy', 'datasecurity'],
  science:        ['science', 'physics', 'biology', 'chemistry', 'sciencefacts'],
  space:          ['space', 'astronomy', 'nasa', 'universe', 'cosmos'],
  gaming:         ['gaming', 'gamer', 'videogames', 'esports', 'pcgaming'],
  anime:          ['anime', 'otaku', 'manga', 'animefan', 'animeedits'],
  movies:         ['movies', 'cinema', 'film', 'moviereview', 'netflix'],
  music:          ['music', 'musician', 'newmusic', 'producer', 'musicvideo'],
  books:          ['books', 'reading', 'bookrecommendations', 'bookworm', 'booktok'],
  comedy:         ['comedy', 'funny', 'memes', 'humor', 'standup'],
  sports:         ['sports', 'fitness', 'athlete', 'sportslife', 'training'],
  cricket:        ['cricket', 'ipl', 'testcricket', 'cricketlovers', 'bcci'],
  esports:        ['esports', 'gaming', 'tournament', 'competitive', 'streamers'],
  lifestyle:      ['lifestyle', 'motivation', 'dailylife', 'positivevibes', 'livingmybest'],
  productivity:   ['productivity', 'timemanagement', 'focus', 'deepwork', 'habits'],
  minimalism:     ['minimalism', 'simplelife', 'declutter', 'lessismore', 'minimalist'],
  luxury:         ['luxury', 'luxurylife', 'lifestyle', 'wealth', 'highend'],
  'self-improvement': ['selfimprovement', 'personalgrowth', 'mindset', 'growthmindset', 'discipline'],
  journaling:     ['journaling', 'bulletjournal', 'journal', 'selfreflection', 'bujo'],
  stoicism:       ['stoicism', 'stoic', 'philosophy', 'mindset', 'discipline'],
  travel:         ['travel', 'wanderlust', 'adventure', 'backpacking', 'travelphotography'],
  hiking:         ['hiking', 'trailrunning', 'nature', 'outdoors', 'hikingadventures'],
  camping:        ['camping', 'outdoors', 'vanlife', 'campfire', 'campinglife'],
  photography:    ['photography', 'photographer', 'photooftheday', 'naturephotography', 'portrait'],
  'solo-travel':  ['solotravel', 'travelalone', 'wanderlust', 'backpacking', 'solotrip'],
  'budget-travel':['budgettravel', 'travelcheap', 'affordabletravel', 'hostel', 'backpacking'],
  parenting:      ['parenting', 'momlife', 'dadlife', 'kidsofinstagram', 'raisingkids'],
  pets:           ['pets', 'animals', 'petstagram', 'petlover', 'animalsofinstagram'],
  dogs:           ['dogs', 'dogoftheday', 'puppylove', 'dogsofinstagram', 'doglover'],
  cats:           ['cats', 'catsofinstagram', 'catstagram', 'kittens', 'catlover'],
  relationships:  ['relationships', 'love', 'dating', 'couplegoals', 'relationshipadvice'],
  pregnancy:      ['pregnancy', 'newborn', 'baby', 'motherhood', 'momtobe'],
  art:            ['art', 'artwork', 'illustration', 'digitalart', 'artist'],
  design:         ['design', 'uiux', 'graphicdesign', 'uidesign', 'webdesign'],
  diy:            ['diy', 'crafts', 'handmade', 'makersofinstagram', 'diycrafts'],
  'interior-design': ['interiordesign', 'homedecor', 'interiors', 'homedesign', 'livingroom'],
  writing:        ['writing', 'author', 'amwriting', 'writingcommunity', 'poet'],
  architecture:   ['architecture', 'archilovers', 'design', 'urbandesign', 'modernarchitecture'],
  education:      ['education', 'learning', 'studytips', 'student', 'teacher'],
  'language-learning': ['languagelearning', 'polyglot', 'english', 'duolingo', 'learnenglish'],
  history:        ['history', 'historylovers', 'ancienthistory', 'historical', 'worldhistory'],
  philosophy:     ['philosophy', 'stoicism', 'wisdom', 'ethics', 'thinking'],
  spirituality:   ['spirituality', 'spiritual', 'manifestation', 'consciousness', 'awakening'],
}

export const NICHE_YT_CATEGORIES = {
  finance:        { id: '27', query: 'personal finance money tips 2024' },
  investing:      { id: '27', query: 'investing stocks beginner guide' },
  crypto:         { id: '27', query: 'cryptocurrency bitcoin investing 2024' },
  ecommerce:      { id: '27', query: 'ecommerce dropshipping online business' },
  marketing:      { id: '27', query: 'digital marketing social media growth' },
  'side-hustle':  { id: '27', query: 'side hustle make money online' },
  'real-estate':  { id: '27', query: 'real estate investing property tips' },
  startup:        { id: '27', query: 'startup founder entrepreneur advice' },
  career:         { id: '27', query: 'career advice job interview tips' },
  fitness:        { id: '17', query: 'fitness workout tips training' },
  yoga:           { id: '26', query: 'yoga beginner routine flexibility' },
  running:        { id: '17', query: 'running tips marathon training' },
  nutrition:      { id: '26', query: 'nutrition healthy eating diet guide' },
  'weight-loss':  { id: '26', query: 'weight loss transformation tips' },
  'mental-health':{ id: '26', query: 'mental health anxiety tips' },
  meditation:     { id: '26', query: 'meditation beginner guided mindfulness' },
  veganism:       { id: '26', query: 'vegan diet plant based lifestyle' },
  bodybuilding:   { id: '17', query: 'bodybuilding muscle building workout' },
  beauty:         { id: '26', query: 'beauty skincare makeup routine' },
  skincare:       { id: '26', query: 'skincare routine anti aging tips' },
  hair:           { id: '26', query: 'hair care routine growth tips' },
  fashion:        { id: '26', query: 'fashion style outfit ideas trends' },
  nails:          { id: '26', query: 'nail art tutorial designs' },
  streetwear:     { id: '26', query: 'streetwear style sneakers fashion' },
  cooking:        { id: '26', query: 'cooking recipes homemade easy meals' },
  baking:         { id: '26', query: 'baking bread cakes desserts recipes' },
  'meal-prep':    { id: '26', query: 'meal prep healthy recipes week' },
  food:           { id: '26', query: 'food recipes cooking foodie' },
  keto:           { id: '26', query: 'keto diet recipes low carb' },
  'plant-based':  { id: '26', query: 'plant based vegan recipes cooking' },
  'street-food':  { id: '26', query: 'street food best places eat' },
  coffee:         { id: '26', query: 'coffee latte art espresso guide' },
  tech:           { id: '28', query: 'technology ai gadgets 2024' },
  ai:             { id: '28', query: 'artificial intelligence ai tools 2024' },
  coding:         { id: '28', query: 'programming tutorial beginner web dev' },
  gadgets:        { id: '28', query: 'best gadgets tech review 2024' },
  cybersecurity:  { id: '28', query: 'cybersecurity hacking ethical tutorial' },
  science:        { id: '28', query: 'science explained facts discoveries' },
  space:          { id: '28', query: 'space astronomy nasa discoveries' },
  gaming:         { id: '20', query: 'gaming tips esports guide' },
  anime:          { id: '1',  query: 'anime review recommendations 2024' },
  movies:         { id: '1',  query: 'movie review best films' },
  music:          { id: '10', query: 'music new releases hits 2024' },
  books:          { id: '27', query: 'book review recommendations reading' },
  comedy:         { id: '23', query: 'comedy funny video stand up' },
  sports:         { id: '17', query: 'sports highlights best moments' },
  cricket:        { id: '17', query: 'cricket IPL highlights tips' },
  esports:        { id: '20', query: 'esports tournament highlights gameplay' },
  lifestyle:      { id: '26', query: 'lifestyle daily routine habits' },
  productivity:   { id: '27', query: 'productivity habits time management' },
  minimalism:     { id: '26', query: 'minimalism simple living declutter' },
  luxury:         { id: '26', query: 'luxury lifestyle rich living' },
  'self-improvement': { id: '26', query: 'self improvement discipline habits' },
  journaling:     { id: '26', query: 'journaling bullet journal tips' },
  stoicism:       { id: '27', query: 'stoicism philosophy marcus aurelius' },
  travel:         { id: '19', query: 'travel adventure destinations guide' },
  hiking:         { id: '19', query: 'hiking trails tips beginners' },
  camping:        { id: '19', query: 'camping guide gear tips' },
  photography:    { id: '2',  query: 'photography tips camera techniques' },
  'solo-travel':  { id: '19', query: 'solo travel tips safety guide' },
  'budget-travel':{ id: '19', query: 'budget travel cheap flights save' },
  parenting:      { id: '26', query: 'parenting tips newborn toddler' },
  pets:           { id: '15', query: 'pets care tips cute animals' },
  dogs:           { id: '15', query: 'dog training tips puppy care' },
  cats:           { id: '15', query: 'cat care tips training behavior' },
  relationships:  { id: '26', query: 'relationship advice dating tips' },
  pregnancy:      { id: '26', query: 'pregnancy tips newborn baby care' },
  art:            { id: '27', query: 'art tutorial digital illustration' },
  design:         { id: '27', query: 'ui ux design tutorial figma' },
  diy:            { id: '26', query: 'diy crafts projects home' },
  'interior-design': { id: '26', query: 'interior design home decor ideas' },
  writing:        { id: '27', query: 'creative writing tips author advice' },
  architecture:   { id: '26', query: 'architecture design buildings amazing' },
  education:      { id: '27', query: 'education learning study techniques' },
  'language-learning': { id: '27', query: 'language learning fluency tips' },
  history:        { id: '27', query: 'history facts ancient civilizations' },
  philosophy:     { id: '27', query: 'philosophy explained life wisdom' },
  spirituality:   { id: '26', query: 'spirituality meditation consciousness' },
}

export const NICHE_SUBREDDITS = {
  finance:        ['personalfinance', 'financialindependence', 'povertyfinance'],
  investing:      ['investing', 'stocks', 'dividends'],
  crypto:         ['CryptoCurrency', 'Bitcoin', 'ethereum'],
  ecommerce:      ['ecommerce', 'dropship', 'Entrepreneur'],
  marketing:      ['marketing', 'digital_marketing', 'SEO'],
  'side-hustle':  ['sidehustle', 'beermoney', 'Entrepreneur'],
  'real-estate':  ['realestateinvesting', 'realestate', 'landlord'],
  startup:        ['startups', 'entrepreneur', 'SaaS'],
  career:         ['cscareerquestions', 'jobs', 'careerguidance'],
  fitness:        ['fitness', 'bodyweightfitness', 'loseit'],
  yoga:           ['yoga', 'flexibility', 'meditation'],
  running:        ['running', 'ultramarathon', 'trailrunning'],
  nutrition:      ['nutrition', 'HealthyFood', 'EatCheapAndHealthy'],
  'weight-loss':  ['loseit', 'progresspics', 'intermittentfasting'],
  'mental-health':['mentalhealth', 'anxiety', 'depression'],
  meditation:     ['meditation', 'Mindfulness', 'spirituality'],
  veganism:       ['vegan', 'veganfitness', 'PlantBasedDiet'],
  bodybuilding:   ['bodybuilding', 'powerlifting', 'weightlifting'],
  beauty:         ['SkincareAddiction', 'beauty', 'MakeupAddiction'],
  skincare:       ['SkincareAddiction', 'AsianBeauty', 'tretinoin'],
  hair:           ['Hair', 'curlyhair', 'HaircareScience'],
  fashion:        ['malefashionadvice', 'femalefashionadvice', 'streetwear'],
  nails:          ['RedditLaqueristas', 'nails', 'gelnails'],
  streetwear:     ['streetwear', 'Sneakers', 'hoodwink'],
  cooking:        ['Cooking', 'recipes', 'AskCulinary'],
  baking:         ['Baking', 'Breadit', 'cakedecorating'],
  'meal-prep':    ['MealPrepSunday', 'fitmeals', 'EatCheapAndHealthy'],
  food:           ['food', 'FoodPorn', 'GifRecipes'],
  keto:           ['keto', 'ketoscience', 'ketorecipes'],
  'plant-based':  ['PlantBasedDiet', 'vegan', 'whole30'],
  'street-food':  ['food', 'streetfood', 'FoodPorn'],
  coffee:         ['Coffee', 'espresso', 'barista'],
  tech:           ['technology', 'gadgets', 'techsupport'],
  ai:             ['artificial', 'MachineLearning', 'ChatGPT'],
  coding:         ['programming', 'learnprogramming', 'webdev'],
  gadgets:        ['gadgets', 'hardware', 'tech'],
  cybersecurity:  ['cybersecurity', 'netsec', 'hacking'],
  science:        ['science', 'askscience', 'Physics'],
  space:          ['space', 'Astronomy', 'spacex'],
  gaming:         ['gaming', 'pcgaming', 'indiegaming'],
  anime:          ['anime', 'manga', 'animesuggest'],
  movies:         ['movies', 'MovieSuggestions', 'horror'],
  music:          ['Music', 'indieheads', 'listentothis'],
  books:          ['books', 'booksuggestions', 'fantasy'],
  comedy:         ['funny', 'memes', 'ComedyNecrophilia'],
  sports:         ['sports', 'nba', 'soccer'],
  cricket:        ['Cricket', 'IndianCricket', 'IPL'],
  esports:        ['esports', 'leagueoflegends', 'GlobalOffensive'],
  lifestyle:      ['selfimprovement', 'productivity', 'getdisciplined'],
  productivity:   ['productivity', 'getdisciplined', 'timemanagement'],
  minimalism:     ['minimalism', 'declutter', 'simpleliving'],
  luxury:         ['luxury', 'watches', 'malelivingspace'],
  'self-improvement': ['selfimprovement', 'getdisciplined', 'decidingtobebetter'],
  journaling:     ['Journaling', 'bulletjournal', 'Diary'],
  stoicism:       ['Stoicism', 'philosophy', 'Meditations'],
  travel:         ['travel', 'solotravel', 'backpacking'],
  hiking:         ['hiking', 'ultralight', 'CampingandHiking'],
  camping:        ['camping', 'vandwellers', 'overlanding'],
  photography:    ['photography', 'photocritique', 'analog'],
  'solo-travel':  ['solotravel', 'travel', 'iwantout'],
  'budget-travel':['Shoestring', 'travel', 'solotravel'],
  parenting:      ['Parenting', 'daddit', 'Mommit'],
  pets:           ['pets', 'aww', 'AnimalsBeingBros'],
  dogs:           ['dogs', 'puppy101', 'dogtraining'],
  cats:           ['cats', 'aww', 'CatAdvice'],
  relationships:  ['relationships', 'dating_advice', 'dating'],
  pregnancy:      ['pregnant', 'beyondthebump', 'NewParents'],
  art:            ['Art', 'ArtFundamentals', 'learnart'],
  design:         ['design', 'graphic_design', 'UI_Design'],
  diy:            ['DIY', 'crafts', 'somethingimade'],
  'interior-design': ['malelivingspace', 'femalelivingspace', 'interiordesign'],
  writing:        ['writing', 'worldbuilding', 'fantasywriters'],
  architecture:   ['architecture', 'ArchitecturePorn', 'urbanplanning'],
  education:      ['education', 'Teachers', 'AskAcademia'],
  'language-learning': ['languagelearning', 'Spanish', 'learnfrench'],
  history:        ['history', 'AskHistorians', 'HistoryPorn'],
  philosophy:     ['philosophy', 'askphilosophy', 'Stoicism'],
  spirituality:   ['spirituality', 'awakened', 'meditation'],
}
