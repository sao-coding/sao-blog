import Image from 'next/image'

export type MdxImageProps = React.ImgHTMLAttributes<HTMLImageElement>

export const MdxImage = ({ src, alt, ...props }: MdxImageProps) => {
  if (!src) return null
  const isExternal = /^https?:\/\//.test(src as string)
  return (
    <span className="my-6 block">
      <Image
        src={src as string}
        alt={alt ?? ''}
        width={0}
        height={0}
        sizes="100vw"
        className="h-auto w-full rounded-md"
        unoptimized={isExternal}
      />
    </span>
  )
}
