import type { LearningLevel } from './catalog-api';
import type { LanguageTag } from './language';

interface InterfaceCopy {
  common: {
    mainNavigation: string;
    discover: string;
    myLearningList: string;
    list: string;
    vocabulary: string;
    words: string;
    signIn: string;
    toggleNavigation: string;
    autoTranslated: string;
    readingDevice: string;
    newWords(count: number): string;
    wordCount(count: number): string;
    savedCount(count: number): string;
    durationMinutes(count: number): string;
    durationSeconds(count: number): string;
    voices(count: number): string;
    level: Record<
      LearningLevel,
      { label: string; note: string; range: string }
    >;
  };
  discover: {
    heroEyebrow: string;
    heroLead: string;
    heroEmphasis: string;
    chooseLevelIntro(language: string): string;
    searchAria: string;
    searchPlaceholder: string;
    explore: string;
    supportNote: string;
    stepOne: string;
    chooseLevel: string;
    stepTwo: string;
    fit(score: number): string;
    startHere: string;
    browseByInterest: string;
    all: string;
    matchCount(count: number, level: string): string;
    queryHeading(query: string, level: string): string;
    interestHeading(interest: string, level: string): string;
    practiceHeading(level: string): string;
    showLess: string;
    showAll(count: number): string;
    realLesson: string;
    saveShow(title: string): string;
    removeShow(title: string): string;
    playShow(title: string): string;
    pauseShow(title: string): string;
    whyItFits: string;
    transcriptOnly: string;
    startLesson: string;
    noMatch(level: string): string;
    broadenSearch: string;
    resetFilters: string;
    analyzedEyebrow: string;
    difficultyHeading: string;
    difficultyBody: string;
    speechPace: string;
    speechPaceBody: string;
    vocabularyLoad: string;
    vocabularyLoadBody: string;
    sentenceComplexity: string;
    sentenceComplexityBody: string;
    listEyebrow: string;
    listHeading: string;
    listBody: string;
    waitingLessons(count: number): string;
    openList: string;
    footer: string;
    about: string;
    privacy: string;
    feedback: string;
  };
  episode: {
    backToDiscover: string;
    listeningLesson: string;
    realAudioTranscript: string;
    multiSpeakerHeading: string;
    singleSpeakerHeading: string;
    transcriptOnly: string;
    sourcePrefix: string;
    sourceModifiedUnder: string;
    sourceUnmodifiedUnder: string;
    sourceCreditOnly: string;
    player: string;
    playLesson: string;
    pauseLesson: string;
    seekEpisode: string;
    replayTen: string;
    skipTen: string;
    completed: string;
    markComplete: string;
    speed: string;
    deviceStorage: string;
    transcript: string;
    practice: string;
    hideTranslation: string;
    showTranslation: string;
    learningFocus: string;
    focusAdvice: string;
    listeningTip: string;
    listeningTipBody: string;
    fromEpisode: string;
    wordsWorthKeeping: string;
    savedToWordList(count: number): string;
    saveWord(term: string): string;
    removeWord(term: string): string;
    hearAt(time: string): string;
    exampleNotLocated: string;
    quickCheck: string;
    understoodHeading: string;
    practiceBody: string;
    score(correct: number, total: number): string;
    tryAgain: string;
    checkAnswers: string;
    keepLearning: string;
    anotherEpisode: string;
    previousLesson: string;
    nextLesson: string;
  };
  list: {
    eyebrow: string;
    heading: string;
    deviceOnly(pair: string): string;
    removed(title: string): string;
    wordsRemain: string;
    undo: string;
    continueTitle: string;
    continueBody: string;
    savedTitle: string;
    savedBody: string;
    finishedTitle: string;
    finishedBody: string;
    findSomething: string;
    sampleTitle: string;
    sampleBody: string;
    finished: string;
    stoppedAt(time: string): string;
    openedNotPlayed: string;
    notStarted: string;
    savedWords(count: number): string;
    continue: string;
    open: string;
    removeFromList(title: string): string;
  };
  words: {
    eyebrow: string;
    heading: string;
    body: string;
    searchAria: string;
    searchPlaceholder: string;
    noMatch(query: string): string;
    noneSaved: string;
    noVocabulary: string;
    findEpisode: string;
    sampleTitle: string;
    sampleBody: string;
  };
  metadata: {
    discoverTitle(language: string): string;
    discoverDescription: string;
    listTitle(language: string): string;
    listDescription: string;
    wordsTitle(language: string): string;
    wordsDescription: string;
    lessonNotFound: string;
    lessonTitle(title: string, level: string, language: string): string;
  };
}

const en: InterfaceCopy = {
  common: {
    mainNavigation: 'Main navigation',
    discover: 'Discover',
    myLearningList: 'My learning list',
    list: 'List',
    vocabulary: 'Vocabulary',
    words: 'Words',
    signIn: 'Sign in',
    toggleNavigation: 'Toggle navigation',
    autoTranslated: 'Auto-translated',
    readingDevice: 'Reading this device…',
    newWords: (count) => `${count} new ${count === 1 ? 'word' : 'words'}`,
    wordCount: (count) => `${count} ${count === 1 ? 'word' : 'words'}`,
    savedCount: (count) => `${count} saved`,
    durationMinutes: (count) => `${count} min`,
    durationSeconds: (count) => `${count} sec`,
    voices: (count) => (count === 1 ? 'One voice' : `${count} voices`),
    level: {
      Beginner: {
        label: 'Beginner',
        note: 'Clear, everyday language',
        range: 'A1–A2',
      },
      Intermediate: {
        label: 'Intermediate',
        note: 'Natural speech with support',
        range: 'B1–B2',
      },
      Advanced: {
        label: 'Advanced',
        note: 'Nuanced, fast-paced ideas',
        range: 'C1–C2',
      },
    },
  },
  discover: {
    heroEyebrow: 'Ranked by what you can follow',
    heroLead: 'Podcasts at ',
    heroEmphasis: 'your level.',
    chooseLevelIntro: (language) =>
      `Choose your ${language} level. We analyze each transcript so every episode feels challenging—not overwhelming.`,
    searchAria: 'Search learning podcasts by topic',
    searchPlaceholder: 'What do you want to learn about?',
    explore: 'Explore',
    supportNote: 'Every episode includes a transcript and vocabulary support.',
    stepOne: 'Step 1',
    chooseLevel: 'Choose your level',
    stepTwo: 'Step 2 · Start here',
    fit: (score) => `${score}% fit`,
    startHere: 'Start with this one',
    browseByInterest: 'Browse by interest',
    all: 'All',
    matchCount: (count, level) =>
      `${count} ${level.toLowerCase()} ${count === 1 ? 'match' : 'matches'}`,
    queryHeading: (query, level) =>
      `“${query}” at ${level.toLowerCase()} level`,
    interestHeading: (interest, level) =>
      `${interest} for ${level.toLowerCase()} learners`,
    practiceHeading: (level) => `${level} listening practice`,
    showLess: 'Show less',
    showAll: (count) => `See all ${count}`,
    realLesson: 'Real lesson',
    saveShow: (title) => `Save ${title}`,
    removeShow: (title) => `Remove ${title}`,
    playShow: (title) => `Play ${title}`,
    pauseShow: (title) => `Pause ${title}`,
    whyItFits: 'Why it fits your level',
    transcriptOnly: 'Transcript-only rating',
    startLesson: 'Start lesson',
    noMatch: (level) => `No ${level.toLowerCase()} match yet`,
    broadenSearch: 'Try a broader topic or choose another learning level.',
    resetFilters: 'Reset filters',
    analyzedEyebrow: 'Transcript analyzed',
    difficultyHeading: 'Difficulty you can trust',
    difficultyBody:
      'We classify the episode itself—not the show—so the level reflects the words you will actually hear.',
    speechPace: 'Speech pace',
    speechPaceBody: 'Words per minute and pauses between ideas.',
    vocabularyLoad: 'Vocabulary load',
    vocabularyLoadBody: 'Uncommon words, idioms, and technical terms.',
    sentenceComplexity: 'Sentence complexity',
    sentenceComplexityBody: 'Grammar patterns and how ideas connect.',
    listEyebrow: 'Your learning list',
    listHeading: 'A better way to practice listening.',
    listBody:
      'Save episodes for your next study session. Every listen comes with a readable transcript and vocabulary help.',
    waitingLessons: (count) =>
      ` You have ${count} ${count === 1 ? 'lesson' : 'lessons'} waiting.`,
    openList: 'Open my learning list',
    footer: '© 2026 DiscoPod. Learn by listening.',
    about: 'About',
    privacy: 'Privacy',
    feedback: 'Feedback',
  },
  episode: {
    backToDiscover: 'Back to discover',
    listeningLesson: 'Listening lesson',
    realAudioTranscript: 'Real audio + transcript',
    multiSpeakerHeading: 'Learn from a real conversation.',
    singleSpeakerHeading: 'Learn from real speech.',
    transcriptOnly: 'Transcript-only rating',
    sourcePrefix: 'Audio and transcript',
    sourceModifiedUnder: 'Excerpted and re-timed for language learning, under ',
    sourceUnmodifiedUnder:
      "The publisher's own file, unmodified; only the cue timings were added here. Under ",
    sourceCreditOnly: 'Used with credit for language learning.',
    player: 'Episode player',
    playLesson: 'Play lesson',
    pauseLesson: 'Pause lesson',
    seekEpisode: 'Seek episode',
    replayTen: 'Replay 10 seconds',
    skipTen: 'Skip 10 seconds',
    completed: 'Completed',
    markComplete: 'Mark complete',
    speed: 'Speed',
    deviceStorage:
      'Your listening position, saved words, and quiz answers stay on this device.',
    transcript: 'Transcript',
    practice: 'Practice',
    hideTranslation: 'Hide translation',
    showTranslation: 'Show translation',
    learningFocus: 'Learning focus',
    focusAdvice:
      'Don’t stop at every unfamiliar word. First listen for the speaker’s main idea, then replay each section.',
    listeningTip: 'Listening tip',
    listeningTipBody:
      'Tap any transcript line to jump to that part of the episode. The current line follows the audio.',
    fromEpisode: 'From this episode',
    wordsWorthKeeping: 'Words worth keeping',
    savedToWordList: (count) => `${count} saved to your word list`,
    saveWord: (term) => `Save ${term}`,
    removeWord: (term) => `Remove ${term}`,
    hearAt: (time) => `Hear it at ${time}`,
    exampleNotLocated:
      'Example sentence — we couldn’t locate this word in the transcript.',
    quickCheck: 'Quick check',
    understoodHeading: 'What did you understand?',
    practiceBody:
      'Choose one answer for each question. You can retry as many times as you like.',
    score: (correct, total) => `You got ${correct} of ${total} correct.`,
    tryAgain: 'Try again',
    checkAnswers: 'Check answers',
    keepLearning: 'Keep learning',
    anotherEpisode: 'Ready for another episode?',
    previousLesson: 'Previous lesson',
    nextLesson: 'Next lesson',
  },
  list: {
    eyebrow: 'Your learning list',
    heading: 'Where you left off.',
    deviceOnly: (pair) =>
      `Everything here is stored on this device only, under ${pair}. Nothing is uploaded, and clearing your browser data clears this list.`,
    removed: (title) => `Removed ${title}.`,
    wordsRemain: 'Any words you saved from it are still in your word list.',
    undo: 'Undo',
    continueTitle: 'Continue listening',
    continueBody:
      'Picked up where the audio stopped, not where a percentage says you are.',
    savedTitle: 'Saved for later',
    savedBody: 'Saved from discover, not opened yet.',
    finishedTitle: 'Finished',
    finishedBody:
      'Listened to the end. Worth a second pass without the transcript.',
    findSomething: 'Find something to add',
    sampleTitle: 'Sample list',
    sampleBody:
      'You have not saved anything yet, so this is a made-up list showing what the page does. The episodes are real and the links work; the positions and saved-word counts are invented, and none of it has been written to this device. These rows have no remove button because there is nothing to remove. Save an episode on discover and it replaces this immediately.',
    finished: 'Finished',
    stoppedAt: (time) => `Stopped at ${time}`,
    openedNotPlayed: 'Opened, not played yet',
    notStarted: 'Not started',
    savedWords: (count) => `${count} ${count === 1 ? 'word' : 'words'} saved`,
    continue: 'Continue',
    open: 'Open',
    removeFromList: (title) => `Remove ${title} from my learning list`,
  },
  words: {
    eyebrow: 'Your vocabulary',
    heading: 'Every word, with the sentence it was said in.',
    body: 'A word saved from an episode keeps the line it was spoken in, who said it and when—so you can review by ear instead of by flashcard. Stored on this device only.',
    searchAria: 'Search saved words',
    searchPlaceholder: 'Search a word, a meaning or a line',
    noMatch: (query) => `Nothing saved matches “${query}”.`,
    noneSaved: 'No words saved under this pair yet.',
    noVocabulary:
      'No episode in this pair carries a word list yet, so there is nothing here to save from. This page fills up as soon as one does.',
    findEpisode: 'Find another episode',
    sampleTitle: 'Sample vocabulary',
    sampleBody:
      'You have not saved a word yet, so these are real vocabulary entries from the episodes below, shown as if you had. Nothing here has been written to this device. Save a word inside any episode and it replaces this immediately.',
  },
  metadata: {
    discoverTitle: (language) =>
      `${language} podcasts at your level — DiscoPod`,
    discoverDescription:
      'Podcast episodes ranked by whether you can follow them, not by what is popular.',
    listTitle: (language) => `My learning list — ${language} on DiscoPod`,
    listDescription:
      'The episodes you saved, where you stopped, and what you saved from them.',
    wordsTitle: (language) => `Vocabulary — ${language} on DiscoPod`,
    wordsDescription: 'Every word you saved, with the sentence it was said in.',
    lessonNotFound: 'Lesson not found — DiscoPod',
    lessonTitle: (title, level, language) =>
      `${title} — ${level} ${language} lesson`,
  },
};

const zhHant: InterfaceCopy = {
  common: {
    mainNavigation: '主要導覽',
    discover: '探索',
    myLearningList: '我的學習清單',
    list: '清單',
    vocabulary: '單字庫',
    words: '單字',
    signIn: '登入',
    toggleNavigation: '開啟或關閉導覽',
    autoTranslated: '自動翻譯',
    readingDevice: '正在讀取這部裝置…',
    newWords: (count) => `${count} 個新單字`,
    wordCount: (count) => `${count} 個單字`,
    savedCount: (count) => `已儲存 ${count} 集`,
    durationMinutes: (count) => `${count} 分鐘`,
    durationSeconds: (count) => `${count} 秒`,
    voices: (count) => `${count} 位說話者`,
    level: {
      Beginner: { label: '初級', note: '清楚的日常用語', range: 'A1–A2' },
      Intermediate: { label: '中級', note: '有輔助的自然語速', range: 'B1–B2' },
      Advanced: { label: '高級', note: '細膩而快速的內容', range: 'C1–C2' },
    },
  },
  discover: {
    heroEyebrow: '依照你聽得懂的程度排序',
    heroLead: '適合',
    heroEmphasis: '你程度的 Podcast。',
    chooseLevelIntro: (language) =>
      `選擇你的 ${language} 程度。我們會分析每一集逐字稿，讓內容有挑戰性，卻不至於難到聽不下去。`,
    searchAria: '依主題搜尋語言學習 Podcast',
    searchPlaceholder: '你想聽什麼主題？',
    explore: '探索',
    supportNote: '每一集都附有逐字稿和單字輔助。',
    stepOne: '步驟 1',
    chooseLevel: '選擇你的程度',
    stepTwo: '步驟 2 · 從這集開始',
    fit: (score) => `適合度 ${score}%`,
    startHere: '就從這集開始',
    browseByInterest: '依興趣瀏覽',
    all: '全部',
    matchCount: (count, level) => `${level}共有 ${count} 個結果`,
    queryHeading: (query, level) => `${level}程度的「${query}」`,
    interestHeading: (interest, level) => `適合${level}學習者的${interest}`,
    practiceHeading: (level) => `${level}聽力練習`,
    showLess: '顯示較少',
    showAll: (count) => `查看全部 ${count} 集`,
    realLesson: '真人內容',
    saveShow: (title) => `儲存 ${title}`,
    removeShow: (title) => `移除 ${title}`,
    playShow: (title) => `播放 ${title}`,
    pauseShow: (title) => `暫停 ${title}`,
    whyItFits: '適合你程度的原因',
    transcriptOnly: '僅依逐字稿評分',
    startLesson: '開始學習',
    noMatch: (level) => `目前沒有適合${level}的內容`,
    broadenSearch: '試試更廣泛的主題，或選擇其他程度。',
    resetFilters: '重設篩選',
    analyzedEyebrow: '逐字稿分析',
    difficultyHeading: '值得信賴的難度',
    difficultyBody:
      '我們分析每一集，而不是整個節目，所以程度真正反映你會聽到的內容。',
    speechPace: '語速',
    speechPaceBody: '每分鐘字詞數，以及想法之間的停頓。',
    vocabularyLoad: '單字負擔',
    vocabularyLoadBody: '不常見的字詞、慣用語和專業術語。',
    sentenceComplexity: '句子複雜度',
    sentenceComplexityBody: '文法結構和想法之間的連接方式。',
    listEyebrow: '你的學習清單',
    listHeading: '更有效的聽力練習方式。',
    listBody: '儲存下一次想學的集數。每次收聽都有清楚的逐字稿和單字輔助。',
    waitingLessons: (count) => ` 你有 ${count} 集等待收聽。`,
    openList: '開啟我的學習清單',
    footer: '© 2026 DiscoPod。用聆聽來學習。',
    about: '關於',
    privacy: '隱私',
    feedback: '意見回饋',
  },
  episode: {
    backToDiscover: '返回探索',
    listeningLesson: '聽力課程',
    realAudioTranscript: '真實音訊＋逐字稿',
    multiSpeakerHeading: '從真實對話中學習。',
    singleSpeakerHeading: '從真實語音中學習。',
    transcriptOnly: '僅依逐字稿評分',
    sourcePrefix: '音訊與逐字稿',
    sourceModifiedUnder: '為語言學習節錄並重新配時，授權條款為 ',
    sourceUnmodifiedUnder:
      '使用發布者未修改的原始檔案；本站只加入提示時間。授權條款為 ',
    sourceCreditOnly: '註明來源後用於語言學習。',
    player: '單集播放器',
    playLesson: '播放課程',
    pauseLesson: '暫停課程',
    seekEpisode: '跳至單集中的位置',
    replayTen: '倒退 10 秒',
    skipTen: '前進 10 秒',
    completed: '已完成',
    markComplete: '標記為完成',
    speed: '速度',
    deviceStorage: '你的收聽位置、已儲存單字和測驗答案只會保留在這部裝置上。',
    transcript: '逐字稿',
    practice: '練習',
    hideTranslation: '隱藏翻譯',
    showTranslation: '顯示翻譯',
    learningFocus: '學習重點',
    focusAdvice:
      '不要每遇到陌生單字就停下來。先聽懂說話者的主要意思，再重播各個段落。',
    listeningTip: '聆聽提示',
    listeningTipBody:
      '點選任一句逐字稿即可跳到該段音訊；目前播放的句子會跟著音訊前進。',
    fromEpisode: '來自這一集',
    wordsWorthKeeping: '值得記住的單字',
    savedToWordList: (count) => `已儲存 ${count} 個單字`,
    saveWord: (term) => `儲存 ${term}`,
    removeWord: (term) => `移除 ${term}`,
    hearAt: (time) => `在 ${time} 聆聽`,
    exampleNotLocated: '例句——我們無法在逐字稿中找到這個單字。',
    quickCheck: '快速測驗',
    understoodHeading: '你聽懂了多少？',
    practiceBody: '每題選擇一個答案，可以不限次數重新作答。',
    score: (correct, total) => `你答對了 ${total} 題中的 ${correct} 題。`,
    tryAgain: '再試一次',
    checkAnswers: '檢查答案',
    keepLearning: '繼續學習',
    anotherEpisode: '準備好收聽下一集了嗎？',
    previousLesson: '上一課',
    nextLesson: '下一課',
  },
  list: {
    eyebrow: '你的學習清單',
    heading: '從上次停下的地方繼續。',
    deviceOnly: (pair) =>
      `這裡的所有資料只會以 ${pair} 儲存在這部裝置上，不會上傳。清除瀏覽器資料也會清空這份清單。`,
    removed: (title) => `已移除「${title}」。`,
    wordsRemain: '你從這一集儲存的單字仍保留在單字庫中。',
    undo: '復原',
    continueTitle: '繼續收聽',
    continueBody: '直接從音訊停下的位置繼續，而不是用百分比猜測。',
    savedTitle: '稍後收聽',
    savedBody: '已從探索頁儲存，尚未開啟。',
    finishedTitle: '已完成',
    finishedBody: '已聽到最後；下次可以不看逐字稿再聽一次。',
    findSomething: '尋找可加入的內容',
    sampleTitle: '範例清單',
    sampleBody:
      '你還沒有儲存任何內容，因此這裡以真實集數示範頁面功能。連結都可使用，但播放位置和單字數量是範例，也不會寫入這部裝置。因為沒有真實資料可移除，這些列不會顯示移除按鈕。從探索頁儲存一集後，範例就會立即被取代。',
    finished: '已完成',
    stoppedAt: (time) => `停在 ${time}`,
    openedNotPlayed: '已開啟，尚未播放',
    notStarted: '尚未開始',
    savedWords: (count) => `已儲存 ${count} 個單字`,
    continue: '繼續',
    open: '開啟',
    removeFromList: (title) => `從我的學習清單移除 ${title}`,
  },
  words: {
    eyebrow: '你的單字庫',
    heading: '每個單字都保留它出現時的完整句子。',
    body: '從單集中儲存單字時，也會保留原句、說話者和時間，讓你用耳朵複習，而不是只看單字卡。資料只會保留在這部裝置上。',
    searchAria: '搜尋已儲存的單字',
    searchPlaceholder: '搜尋單字、意思或句子',
    noMatch: (query) => `沒有已儲存內容符合「${query}」。`,
    noneSaved: '這個語言組合尚未儲存任何單字。',
    noVocabulary:
      '這個語言組合目前沒有附單字表的單集，因此暫時沒有可儲存的內容。有單集加入單字表後，這裡就會自動出現。',
    findEpisode: '尋找另一集',
    sampleTitle: '範例單字',
    sampleBody:
      '你還沒有儲存單字，因此這裡用下方單集中的真實單字示範儲存後的畫面。這些資料不會寫入裝置。從任一單集中儲存單字後，範例就會立即被取代。',
  },
  metadata: {
    discoverTitle: (language) => `適合你程度的 ${language} Podcast — DiscoPod`,
    discoverDescription:
      'Podcast 單集依照你是否聽得懂來排序，而不是依照熱門程度。',
    listTitle: (language) => `我的 ${language} 學習清單 — DiscoPod`,
    listDescription: '你儲存的集數、上次收聽位置，以及從中儲存的內容。',
    wordsTitle: (language) => `${language} 單字庫 — DiscoPod`,
    wordsDescription: '每個儲存的單字，都附上它出現時的完整句子。',
    lessonNotFound: '找不到課程 — DiscoPod',
    lessonTitle: (title, level, language) =>
      `${title} — ${level} ${language} 課程`,
  },
};

const zhHans: InterfaceCopy = {
  ...zhHant,
  common: {
    ...zhHant.common,
    mainNavigation: '主要导航',
    discover: '探索',
    myLearningList: '我的学习清单',
    list: '清单',
    vocabulary: '词汇',
    words: '单词',
    signIn: '登录',
    toggleNavigation: '打开或关闭导航',
    autoTranslated: '自动翻译',
    readingDevice: '正在读取这台设备…',
    newWords: (count) => `${count} 个新单词`,
    wordCount: (count) => `${count} 个单词`,
    savedCount: (count) => `已保存 ${count} 集`,
    durationMinutes: (count) => `${count} 分钟`,
    durationSeconds: (count) => `${count} 秒`,
    voices: (count) => `${count} 位说话者`,
    level: {
      Beginner: { label: '初级', note: '清楚的日常用语', range: 'A1–A2' },
      Intermediate: { label: '中级', note: '有辅助的自然语速', range: 'B1–B2' },
      Advanced: { label: '高级', note: '细腻而快速的内容', range: 'C1–C2' },
    },
  },
  discover: {
    ...zhHant.discover,
    heroEyebrow: '按照你听得懂的程度排序',
    heroLead: '适合',
    heroEmphasis: '你程度的 Podcast。',
    chooseLevelIntro: (language) =>
      `选择你的 ${language} 程度。我们会分析每一集文字稿，让内容有挑战性，却不至于难到听不下去。`,
    searchAria: '按主题搜索语言学习 Podcast',
    searchPlaceholder: '你想听什么主题？',
    supportNote: '每一集都附有文字稿和词汇辅助。',
    stepOne: '步骤 1',
    chooseLevel: '选择你的程度',
    stepTwo: '步骤 2 · 从这集开始',
    fit: (score) => `适合度 ${score}%`,
    startHere: '就从这集开始',
    browseByInterest: '按兴趣浏览',
    all: '全部',
    matchCount: (count, level) => `${level}共有 ${count} 个结果`,
    queryHeading: (query, level) => `${level}程度的“${query}”`,
    interestHeading: (interest, level) => `适合${level}学习者的${interest}`,
    practiceHeading: (level) => `${level}听力练习`,
    showLess: '显示较少',
    showAll: (count) => `查看全部 ${count} 集`,
    realLesson: '真人内容',
    saveShow: (title) => `保存 ${title}`,
    removeShow: (title) => `移除 ${title}`,
    playShow: (title) => `播放 ${title}`,
    pauseShow: (title) => `暂停 ${title}`,
    whyItFits: '适合你程度的原因',
    transcriptOnly: '仅按文字稿评分',
    startLesson: '开始学习',
    noMatch: (level) => `目前没有适合${level}的内容`,
    broadenSearch: '试试更广泛的主题，或选择其他程度。',
    resetFilters: '重置筛选',
    analyzedEyebrow: '文字稿分析',
    difficultyHeading: '值得信赖的难度',
    difficultyBody:
      '我们分析每一集，而不是整个节目，所以程度真正反映你会听到的内容。',
    speechPace: '语速',
    speechPaceBody: '每分钟词数，以及想法之间的停顿。',
    vocabularyLoad: '词汇负担',
    vocabularyLoadBody: '不常见的词语、惯用语和专业术语。',
    sentenceComplexity: '句子复杂度',
    sentenceComplexityBody: '语法结构和想法之间的连接方式。',
    listEyebrow: '你的学习清单',
    listHeading: '更有效的听力练习方式。',
    listBody: '保存下次想学的集数。每次收听都有清楚的文字稿和词汇辅助。',
    waitingLessons: (count) => ` 你有 ${count} 集等待收听。`,
    openList: '打开我的学习清单',
    footer: '© 2026 DiscoPod。用聆听来学习。',
    about: '关于',
    privacy: '隐私',
    feedback: '意见反馈',
  },
  episode: {
    ...zhHant.episode,
    backToDiscover: '返回探索',
    listeningLesson: '听力课程',
    realAudioTranscript: '真实音频＋文字稿',
    multiSpeakerHeading: '从真实对话中学习。',
    singleSpeakerHeading: '从真实语音中学习。',
    transcriptOnly: '仅按文字稿评分',
    sourcePrefix: '音频与文字稿',
    sourceModifiedUnder: '为语言学习节选并重新配时，授权条款为 ',
    sourceUnmodifiedUnder:
      '使用发布者未修改的原始文件；本站只加入提示时间。授权条款为 ',
    sourceCreditOnly: '注明来源后用于语言学习。',
    player: '单集播放器',
    playLesson: '播放课程',
    pauseLesson: '暂停课程',
    seekEpisode: '跳到单集中的位置',
    replayTen: '后退 10 秒',
    skipTen: '前进 10 秒',
    completed: '已完成',
    markComplete: '标记为完成',
    speed: '速度',
    deviceStorage: '你的收听位置、已保存单词和测验答案只会保留在这台设备上。',
    transcript: '文字稿',
    practice: '练习',
    hideTranslation: '隐藏翻译',
    showTranslation: '显示翻译',
    learningFocus: '学习重点',
    focusAdvice:
      '不要每遇到陌生单词就停下来。先听懂说话者的主要意思，再重播各个段落。',
    listeningTip: '聆听提示',
    listeningTipBody:
      '点击任一句文字稿即可跳到该段音频；目前播放的句子会跟着音频前进。',
    fromEpisode: '来自这一集',
    wordsWorthKeeping: '值得记住的单词',
    savedToWordList: (count) => `已保存 ${count} 个单词`,
    saveWord: (term) => `保存 ${term}`,
    removeWord: (term) => `移除 ${term}`,
    hearAt: (time) => `在 ${time} 聆听`,
    exampleNotLocated: '例句——我们无法在文字稿中找到这个单词。',
    quickCheck: '快速测验',
    understoodHeading: '你听懂了多少？',
    practiceBody: '每题选择一个答案，可以不限次数重新作答。',
    score: (correct, total) => `你答对了 ${total} 题中的 ${correct} 题。`,
    tryAgain: '再试一次',
    checkAnswers: '检查答案',
    keepLearning: '继续学习',
    anotherEpisode: '准备好收听下一集了吗？',
    previousLesson: '上一课',
    nextLesson: '下一课',
  },
  list: {
    ...zhHant.list,
    eyebrow: '你的学习清单',
    heading: '从上次停下的地方继续。',
    deviceOnly: (pair) =>
      `这里的所有数据只会以 ${pair} 保存在这台设备上，不会上载。清除浏览器数据也会清空这份清单。`,
    removed: (title) => `已移除“${title}”。`,
    wordsRemain: '你从这一集保存的单词仍保留在词汇表中。',
    undo: '撤销',
    continueTitle: '继续收听',
    continueBody: '直接从音频停下的位置继续，而不是用百分比猜测。',
    savedTitle: '稍后收听',
    savedBody: '已从探索页保存，尚未打开。',
    finishedTitle: '已完成',
    finishedBody: '已听到最后；下次可以不看文字稿再听一次。',
    findSomething: '寻找可加入的内容',
    sampleTitle: '示例清单',
    sampleBody:
      '你还没有保存任何内容，因此这里以真实集数示范页面功能。链接都可使用，但播放位置和单词数量是示例，也不会写入这台设备。因为没有真实数据可移除，这些行不会显示移除按钮。从探索页保存一集后，示例就会立即被取代。',
    finished: '已完成',
    stoppedAt: (time) => `停在 ${time}`,
    openedNotPlayed: '已打开，尚未播放',
    notStarted: '尚未开始',
    savedWords: (count) => `已保存 ${count} 个单词`,
    continue: '继续',
    open: '打开',
    removeFromList: (title) => `从我的学习清单移除 ${title}`,
  },
  words: {
    eyebrow: '你的词汇',
    heading: '每个单词都保留它出现时的完整句子。',
    body: '从单集中保存单词时，也会保留原句、说话者和时间，让你用耳朵复习，而不是只看单词卡。数据只会保留在这台设备上。',
    searchAria: '搜索已保存的单词',
    searchPlaceholder: '搜索单词、意思或句子',
    noMatch: (query) => `没有已保存内容符合“${query}”。`,
    noneSaved: '这个语言组合尚未保存任何单词。',
    noVocabulary:
      '这个语言组合目前没有附词汇表的单集，因此暂时没有可保存的内容。有单集加入词汇表后，这里就会自动出现。',
    findEpisode: '寻找另一集',
    sampleTitle: '示例词汇',
    sampleBody:
      '你还没有保存单词，因此这里用下方单集中的真实单词示范保存后的画面。这些数据不会写入设备。从任一单集中保存单词后，示例就会立即被取代。',
  },
  metadata: {
    discoverTitle: (language) => `适合你程度的 ${language} Podcast — DiscoPod`,
    discoverDescription:
      'Podcast 单集按照你是否听得懂来排序，而不是按照热门程度。',
    listTitle: (language) => `我的 ${language} 学习清单 — DiscoPod`,
    listDescription: '你保存的集数、上次收听位置，以及从中保存的内容。',
    wordsTitle: (language) => `${language} 词汇 — DiscoPod`,
    wordsDescription: '每个保存的单词，都附上它出现时的完整句子。',
    lessonNotFound: '找不到课程 — DiscoPod',
    lessonTitle: (title, level, language) =>
      `${title} — ${level} ${language} 课程`,
  },
};

const vi: InterfaceCopy = {
  ...en,
  common: {
    ...en.common,
    mainNavigation: 'Điều hướng chính',
    discover: 'Khám phá',
    myLearningList: 'Danh sách học của tôi',
    list: 'Danh sách',
    vocabulary: 'Từ vựng',
    words: 'Từ',
    signIn: 'Đăng nhập',
    toggleNavigation: 'Bật hoặc tắt điều hướng',
    autoTranslated: 'Dịch tự động',
    readingDevice: 'Đang đọc dữ liệu trên thiết bị…',
    newWords: (count) => `${count} từ mới`,
    wordCount: (count) => `${count} từ`,
    savedCount: (count) => `Đã lưu ${count}`,
    durationMinutes: (count) => `${count} phút`,
    durationSeconds: (count) => `${count} giây`,
    voices: (count) => `${count} giọng nói`,
    level: {
      Beginner: {
        label: 'Sơ cấp',
        note: 'Ngôn ngữ hằng ngày, rõ ràng',
        range: 'A1–A2',
      },
      Intermediate: {
        label: 'Trung cấp',
        note: 'Lời nói tự nhiên có hỗ trợ',
        range: 'B1–B2',
      },
      Advanced: {
        label: 'Cao cấp',
        note: 'Ý tưởng tinh tế, tốc độ nhanh',
        range: 'C1–C2',
      },
    },
  },
  discover: {
    ...en.discover,
    heroEyebrow: 'Xếp hạng theo những gì bạn có thể nghe hiểu',
    heroLead: 'Podcast đúng ',
    heroEmphasis: 'trình độ của bạn.',
    chooseLevelIntro: (language) =>
      `Chọn trình độ ${language} của bạn. Chúng tôi phân tích từng bản chép lời để mỗi tập đủ thử thách nhưng không quá sức.`,
    searchAria: 'Tìm podcast học ngôn ngữ theo chủ đề',
    searchPlaceholder: 'Bạn muốn nghe về chủ đề gì?',
    explore: 'Khám phá',
    supportNote: 'Mỗi tập đều có bản chép lời và hỗ trợ từ vựng.',
    stepOne: 'Bước 1',
    chooseLevel: 'Chọn trình độ',
    stepTwo: 'Bước 2 · Bắt đầu tại đây',
    fit: (score) => `Phù hợp ${score}%`,
    startHere: 'Bắt đầu với tập này',
    browseByInterest: 'Duyệt theo sở thích',
    all: 'Tất cả',
    matchCount: (count, level) => `${count} kết quả ở trình độ ${level}`,
    queryHeading: (query, level) => `“${query}” ở trình độ ${level}`,
    interestHeading: (interest, level) => `${interest} cho người học ${level}`,
    practiceHeading: (level) => `Luyện nghe ${level}`,
    showLess: 'Thu gọn',
    showAll: (count) => `Xem tất cả ${count}`,
    realLesson: 'Nội dung thực',
    saveShow: (title) => `Lưu ${title}`,
    removeShow: (title) => `Bỏ lưu ${title}`,
    playShow: (title) => `Phát ${title}`,
    pauseShow: (title) => `Tạm dừng ${title}`,
    whyItFits: 'Vì sao phù hợp với trình độ của bạn',
    transcriptOnly: 'Chỉ đánh giá từ bản chép lời',
    startLesson: 'Bắt đầu bài học',
    noMatch: (level) => `Chưa có nội dung phù hợp với ${level}`,
    broadenSearch: 'Thử một chủ đề rộng hơn hoặc chọn trình độ khác.',
    resetFilters: 'Đặt lại bộ lọc',
    analyzedEyebrow: 'Đã phân tích bản chép lời',
    difficultyHeading: 'Độ khó đáng tin cậy',
    difficultyBody:
      'Chúng tôi phân loại từng tập, không phải cả chương trình, để trình độ phản ánh đúng những từ bạn sẽ nghe.',
    speechPace: 'Tốc độ nói',
    speechPaceBody: 'Số từ mỗi phút và khoảng nghỉ giữa các ý.',
    vocabularyLoad: 'Mật độ từ vựng',
    vocabularyLoadBody: 'Từ ít gặp, thành ngữ và thuật ngữ chuyên môn.',
    sentenceComplexity: 'Độ phức tạp của câu',
    sentenceComplexityBody: 'Cấu trúc ngữ pháp và cách các ý liên kết.',
    listEyebrow: 'Danh sách học của bạn',
    listHeading: 'Một cách luyện nghe hiệu quả hơn.',
    listBody:
      'Lưu các tập cho buổi học tiếp theo. Mỗi lần nghe đều có bản chép lời dễ đọc và hỗ trợ từ vựng.',
    waitingLessons: (count) => ` Bạn có ${count} bài đang chờ.`,
    openList: 'Mở danh sách học của tôi',
    footer: '© 2026 DiscoPod. Học bằng cách lắng nghe.',
    about: 'Giới thiệu',
    privacy: 'Quyền riêng tư',
    feedback: 'Phản hồi',
  },
  episode: {
    ...en.episode,
    backToDiscover: 'Quay lại khám phá',
    listeningLesson: 'Bài luyện nghe',
    realAudioTranscript: 'Âm thanh thật + bản chép lời',
    multiSpeakerHeading: 'Học từ một cuộc trò chuyện thật.',
    singleSpeakerHeading: 'Học từ lời nói thật.',
    transcriptOnly: 'Chỉ đánh giá từ bản chép lời',
    sourcePrefix: 'Âm thanh và bản chép lời',
    sourceModifiedUnder:
      'Đã trích đoạn và căn lại thời gian cho việc học ngôn ngữ, theo giấy phép ',
    sourceUnmodifiedUnder:
      'Tệp gốc của nhà xuất bản, không chỉnh sửa; chỉ thêm thời gian cho từng câu. Theo giấy phép ',
    sourceCreditOnly: 'Được sử dụng cho việc học ngôn ngữ và ghi rõ nguồn.',
    player: 'Trình phát tập podcast',
    playLesson: 'Phát bài học',
    pauseLesson: 'Tạm dừng bài học',
    seekEpisode: 'Chuyển đến vị trí trong tập',
    replayTen: 'Lùi 10 giây',
    skipTen: 'Tiến 10 giây',
    completed: 'Đã hoàn thành',
    markComplete: 'Đánh dấu hoàn thành',
    speed: 'Tốc độ',
    deviceStorage:
      'Vị trí nghe, từ đã lưu và câu trả lời chỉ được giữ trên thiết bị này.',
    transcript: 'Bản chép lời',
    practice: 'Luyện tập',
    hideTranslation: 'Ẩn bản dịch',
    showTranslation: 'Hiện bản dịch',
    learningFocus: 'Trọng tâm học tập',
    focusAdvice:
      'Đừng dừng lại ở mọi từ lạ. Hãy nghe ý chính của người nói trước, rồi phát lại từng phần.',
    listeningTip: 'Mẹo nghe',
    listeningTipBody:
      'Chạm vào một dòng trong bản chép lời để chuyển đến đoạn đó. Dòng hiện tại sẽ chạy theo âm thanh.',
    fromEpisode: 'Từ tập này',
    wordsWorthKeeping: 'Những từ đáng ghi nhớ',
    savedToWordList: (count) => `Đã lưu ${count} từ vào danh sách`,
    saveWord: (term) => `Lưu ${term}`,
    removeWord: (term) => `Bỏ lưu ${term}`,
    hearAt: (time) => `Nghe tại ${time}`,
    exampleNotLocated:
      'Câu ví dụ — chúng tôi không tìm thấy từ này trong bản chép lời.',
    quickCheck: 'Kiểm tra nhanh',
    understoodHeading: 'Bạn đã hiểu được gì?',
    practiceBody:
      'Chọn một đáp án cho mỗi câu hỏi. Bạn có thể thử lại bao nhiêu lần tùy thích.',
    score: (correct, total) => `Bạn trả lời đúng ${correct}/${total} câu.`,
    tryAgain: 'Thử lại',
    checkAnswers: 'Kiểm tra đáp án',
    keepLearning: 'Tiếp tục học',
    anotherEpisode: 'Sẵn sàng nghe tập tiếp theo?',
    previousLesson: 'Bài trước',
    nextLesson: 'Bài tiếp theo',
  },
  list: {
    eyebrow: 'Danh sách học của bạn',
    heading: 'Tiếp tục từ nơi bạn đã dừng.',
    deviceOnly: (pair) =>
      `Mọi dữ liệu ở đây chỉ được lưu trên thiết bị này cho ${pair}. Không có gì được tải lên; xóa dữ liệu trình duyệt cũng sẽ xóa danh sách này.`,
    removed: (title) => `Đã xóa “${title}”.`,
    wordsRemain: 'Các từ bạn đã lưu từ tập này vẫn còn trong danh sách từ.',
    undo: 'Hoàn tác',
    continueTitle: 'Tiếp tục nghe',
    continueBody:
      'Tiếp tục đúng nơi âm thanh dừng lại, không phải nơi một con số phần trăm ước đoán.',
    savedTitle: 'Để nghe sau',
    savedBody: 'Đã lưu từ trang khám phá, chưa mở.',
    finishedTitle: 'Đã hoàn thành',
    finishedBody:
      'Đã nghe đến cuối. Hãy thử nghe lại mà không nhìn bản chép lời.',
    findSomething: 'Tìm nội dung để thêm',
    sampleTitle: 'Danh sách mẫu',
    sampleBody:
      'Bạn chưa lưu nội dung nào, nên đây là danh sách minh họa bằng các tập có thật. Các liên kết đều hoạt động; vị trí nghe và số từ đã lưu chỉ là ví dụ và không được ghi vào thiết bị. Các dòng này không có nút xóa vì không có dữ liệu thật để xóa. Lưu một tập từ trang khám phá để thay thế mẫu ngay lập tức.',
    finished: 'Đã hoàn thành',
    stoppedAt: (time) => `Dừng ở ${time}`,
    openedNotPlayed: 'Đã mở, chưa phát',
    notStarted: 'Chưa bắt đầu',
    savedWords: (count) => `Đã lưu ${count} từ`,
    continue: 'Tiếp tục',
    open: 'Mở',
    removeFromList: (title) => `Xóa ${title} khỏi danh sách học của tôi`,
  },
  words: {
    eyebrow: 'Từ vựng của bạn',
    heading: 'Mỗi từ đều đi cùng câu mà bạn đã nghe.',
    body: 'Khi lưu một từ trong tập, bạn cũng giữ lại câu nói, người nói và thời điểm để ôn bằng tai thay vì bằng thẻ từ. Dữ liệu chỉ được lưu trên thiết bị này.',
    searchAria: 'Tìm từ đã lưu',
    searchPlaceholder: 'Tìm một từ, nghĩa hoặc câu',
    noMatch: (query) => `Không có nội dung đã lưu nào khớp với “${query}”.`,
    noneSaved: 'Bạn chưa lưu từ nào trong cặp ngôn ngữ này.',
    noVocabulary:
      'Chưa có tập nào trong cặp ngôn ngữ này kèm danh sách từ, nên hiện chưa có gì để lưu. Trang này sẽ có nội dung ngay khi một tập được bổ sung danh sách từ.',
    findEpisode: 'Tìm tập khác',
    sampleTitle: 'Từ vựng mẫu',
    sampleBody:
      'Bạn chưa lưu từ nào, nên đây là các mục từ thật từ những tập bên dưới, được hiển thị như thể bạn đã lưu. Không có gì được ghi vào thiết bị. Lưu một từ trong bất kỳ tập nào để thay thế mẫu ngay lập tức.',
  },
  metadata: {
    discoverTitle: (language) =>
      `Podcast ${language} đúng trình độ của bạn — DiscoPod`,
    discoverDescription:
      'Các tập podcast được xếp hạng theo khả năng bạn nghe hiểu, không theo độ phổ biến.',
    listTitle: (language) => `Danh sách học ${language} — DiscoPod`,
    listDescription:
      'Các tập bạn đã lưu, vị trí đã dừng và nội dung bạn đã lưu từ đó.',
    wordsTitle: (language) => `Từ vựng ${language} — DiscoPod`,
    wordsDescription: 'Mỗi từ đã lưu đều đi cùng câu mà bạn đã nghe.',
    lessonNotFound: 'Không tìm thấy bài học — DiscoPod',
    lessonTitle: (title, level, language) =>
      `${title} — bài học ${language} ${level}`,
  },
};

const COPY: Record<LanguageTag, InterfaceCopy> = {
  en,
  'zh-Hant': zhHant,
  'zh-Hans': zhHans,
  vi,
};

export function interfaceCopy(language: LanguageTag): InterfaceCopy {
  return COPY[language];
}
