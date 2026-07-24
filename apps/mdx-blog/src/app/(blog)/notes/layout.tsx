import { NoteLeftSidebar } from './[id]/_components/note-left-sidebar'

export default function NoteLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <div className="grid max-w-[60rem] mt-12 mx-auto gap-4 xl:max-w-[calc(60rem+400px)] xl:grid-cols-[1fr_minmax(auto,60rem)_1fr] md:grid-cols-1">
        <NoteLeftSidebar className="relative hidden min-w-0 xl:block" />
        <>{children}</>
        {/* The right column is now handled by the client component */}
      </div>
    </>
  )
}
