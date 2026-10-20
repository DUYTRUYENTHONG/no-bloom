import type { Locale } from "./content";

export const complimentIds = ["joy", "own-pace", "possibility", "small-wonders", "confidence", "care", "freedom", "new-chapter"] as const;
export type ComplimentId = typeof complimentIds[number];
type GreetingCopy = { body: string; signoff: string };
export const compliments: Record<ComplimentId, Record<Locale, GreetingCopy>> = {
  joy: {
    vi: {body:"Mong hôm nay có thật nhiều điều khiến bạn mỉm cười: một cuộc trò chuyện dễ chịu, một tin vui nhỏ, hay chút thời gian dành cho điều mình yêu thích. Bạn xứng đáng được trân trọng trong những ngày bình thường, không chỉ riêng ngày 20/10.",signoff:"Một đóa hoa nhỏ, gửi bạn thật nhiều niềm vui."},
    en: {body:"May today bring plenty of reasons to smile: a good conversation, a little welcome news, or time for something you love. You deserve appreciation on ordinary days too, as well as on Vietnamese Women’s Day.",signoff:"A little flower, with plenty of joy for you."},
  },
  "own-pace": {
    vi: {body:"Bạn không cần vội vàng để theo kịp bất kỳ ai. Mong bạn được bước đi theo nhịp của riêng mình, có chỗ cho những điều quan trọng và có khoảng nghỉ khi cần. Chúc ngày 20/10 của bạn thật nhẹ nhàng.",signoff:"Cứ nở theo cách và nhịp của bạn."},
    en: {body:"There is no need to hurry to keep up with anyone else. May you have room for what matters to you and time to rest when you need it. Wishing you a gentle Vietnamese Women’s Day, at your own pace.",signoff:"Bloom in your own way, in your own time."},
  },
  possibility: {
    vi: {body:"Mong những ý tưởng bạn đang ấp ủ có cơ hội được thử, những điều bạn tò mò có dịp được khám phá. Dù hôm nay bắt đầu bằng một bước rất nhỏ, mong đó là bước bạn chọn cho chính mình.",signoff:"Gửi bạn một đóa hoa và những khả năng mới."},
    en: {body:"May the ideas you have been considering find room to be tried, and your curiosity find something new to explore. Even if today begins with one small step, may it be a step you choose for yourself.",signoff:"A flower for you, and room for new possibilities."},
  },
  "small-wonders": {
    vi: {body:"Chúc bạn gặp những điều đẹp vừa đủ để một ngày trở nên đáng nhớ: một góc trời trong, món ăn mình thích, hay một lời hỏi han đúng lúc. Mong niềm vui không phải điều bạn phải đợi đến một dịp đặc biệt mới được nhận.",signoff:"Dành cho bạn, từ những điều nhỏ xinh."},
    en: {body:"Wishing you little things that make a day memorable: a clear patch of sky, a favorite meal, or a thoughtful message at just the right time. May joy be something you receive beyond special occasions too.",signoff:"For you, with appreciation for the little things."},
  },
  confidence: {
    vi: {body:"Mong bạn luôn có không gian để lên tiếng, được lắng nghe và được tôn trọng những lựa chọn của mình. Bạn không cần trở thành một phiên bản khác để xứng đáng với sự quan tâm. Hôm nay, gửi bạn một lời chúc thật lòng.",signoff:"Mong bạn được là mình, thật thoải mái."},
    en: {body:"May you have space to speak, to be heard, and to have your choices respected. You do not need to become someone else to deserve care and consideration. Today, this little greeting is simply for you.",signoff:"May you feel free to be yourself."},
  },
  care: {
    vi: {body:"Nếu hôm nay có thể dành một chút dịu dàng cho ai đó, mong bạn cũng dành một phần cho chính mình. Một khoảng nghỉ, một điều dễ chịu, một lời tự nhắc rằng mình cũng đáng được chăm sóc. Chúc bạn một ngày 20/10 ấm áp.",signoff:"Một chút dịu dàng, dành riêng cho bạn."},
    en: {body:"If you have a little kindness to give today, may some of it be for yourself too. A pause, a small comfort, a reminder that you deserve care as well. Wishing you a warm Vietnamese Women’s Day.",signoff:"A little gentleness, especially for you."},
  },
  freedom: {
    vi: {body:"Chúc bạn có những ngày được chọn điều mình thích, thử điều mình muốn và nói không khi cần. Mong quanh bạn là những người tôn trọng sự tự do ấy, để niềm vui đến thật tự nhiên.",signoff:"Chúc bạn vui theo cách của riêng mình."},
    en: {body:"Wishing you days with the freedom to choose what you enjoy, try what interests you, and say no when you need to. May the people around you respect that freedom, leaving room for joy to arrive naturally.",signoff:"May you find joy in your own way."},
  },
  "new-chapter": {
    vi: {body:"Dù bạn đang bắt đầu một điều mới hay chỉ muốn hôm nay bình yên hơn một chút, mong ngày này mang đến điều có ý nghĩa với bạn. Không cần một cột mốc lớn để xứng đáng được chúc mừng.",signoff:"Mỗi ngày đều có thể dành một điều đẹp cho bạn."},
    en: {body:"Whether you are beginning something new or simply hoping for a quieter day, may today bring something meaningful to you. There is no need for a big milestone to deserve a moment of celebration.",signoff:"There is room for something lovely in an ordinary day."},
  },
};
export function isComplimentId(value: unknown): value is ComplimentId { return typeof value === "string" && (complimentIds as readonly string[]).includes(value); }
export function chooseCompliment(previous?: ComplimentId, random?: number): ComplimentId {
  const candidates = complimentIds.filter(id => id !== previous);
  const value = random ?? (typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 : Math.random());
  return candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(value * candidates.length)))];
}
