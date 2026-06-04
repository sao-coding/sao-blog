'use client'

import React from 'react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel'
import { cn } from '@/lib/utils'

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
  const slides = React.Children.toArray(children).filter(isSlide)

  if (slides.length === 0) return null

  return (
    <Carousel
      opts={{ loop }}
      className={cn('my-6 px-12', className)}
    >
      <CarouselContent>
        {slides.map((slide, index) => (
          <CarouselItem key={index}>
            <div className="overflow-hidden rounded-lg [&>:first-child]:my-0 [&_img]:my-0">
              {slide.props.children}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}
