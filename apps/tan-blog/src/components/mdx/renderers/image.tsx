import { Zoomable } from './zoomable'

export type MdxImageProps = React.ImgHTMLAttributes<HTMLImageElement>

export const MdxImage = ({ src, alt, ...props }: MdxImageProps) => {
  if (!src) return null
  return (
    <span className="my-6 block">
      <Zoomable label={alt || undefined}>
        <img
          src={src as string}
          alt={alt ?? ''}
          loading="lazy"
          decoding="async"
          className="h-auto w-full rounded-md"
          {...props}
        />
      </Zoomable>
    </span>
  )
}
