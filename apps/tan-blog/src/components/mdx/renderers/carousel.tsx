'use client'

import React, { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@sao-blog/ui/components/carousel'
import { m } from '#/paraglide/messages'
import { cn } from '@/lib/utils'
import { flattenItems } from './children'

export interface MdxSlideProps {
  children: React.ReactNode
}

/**
 * 單張輪播內容。需放在 <Carousel> 內。可放圖片或任意 markdown。
 */
export const MdxSlide = ({ children }: MdxSlideProps) => {
  return <>{children}</>
}
MdxSlide.displayName = 'MdxSlide'

export interface MdxCarouselProps {
  /** 是否循環播放，預設 true */
  loop?: boolean
  children: React.ReactNode
  className?: string
}

type SlideElement = React.ReactElement<MdxSlideProps>

const isSlide = (child: React.ReactNode): child is SlideElement =>
  React.isValidElement(child) &&
  (child.type === MdxSlide ||
    (child.type as { displayName?: string })?.displayName === 'MdxSlide')

/**
 * 文章用的輪播元件（對應 Hexo 的 gallery/swiper）。
 * 箭頭疊在內容上（滑過才出現，觸控裝置常駐），不佔左右版寬；底下一排點＋頁碼。
 *
 * ```mdx
 * <Carousel>
 *   <Slide>![圖一](/img/1.jpg)</Slide>
 *   <Slide>![圖二](/img/2.jpg)</Slide>
 * </Carousel>
 * ```
 */
export const MdxCarousel = ({
  loop = true,
  children,
  className,
}: MdxCarouselProps) => {
  const slides = flattenItems(children).filter(isSlide)
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(slides.length > 1)

  useEffect(() => {
    if (!api) return
    const sync = () => {
      setCurrent(api.selectedScrollSnap())
      setCanPrev(api.canScrollPrev())
      setCanNext(api.canScrollNext())
    }
    sync()
    api.on('select', sync)
    api.on('reInit', sync)
    return () => {
      api.off('select', sync)
      api.off('reInit', sync)
    }
  }, [api])

  if (slides.length === 0) return null
  const multiple = slides.length > 1

  return (
    <Carousel
      opts={{ loop }}
      setApi={setApi}
      className={cn('mdx-block mdx-carousel', className)}
    >
      <div className="relative">
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem
              key={index}
              aria-label={`${index + 1} / ${slides.length}`}
              className="mdx-carousel-slide"
            >
              {slide.props.children}
            </CarouselItem>
          ))}
        </CarouselContent>
        {multiple && (
          <>
            <button
              type="button"
              className="mdx-carousel-nav"
              data-dir="prev"
              disabled={!canPrev}
              aria-label={m.lightbox_prev()}
              onClick={() => api?.scrollPrev()}
            >
              <ChevronLeftIcon aria-hidden />
            </button>
            <button
              type="button"
              className="mdx-carousel-nav"
              data-dir="next"
              disabled={!canNext}
              aria-label={m.lightbox_next()}
              onClick={() => api?.scrollNext()}
            >
              <ChevronRightIcon aria-hidden />
            </button>
          </>
        )}
      </div>
      {multiple && (
        <div className="mdx-carousel-foot">
          <div className="mdx-carousel-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                className="mdx-carousel-dot"
                aria-current={index === current}
                aria-label={m.carousel_goto({ index: index + 1 })}
                onClick={() => api?.scrollTo(index)}
              />
            ))}
          </div>
          <span className="mdx-carousel-count" aria-live="polite">
            {current + 1} / {slides.length}
          </span>
        </div>
      )}
    </Carousel>
  )
}
