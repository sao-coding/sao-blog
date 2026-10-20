import cx from 'clsx'
import { motion } from 'motion/react'

import AnimatedText from '@/components/animation/text'
import { SOCIAL_LINKS } from '@/config/menu'
import { ChevronDownIcon } from 'lucide-react'

const Welcome = () => {
  return (
    <>
      <div className="flex w-full h-full flex-col items-center justify-center space-y-10 px-4 lg:flex-row lg:px-0">
        <div className="flex w-full flex-col items-center justify-center lg:w-1/2">
          <div className="flex flex-col gap-2">
            <div className="group [&_*]:inline-block leading-[4]">
              <AnimatedText
                text={'嗨，我是唯一👋。'}
                className="font-wenkai text-4xl text-center md:text-left w-full"
                delay={0.1}
              />
              <br />
              <AnimatedText
                text={'一個正在學習的全端'}
                className="font-wenkai text-4xl text-center w-full md:text-left md:w-fit"
                delay={1}
              />
              <AnimatedText
                text={'<Developer />'}
                delay={1.1}
                el="code"
                className="mb-4 mr-2 self-end rounded-md px-1 text-3xl transition-colors duration-200 hover:bg-foreground/10 text-center md:text-left w-full md:w-fit"
              />
              <span className="relative top-2 inline-block h-8 w-[1px] self-end bg-gray-800/80 opacity-0 transition-opacity duration-200 group-hover:animate-blink group-hover:opacity-100 dark:bg-gray-200/80" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: [20, -10, 0] }}
              transition={{ delay: 2 }}
              className="text-center font-wenkai text-muted-foreground md:text-left"
            >
              喜歡寫程式、看動漫😆
            </motion.div>
            <div className="mt-10 flex items-center gap-2 justify-center md:justify-start">
              {SOCIAL_LINKS.map((social, index) => (
                <motion.div
                  key={social.link}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: [20, -15, 0] }}
                  transition={{ delay: 3 + index * 0.2, duration: 0.6 }}
                >
                  <a href={social.link} target="_blank" rel="noopener noreferrer">
                    <social.icon
                      className={cx(
                        'h-9 w-9 rounded-full stroke-2 p-1',
                        social.color
                      )}
                    />
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        {/* 頭像當作山水畫裡的月亮（月暈見 styles.css 的 .moon-avatar）：手機排在文字上方，桌機往上提到山的上方 */}
        <div className="order-first flex w-full justify-center lg:order-none lg:w-1/2 lg:-translate-y-[14vh]">
          <div className="moon-avatar">
            <img
              className="size-44 rounded-full lg:size-60"
              src="/img/avatar.jpg"
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
      <ChevronDownIcon className="absolute bottom-4 h-6 w-full animate-bounce stroke-2" />
    </>
  )
}

export default Welcome
