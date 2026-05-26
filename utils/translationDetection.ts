const CJK_THAI_SCRIPT =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0e00-\u0e7f]/g;
const LATIN_CHAR_CLASS = "A-Za-zÀ-ÖØ-öø-ÿĀ-ſƀ-ɏ";
const LATIN_WORD_REGEX = new RegExp(`[${LATIN_CHAR_CLASS}]+(?:['’-][${LATIN_CHAR_CLASS}]+)*`, "g");
const NON_LANGUAGE_REGEX = new RegExp(`[^${LATIN_CHAR_CLASS}\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uac00-\\ud7af\\u0e00-\\u0e7f\\s'’-]+`, "g");
const VIETNAMESE_DIACRITICS =
  /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
const URL_OR_EMAIL_REGEX = /\b(?:https?:\/\/|www\.)\S+|\b\S+@\S+\.\S+\b/gi;

const CHAT_FILLERS = new Set([
  "ah",
  "ha",
  "haha",
  "hehe",
  "hihi",
  "hi",
  "hmm",
  "kk",
  "lol",
  "ok",
  "oke",
  "uh",
  "um",
  "yo",
]);

const VIETNAMESE_ROMANIZED_WORDS = new Set([
  "ai",
  "anh",
  "ban",
  "bao",
  "biet",
  "cac",
  "cai",
  "cam",
  "can",
  "chi",
  "cho",
  "chua",
  "chuyen",
  "co",
  "con",
  "cua",
  "dang",
  "day",
  "de",
  "den",
  "di",
  "do",
  "duoc",
  "em",
  "gap",
  "gi",
  "gio",
  "gui",
  "hay",
  "hen",
  "het",
  "hoi",
  "hom",
  "khong",
  "ko",
  "la",
  "lai",
  "lam",
  "loi",
  "luc",
  "ma",
  "mai",
  "minh",
  "mot",
  "muon",
  "nao",
  "nay",
  "neu",
  "nha",
  "nhe",
  "nhan",
  "nhieu",
  "noi",
  "nua",
  "oi",
  "on",
  "phai",
  "qua",
  "ra",
  "roi",
  "sao",
  "se",
  "sua",
  "tai",
  "the",
  "thi",
  "thoi",
  "thu",
  "toi",
  "tui",
  "vao",
  "ve",
  "viec",
  "voi",
  "vua",
  "xem",
  "xin",
]);

const FOREIGN_MEANINGFUL_WORDS = new Set([
  "about",
  "address",
  "after",
  "again",
  "also",
  "and",
  "answer",
  "are",
  "because",
  "before",
  "bonjour",
  "book",
  "bug",
  "but",
  "bye",
  "call",
  "can",
  "cannot",
  "check",
  "code",
  "color",
  "come",
  "comment",
  "could",
  "danke",
  "date",
  "day",
  "did",
  "does",
  "doing",
  "done",
  "email",
  "error",
  "file",
  "for",
  "from",
  "good",
  "gracias",
  "great",
  "have",
  "hello",
  "help",
  "hola",
  "how",
  "ich",
  "issue",
  "job",
  "login",
  "merci",
  "message",
  "meeting",
  "need",
  "night",
  "not",
  "now",
  "order",
  "please",
  "price",
  "project",
  "question",
  "register",
  "reply",
  "report",
  "send",
  "ship",
  "shoes",
  "should",
  "size",
  "sorry",
  "support",
  "sure",
  "task",
  "than",
  "thank",
  "thanks",
  "that",
  "the",
  "this",
  "time",
  "today",
  "tomorrow",
  "update",
  "want",
  "was",
  "what",
  "when",
  "where",
  "which",
  "why",
  "will",
  "with",
  "work",
  "would",
  "yes",
  "you",
  "your",
]);

const AMBIGUOUS_WORDS = new Set([
  "am",
  "an",
  "can",
  "do",
  "go",
  "he",
  "in",
  "is",
  "may",
  "me",
  "no",
  "on",
  "so",
  "the",
  "to",
]);

const KEYBOARD_RUNS = [
  "asdf",
  "dfgh",
  "hjkl",
  "qwer",
  "wert",
  "zxcv",
  "uiop",
  "ghjk",
  "sdfg",
  "tyui",
];

const COMMON_FOREIGN_BIGRAMS = [
  "th",
  "he",
  "in",
  "er",
  "an",
  "re",
  "on",
  "at",
  "en",
  "nd",
  "ou",
  "ch",
  "sh",
  "ll",
  "st",
  "ing",
  "tion",
  "que",
  "der",
  "sch",
  "gr",
  "pr",
];

export interface MessageTranslationCandidate {
  shouldOffer: boolean;
  reason: string;
}

const normalizeLatinWord = (word: string) =>
  word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z]/g, "");

const stripNoise = (text: string) =>
  text
    .replace(URL_OR_EMAIL_REGEX, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/[@#][A-Za-z0-9_À-ÖØ-öø-ÿĀ-ſƀ-ɏ-]+/g, " ")
    .replace(/\b\d+(?:[.,:/-]\d+)*\b/g, " ")
    .replace(NON_LANGUAGE_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();

const isKeyboardMash = (word: string) =>
  KEYBOARD_RUNS.some((run) => word.includes(run));

const isRepeatedPattern = (word: string) =>
  /(.)\1{2,}/.test(word) || /^(.{1,3})\1{2,}$/.test(word);

const isLikelyGibberishWord = (word: string) => {
  if (word.length < 4) return false;
  if (isKeyboardMash(word) || isRepeatedPattern(word)) return true;

  const vowelCount = (word.match(/[aeiouy]/g) || []).length;
  if (vowelCount === 0) return true;

  const vowelRatio = vowelCount / word.length;
  if (vowelRatio < 0.18 || vowelRatio > 0.78) return true;

  return /[bcdfghjklmnpqrstvwxyz]{5,}/.test(word);
};

const hasForeignWordShape = (word: string) =>
  word.length >= 4 &&
  !isLikelyGibberishWord(word) &&
  COMMON_FOREIGN_BIGRAMS.some((bigram) => word.includes(bigram));

export const getMessageTranslationCandidate = (text: string): MessageTranslationCandidate => {
  const cleaned = stripNoise(String(text || ""));

  if (cleaned.length < 2) {
    return { shouldOffer: false, reason: "too_short" };
  }

  if ((cleaned.match(CJK_THAI_SCRIPT) || []).length >= 2) {
    return { shouldOffer: true, reason: "foreign_script" };
  }

  const rawWords = (cleaned.match(LATIN_WORD_REGEX) || []).filter(Boolean);
  const normalizedWords = rawWords
    .map(normalizeLatinWord)
    .filter((word) => word.length >= 2 && !CHAT_FILLERS.has(word));

  if (!normalizedWords.length) {
    return { shouldOffer: false, reason: "no_words" };
  }

  const vietnameseHits =
    rawWords.filter((word) => VIETNAMESE_DIACRITICS.test(word)).length +
    normalizedWords.filter((word) => VIETNAMESE_ROMANIZED_WORDS.has(word)).length;
  const foreignHits = normalizedWords.filter(
    (word) =>
      FOREIGN_MEANINGFUL_WORDS.has(word) &&
      (!VIETNAMESE_ROMANIZED_WORDS.has(word) || !AMBIGUOUS_WORDS.has(word)),
  ).length;
  const shapeHits = normalizedWords.filter(hasForeignWordShape).length;
  const gibberishHits = normalizedWords.filter(isLikelyGibberishWord).length;
  const meaningfulForeignHits = foreignHits + Math.max(0, shapeHits - foreignHits);

  if (gibberishHits > 0 && normalizedWords.length <= 3) {
    return { shouldOffer: false, reason: "gibberish" };
  }

  if (vietnameseHits >= Math.max(2, meaningfulForeignHits + 1)) {
    return { shouldOffer: false, reason: "likely_vietnamese" };
  }

  if (meaningfulForeignHits >= 2 && gibberishHits / normalizedWords.length <= 0.35) {
    return { shouldOffer: true, reason: "foreign_words" };
  }

  if (
    meaningfulForeignHits === 1 &&
    normalizedWords.length <= 4 &&
    gibberishHits === 0 &&
    vietnameseHits === 0
  ) {
    const strongWord = normalizedWords.some(
      (word) => FOREIGN_MEANINGFUL_WORDS.has(word) && word.length >= 4 && !AMBIGUOUS_WORDS.has(word),
    );
    return strongWord
      ? { shouldOffer: true, reason: "single_foreign_word" }
      : { shouldOffer: false, reason: "weak_signal" };
  }

  return { shouldOffer: false, reason: "weak_signal" };
};
