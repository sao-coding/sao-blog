import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { env } from '@sao-blog/env/web'

export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidate-secret')

  if (secret !== env.REVALIDATE_SECRET) {
    return NextResponse.json({ status: 'error', message: 'Invalid secret' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as { paths?: string[] } | null
  const paths = body?.paths

  if (!paths || paths.length === 0) {
    return NextResponse.json({ status: 'error', message: 'paths is required' }, { status: 400 })
  }

  for (const path of paths) {
    revalidatePath(path)
  }

  return NextResponse.json({ status: 'success', revalidated: paths })
}
