import React, { JSX } from 'react'
import { motion, useInView } from 'motion/react'

type AnimatedTextProps = {
  text: string | string[]
  delay?: number
  el?: keyof JSX.IntrinsicElements
  className?: string
}

const defaultAnimation = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    // 往上彈跳再回到原位
    y: [10, -10, 0],
    transition: { duration: 0.6 },
  },
}

const AnimatedText = ({
  text,
  delay,
  el: Wrapper = 'div',
  className,
}: AnimatedTextProps) => {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true })
  const [isDone, setIsDone] = React.useState(false)
  const textArray = Array.isArray(text) ? text : [text]

  let textList: string[][] = []

  React.useEffect(() => {
    // 顯示計時器 用 log 顯示
    if (delay) {
      const timer = setTimeout(() => {
        setIsDone(true)
      }, delay * 1000)
      return () => clearTimeout(timer)
    } else {
      setIsDone(true)
    }
  }, [delay])

  if (Array.isArray(text)) {
    textList = textArray.map((text) => {
      const splitSpace = text.split(/(\s+)/).filter(Boolean)
      const splitEmoji = splitSpace
        .map((word) => {
          if (word.match(/([^\p{Emoji}\p{White_Space}]+)/gu)) {
            return word
              .split(/([^\p{Emoji}\p{White_Space}]+)/gu)
              .filter(Boolean)
          } else {
            return word
          }
        })
        .flat()
      const splitText = splitEmoji
        .map((word) => {
          if (word.match(/([^\p{Emoji}\p{White_Space}]+)/gu)) {
            return word.split('')
          } else {
            if (word.match(/^\s+$/)) return word
            word = word.replace(/(\p{Emoji})/gu, ' $1 ')
            return word.split(' ').filter(Boolean)
          }
        })
        .flat()
      return splitText
    })
  } else {
    const splitSpace = text.split(/(\s+)/).filter(Boolean)
    const splitEmoji = splitSpace
      .map((word) => {
        if (word.match(/([^\p{Emoji}\p{White_Space}]+)/gu)) {
          return word.split(/([^\p{Emoji}\p{White_Space}]+)/gu).filter(Boolean)
        } else {
          return word
        }
      })
      .flat()
    const splitText = splitEmoji
      .map((word) => {
        if (word.match(/([^\p{Emoji}\p{White_Space}]+)/gu)) {
          return word.split('')
        } else {
          if (word.match(/^\s+$/)) return word
          word = word.replace(/(\p{Emoji})/gu, ' $1 ')
          return word.split(' ').filter(Boolean)
        }
      })
      .flat()
    // console.log("splitText", splitText)
    textList = [splitText]
  }

  return (
    <Wrapper className={className}>
      <motion.div
        ref={ref}
        // initial='hidden'
        // animate={isInView ? "visible" : "hidden"}
        // transition={{ staggerChildren: 0.1 }}
        // 改成等 delay 秒後再開始動畫
        // initial='hidden'
        // animate={isInView ? "visible" : "hidden"}
        initial="hidden"
        // 計時 delay 秒後 visible
        // animate={isInView || isDone.current ? "visible" : "hidden"}
        animate={isInView && isDone ? 'visible' : 'hidden'}
        transition={{ delay: delay, staggerChildren: 0.1 }}
        className=""
      >
        {textList.map((line, i) => (
          <span className="block [&_*]:inline-block" key={i}>
            {line.map((char, j) => {
              if (char.match(/^\s+$/)) {
                return <span key={j}>&nbsp;</span>
              }
              return (
                <motion.span
                  key={j}
                  variants={defaultAnimation}
                  className="text-3xl"
                >
                  {char}
                </motion.span>
              )
            })}
          </span>
        ))}
      </motion.div>
    </Wrapper>
  )
}

export default AnimatedText
