export interface EmojiOption {
  emoji: string;
  label: string;
}

const POPULAR_EMOJI_SEED = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🙂', '🙃', '😉', '😊', '😇',
  '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '😋', '😛', '😜', '🤪', '😝',
  '🫠', '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶',
  '🫥', '😶‍🌫️', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴',
  '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '😵‍💫', '🤯', '🤠',
  '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯', '😲',
  '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
  '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️',
  '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '👋', '🤚', '🖐️', '✋', '🖖',
  '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙',
  '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜',
  '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦵', '🦿', '🦶',
  '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '🫦',
  '❤️', '🩷', '🧡', '💛', '💚', '💙', '🩵', '💜', '🤎', '🖤', '🩶', '🤍', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '⭐', '🌟', '✨', '⚡',
  '🔥', '💥', '💫', '💦', '💨', '🕳️', '💬', '🗨️', '🗯️', '💭', '💤', '🌈', '☀️',
  '🌤️', '⛅', '🌧️', '⛈️', '🌩️', '❄️', '☃️', '☁️', '🌪️', '🌊', '🍏', '🍎', '🍐',
  '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🥝', '🍍', '🥭', '🍑', '🍈',
  '🍅', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🥒', '🥬', '🥦', '🧄', '🧅',
  '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🧀', '🍗', '🍖', '🥩', '🍔',
  '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥗', '🍝', '🍜', '🍲', '🍛',
  '🍣', '🍱', '🥟', '🍤', '🍙', '🍘', '🍚', '🍥', '🥠', '🍢', '🍡', '🍧', '🍨',
  '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '☕',
  '🍵', '🧋', '🥤', '🍺', '🍻', '🍷', '🥂', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'
];

const EXTRA_RANGES: Array<[number, number]> = [
  [0x1F600, 0x1F64F],
  [0x1F300, 0x1F5FF],
  [0x1F680, 0x1F6FF],
  [0x1F900, 0x1F9FF],
  [0x1FA70, 0x1FAFF],
  [0x2600, 0x26FF],
  [0x2700, 0x27BF]
];

const EMOJI_PATTERN = /\p{Extended_Pictographic}/u;

const KNOWN_LABELS: Record<string, string> = {
  '😀': 'grinning face',
  '😁': 'beaming smile',
  '😂': 'tears of joy',
  '🤣': 'rolling laughter',
  '🙂': 'slight smile',
  '😉': 'winking face',
  '😊': 'smiling eyes',
  '😍': 'heart eyes',
  '😘': 'blowing kiss',
  '😎': 'cool face',
  '😭': 'loudly crying',
  '😡': 'angry face',
  '👍': 'thumbs up',
  '👎': 'thumbs down',
  '🙏': 'folded hands',
  '❤️': 'red heart',
  '💔': 'broken heart',
  '🔥': 'fire',
  '✨': 'sparkles',
  '⭐': 'star',
  '☀️': 'sun',
  '🌧️': 'rain cloud',
  '🍕': 'pizza',
  '🍔': 'burger',
  '🍟': 'fries',
  '🍣': 'sushi',
  '🍰': 'cake',
  '☕': 'coffee',
  '🍺': 'beer',
  '🎂': 'birthday cake',
  '💬': 'speech bubble'
};

function getCategoryName(codePoint: number): string {
  if (codePoint >= 0x1F600 && codePoint <= 0x1F64F) return 'face';
  if (codePoint >= 0x1F440 && codePoint <= 0x1F4FF) return 'symbol';
  if (codePoint >= 0x1F300 && codePoint <= 0x1F5FF) return 'nature';
  if (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) return 'travel';
  if (codePoint >= 0x1F900 && codePoint <= 0x1FAFF) return 'objects';
  if (codePoint >= 0x1F345 && codePoint <= 0x1F37F) return 'food';
  if (codePoint >= 0x1F3FB && codePoint <= 0x1F3FF) return 'tone';
  if (codePoint >= 0x2600 && codePoint <= 0x26FF) return 'symbol';
  if (codePoint >= 0x2700 && codePoint <= 0x27BF) return 'symbol';
  return 'emoji';
}

function formatCodePoints(emoji: string): string {
  return Array.from(emoji)
    .map((char) => (char.codePointAt(0) ?? 0).toString(16).toUpperCase())
    .join('-');
}

function createLabel(emoji: string): string {
  const known = KNOWN_LABELS[emoji];
  if (known) {
    return known;
  }

  const codePoint = emoji.codePointAt(0) ?? 0;
  const category = getCategoryName(codePoint);
  return `${category} ${formatCodePoints(emoji)}`;
}

function createTop500Emojis(): EmojiOption[] {
  const result: EmojiOption[] = [];
  const seen = new Set<string>();

  const pushEmoji = (emoji: string): void => {
    if (!emoji || seen.has(emoji) || !EMOJI_PATTERN.test(emoji)) {
      return;
    }

    seen.add(emoji);
    result.push({
      emoji,
      label: createLabel(emoji)
    });
  };

  for (const emoji of POPULAR_EMOJI_SEED) {
    pushEmoji(emoji);

    if (result.length >= 500) {
      return result.slice(0, 500);
    }
  }

  for (const [start, end] of EXTRA_RANGES) {
    for (let codePoint = start; codePoint <= end; codePoint += 1) {
      pushEmoji(String.fromCodePoint(codePoint));

      if (result.length >= 500) {
        return result.slice(0, 500);
      }
    }
  }

  return result.slice(0, 500);
}

export const TOP_500_EMOJIS = createTop500Emojis();
