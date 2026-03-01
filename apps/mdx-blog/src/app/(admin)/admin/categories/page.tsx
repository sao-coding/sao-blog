import type { ApiResponse } from '@/types/api'
import { CategoryItem } from '@/types/category'
import { cookies } from 'next/headers'
import { DataTableContainer } from '@/app/(admin)/_components/table/table'
import { columns } from './_components/table/categories-columns'
import AdminShell from '../../_components/layout/admin-shell'
import { CategoryFormDialog } from './_components/category-form-dialog'

const getCategories = async () => {
  const cookieStore = await cookies()
  const url = `${process.env.NEXT_PUBLIC_API_URL}/admin/categories`
  console.log('Fetching URL:', url)
  const res = await fetch(url, {
    headers: {
      cookie: cookieStore.toString(),
    },
    next: {
      tags: ['categories'],
    },
  })
  console.log('Fetch response status:', res.status)
  if (!res.ok) {
    // 考慮到 API 可能失敗，增加錯誤處理
    console.error('Failed to fetch categories:', await res.text())
    return { data: [], meta: {} }
  }
  const categories = await res.json()
  console.log('Fetched categories:', categories)
  return categories
}

const CategoriesPage = async () => {
  const categories: ApiResponse<CategoryItem[]> = await getCategories()

  return (
    <AdminShell title="分類" actions={<CategoryFormDialog mode="create" />}>
      <DataTableContainer
        columns={columns}
        searchColumnId="name"
        data={categories.data ?? []}
      />
    </AdminShell>
  )
}

export default CategoriesPage
