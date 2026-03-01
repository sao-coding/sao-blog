'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useHeaderStore } from '@/store/header-store'
import { AnimatePresence, motion } from 'motion/react'

type Props = {
  showBackground: boolean
}

/**
 * HeaderTitle
 * - 負責從 store 取得 post/note 的 title 並顯示
 * - 在切換至非 detail page 時呼叫 clearAll() 清除狀態
 */
const HeaderTitle: React.FC<Props> = ({ showBackground }) => {
  const pathname = usePathname()
  const { postState, noteState, clearAll } = useHeaderStore()

  // 當路由變動且不在 detail page 時，清除 store 狀態
  // 特別處理 /notes/topics：它是 topics 列表，不應被視為 note detail，故需清除
  useEffect(() => {
    const isPostDetail = pathname?.startsWith('/posts/')
    // notes 下有多種頁面，/notes/topics 應視為 list，而非 detail
    const isNoteDetail =
      pathname?.startsWith('/notes/') && !pathname?.startsWith('/notes/topics')

    if (!isPostDetail && !isNoteDetail) {
      clearAll()
    }
  }, [pathname, clearAll])

  const title = postState?.title ?? noteState?.title

  return (
    <AnimatePresence>
      {title && showBackground && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className={cn('absolute w-full lg:px-16')}
        >
          <small className="flex gap-0.5 text-gray-500">
            {postState.title && (
              <>
                {postState.category}
                <span>/</span>
                {postState.tags.join(', ')}
              </>
            )}
            {noteState.title && (
              <>
                日記<span>/</span>
                {noteState.topic}
              </>
            )}
          </small>
          <div className="text-xl leading-normal truncate">{title}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default HeaderTitle
