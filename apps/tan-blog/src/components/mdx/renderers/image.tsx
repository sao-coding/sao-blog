export type MdxImageProps = React.ImgHTMLAttributes<HTMLImageElement>

export const MdxImage = ({ src, alt, ...props }: MdxImageProps) => {
  if (!src) return null
  return (
    <span className="my-6 block">
      <img
        src={src as string}
        alt={alt ?? ''}
        loading="lazy"
        decoding="async"
        className="h-auto w-full rounded-md"
        {...props}
      />
    </span>
  )
}
