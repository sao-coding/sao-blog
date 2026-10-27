import { SOCIAL_LINKS } from '@/config/menu'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'

// hero 上方的字：學馬遠「一角」構圖，月亮（頭像）在一角，題字寫在對角的空處（REDESIGN-PLAN 階段 10）。
// 背景的夜航江山不動。中文、日文直排；英文直排會躺著，改成靠右的橫排。
const Welcome = () => {
  const vertical = getLocale() !== 'en'
  return (
    <div className="relative mx-auto h-full w-full max-w-6xl px-5">
      {/* 頭像當作山水畫裡的月亮（白天是紅日，月暈見 styles.css 的 .moon-avatar） */}
      <div className="absolute top-[14vh] left-6 md:top-[16vh] md:left-[8%]">
        <div className="moon-avatar">
          <img
            className="size-24 rounded-full md:size-40 lg:size-48"
            src="/img/avatar.webp"
            width={480}
            height={480}
            alt=""
            // 首屏最大的元素（LCP），要一開始就以高優先度下載，不能 lazy
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </div>

      <div
        className={`absolute right-6 flex flex-col items-end gap-6 md:top-[15vh] md:right-[8%] md:gap-8 ${
          // 英文橫排比較寬，手機上排到月亮下面，免得擠在一起
          vertical ? 'top-[13vh]' : 'top-[30vh]'
        }`}
      >
        <h1
          className={`hero-inscription flex items-start font-wenkai ${
            vertical ? 'flex-row-reverse gap-3 md:gap-5' : 'flex-col items-end gap-1 text-right'
          }`}
        >
          <span
            className={`hero-col flex items-center ${
              vertical ? '[writing-mode:vertical-rl] tracking-[0.3em]' : 'gap-3'
            } text-4xl md:text-5xl`}
          >
            {m.home_hero_name()}
            <span
              aria-hidden
              className={`inline-block size-4 border border-ink text-center text-[10px] leading-[14px] tracking-normal text-ink ${
                vertical ? 'mt-3' : ''
              }`}
            >
              影
            </span>
          </span>
          {[m.home_hero_line1(), m.home_hero_line2()].map((line, i) => (
            <span
              key={i}
              className={`hero-col text-sm leading-relaxed text-muted-foreground md:text-base ${
                vertical ? '[writing-mode:vertical-rl] tracking-[0.25em]' : ''
              }`}
              style={{ '--col': i + 1 } as React.CSSProperties}
            >
              {line}
            </span>
          ))}
        </h1>

        <ul className="hero-links flex flex-wrap justify-end gap-x-4 gap-y-1 font-wenkai text-xs text-muted-foreground md:text-sm">
          {SOCIAL_LINKS.map((social) => (
            <li key={social.link}>
              <a
                href={social.link}
                target={social.link.startsWith('/') ? undefined : '_blank'}
                rel={social.link.startsWith('/') ? undefined : 'noopener noreferrer'}
                className="transition-colors hover:text-ink focus-visible:text-ink"
              >
                {social.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default Welcome
